"""Build an evidence-based duplicate-question database without changing inputs.

Run with Python 3.10+: python -B src/data/questions_clones.py
Uses only the Python standard library and the existing images/_clones.json.
Default output: questions_clones.json beside questions.json.
"""

import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
from difflib import SequenceMatcher
from functools import lru_cache
import hashlib
import html
from itertools import combinations, permutations
import json
import math
from pathlib import Path
import re
import unicodedata


PREFIX = re.compile(r"^\s*((?:\d{1,6}(?:\s+|[.)\-:]+\s*))+)(?=[^\W\d_])")
UNITS = {"km", "m", "cm", "mm", "kg", "t", "g", "l", "ml", "metres", "metre",
         "quilometres", "hores", "hora", "minuts", "segons", "anys", "vehicles",
         "persones", "carrils", "rodes", "dies", "mesos", "litres", "tones"}
TOKEN = re.compile(r"\d+(?:[.,]\d+)*|[^\W\d_]+|[%+<>=/°−-]", re.UNICODE)
VISUAL = re.compile(
    r"\b(?:aquest\w*|aquell\w*|aqui|imatge\w*|fotografia\w*|dibuix\w*|figura\w*|"
    r"observ\w*|representat\w*|vermell\w*|blau\w*|groc\w*|verd\w*)\b"
)
CRITICAL = re.compile(
    r"\b(?:no|mai|nomes|excepte|sense|sempre|dreta|esquerra|davant|darrere|"
    r"anterior|posterior|maxim\w*|minim\w*|prohib\w*|permes\w*|obligat\w*)\b"
)
NUMBER_WORDS = re.compile(
    r"\b(?:zero|dos|dues|tres|quatre|cinc|sis|set|vuit|nou|deu|onze|dotze|tretze|"
    r"catorze|quinze|setze|disset|divuit|dinou|vint|trenta|quaranta|cinquanta|"
    r"seixanta|setanta|vuitanta|noranta|cent|cents|mil|milers)\b"
)


def fold_accents(text):
    return "".join(c for c in unicodedata.normalize("NFKD", text)
                   if not unicodedata.combining(c))


def strip_question_id(text):
    text = unicodedata.normalize("NFKC", html.unescape(text)).strip()
    match = PREFIX.match(text)
    if match:
        remainder = text[match.end():]
        # L'autoritat / L’alcohol start with a Catalan article, not litres.
        first_word = re.match(r"\w+(?:['’]\w+)?", remainder)
        word = fold_accents(first_word[0].casefold()) if first_word else ""
        # 'Segons les normes' means 'According to the rules', not seconds.
        according_to = re.match(r"segons\s+(?:el\b|els\b|la\b|les\b|l['’])", remainder, re.I)
        if first_word and (word not in UNITS or according_to):
            return remainder, match[1].strip()
    return text, None


def normalize(text, *, loose=False):
    text = unicodedata.normalize("NFKC", html.unescape(text)).casefold()
    # Catalan geminated l appears as l·l, l.l, l•l, or l-l in the source.
    text = re.sub(r"l[·.•-]l", "ll", text)
    if loose:
        text = fold_accents(text)
    # Keep numbers, decimal values, and mathematical signs. Only punctuation
    # and whitespace outside these tokens are ignored.
    return " ".join(token.replace(",", ".") if token[0].isdigit() else token
                    for token in TOKEN.findall(text))


@lru_cache(maxsize=150000)
def similarity(left, right):
    if left == right:
        return 1.0
    if not left or not right:
        return 0.0
    return SequenceMatcher(None, left, right, autojunk=False).ratio()


def answer_alignment(left, right):
    """Compare answer text, allowing options to appear in a different order."""
    if len(left) != len(right) or not left:
        return 0.0, 0.0, []
    scores = [[similarity(a, b) for b in right] for a in left]
    order = max(permutations(range(len(right))),
                key=lambda p: (sum(scores[i][j] for i, j in enumerate(p)),
                               min(scores[i][j] for i, j in enumerate(p))))
    matched = [scores[i][j] for i, j in enumerate(order)]
    return sum(matched) / len(matched), min(matched), list(order)


