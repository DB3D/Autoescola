"""Split translations.json entries into compact numbered chunks for translation."""

import json
from pathlib import Path

BASE = Path(__file__).parent.parent
SOURCE = BASE / "autoescola_data" / "translations.json"
WORK = BASE / "work"

CHUNK_SIZE = 100

with open(SOURCE, encoding="utf-8") as f:
    data = json.load(f)

keys = list(data.keys())
with open(WORK / "keys.json", "w", encoding="utf-8") as f:
    json.dump(keys, f, ensure_ascii=False, indent=0)

n_chunks = 0
for start in range(0, len(keys), CHUNK_SIZE):
    chunk = {}
    for i in range(start, min(start + CHUNK_SIZE, len(keys))):
        e = data[keys[i]]
        chunk[str(i)] = {
            "q": e["question_cat"],
            "a1": e["answer_1_cat"],
            "a2": e["answer_2_cat"],
            "a3": e["answer_3_cat"],
        }
    n_chunks += 1
    with open(WORK / f"chunk_{n_chunks:02d}.json", "w", encoding="utf-8") as f:
        json.dump(chunk, f, ensure_ascii=False, indent=1)

print(f"{len(keys)} entries -> {n_chunks} chunks of {CHUNK_SIZE}")
