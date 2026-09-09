#!/usr/bin/env python3
"""Download the authenticated Autoescola Olimpica test bank for offline study.

Credentials are requested interactively (or read from AUTOESCOLA_EMAIL and
AUTOESCOLA_PASSWORD) and are never written to the output dataset.
"""

from __future__ import annotations

import argparse
import base64
import csv
import getpass
import hashlib
import html
import json
import os
import re
import sys
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
from html.parser import HTMLParser
from http.cookiejar import CookieJar
from pathlib import Path
from typing import Any, Iterable
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode, urljoin, urlparse
from urllib.request import HTTPCookieProcessor, Request, build_opener, urlopen


LOGIN_URL = "https://www.autoescolaolimpica.com/pagines/questionari.php"
AJAX_URL = (
    "https://www.autoescolaolimpica.com/pagines/questionari/"
    "questionari_ajax.php"
)
IMAGE_ROOT = "https://www.autoescolaolimpica.com/img/imatges_questionari/"
USER_AGENT = "AutoescolaOfflineStudy/1.0 (authorized student export)"

# These records have complete questions/choices but an empty answer key in the
# source JSON. They were resolved from the unambiguous rule wording or sign
# image and remain explicitly labelled as manual overrides in every export.
ANSWER_KEY_OVERRIDES: dict[str, tuple[int, str]] = {
    "8464": (3, "rule wording: speed competitions on public roads are never permitted"),
    "8501": (1, "sign image: no right turn"),
    "8558": (1, "rule wording: exercise extra caution at the children warning sign"),
    "8550": (2, "sign image: no left or right turn"),
    "8548": (1, "sign image: maximum height"),
    "8539": (2, "definition: carriageway"),
    "8597": (3, "sign image: level crossing with barriers"),
    "8585": (2, "rule wording: abandon an unsafe overtaking manoeuvre"),
    "8631": (1, "rule wording: reduce speed where mud or gravel may be thrown"),
    "8653": (3, "rule wording: higher speed makes a crash more severe"),
    "8648": (1, "rule wording: rear overhang marking and red light at night"),
}