def grouped_indices(records, key):
    groups = defaultdict(list)
    for i, record in enumerate(records):
        value = key(record)
        if value is not None:
            groups[value].append(i)
    return {key: indices for key, indices in groups.items() if len(indices) > 1}


def add_bucket_pairs(candidates, groups):
    for indices in groups.values():
        candidates.update(combinations(indices, 2))


def fuzzy_candidates(texts, *, limit=12, minimum=0.48):
    """Retrieve spelling/wording candidates using TF-IDF character trigrams.

    This is candidate retrieval, not a semantic-equivalence classifier. Exact
    matches are covered separately. Keeping the top 12 different strings per
    string avoids comparing every possible pair of the 4,400 questions.
    """
    occurrences = defaultdict(list)
    for i, text in enumerate(texts):
        if text:
            occurrences[text].append(i)
    unique = sorted(occurrences)
    postings = defaultdict(list)
    for i, text in enumerate(unique):
        padded = f"  {text}  "
        for gram in {padded[j:j + 3] for j in range(len(padded) - 2)}:
            postings[gram].append(i)
    vectors = [dict() for _ in unique]
    # Ignore ubiquitous trigrams, which provide little useful evidence.
    for gram, indices in postings.items():
        if len(indices) > max(20, len(unique) * 0.25):
            continue
        weight = math.log((1 + len(unique)) / (1 + len(indices))) + 1
        for i in indices:
            vectors[i][gram] = weight
    norms = [math.sqrt(sum(w * w for w in vector.values())) for vector in vectors]
    result = set()
    for i, vector in enumerate(vectors):
        if not norms[i]:
            continue
        dots = defaultdict(float)
        for gram, weight in vector.items():
            for j in postings[gram]:
                if j != i:
                    dots[j] += weight * weight
        scored = [(dot / (norms[i] * norms[j]), j) for j, dot in dots.items() if norms[j]]
        for score, j in sorted(scored, key=lambda pair: (-pair[0], pair[1]))[:limit]:
            if score < minimum:
                break
            for a in occurrences[unique[i]]:
                for b in occurrences[unique[j]]:
                    if a != b:
                        result.add((min(a, b), max(a, b)))
    return result


def numeric_tokens(text):
    return (re.findall(r"\d+(?:\.\d+)*|[%+<>=/°−-]", text)
            + NUMBER_WORDS.findall(text))


