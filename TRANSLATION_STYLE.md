# Catalan → French translation style guide (driving-theory test questions)

## Task
Each source file `chunk_NN.json` is a JSON object mapping an index string to
`{"q": question, "a1": ..., "a2": ..., "a3": ...}` — a question and its three
answer options, in Catalan. Translate all 4 fields of every entry into French
and write `fr_chunk_NN.json` with EXACTLY the same index keys and the same four
field names, values in French only (no Catalan left in the output).

## Style rules — this is the user's explicit, central requirement

1. **Accuracy of meaning is the absolute priority.** These are driving-code
   questions with legal precision. Never flip, weaken or approximate a meaning.
   Watch negations and qualifiers especially: `no`, `excepte`, `només`,
   `sempre que`, `mai`, `sempre`.

2. **Prefer the cognate.** Among translations that are equally accurate, ALWAYS
   choose the French word that looks/sounds closest to the Catalan one, even
   when a more idiomatic French synonym exists. The user is using this file to
   learn Catalan by seeing the family resemblance, so lexical closeness beats
   elegance.
   - senyal → signal (NOT panneau)
   - indicadors de direcció → indicateurs de direction (NOT clignotants)
   - calçada → chaussée · circulació → circulation · maniobra → manœuvre
   - intersecció → intersection · obligatòria → obligatoire · prohibit → interdit
   - **But never a false friend.** avançament → dépassement (NOT "avancement");
     velocitat → vitesse (NOT "vélocité"); if the cognate would be wrong or
     unintelligible, accuracy wins and you use the correct French term.

3. **Preserve Catalan word order and sentence structure** whenever the result is
   still grammatical French. A slightly awkward but structurally parallel French
   sentence is explicitly preferred over an elegant rephrasing. Word-for-word
   when possible.

4. **Mirror the formatting exactly**, including the source's quirks:
   - leading question numbers: `3191 Un turisme...` → `3191 Une voiture de tourisme...`
   - trailing `...`, final periods, capitalization pattern of the source
   - the source's own punctuation spacing (it often has no space before `?`,
     or a missing space after a comma) — mirror it rather than "fixing" it
   - placeholders like `xxx` / `xxxx` stay verbatim
   - answer fragments that complete the question stay fragments:
     `cada any.` → `chaque année.`

5. **Questions referring to `aquest senyal`** point at an image you cannot see.
   Translate literally; the answers describe the sign and translate fine.

6. **Garbled or truncated source text**: translate as literally as possible.
   Only repair the source when a strict rendering would be unintelligible, and
   note it in your final report.

## Glossary — apply consistently

avançament/avançar → dépassement/dépasser · calçada → chaussée ·
voral → accotement · vorera → trottoir · carril → voie ·
turisme → voiture de tourisme · vianant → piéton ·
pas de vianants → passage pour piétons · senyal → signal ·
semàfor → feu de signalisation (short form: le feu) · rotonda/glorieta → rond-point ·
intersecció giratòria → intersection giratoire · cediu el pas → cédez le passage ·
prioritat de pas → priorité de passage · llums d'encreuament → feux de croisement ·
llums de carretera → feux de route · llums de posició → feux de position ·
ciclomotor → cyclomoteur · motocicleta → motocyclette · remolc → remorque ·
estacionar/estacionament → stationner/stationnement · parada → arrêt ·
autopista → autoroute · autovia → voie express ·
inspecció tècnica periòdica → inspection technique périodique ·
permís de conduir → permis de conduire · cinturó de seguretat → ceinture de sécurité ·
alcoholèmia → alcoolémie · encreuament → croisement ·
canvi de sentit → changement de sens · frenada → freinage ·
distància de seguretat → distance de sécurité · via interurbana → voie interurbaine ·
nucli urbà/poblat → agglomération · conductor → conducteur · vehicle → véhicule ·
graó lateral → dénivelé latéral · fletxa de retorn → flèche de rabattement

## Output rules

- Valid JSON, UTF-8, accented characters written directly (é, è, œ, à...).
- Every index key from the source, none added, none missing.
- Every one of the 4 fields must be a French string, never null and never
  `TODO SOON`. The one exception: a handful of questions in the scraped source
  have a blank third answer (`"a3": ""`). Where the SOURCE field is an empty
  string, the output field must be an empty string too — do not invent an
  answer to fill it.
- **Work one chunk at a time**: compose the whole file, write it with a single
  Write call, verify it, and only then move to the next chunk. This way partial
  progress survives if you are interrupted.
- Verify each file after writing with:
  `python -c "import json;d=json.load(open(r'<path>',encoding='utf-8'));print(len(d), all(all(isinstance(v.get(f),str) and v[f].strip() for f in ('q','a1','a2','a3')) for v in d.values()))"`
  It must print the source's entry count and `True`. If not, fix and rewrite.

## Final report
Entry count per output file, plus any strings you were genuinely unsure about
(index + the issue).

---

# Decisions taken during review

These were settled while auditing the finished translation and applied
file-wide. Follow them if more questions are ever added.

## Terminology fixed by review

| Catalan | French | Why |
|---|---|---|
| `preferència` / `prioritat` (right of way) | **priorité** | "préférence" does not carry the right-of-way sense in French. The one exception is where the Catalan glosses one synonym with the other — `preferència de pas (prioritat de pas)` — which keeps "préférence (priorité)" so the gloss is not a self-repetition. |
| `retenció` (traffic queue) | **retenue** | Standard French traffic vocabulary ("bouchons et retenues") *and* the cognate. "rétention" is the medical sense and is wrong. |
| `pretendre` (to intend) | **avoir l'intention de** | False friend: French "prétendre" = to claim. Was wrong in 57 fields. |
| `trepitjar` / `xafar` a line | **chevaucher** | To straddle a marking. "écraser" (crush) is wrong for a painted line — but IS correct for physically crushing a beacon/cone. |
| `ultrapassar` / `depassar` a line | **franchir** | Keep distinct from `avançar` → **dépasser** (to overtake). Collapsing the two makes answers self-contradictory. |
| `Cert` / `Fals` (true-false options) | **Vrai** / **Faux** | "Certain" means "sure" and loses the true/false function. |
| `canvi de rasant` | **changement de déclivité** | |
| `graó lateral` | **dénivelé latéral** | |
| `vorera d'emergència` | **bande d'arrêt d'urgence** | Hard shoulder; plain `vorera` stays **trottoir**. |
| `botzina` | **klaxon** | |

## Traps that caused the only answer-breaking errors

1. **A preposition carrying a quantity.** Catalan `en` before a number often
   means "BY that amount": `no sobrepassi el límit EN 30 km/h` = do not exceed
   the limit BY 30, NOT "the 30 km/h limit". Getting this wrong invents a rule.
2. **Two Catalan near-synonyms collapsed into one French word** in the same
   entry, which makes an option contradict itself and the question unanswerable.
   Watch trepitjar/ultrapassar, parar/aturar/detenir, via/carril.
3. **A qualifier attaching to the wrong noun.** `portar menors ... en una
   motocicleta a menors de X anys` — "de moins de X" must attach to the minors,
   not to the motorcycle.

## Note on the source data

The scrape is noisy: garbled and truncated questions, 11 blank answer fields,
and **accent typos** (`graò` for `graó`, `pretèn` for `pretén`). Any script that
matches Catalan text must fold accents, or it will silently miss entries.