class _TextExtractor(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.parts: list[str] = []

    def handle_data(self, data: str) -> None:
        self.parts.append(data)


def repair_mojibake(value: str) -> str:
    """Repair the site's UTF-8 text that was mistakenly decoded as CP-1252."""
    markers = ("Ã", "Â", "â", "�")

    def score(text: str) -> int:
        return sum(text.count(marker) for marker in markers)

    repaired = value
    for _ in range(2):
        if score(repaired) == 0:
            break
        try:
            candidate = repaired.encode("cp1252").decode("utf-8")
        except (UnicodeEncodeError, UnicodeDecodeError):
            break
        if score(candidate) >= score(repaired):
            break
        repaired = candidate
    return repaired


def clean_text(value: Any) -> str:
    """Turn the small HTML fragments returned by the site into plain text."""
    if value is None:
        return ""
    parser = _TextExtractor()
    parser.feed(str(value))
    parser.close()
    extracted = html.unescape("".join(parser.parts))
    return " ".join(repair_mojibake(extracted).split())


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


@dataclass
class AutoescolaClient:
    timeout: float = 30.0

    def __post_init__(self) -> None:
        self.cookies = CookieJar()
        self.opener = build_opener(HTTPCookieProcessor(self.cookies))

    def _request(
        self,
        url: str,
        *,
        form: dict[str, Any] | None = None,
        accept: str = "text/html,application/xhtml+xml",
        attempts: int = 3,
    ) -> bytes:
        payload = None
        headers = {"User-Agent": USER_AGENT, "Accept": accept}
        if form is not None:
            payload = urlencode(form).encode("utf-8")
            headers["Content-Type"] = "application/x-www-form-urlencoded"
            headers["X-Requested-With"] = "XMLHttpRequest"

        last_error: Exception | None = None
        for attempt in range(1, attempts + 1):
            request = Request(url, data=payload, headers=headers)
            try:
                with self.opener.open(request, timeout=self.timeout) as response:
                    return response.read()
            except (HTTPError, URLError, TimeoutError) as error:
                last_error = error
                if attempt < attempts:
                    time.sleep(0.8 * attempt)
        raise RuntimeError(f"Request failed after {attempts} attempts: {url}") from last_error

    def login(self, email: str, password: str) -> list[int]:
        body = self._request(
            LOGIN_URL,
            form={
                "mail_questionari": email,
                "password_questionari": password,
                "submit": "Accedir al Qüestionari",
            },
        ).decode("utf-8", errors="replace")

        group_ids = list(
            dict.fromkeys(
                int(value)
                for value in re.findall(r"data-id_grup\s*=\s*['\"](\d+)", body)
            )
        )
        if not group_ids:
            error_match = re.search(
                r"(?:ERROR|Error).*?(?:</small>|</div>)", body, re.I | re.S
            )
            detail = clean_text(error_match.group(0)) if error_match else ""
            suffix = f" Site response: {detail}" if detail else ""
            raise RuntimeError(
                "Login did not expose any test IDs. Check the credentials or account access."
                + suffix
            )
        return group_ids

    def start_test(self, group_id: int) -> dict[str, Any]:
        raw = self._request(
            AJAX_URL,
            form={"id_grup": group_id, "type": "bt_start"},
            accept="application/json,text/javascript,*/*;q=0.1",
        )
        try:
            result = json.loads(raw.decode("utf-8-sig"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            preview = raw[:300].decode("utf-8", errors="replace")
            raise RuntimeError(
                f"Test {group_id} returned invalid JSON: {preview!r}"
            ) from error
        if not isinstance(result, dict):
            raise RuntimeError(f"Test {group_id} returned an unexpected JSON value")
        return result


def decode_correct_option(value: Any) -> int:
    """Decode the answer number, which this site usually sends as Base64."""
    raw = str(value or "").strip()
    if raw.isdigit():
        return int(raw)
    try:
        decoded = base64.b64decode(raw, validate=True).decode("ascii").strip()
    except (ValueError, UnicodeDecodeError) as error:
        raise ValueError(f"invalid encoded answer {value!r}") from error
    if not decoded.isdigit():
        raise ValueError(f"decoded answer is not numeric: {decoded!r}")
    return int(decoded)


def normalize_test(
    test_number: int, group_id: int, payload: dict[str, Any]
) -> dict[str, Any]:
    try:
        count = int(payload["count_max"])
    except (KeyError, TypeError, ValueError) as error:
        raise RuntimeError(f"Test {group_id} has no valid count_max") from error

    questions: list[dict[str, Any]] = []
    skipped_blank_records = 0
    for source_position in range(1, count + 1):
        raw = payload.get(str(source_position), payload.get(source_position))
        if not isinstance(raw, dict):
            raise RuntimeError(
                f"Test {test_number} (group {group_id}), "
                f"question {source_position} is missing"
            )

        answers = [clean_text(raw.get(f"quest_{index}")) for index in range(1, 4)]
        question_text = clean_text(raw.get("quest_pregunta"))
        encoded_answer = str(raw.get("r") or "").strip()
        if not question_text and not any(answers) and not encoded_answer:
            skipped_blank_records += 1
            continue
        try:
            correct_option = decode_correct_option(encoded_answer)
        except (TypeError, ValueError) as error:
            if encoded_answer:
                raise RuntimeError(
                    f"Test {test_number} (group {group_id}), question {source_position} "
                    f"has invalid correct answer {encoded_answer!r}"
                ) from error
            correct_option = None
        if correct_option == 0 and not question_text and not any(answers):
            skipped_blank_records += 1
            continue
        if correct_option is not None and correct_option not in (1, 2, 3):
            raise RuntimeError(
                f"Test {test_number} (group {group_id}), question {source_position} "
                f"has out-of-range correct answer {correct_option}"
            )

        question_id = str(raw.get("id_quest") or "").strip()
        answer_key_status = "present"
        answer_key_note = ""
        if correct_option is None and question_id in ANSWER_KEY_OVERRIDES:
            correct_option, answer_key_note = ANSWER_KEY_OVERRIDES[question_id]
            answer_key_status = "manual_override"
        elif correct_option is None:
            answer_key_status = "missing_at_source"

        image_name = str(raw.get("quest_imatge") or "").strip()
        image_url = urljoin(IMAGE_ROOT, quote(image_name, safe="/")) if image_name else ""
        questions.append(
            {
                "position": len(questions) + 1,
                "source_position": source_position,
                "question_id": question_id,
                "question": question_text,
                "answers": answers,
                "correct_option": correct_option,
                "correct_answer": (
                    answers[correct_option - 1] if correct_option is not None else ""
                ),
                "answer_key_status": answer_key_status,
                "answer_key_note": answer_key_note,
                "image_original": image_name,
                "image_url": image_url,
                "image_local": "",
            }
        )

    return {
        "test_number": test_number,
        "group_id": int(payload.get("id_grup", group_id)),
        "question_count": len(questions),
        "source_record_count": count,
        "skipped_blank_records": skipped_blank_records,
        "questions": questions,
    }


def image_filename(url: str) -> str:
    parsed = urlparse(url)
    basename = Path(parsed.path).name or "image"
    safe_name = re.sub(r"[^A-Za-z0-9._-]+", "_", basename)
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:12]
    return f"{digest}_{safe_name}"


def _download_image(item: tuple[str, Path], timeout: float) -> tuple[str, Path, int]:
    url, target = item
    if target.exists() and target.stat().st_size > 0:
        return url, target, target.stat().st_size
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "image/*"})
    last_error: Exception | None = None
    for attempt in range(1, 4):
        try:
            with urlopen(request, timeout=timeout) as response:
                content = response.read()
            if not content:
                raise RuntimeError("empty response")
            target.write_bytes(content)
            return url, target, len(content)
        except (HTTPError, URLError, TimeoutError, OSError) as error:
            last_error = error
            if attempt < 3:
                time.sleep(0.6 * attempt)
    raise RuntimeError(f"Could not download image {url}") from last_error