def classify_pair(left, right):
    same_question = left["q"] == right["q"]
    same_answers = sorted(left["a"]) == sorted(right["a"])
    same_image = left["image_key"] is not None and left["image_key"] == right["image_key"]
    both_no_image = left["image_key"] is None and right["image_key"] is None
    q_score = similarity(left["q"], right["q"])
    if q_score < 0.50 and not (same_image and same_answers):
        return None
    # Avoid expensive alignment for unrelated answer sets.
    tokens_a = set(" ".join(left["a"]).split())
    tokens_b = set(" ".join(right["a"]).split())
    overlap = len(tokens_a & tokens_b) / max(1, min(len(tokens_a), len(tokens_b)))
    if overlap < 0.30 and not (same_image and q_score >= 0.90):
        return None
    a_score, a_min, order = answer_alignment(left["a"], right["a"])
    correct_score = similarity(left["correct"], right["correct"])
    if not (
        (same_question and same_answers)
        or (same_image and q_score >= 0.60 and a_score >= 0.55)
        or (same_image and same_answers)
        or (q_score >= 0.88 and a_score >= 0.77)
        or (same_question and a_score >= 0.70)
        or (same_answers and q_score >= 0.65)
    ):
        return None

    flags = []
    if left["image_key"] != right["image_key"]:
        flags.append("different_images" if left["image_key"] and right["image_key"]
                     else "image_present_on_one_question_only")
        if left["visual"] or right["visual"]:
            flags.append("visual_context_needs_review")
    if left["public"]["category"] != right["public"]["category"]:
        flags.append("different_categories")
    if numeric_tokens(left["q"]) != numeric_tokens(right["q"]):
        flags.append("question_numbers_or_symbols_differ")
    if Counter(CRITICAL.findall(left["q"])) != Counter(CRITICAL.findall(right["q"])):
        flags.append("question_negation_direction_or_qualifier_differs")
    if any(numeric_tokens(left["a"][i]) != numeric_tokens(right["a"][j])
           for i, j in enumerate(order)):
        flags.append("answer_numbers_or_symbols_differ")
    if any(Counter(CRITICAL.findall(left["a"][i])) != Counter(CRITICAL.findall(right["a"][j]))
           for i, j in enumerate(order)):
        flags.append("answer_negation_direction_or_qualifier_differs")
    if left["key_issue"] or right["key_issue"]:
        flags.append("source_answer_key_issue")
    selected_left = left["public"]["correct_option"]
    selected_right = right["public"]["correct_option"]
    key_alignment = (order[selected_left - 1] == selected_right - 1
                     if order and isinstance(selected_left, int) and isinstance(selected_right, int)
                     and 1 <= selected_left <= len(order) and 1 <= selected_right <= len(order)
                     else False)
    if not key_alignment:
        flags.append("correct_options_disagree_after_answer_alignment")
    if left["correct"] != right["correct"]:
        flags.append("correct_answer_text_differs")

    blockers = set(flags) - {"different_images", "image_present_on_one_question_only",
                             "different_categories", "correct_answer_text_differs"}
    probable = (not blockers and correct_score >= 0.90 and a_min >= 0.72 and (
        (same_question and same_answers)
        or (same_image and q_score >= 0.70 and a_score >= 0.85)
        or ((same_image or both_no_image or not (left["visual"] or right["visual"]))
            and q_score >= 0.92 and a_score >= 0.90)
    ))
    reasons = []
    if same_question:
        reasons.append("same_normalized_question")
    if same_answers:
        reasons.append("same_normalized_answer_choices")
    if same_image:
        reasons.append("same_image_pixels_or_path")
    if both_no_image:
        reasons.append("both_have_no_image")
    if not same_question or not same_answers:
        reasons.append("similar_question_or_answer_wording")
    if left["public"]["removed_leading_id"] or right["public"]["removed_leading_id"]:
        reasons.append("leading_question_ids_ignored")
    if same_answers and left["a"] != right["a"]:
        reasons.append("answer_choices_reordered")
    return {
        "question_ids": [left["public"]["question_id"], right["public"]["question_id"]],
        "confidence": "probable" if probable else "review",
        "reasons": reasons,
        "flags": flags,
        "similarity": {"question": round(q_score, 4), "answers_mean": round(a_score, 4),
                       "answers_minimum": round(a_min, 4), "correct_answer": round(correct_score, 4)},
        "answer_option_mapping": [{"left": i + 1, "right": j + 1} for i, j in enumerate(order)],
    }


