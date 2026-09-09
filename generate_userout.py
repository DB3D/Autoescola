#!/usr/bin/env python3
"""Generate an empty per-question user progress file."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
QUESTIONS_PATH = ROOT / "autoescola_data" / "questions.json"
OUTPUT_PATH = ROOT / "userout.json"


def empty_progress(question_id: str) -> dict[str, object]:
    return {
        "question_id": question_id,
        "total_trials": 0,
        "total_failed": 0,
        "total_success": 0,
        "total_time_seconds": 0,
        "catala_trials": 0,
        "catala_failed": 0,
        "catala_success": 0,
        "catala_time_seconds": 0,
        "fr_trials": 0,
        "fr_failed": 0,
        "fr_success": 0,
        "fr_time_seconds": 0,
        "last_tried_at": None,
        "last_tried_at_catala": None,
        "last_tried_at_fr": None,
        "user_note": "",
        "tip_note": "",
        "difficulty_rating": "N/A",
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--force",
        action="store_true",
        help="overwrite an existing userout.json (this erases saved progress)",
    )
    args = parser.parse_args()

    if OUTPUT_PATH.exists() and not args.force:
        raise SystemExit(
            f"Refusing to overwrite existing progress file: {OUTPUT_PATH}. "
            "Use --force only when an intentional reset is required."
        )

    source = json.loads(QUESTIONS_PATH.read_text(encoding="utf-8"))

    question_ids: list[str] = []
    for test in source["tests"]:
        question_ids.extend(str(question["question_id"]) for question in test["questions"])

    if len(question_ids) != len(set(question_ids)):
        raise ValueError("The source contains duplicate question IDs")

    output = {
        "schema_version": 1,
        "question_count": len(question_ids),
        "timestamp_format": "ISO 8601 with seconds and timezone",
        "questions": {
            question_id: empty_progress(question_id) for question_id in question_ids
        },
    }

    OUTPUT_PATH.write_text(
        json.dumps(output, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
