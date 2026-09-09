"""Extract a Catalan->French translation worksheet from questions.json.

Builds a dict keyed by question text (duplicates with identical answers are
collapsed; the same question text with a *different* answer set — e.g. sign
questions referring to different images — gets a " #2", " #3", ... suffix so
no variant is lost). Saves the result to translations.json.
"""

import json
from pathlib import Path

BASE = Path(__file__).parent
SOURCE = BASE / "autoescola_data" / "questions.json"
OUTPUT = BASE / "autoescola_data" / "translations.json"

TODO = "TODO SOON"


def build_entry(question, answers):
    return {
        "question_cat": question,
        "question_fr": TODO,
        "answer_1_cat": answers[0],
        "answer_1_fr": TODO,
        "answer_2_cat": answers[1],
        "answer_2_fr": TODO,
        "answer_3_cat": answers[2],
        "answer_3_fr": TODO,
    }


def main():
    with open(SOURCE, encoding="utf-8") as f:
        data = json.load(f)

    translations = {}
    total = 0
    collapsed = 0

    for test in data["tests"]:
        for q in test.get("questions", []):
            total += 1
            question = q["question"]
            answers = q["answers"]
            assert len(answers) == 3, f"Expected 3 answers, got {len(answers)} for {q.get('question_id')}"

            # Find an existing key for this exact question+answers pair,
            # or the next free suffixed key if the answers differ.
            key = question
            n = 1
            while key in translations:
                existing = translations[key]
                if [existing["answer_1_cat"], existing["answer_2_cat"], existing["answer_3_cat"]] == answers:
                    collapsed += 1
                    break
                n += 1
                key = f"{question} #{n}"
            else:
                translations[key] = build_entry(question, answers)

    with open(OUTPUT, "w", encoding="utf-8") as f:
        json.dump(translations, f, ensure_ascii=False, indent=2)

    variants = sum(1 for k in translations if " #" in k)
    print(f"Source question entries : {total}")
    print(f"Unique entries kept     : {len(translations)}")
    print(f"True duplicates collapsed: {collapsed}")
    print(f"Suffixed variants (#N)  : {variants}")
    print(f"Written to {OUTPUT}")


if __name__ == "__main__":
    main()