def build_database(source_path, image_clones_path):
    source_bytes = source_path.read_bytes()
    image_bytes = image_clones_path.read_bytes()
    source = json.loads(source_bytes.decode("utf-8-sig"))
    image_clones = json.loads(image_bytes.decode("utf-8-sig"))
    image_lookup = {}
    for number, names in enumerate(image_clones, 1):
        for name in names:
            if name in image_lookup:
                raise ValueError(f"Image appears in multiple image-clone groups: {name}")
            image_lookup[name] = f"image-clones-{number:04d}"

    records = []
    seen_ids = set()
    for test_index, test in enumerate(source["tests"]):
        for question_index, question in enumerate(test["questions"]):
            qid = str(question["question_id"])
            if qid in seen_ids:
                raise ValueError(f"Duplicate source question_id requires occurrence IDs: {qid}")
            seen_ids.add(qid)
            prompt, removed = strip_question_id(question["question"])
            answers = question["answers"]
            if not 1 <= len(answers) <= 6:
                raise ValueError(f"Expected 1–6 answer choices for question {qid}")
            image_local = (question.get("image_local") or "").replace("\\", "/")
            image_name = image_local.removeprefix("images/")
            placeholder = (not image_local or question.get("image_original", "").casefold() == "no-image.jpg"
                           or Path(image_local).name.casefold().endswith("_no-image.jpg"))
            image_key = None if placeholder else image_lookup.get(image_name, "path:" + image_local)
            option = question.get("correct_option")
            correct = question.get("correct_answer") or ""
            key_issue = (not isinstance(option, int) or not 1 <= option <= len(answers)
                         or not correct or answers[option - 1] != correct)
            public = {
                "question_id": qid,
                "test_number": test["test_number"],
                "position": question["position"],
                "source_pointer": f"/tests/{test_index}/questions/{question_index}",
                "question": question["question"],
                "answers": answers,
                "correct_option": option,
                "correct_answer": correct,
                "answer_key_status": question.get("answer_key_status"),
                "answer_key_note": question.get("answer_key_note", ""),
                "category": question.get("category"),
                "image_local": image_local,
                "image_is_placeholder": placeholder,
                "image_clone_group_id": image_lookup.get(image_name) if not placeholder else None,
                "normalized_question": normalize(prompt, loose=True),
                "removed_leading_id": removed,
                "duplicate_group_id": None,
                "text_match_group_id": None,
                "candidate_pair_ids": [],
            }
            records.append({"public": public, "q": normalize(prompt, loose=True),
                            "a": [normalize(a, loose=True) for a in answers],
                            "correct": normalize(correct, loose=True),
                            "strict_q": normalize(prompt), "strict_a": tuple(sorted(normalize(a) for a in answers)),
                            "strict_correct": normalize(correct), "image_key": image_key,
                            "key_issue": key_issue, "visual": bool(VISUAL.search(normalize(prompt, loose=True)))})

    print(f"Loaded {len(records)} questions and {len(image_clones)} image clone groups.", flush=True)
    strict = grouped_indices(records, lambda r: None if r["key_issue"] else (
        r["strict_q"], r["strict_a"], r["strict_correct"], r["image_key"]))
    duplicate_groups = []
    for number, indices in enumerate(strict.values(), 1):
        gid = f"duplicate-{number:04d}"
        for i in indices:
            records[i]["public"]["duplicate_group_id"] = gid
        duplicate_groups.append({
            "group_id": gid, "confidence": "high", "question_count": len(indices),
            "question_ids": [records[i]["public"]["question_id"] for i in indices],
            "representative_question_id": records[indices[0]]["public"]["question_id"],
            "reasons": ["same_question_after_case_prefix_and_typography_normalization",
                        "same_answer_choices_ignoring_order", "same_correct_answer",
                        "same_image_pixels_or_path" if records[indices[0]]["image_key"] else "both_have_no_image"],
        })

    by_image = grouped_indices(records, lambda r: r["image_key"])
    by_wording = grouped_indices(records, lambda r: r["q"])
    by_answers = grouped_indices(records, lambda r: tuple(sorted(r["a"])))
    by_full_text = grouped_indices(records, lambda r: (r["q"], tuple(sorted(r["a"]))))
    text_match_groups = []
    for number, ((prompt, answers), indices) in enumerate(by_full_text.items(), 1):
        gid = f"text-match-{number:04d}"
        members = [records[i] for i in indices]
        image_keys = {r["image_key"] for r in members}
        correct_answers = defaultdict(list)
        for record in members:
            record["public"]["text_match_group_id"] = gid
            correct_answers[record["correct"]].append(record["public"]["question_id"])
        flags = []
        if len(image_keys) > 1:
            flags.append("different_image_contexts")
            if any(r["visual"] for r in members):
                flags.append("visual_context_needs_review")
        if len(correct_answers) > 1:
            flags.append("different_correct_answers")
        if any(r["key_issue"] for r in members):
            flags.append("source_answer_key_issue")
        strict_group_ids = {r["public"]["duplicate_group_id"] for r in members}
        confidence = ("high" if len(strict_group_ids) == 1 and None not in strict_group_ids
                      else "review" if set(flags) - {"different_image_contexts"} else "probable")
        text_match_groups.append({
            "group_id": gid, "confidence": confidence, "question_count": len(indices),
            "question_ids": [r["public"]["question_id"] for r in members],
            "normalized_question": prompt, "normalized_answer_choices": list(answers),
            "flags": flags,
            "correct_answer_variants": [{"normalized_correct_answer": answer, "question_ids": qids}
                                        for answer, qids in correct_answers.items()],
            "high_confidence_subgroup_ids": sorted(g for g in strict_group_ids if g),
        })
    candidates = set()
    for groups in (by_image, by_answers, by_full_text):
        add_bucket_pairs(candidates, groups)
    print("Retrieving similar questions and answer choices...", flush=True)
    candidates.update(fuzzy_candidates([r["q"] for r in records]))
    candidates.update(fuzzy_candidates([" | ".join(sorted(r["a"])) for r in records]))
    print(f"Assessing {len(candidates):,} candidate pairs...", flush=True)
    pairs = []
    for index, (a, b) in enumerate(sorted(candidates), 1):
        left, right = records[a], records[b]
        group = left["public"]["duplicate_group_id"]
        if group and group == right["public"]["duplicate_group_id"]:
            continue
        pair = classify_pair(left, right)
        if pair:
            pairs.append(pair)
        if index % 20000 == 0:
            print(f"  Assessed {index:,}/{len(candidates):,} pairs.", flush=True)
    pairs.sort(key=lambda p: (p["confidence"] != "probable",
                             -(p["similarity"]["question"] + p["similarity"]["answers_mean"]),
                             tuple(p["question_ids"])))
    questions = {r["public"]["question_id"]: r["public"] for r in records}
    for number, pair in enumerate(pairs, 1):
        pair["pair_id"] = f"candidate-{number:05d}"
        for qid in pair["question_ids"]:
            questions[qid]["candidate_pair_ids"].append(pair["pair_id"])

    shared_images = [{
        "group_id": f"shared-image-{number:04d}", "image_identity": key,
        "evidence_only": True,
        "question_ids": [records[i]["public"]["question_id"] for i in indices],
        "image_files": sorted({records[i]["public"]["image_local"] for i in indices}),
    } for number, (key, indices) in enumerate(by_image.items(), 1)]
    shared_wording = [{
        "group_id": f"shared-wording-{number:04d}", "normalized_question": key,
        "evidence_only": True,
        "question_ids": [records[i]["public"]["question_id"] for i in indices],
        "distinct_answer_sets": len({tuple(sorted(records[i]["a"])) for i in indices}),
        "distinct_image_identities": len({records[i]["image_key"] for i in indices}),
    } for number, (key, indices) in enumerate(by_wording.items(), 1)]
    counts = Counter(pair["confidence"] for pair in pairs)
    high_ids = {qid for group in duplicate_groups for qid in group["question_ids"]}
    probable_ids = {qid for pair in pairs if pair["confidence"] == "probable" for qid in pair["question_ids"]}
    review_ids = {qid for pair in pairs if pair["confidence"] == "review" for qid in pair["question_ids"]}
    return {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "sources": {
            "questions_file": str(source_path), "questions_sha256": hashlib.sha256(source_bytes).hexdigest(),
            "image_clones_file": str(image_clones_path), "image_clones_sha256": hashlib.sha256(image_bytes).hexdigest(),
        },
        "method": {
            "purpose": "Review database; no source records or images are modified or deleted.",
            "duplicate_groups": "Disjoint groups with equal normalized question, answer multiset, correct answer, and image identity. High confidence, not a deletion instruction.",
            "text_match_groups": "Disjoint groups with equal accent-insensitive question and answer multiset, even across different images. These can contain high-confidence subgroups. Review image differences and correct-answer variants; counts overlap with the other indexes.",
            "candidate_pairs": "Probable duplicates and review candidates with explicit evidence, scores, answer alignment and conflicts. Pairs are not transitively merged.",
            "shared_image_groups": "Evidence only: identical pixels or the same file can illustrate different questions. The no-image placeholder is excluded.",
            "shared_wording_groups": "Evidence only: equal normalized question text, regardless of answers or images. Generic sign questions often share wording.",
            "normalization": [
                "Remove leading numeric question identifiers, including repeated IDs; preserve leading quantities followed by recognized units.",
                "Normalize Unicode, HTML entities, case, whitespace, punctuation and Catalan l·l typography.",
                "Preserve internal numbers, decimals and mathematical signs. Never strip numbers from answer choices.",
                "Retain accents in high-confidence groups; ignore accents when retrieving and scoring candidates.",
                "Compare answer choices independently of their order and align their correct-option indices.",
            ],
            "confidence": {
                "high": "All equality checks pass, including matching image identity (or both images absent).",
                "probable": "Strong text/answer agreement without detected numeric, negation or answer-key conflicts; manual review still appropriate.",
                "review": "Possible variant or duplicate requiring review, including conflicting answer keys, different visual context, or weaker wording agreement.",
            },
            "similarity_scores": "Character-sequence similarity from 0 to 1, not probabilities. Answer scores use the best one-to-one option alignment.",
            "fuzzy_retrieval": {"algorithm": "TF-IDF character trigrams on question and answer text separately", "neighbors_per_distinct_text": 12, "minimum_cosine_similarity": 0.48},
            "limitations": [
                "Heuristic matching is not a semantic or visual understanding model; false positives and missed paraphrases are possible.",
                "Different images are never assumed equivalent. Only exact pixel clone groups from the supplied image index and identical paths establish image identity.",
                "The existing image clone index is trusted; regenerate it separately if images change. This script does not recompute it.",
                "Leading-ID removal and visual-context detection are heuristics. Original text and removed prefixes are preserved for auditing.",
                "Probable/review pair counts overlap in question membership. Do not add them to estimate removable questions.",
            ],
        },
        "summary": {
            "question_count": len(records), "test_count": len(source["tests"]),
            "questions_with_leading_id_removed": sum(r["public"]["removed_leading_id"] is not None for r in records),
            "questions_without_image": sum(r["public"]["image_is_placeholder"] for r in records),
            "source_answer_key_issues": sum(r["key_issue"] for r in records),
            "high_confidence_group_count": len(duplicate_groups),
            "questions_in_high_confidence_groups": len(high_ids),
            "extra_occurrences_in_high_confidence_groups": sum(len(g["question_ids"]) - 1 for g in duplicate_groups),
            "text_match_group_count": len(text_match_groups),
            "questions_in_text_match_groups": sum(g["question_count"] for g in text_match_groups),
            "text_match_groups_by_confidence": dict(Counter(g["confidence"] for g in text_match_groups)),
            "text_match_groups_with_different_correct_answers": sum("different_correct_answers" in g["flags"] for g in text_match_groups),
            "probable_pair_count": counts["probable"], "review_pair_count": counts["review"],
            "questions_in_probable_pairs": len(probable_ids), "questions_in_review_pairs": len(review_ids),
            "questions_with_a_group_or_candidate_pair": len(high_ids | probable_ids | review_ids),
            "questions_without_a_group_or_candidate_pair": len(records) - len(high_ids | probable_ids | review_ids),
            "pairs_with_conflicting_aligned_correct_options": sum("correct_options_disagree_after_answer_alignment" in p["flags"] for p in pairs),
            "shared_image_group_count": len(shared_images), "shared_wording_group_count": len(shared_wording),
            "candidate_pairs_assessed": len(candidates),
        },
        "duplicate_groups": duplicate_groups,
        "text_match_groups": text_match_groups,
        "candidate_pairs": pairs,
        "shared_image_groups": shared_images,
        "shared_wording_groups": shared_wording,
        "questions": questions,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=Path(__file__).resolve().with_name("questions.json"))
    parser.add_argument("--image-clones", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    source = args.input.resolve()
    image_clones = (args.image_clones or source.parent.parent / "images" / "_clones.json").resolve()
    output = (args.output or source.with_name("questions_clones.json")).resolve()
    if output in {source, image_clones, Path(__file__).resolve()}:
        parser.error("Output must not overwrite an input or this script")
    database = build_database(source, image_clones)
    output.write_text(json.dumps(database, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(database["summary"], indent=2))
    print(f"Saved: {output}")


if __name__ == "__main__":
    main()