def download_images(
    tests: list[dict[str, Any]], output_dir: Path, timeout: float, workers: int
) -> tuple[int, list[str]]:
    images_dir = output_dir / "images"
    images_dir.mkdir(parents=True, exist_ok=True)

    by_url: dict[str, Path] = {}
    for test in tests:
        for question in test["questions"]:
            url = question["image_url"]
            if url:
                by_url[url] = images_dir / image_filename(url)

    errors: list[str] = []
    with ThreadPoolExecutor(max_workers=max(1, workers)) as executor:
        future_map = {
            executor.submit(_download_image, item, timeout): item[0]
            for item in by_url.items()
        }
        completed = 0
        for future in as_completed(future_map):
            url = future_map[future]
            try:
                future.result()
            except Exception as error:  # Continue so the text export remains usable.
                errors.append(f"{url}: {error}")
            completed += 1
            if completed % 100 == 0 or completed == len(future_map):
                print(f"  Images: {completed}/{len(future_map)}", flush=True)

    for test in tests:
        for question in test["questions"]:
            target = by_url.get(question["image_url"])
            if target and target.exists():
                question["image_local"] = target.relative_to(output_dir).as_posix()
    return len(by_url) - len(errors), errors


def iter_question_rows(tests: Iterable[dict[str, Any]]) -> Iterable[dict[str, Any]]:
    for test in tests:
        for question in test["questions"]:
            yield {
                "test_number": test["test_number"],
                "position": question["position"],
                "source_position": question["source_position"],
                "question_id": question["question_id"],
                "question": question["question"],
                "answer_1": question["answers"][0],
                "answer_2": question["answers"][1],
                "answer_3": question["answers"][2],
                "correct_option": question["correct_option"],
                "correct_answer": question["correct_answer"],
                "answer_key_status": question["answer_key_status"],
                "answer_key_note": question["answer_key_note"],
                "image_local": question["image_local"],
                "image_url": question["image_url"],
            }


