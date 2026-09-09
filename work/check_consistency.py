"""Quality checks over the translated translations.json.

1. Coverage: any field still 'TODO SOON', or empty where the source was not.
2. Terminology drift: for each glossary term, which French renderings were used
   across the file — different agents translated different chunks, so this
   catches a term rendered one way in one chunk and another way elsewhere.
3. Leftover Catalan: French fields that still look Catalan.
"""

import json
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

BASE = Path(__file__).parent.parent
TARGET = BASE / "autoescola_data" / "translations.json"

# Catalan term -> the French renderings we expect to see (first = preferred)
GLOSSARY = {
    "avançament": ["dépassement"],
    "avançar": ["dépasser"],
    "calçada": ["chaussée"],
    "voral": ["accotement"],
    "vorera": ["trottoir", "bande d'arrêt"],
    "carril": ["voie"],
    "turisme": ["voiture de tourisme"],
    "vianant": ["piéton"],
    "senyal": ["signal"],
    "semàfor": ["feu"],
    "rotonda": ["rond-point"],
    "glorieta": ["rond-point"],
    "ciclomotor": ["cyclomoteur"],
    "motocicleta": ["motocyclette"],
    "remolc": ["remorque"],
    "estacionament": ["stationnement"],
    "autopista": ["autoroute"],
    "autovia": ["voie express"],
    "cinturó de seguretat": ["ceinture de sécurité"],
    "alcoholèmia": ["alcoolémie"],
    "encreuament": ["croisement"],
    "frenada": ["freinage"],
    "graó lateral": ["dénivelé latéral"],
    "canvi de rasant": ["changement de déclivité"],
    "mitjana": ["terre-plein"],
    "botzina": ["klaxon"],
    "intermitent": ["clignotant"],
}

# Tokens that exist in Catalan but NOT in French. Deliberately excludes
# look-alikes that are ordinary French words (les, pot, son, car, ...).
CATALAN_MARKERS = re.compile(
    r"\b(aquest|aquesta|aquests|aquestes|això|amb|però|què|són|està|estan|"
    r"hem|hi ha|s'ha|només|solament|qualsevol|també|vegada|sempre|"
    r"senyal|senyals|calçada|vorera|voral|carril|carrils|avançar|avançament|"
    r"vianant|vianants|semàfor|velocitat|conduir|circulació|obligatòria|"
    r"esquerra|dreta|llums|cotxe|nosaltres)\b",
    re.IGNORECASE,
)
# Catalan orthography that French never uses
CATALAN_CHARS = re.compile(r"[òóíúàï]?[·]|\b\w*[òóíú]\w*\b")

FR_FIELDS = ("question_fr", "answer_1_fr", "answer_2_fr", "answer_3_fr")
CAT_FIELDS = ("question_cat", "answer_1_cat", "answer_2_cat", "answer_3_cat")


def strip_accents(s):
    return "".join(
        c for c in unicodedata.normalize("NFD", s.lower())
        if unicodedata.category(c) != "Mn"
    )


def main():
    with open(TARGET, encoding="utf-8") as f:
        data = json.load(f)

    todo = []
    empty_mismatch = []
    suspicious = []
    renderings = defaultdict(lambda: defaultdict(int))

    for key, v in data.items():
        for cf, ff in zip(CAT_FIELDS, FR_FIELDS):
            cat, fr = v[cf], v[ff]
            if fr == "TODO SOON":
                todo.append((key, ff))
                continue
            if cat.strip() and not fr.strip():
                empty_mismatch.append((key, ff))
                continue
            if not cat.strip():
                continue

            cat_l = strip_accents(cat)
            fr_l = strip_accents(fr)

            # Terminology drift
            for term, expected in GLOSSARY.items():
                if strip_accents(term) in cat_l:
                    hit = next(
                        (e for e in expected if strip_accents(e) in fr_l), None
                    )
                    renderings[term][hit or f"OTHER: {fr[:60]}"] += 1

            # Leftover Catalan heuristic
            m = CATALAN_MARKERS.search(fr) or CATALAN_CHARS.search(fr)
            if m:
                suspicious.append((key[:40], ff, m.group(0), fr[:70]))

    print(f"Entries: {len(data)}")
    print(f"Fields still TODO SOON : {len(todo)}")
    print(f"Empty where source not : {len(empty_mismatch)}")
    if todo[:5]:
        print("  e.g.", todo[:3])
    if empty_mismatch[:5]:
        print("  e.g.", empty_mismatch[:5])

    print("\n--- Terminology drift ---")
    for term, counts in sorted(renderings.items()):
        others = {k[7:]: c for k, c in counts.items() if k.startswith("OTHER: ")}
        expected_hits = {k: c for k, c in counts.items() if not k.startswith("OTHER: ")}
        n_other = sum(others.values())
        if len(expected_hits) > 1 or n_other:
            total = sum(counts.values())
            print(f"\n{term}  ({total} occurrences)")
            for k, c in sorted(expected_hits.items(), key=lambda x: -x[1]):
                print(f"   {c:5d}  {k}")
            if n_other:
                print(f"   {n_other:5d}  none of the expected renderings, e.g.:")
                for ex, c in sorted(others.items(), key=lambda x: -x[1])[:4]:
                    print(f"            [{c}x] {ex}")

    print(f"\n--- Possible leftover Catalan: {len(suspicious)} fields ---")
    for s in suspicious[:15]:
        print("  ", s)


if __name__ == "__main__":
    main()
