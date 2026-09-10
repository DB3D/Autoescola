# AutoEscola app

Vibe coded app so i can nail my driving license test. 

## Run

Use Node.js 22.12 or newer:

```sh
npm ci
npm run dev
npm test
npm run build
```

`scripts/prepare-data.mjs` validates every ID, answer key, category, image path and exact French match. It generates `public/questions_ca.json`, `public/translations_fr.json` keyed by ID, and copies the existing images into `public/images`. Those generated files are ignored by Git. To update content, edit the existing `src/data/questions.json`, `src/data/translations.json`, and `src/images`, then rebuild. Translation matching uses the Catalan question AND all three ordered answers; repeated question wording cannot select another question's translations. To maintain the generated ID-based format directly, remove the preparation step from the scripts and track the public files.

## GitHub Pages

The workflow in `.github/workflows/pages.yml` tests, builds and deploys every push to `main`. In the GitHub repository's Settings → Pages, select **GitHub Actions** as the source. Push the app changes to `DB3D/Autoescola`, or run the workflow manually after they are pushed. The expected project URL is `https://db3d.github.io/Autoescola/`. Relative asset URLs also support other repository names and custom domains.

Deployment history on 2026-09-10: enabling Pages first failed with HTTP 422, “Your current plan does not support GitHub Pages for this repository,” because the repository was private on a free plan. The repository was then made public, but the first workflow run still failed at `actions/configure-pages` with “Get Pages site failed … Not Found”, because a Pages site had never been created for the repository. Passing `enablement: true` to that step then failed with “Create Pages site failed … Resource not accessible by integration”, because creating a Pages site accepts only an admin OAuth or classic token with `repo` scope and rejects the Actions `GITHUB_TOKEN`; the input was removed again. Pages must therefore be enabled once by hand, under Settings → Pages → Build and deployment → Source → **GitHub Actions**, after which the workflow runs unattended. Action versions were also raised to the Node 24 releases (`checkout@v7`, `setup-node@v7`, `configure-pages@v6`, `upload-pages-artifact@v5`, `deploy-pages@v5`) to clear the Node 20 runner deprecation warning.

## Access gate

`src/lock.ts` shows a passcode screen before any question data is fetched, and stores an unlock marker in `localStorage` so the code is entered once per browser. The code is not present in the source: only an FNV-1a/base36 digest of a salt plus the code is stored, and `digest()` regenerates that value if the code changes. This deters casual visitors only. It is not access control: the repository is public, and the generated `questions_ca.json`, `translations_fr.json` and images are served as static files that anyone can request directly without passing the gate.

## Interface

The header is sticky. Outside a questionnaire it holds the name of the application and the French button. During one it replaces the name with a quit button and the question counter, and adds two matching chips before the French button: the answer gauge, tinted from the left by the elapsed share of the 120-second ceiling, then the time, which counts up during a session and down during a time trial or an exam. The practice screen has no summary box above the setup: the Progression page holds the statistics.

Progression opens with the average over the last 100 answered questions, split in two. The Catalan score counts the questions answered correctly without revealing the French text; the total score counts every correct answer, French-assisted ones included. Both use the same denominator, so the difference between them is what the translations carried. Only the Catalan score reflects examination conditions.

Each question shows its category from the question bank, with its test number and identifier. Exam mode shows the test number and identifier only.

Once a question is answered there is no next button: a hint invites a click anywhere to continue, and the whole page carries that action. The header, the image and its dialog keep their own; the answered options stop catching taps so a click on them passes through. Enter, Space and the right arrow do the same for a keyboard.

## Answer order

The source bank always lists the three choices of a question in the same order, so a fixed layout allows the position of the correct answer to be memorised instead of its content. `answerOrder()` draws a new permutation of A/B/C at every presentation, in practice and in exam mode alike, and the French translation follows its answer. D remains the fixed "Passer cette question" action at the end. The permutation is display-only: the button carries the original index in `data-answer`, so attempts, statistics, history, review and exports keep the source indices and remain comparable with sessions recorded before the shuffle. The correctness letter announced in the feedback is translated to the position shown.

## Data and recovery