def write_outputs(output_dir: Path, dataset: dict[str, Any]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "questions.json"
    csv_path = output_dir / "questions.csv"
    manifest_path = output_dir / "manifest.json"

    json_path.write_text(
        json.dumps(dataset, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )

    fieldnames = [
        "test_number",
        "position",
        "source_position",
        "question_id",
        "question",
        "answer_1",
        "answer_2",
        "answer_3",
        "correct_option",
        "correct_answer",
        "answer_key_status",
        "answer_key_note",
        "image_local",
        "image_url",
    ]
    with csv_path.open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(iter_question_rows(dataset["tests"]))

    manifest = {
        "source": dataset["source"],
        "extracted_at": dataset["extracted_at"],
        "test_count": dataset["stats"]["test_count"],
        "question_count": dataset["stats"]["question_count"],
        "unique_question_ids": dataset["stats"]["unique_question_ids"],
        "downloaded_images": dataset["stats"]["downloaded_images"],
        "image_errors": dataset["stats"]["image_errors"],
        "missing_answer_keys": dataset["stats"]["missing_answer_keys"],
        "manual_answer_key_overrides": dataset["stats"][
            "manual_answer_key_overrides"
        ],
        "files": ["questions.json", "questions.csv", "images/"],
    }
    manifest_path.write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output", type=Path, default=Path("autoescola_data"), help="output directory"
    )
    parser.add_argument(
        "--probe",
        action="store_true",
        help="log in and validate one test without writing the full export",
    )
    parser.add_argument(
        "--probe-test",
        type=int,
        default=1,
        help="visible test number to validate with --probe (default: 1)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.20,
        help="seconds to pause between test requests (default: 0.20)",
    )
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--image-workers", type=int, default=4)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    email = os.environ.get("AUTOESCOLA_EMAIL") or input("Autoescola email: ").strip()
    password = os.environ.get("AUTOESCOLA_PASSWORD") or getpass.getpass(
        "Autoescola password: "
    )

    client = AutoescolaClient(timeout=args.timeout)
    print("Logging in...", flush=True)
    group_ids = client.login(email, password)
    print(
        f"Login successful. Found {len(group_ids)} test entries.",
        flush=True,
    )

    if args.probe:
        if not 1 <= args.probe_test <= len(group_ids):
            raise RuntimeError(
                f"--probe-test must be between 1 and {len(group_ids)}"
            )
        probe_test_number = args.probe_test
        probe_group_id = group_ids[probe_test_number - 1]
        payload = client.start_test(probe_group_id)
        probe_count = int(payload["count_max"])
        decoded_answers: list[int | None] = []
        unusual_answers: list[dict[str, Any]] = []
        for position in range(1, probe_count + 1):
            raw_question = payload.get(str(position), payload.get(position))
            try:
                decoded = decode_correct_option(raw_question.get("r"))
            except ValueError:
                decoded = None
            decoded_answers.append(decoded)
            if decoded not in (1, 2, 3):
                unusual_answers.append(
                    {
                        "position": position,
                        "question_id": raw_question.get("id_quest"),
                        "encoded_answer": raw_question.get("r"),
                        "decoded_answer": decoded,
                        "has_question": bool(
                            clean_text(raw_question.get("quest_pregunta"))
                        ),
                        "nonempty_choices": sum(
                            bool(clean_text(raw_question.get(f"quest_{choice}")))
                            for choice in range(1, 4)
                        ),
                        "has_image_name": bool(raw_question.get("quest_imatge")),
                    }
                )
        nonblank_unusual = [
            item
            for item in unusual_answers
            if (item["has_question"] or item["nonempty_choices"] != 0)
            and str(item["question_id"]) not in ANSWER_KEY_OVERRIDES
        ]
        blank_placeholders = [
            item
            for item in unusual_answers
            if not item["has_question"] and item["nonempty_choices"] == 0
        ]
        source_key_overrides = [
            item
            for item in unusual_answers
            if str(item["question_id"]) in ANSWER_KEY_OVERRIDES
        ]
        if nonblank_unusual:
            print(
                json.dumps(
                    {
                        "test_number": probe_test_number,
                        "group_id": probe_group_id,
                        "question_count": probe_count,
                        "correct_option_counts": dict(Counter(decoded_answers)),
                        "unusual_answers": nonblank_unusual,
                    },
                    ensure_ascii=False,
                    indent=2,
                )
            )
            return 2
        test = normalize_test(probe_test_number, probe_group_id, payload)
        sample = test["questions"][0]
        print(
            json.dumps(
                {
                    "test_number": test["test_number"],
                    "question_count": test["question_count"],
                    "sample_fields": list(sample),
                    "sample_correct_option": sample["correct_option"],
                    "sample_has_image": bool(sample["image_url"]),
                    "correct_option_counts": dict(Counter(decoded_answers)),
                    "blank_placeholder_records": len(blank_placeholders),
                    "manual_answer_key_overrides": len(source_key_overrides),
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0

    tests: list[dict[str, Any]] = []
    for index, group_id in enumerate(group_ids, start=1):
        payload = client.start_test(group_id)
        test = normalize_test(index, group_id, payload)
        tests.append(test)
        print(
            f"  Tests: {index}/{len(group_ids)} "
            f"(visible test {index}, group {group_id}, "
            f"{test['question_count']} questions)",
            flush=True,
        )
        if args.delay > 0 and index < len(group_ids):
            time.sleep(args.delay)

    print("Downloading unique images...", flush=True)
    downloaded_images, image_errors = download_images(
        tests, args.output, args.timeout, args.image_workers
    )

    question_count = sum(test["question_count"] for test in tests)
    unique_question_ids = {
        str(question["question_id"])
        for test in tests
        for question in test["questions"]
        if question["question_id"] is not None
    }
    missing_answer_keys = [
        {
            "test_number": test["test_number"],
            "group_id": test["group_id"],
            "question_id": question["question_id"],
        }
        for test in tests
        for question in test["questions"]
        if question["correct_option"] is None
    ]
    manual_answer_key_overrides = [
        {
            "test_number": test["test_number"],
            "group_id": test["group_id"],
            "question_id": question["question_id"],
            "correct_option": question["correct_option"],
            "note": question["answer_key_note"],
        }
        for test in tests
        for question in test["questions"]
        if question["answer_key_status"] == "manual_override"
    ]
    dataset = {
        "source": LOGIN_URL,
        "extracted_at": utc_now(),
        "tests": tests,
        "stats": {
            "test_count": len(tests),
            "question_count": question_count,
            "unique_question_ids": len(unique_question_ids),
            "downloaded_images": downloaded_images,
            "image_errors": image_errors,
            "missing_answer_keys": missing_answer_keys,
            "manual_answer_key_overrides": manual_answer_key_overrides,
        },
    }
    write_outputs(args.output, dataset)
    print(
        f"Done: {len(tests)} tests, {question_count} question occurrences, "
        f"{downloaded_images} images.",
        flush=True,
    )
    print(f"Output: {args.output.resolve()}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except KeyboardInterrupt:
        print("\nCancelled.", file=sys.stderr)
        raise SystemExit(130)
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
