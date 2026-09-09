"""Merge fr_chunk_*.json into translations.json.

Default: merges only fully valid chunks and reports what is still outstanding,
so partial progress is never lost. Pass --strict to refuse merging unless all
entries are translated.
"""

import json
import sys
from pathlib import Path

BASE = Path(__file__).parent.parent
WORK = BASE / "work"
TARGET = BASE / "autoescola_data" / "translations.json"

FIELDS = ("q", "a1", "a2", "a3")
strict = "--strict" in sys.argv

with open(WORK / "keys.json", encoding="utf-8") as f:
    keys = json.load(f)
with open(TARGET, encoding="utf-8") as f:
    data = json.load(f)

fr = {}
skipped = []

for n in range(1, 43):
    src_path = WORK / f"chunk_{n:02d}.json"
    out_path = WORK / f"fr_chunk_{n:02d}.json"
    if not out_path.exists():
        skipped.append((n, "not translated yet"))
        continue
    with open(src_path, encoding="utf-8") as f:
        src = json.load(f)
    try:
        with open(out_path, encoding="utf-8") as f:
            chunk = json.load(f)
    except json.JSONDecodeError as e:
        skipped.append((n, f"invalid JSON: {e}"))
        continue

    if set(chunk) != set(src):
        skipped.append((n, f"key mismatch ({len(chunk)} vs {len(src)} entries)"))
        continue
    # A translated field may be empty only where the source field is empty too
    # (the scraped data has a handful of questions with a blank third answer).
    def field_ok(v, src_v, fld):
        t = v.get(fld)
        if not isinstance(t, str) or t.strip() == "TODO SOON":
            return False
        return bool(t.strip()) or not src_v[fld].strip()

    bad = [
        k for k, v in chunk.items()
        if not all(field_ok(v, src[k], fld) for fld in FIELDS)
    ]
    if bad:
        skipped.append((n, f"{len(bad)} entries with empty/TODO fields: {bad[:5]}"))
        continue

    fr.update(chunk)

print(f"Usable chunks : {42 - len(skipped)} / 42")
print(f"Entries ready : {len(fr)} / {len(keys)}")
if skipped:
    print("\nOutstanding chunks:")
    for n, why in skipped:
        print(f"  chunk_{n:02d}: {why}")

if strict and skipped:
    print("\n--strict: refusing to merge while chunks are outstanding.")
    sys.exit(1)

for i, key in enumerate(keys):
    e = fr.get(str(i))
    if not e:
        continue
    data[key]["question_fr"] = e["q"]
    data[key]["answer_1_fr"] = e["a1"]
    data[key]["answer_2_fr"] = e["a2"]
    data[key]["answer_3_fr"] = e["a3"]

with open(TARGET, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

todo = sum(
    1 for v in data.values()
    for fld in ("question_fr", "answer_1_fr", "answer_2_fr", "answer_3_fr")
    if v[fld] == "TODO SOON"
)
print(f"\nWrote {TARGET}")
print(f"Fields still 'TODO SOON': {todo}")