Simulation examen forces 40 random unique questions, a 40-minute global timer, and no French assistance. Setup controls and the header French button are disabled in exam mode. The question screen is in Catalan and has only A/B/C. Selecting an answer highlights the selection neutrally and allows advancing; no correctness, flash, learning statistics or translations are revealed before finishing. At least 38 correct answers passes. Timeouts preserve existing answers and count the current unanswered question as incorrect rather than a voluntary skip. The Exams page includes only the latest 20 completed exam-mode sessions, calculates the fraction passed, and marks readiness after five consecutive successful simulations. This indicator is a practice benchmark, not a prediction of official exam success.

Time trial is an optional setting below French assistance, available with every selection mode. The global allowance is 60 seconds per selected question (10/20/40/60/80 minutes). It is the only setting that turns the header time into a countdown, alongside exam mode; every other session counts up from zero. Exam mode displays its fixed settings without overwriting the preferences, which return unchanged when another mode is selected. Its deadline is independent of the per-question reflex gauge and keeps running during answer review and when the tab is hidden. On expiry, the current unanswered question is recorded as passed with a timeout marker; already answered questions are kept and unseen questions do not create attempts or affect their mastery. Results use the full requested question count and separately report questions not reached. Timeout state and deadline are saved/exported. Browsers may suspend timers in the background; the deadline is checked immediately on returning and before accepting an answer or advancing.

The active questionnaire lives in memory. Leaving or refreshing before completion loses it; a browser unload warning is requested but mobile Safari may not show it. A completed session saves its session record, every attempt, and derived question statistics in one IndexedDB transaction. Saving is idempotent and merges existing attempts within the same transaction, including concurrent tabs. No history pruning is performed.

If saving fails, the results screen provides retry and JSON export. The export has schema version 1 and contains all session records, raw attempts and derived statistics, including an unsaved completed session when exported from its results. It contains sufficient data for full future restoration. Import is deferred. The legacy `src/data/userout.json` remains untouched; it is a zeroed initialization format and is not used as live storage.

Progress is private to this browser and origin. Browser data clearing, private browsing and browser storage eviction can remove it. Export periodically. Changing from localhost to GitHub Pages does not transfer history. Images and question files are fetched over the network; no offline app is installed. Normal browser caching may continue to serve previously fetched assets.

## Scoring version 1

- Start at 0, clamp to 0–100 after each attempt.
- Correct: +12 within 15 seconds, +10 below 50 seconds, +4 at/after 50 seconds.
- French visible before answering halves that positive credit, including auto-visible French. The automatic reveal after answering does not count as assistance.
- Wrong or passed: −22. Slow reflex (at least 50 seconds): an additional −6 for any result. The question never times out, but the recorded time is capped at 120 seconds so a phone left awake cannot distort average time, priority or totals; the gauge then reads “Trop lent !”. Attempts recorded before the cap are capped when read.
- After three days away, displayed mastery decays 0.6 points/day. Raw attempts stay unchanged and statistics can always be recomputed.
- Sequential bounded updates account for both historical and recent results. Success/failure ratio, average time and French dependency additionally inform smart priority.
- Smart priority combines inverse mastery (45%), failure ratio (up to 25), average response time (up to 20), French use (up to 15), and spacing (up to 40), with a base of 10.
- Recency suppression rises from zero to full weight over 10 minutes. Due intervals start at six hours after failure; consecutive correct answers double the interval up to 30 days.
- Discovery replaces medium difficulty in the session setup. Never-seen questions have weight 120. For practiced questions, weight is `(5 + 60 / sqrt(attempts) + 40 * min(daysSinceLastAnswer / 30, 1)) * (0.25 + 0.75 * min(daysSinceLastAnswer, 1))`. This favors low exposure and older questions while suppressing questions answered today. Selection remains random and without replacement. Previous medium-mode sessions retain their original label in history and exports.
- Weighted random sampling without replacement avoids locking into one small weak group. Review ranks failures, time, French use and historical weakness together.

## Verification

`npm test` covers answer-order shuffling, French credit, skips, slow penalties, history breakdown, spacing, weighted selection, all session lengths, uniqueness, IndexedDB persistence and idempotent saving. `npm run build` validates the entire source bank and compiles TypeScript. Real-device Safari interaction testing remains a separate check.
