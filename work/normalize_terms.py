"""Normalize terminology that different translator agents rendered differently.

Each rule fires only when the CATALAN field contains `cat_term` (so we never
touch an unrelated French sentence) and the FRENCH field contains one of the
`variants`. Run with --apply to write; default is a dry run.
"""

import json
import re
import sys
import unicodedata
from pathlib import Path


def fold(s):
    """Lowercase and strip accents — the scraped Catalan has accent typos
    (e.g. 'graò' for 'graó'), so triggers must match accent-insensitively."""
    return "".join(
        c for c in unicodedata.normalize("NFD", s.lower())
        if unicodedata.category(c) != "Mn"
    )

BASE = Path(__file__).parent.parent
TARGET = BASE / "autoescola_data" / "translations.json"

FR_FIELDS = ("question_fr", "answer_1_fr", "answer_2_fr", "answer_3_fr")
CAT_FIELDS = ("question_cat", "answer_1_cat", "answer_2_cat", "answer_3_cat")

# (catalan trigger, [ (variant regex, replacement) ... ], note)
#
# Patterns are applied in order, longest first, and must carry any preceding
# article: the replacements change both the initial sound (so elision with
# l'/d' has to be undone) and sometimes the gender, e.g. masculine
# "accotement" -> feminine "bande d'arrêt".
RULES = [
    (
        "rasant",
        [(r"Changements de (?:rasant|pente)s?", "Changements de déclivité"),
         (r"changements de (?:rasant|pente)s?", "changements de déclivité"),
         (r"Changement de (?:rasant|pente)", "Changement de déclivité"),
         (r"changement de (?:rasant|pente)", "changement de déclivité"),
         (r"\bles rasants\b", "les déclivités"),
         (r"\bdes rasants\b", "des déclivités")],
        "canvi de rasant -> changement de déclivité",
    ),
    (
        "graó lateral",
        [(r"\bd'une marche latérale\b", "d'un dénivelé latéral"),
         (r"\bUne marche latérale\b", "Un dénivelé latéral"),
         (r"\bune marche latérale\b", "un dénivelé latéral"),
         (r"\bLa marche latérale\b", "Le dénivelé latéral"),
         (r"\bla marche latérale\b", "le dénivelé latéral"),
         (r"\bmarches latérales\b", "dénivelés latéraux"),
         (r"\bMarche latérale\b", "Dénivelé latéral"),
         (r"\bmarche latérale\b", "dénivelé latéral")],
        "graó lateral -> dénivelé latéral",
    ),
    (
        "vorera d'emergència",
        [(r"\bd'(?:un )?(?:accotement|trottoir) d'urgence\b",
          "de bande d'arrêt d'urgence"),
         (r"\bdu (?:accotement|trottoir) d'urgence\b",
          "de la bande d'arrêt d'urgence"),
         (r"\bl'accotement d'urgence\b", "la bande d'arrêt d'urgence"),
         (r"\ble trottoir d'urgence\b", "la bande d'arrêt d'urgence"),
         (r"\bun (?:accotement|trottoir) d'urgence\b",
          "une bande d'arrêt d'urgence"),
         (r"\bau (?:accotement|trottoir) d'urgence\b",
          "à la bande d'arrêt d'urgence"),
         (r"\b(?:accotement|trottoir) d'urgence\b", "bande d'arrêt d'urgence")],
        "vorera d'emergència (hard shoulder) -> bande d'arrêt d'urgence",
    ),
    (
        # Right of way. French "préférence" does not carry this sense; the
        # road-code term is "priorité". Catalan uses preferència/prioritat as
        # synonyms and "prioritat" already maps to "priorité" everywhere.
        "prefer",
        [(r"PRÉFÉRENCE", "PRIORITÉ"),
         (r"Préférence", "Priorité"),
         (r"préférence", "priorité")],
        "preferència (right of way) -> priorité",
    ),
    (
        # Must run AFTER the rule above. Where the Catalan glosses one synonym
        # with the other — "preferència de pas (prioritat de pas)" — mapping
        # both onto "priorité" yields a verbatim self-repetition, so keep the
        # pair distinct in this construction only.
        "prefer",
        [(r"la priorité de passage \(priorité de passage\)",
          "la préférence de passage (priorité de passage)")],
        "preferència (prioritat) gloss -> keep the two words distinct",
    ),
    (
        # A traffic tailback. French "retenue" IS the standard traffic term
        # (and the cognate); "rétention" is medical/physical and wrong here.
        "retenc",
        [(r"un embouteillage important", "une retenue importante"),
         (r"\bembouteillages\b", "retenues"),
         (r"\bembouteillage\b", "retenue"),
         (r"Rétentions", "Retenues"),
         (r"rétentions", "retenues"),
         (r"Rétention", "Retenue"),
         (r"rétention", "retenue")],
        "retenció (tailback) -> retenue",
    ),
    (
        # trepitjar a LINE = straddle it (chevaucher). "écraser" (crush) is
        # wrong for a painted line. Patterns are scoped so the beacon-sign
        # entries, where "les écraser" is correct, are left alone.
        "trepitj",
        [(r"la franchir ou l'écraser", "la franchir ou la chevaucher"),
         (r"l'écraser mais bien la franchir", "la chevaucher mais bien la franchir"),
         (r"l'écraser mais oui la franchir", "la chevaucher mais oui la franchir"),
         (r"Sans écraser les lignes", "Sans chevaucher les lignes")],
        "trepitjar (a line) -> chevaucher, not écraser",
    ),
    (
        "botzina",
        [(r"\bd'avertisseur sonore\b", "de klaxon"),
         (r"\bl'avertisseur sonore\b", "le klaxon"),
         (r"\bun avertisseur sonore\b", "un klaxon"),
         (r"\bavertisseur sonore\b", "klaxon")],
        "botzina -> klaxon",
    ),
]


def main():
    apply = "--apply" in sys.argv
    with open(TARGET, encoding="utf-8") as f:
        data = json.load(f)

    changes = []
    for key, v in data.items():
        for cf, ff in zip(CAT_FIELDS, FR_FIELDS):
            cat, fr = v[cf], v[ff]
            if fr == "TODO SOON" or not fr.strip():
                continue
            for cat_term, subs, note in RULES:
                if fold(cat_term) not in fold(cat):
                    continue
                new = fr
                for pat, rep in subs:
                    new = re.sub(pat, rep, new)
                if new != fr:
                    changes.append((key[:35], ff, note, fr, new))
                    fr = new
            v[ff] = fr

    print(f"{len(changes)} field(s) would change\n")
    for key, ff, note, old, new in changes:
        print(f"[{note}]  {key} / {ff}")
        print(f"   -  {old}")
        print(f"   +  {new}")

    if apply:
        with open(TARGET, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        print(f"\nApplied to {TARGET}")
    else:
        print("\n(dry run — pass --apply to write)")


if __name__ == "__main__":
    main()
