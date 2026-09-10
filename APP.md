# AutoEscola app

An iPhone-first driving-question practice app using Vite and TypeScript. The interface, feedback and statistics are in French; question text and answer choices remain in Catalan, with French translations available as learning assistance. No backend, account or service worker. It uses the existing 4,400-question bank without changing source questions, answer keys, translations or images.

## Run

Use Node.js 22.12 or newer:

```sh
npm ci
npm run dev
npm test
npm run build
```

`scripts/prepare-data.mjs` validates every ID, answer key, image path and exact French match. It generates `public/questions_ca.json`, `public/translations_fr.json` keyed by ID, and copies the existing images into `public/images`. Those generated files are ignored by Git. To update content, edit the existing `src/data/questions.json`, `src/data/translations.json`, and `src/images`, then rebuild. Translation matching uses the Catalan question AND all three ordered answers; repeated question wording cannot select another question's translations. To maintain the generated ID-based format directly, remove the preparation step from the scripts and track the public files.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` tests, builds and deploys every push to `main`. In the GitHub repository's Settings → Pages, select **GitHub Actions** as the source. Push the app changes to `DB3D/Autoescola`, or run the workflow manually after they are pushed. The expected project URL is `https://db3d.github.io/Autoescola/`. Relative asset URLs also support other repository names and custom domains.

Deployment check on 2026-09-10: GitHub rejected enabling Pages with HTTP 422, “Your current plan does not support GitHub Pages for this repository.” The repository is private. Deployment needs a plan supporting private-repository Pages or an explicit user decision to make the repository public. Repository visibility has not been changed, and the app is not published.

## Data and recovery

Simulation examen forces 40 random unique questions, a 40-minute global timer, and no French assistance. Setup controls and the header French button are disabled in exam mode. The question screen is in Catalan and has only A/B/C. Selecting an answer highlights the selection neutrally and allows advancing; no correctness, flash, learning statistics or translations are revealed before finishing. At least 38 correct answers passes. Timeouts preserve existing answers and count the current unanswered question as incorrect rather than a voluntary skip. The Exams page includes only the latest 20 completed exam-mode sessions, calculates the fraction passed, and marks readiness after five consecutive successful simulations. This indicator is a practice benchmark, not a prediction of official exam success.

Time trial is an optional setting below French assistance, available with every selection mode. The global allowance is 60 seconds per selected question (20/40/60/80 minutes). Its deadline is independent of the per-question reflex gauge and keeps running during answer review and when the tab is hidden. On expiry, the current unanswered question is recorded as passed with a timeout marker; already answered questions are kept and unseen questions do not create attempts or affect their mastery. Results use the full requested question count and separately report questions not reached. Timeout state and deadline are saved/exported. Browsers may suspend timers in the background; the deadline is checked immediately on returning and before accepting an answer or advancing.

The active questionnaire lives in memory. Leaving or refreshing before completion loses it; a browser unload warning is requested but mobile Safari may not show it. A completed session saves its session record, every attempt, and derived question statistics in one IndexedDB transaction. Saving is idempotent and merges existing attempts within the same transaction, including concurrent tabs. No history pruning is performed.

If saving fails, the results screen provides retry and JSON export. The export has schema version 1 and contains all session records, raw attempts and derived statistics, including an unsaved completed session when exported from its results. It contains sufficient data for full future restoration. Import is deferred. The legacy `src/data/userout.json` remains untouched; it is a zeroed initialization format and is not used as live storage.

Progress is private to this browser and origin. Browser data clearing, private browsing and browser storage eviction can remove it. Export periodically. Changing from localhost to GitHub Pages does not transfer history. Images and question files are fetched over the network; no offline app is installed. Normal browser caching may continue to serve previously fetched assets.

## Scoring version 1

- Start at 0, clamp to 0–100 after each attempt.
- Correct: +12 within 15 seconds, +10 below 50 seconds, +4 at/after 50 seconds.
- French visible before answering halves that positive credit, including auto-visible French. The automatic reveal after answering does not count as assistance.
- Wrong or passed: −22. Slow reflex (at least 50 seconds): an additional −6 for any result. The question never times out.
- After three days away, displayed mastery decays 0.6 points/day. Raw attempts stay unchanged and statistics can always be recomputed.
- Sequential bounded updates account for both historical and recent results. Success/failure ratio, average time and French dependency additionally inform smart priority.
- Smart priority combines inverse mastery (45%), failure ratio (up to 25), average response time (up to 20), French use (up to 15), and spacing (up to 40), with a base of 10.
- Recency suppression rises from zero to full weight over 10 minutes. Due intervals start at six hours after failure; consecutive correct answers double the interval up to 30 days.
- Discovery replaces medium difficulty in the session setup. Never-seen questions have weight 120. For practiced questions, weight is `(5 + 60 / sqrt(attempts) + 40 * min(daysSinceLastAnswer / 30, 1)) * (0.25 + 0.75 * min(daysSinceLastAnswer, 1))`. This favors low exposure and older questions while suppressing questions answered today. Selection remains random and without replacement. Previous medium-mode sessions retain their original label in history and exports.
- Weighted random sampling without replacement avoids locking into one small weak group. Review ranks failures, time, French use and historical weakness together.

## Verification

`npm test` covers French credit, skips, slow penalties, history breakdown, spacing, weighted selection, all session lengths, uniqueness, IndexedDB persistence and idempotent saving. `npm run build` validates the entire source bank and compiles TypeScript. Real-device Safari interaction testing remains a separate check.
