"""Apply reviewer-reported translation fixes by entry id.

Each fix is (entry_id, field, old_substring, new_substring). The substring must
occur EXACTLY ONCE in the current French text, otherwise the fix is refused —
so a stale or mistaken report can never silently corrupt a different string.
Dry run by default; pass --apply to write.
"""

import json
import sys
from pathlib import Path

BASE = Path(__file__).parent.parent
TARGET = BASE / "autoescola_data" / "translations.json"

FIELD_MAP = {"Q": "question_fr", "A1": "answer_1_fr",
             "A2": "answer_2_fr", "A3": "answer_3_fr"}

FIXES = [
    # 'sobrepassar el límit EN 30 km/h' = exceed the limit BY 30, not 'the 30 limit'
    (907, "A3", "la limite de 30km/h", "la limite de plus de 30km/h"),

    # trepitjar = straddle (chevaucher); ultrapassar = cross (franchir).
    # 'franchir' had been used for trepitjar, making A3 self-contradictory.
    (2322, "A1", "la franchir ou l'outrepasser", "la chevaucher ni la franchir"),
    (2322, "A2", "l'outrepasser", "la franchir"),
    (2322, "A3", "la franchir mais oui l'outrepasser", "la chevaucher mais oui la franchir"),

    # 'laisser que + subjonctif' is not French
    (2475, "A3", "laisser qu'il sorte", "le laisser sortir"),
    (645, "A3", "laisser qu'il sorte", "le laisser sortir"),

    # 'Égale que si' is ungrammatical
    (3767, "A1", "Égale que si", "La même que si"),

    # 'quand' never takes the subjunctive in French
    (3672, "Q", "au lieu qui soit désigné", "au lieu qui est désigné"),
    (3672, "Q", "quand le véhicule soit stationn", "quand le véhicule est stationn"),
    # 'Cert' is the true/false marker: Vrai, not Certain (= sure)
    (3672, "A1", "Certain", "Vrai"),
    (3672, "A2", "Certain,", "Vrai,"),
    (3672, "A3", "Certain,", "Vrai,"),

    # 'alcoolmètre' is not a French word
    (410, "A2", "l'alcoolmètre", "l'alcoomètre"),

    # 'procurer que' takes no completive clause in French
    (287, "A1", "Procurer que", "Veiller à ce que"),

    # causal 'per' -> 'pour' reads as purpose, not cause
    (2862, "A2", "insuffisante pour des circonstances",
     "insuffisante en raison de circonstances"),

    # familiars = relatives; French 'familiers' = intimates/regulars
    (1804, "A3", "les familiers les plus proches", "les parents les plus proches"),

    # deixar-ho (neuter) = give it up, not abandon HIM
    (3718, "A2", "il vaut mieux l’abandonner", "il vaut mieux y renoncer"),

    # pretendre (ca) = intend; French 'prétendre' = to claim
    (2321, "A1", "prétendent y accéder", "ont l'intention d'y accéder"),
    (2321, "A2", "prétendent y accéder", "ont l'intention d'y accéder"),

    # voravia = vorera = sidewalk (trottoir), not the hard shoulder
    (2494, "A2", "libre l'accotement", "libre le trottoir"),
    (2494, "A3", "libre l'accotement", "libre le trottoir"),

    # pull over TO the right side
    (1666, "A1", "Vous ranger toujours du côté droit",
     "Vous ranger toujours sur le côté droit"),

    # 'ha de' is the vostè form addressed to the candidate; 'il' wrongly
    # points at the lorry
    (3878, "Q", "que doit-il tenir en compte", "que devez-vous tenir en compte"),
]


def main():
    apply = "--apply" in sys.argv
    with open(TARGET, encoding="utf-8") as f:
        data = json.load(f)
    keys = list(data.keys())

    ok, refused = [], []
    for eid, field, old, new in FIXES:
        if not (0 <= eid < len(keys)):
            refused.append((eid, field, "entry id out of range"))
            continue
        v = data[keys[eid]]
        fld = FIELD_MAP[field]
        cur = v[fld]
        n = cur.count(old)
        if n != 1:
            refused.append((eid, field, f"substring occurs {n} times: {old!r}"))
            continue
        v[fld] = cur.replace(old, new)
        ok.append((eid, field, cur, v[fld]))

    for eid, field, before, after in ok:
        print(f"ENTRY {eid} / {field}")
        print(f"   -  {before}")
        print(f"   +  {after}")
    if refused:
        print("\nREFUSED:")
        for eid, field, why in refused:
            print(f"   ENTRY {eid} / {field}: {why}")

    print(f"\n{len(ok)} fix(es) ready, {len(refused)} refused")
    if apply and ok:
        with open(TARGET, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"Applied to {TARGET}")
    elif not apply:
        print("(dry run — pass --apply to write)")


if __name__ == "__main__":
    main()
