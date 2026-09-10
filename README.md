# AutoEscola

The iPhone-first Catalan practice app is implemented with Vite and TypeScript.
See [APP.md](APP.md) for local setup, GitHub Pages deployment, scoring rules,
progress storage and verification. Run `npm ci` then `npm run dev` with Node.js
22.12 or newer.

## Original study bank

Authenticated offline export of the Catalan driving-test bank available to the
student account. Credentials are prompted for at runtime and are **not** stored
in the script, JSON, manifest, or images.

## Export summary

- 110 visible tests
- 40 real questions per test (4,400 total)
- 3 choices and one correct choice per question
- 3,341 unique images (duplicate image URLs are stored once)
- 0 failed or unreadable images
- 0 unresolved answer keys
- Catalan text repaired from the source site's mojibake encoding

The source occasionally returns an extra fully blank record, which the
extractor removes. The original server position and record count remain in the
JSON for auditing.

## Project layout

- `src/data/questions.json`: complete structured dataset, grouped by test
- `src/data/translations.json`: Catalan source text with the French translation of
  every question and answer, keyed by question text
- `src/data/userout.json`: initialized per-question progress records for all
  4,400 question IDs
- `src/images/`: locally downloaded question images
- `src/data/manifest.json`: counts, validation results, and overrides
- `docs/`: official reference material used while auditing questions

The `src/` directory is reserved for the future frontend application. Images
remain in `src/images/`; application code can be added alongside the existing
`data/` and `images/` directories.

Important question fields:

- `test_number`: the visible website number (1 through 110)
- `group_id`: the site's non-sequential internal PHP/AJAX ID
- `position`: clean 1-through-40 position in this export
- `source_position`: randomized position returned by the website
- `correct_option`: 1, 2, or 3
- `correct_answer`: text of the correct choice
- `image_local`: logical image path relative to `src/` (for example,
  `images/example.jpg`)
- `answer_key_status`: `present` or `manual_override`

## User progress

`src/data/userout.json` is the initial and exportable user-progress format. It
is keyed by question ID and stores total, Catalan, and French attempts,
successes, failures, elapsed seconds, last-attempt timestamps, notes, and a
difficulty rating.

The count invariants are:

```text
total_trials = total_failed + total_success
catala_trials = catala_failed + catala_success
fr_trials = fr_failed + fr_success
```

Empty timestamps are `null`. Populated timestamps should use ISO 8601 with
seconds and a timezone offset. A static deployment cannot write changes back
to this file, so the application will persist live progress in IndexedDB or a
remote database and use this JSON as its initialization/export schema.

## Source answer-key defects

The server supplied an empty answer key for 11 otherwise complete questions.
They were resolved from unambiguous rule wording or road-sign images and are
labelled `manual_override`, with a note in the question data and manifest:

| Question ID | Correct option | Basis |
| --- | ---: | --- |
| 8464 | 3 | Speed competition is prohibited on public roads open to general traffic |
| 8501 | 1 | No-right-turn sign |
| 8558 | 1 | Exercise extra caution at a children warning sign |
| 8550 | 2 | No-left-or-right-turn sign |
| 8548 | 1 | Maximum-height sign |
| 8539 | 2 | Definition of carriageway |
| 8597 | 3 | Level crossing with barriers sign |
| 8585 | 2 | Abandon an unsafe overtaking manoeuvre |
| 8631 | 1 | Reduce speed where mud or gravel may be thrown |
| 8653 | 3 | Higher speed makes a crash more severe |
| 8648 | 1 | Rear overhang panel, plus red light at night/poor visibility |

The two detailed statutory checks agree with articles 7 and 65 of Andorra's
current circulation code:

https://portaljuridicandorra.ad/L2021012
