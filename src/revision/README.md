# Révision

Independent learning area: 12 driving themes plus 2 Catalan language themes.
Each contains two visual French lessons, Catalan vocabulary, memory aids and
contextual grammar, and 14 authored non-visual questions in Catalan (196 total).
All 28 lessons use complete explanations with context and concrete examples;
the main teaching text is approximately twice as long as the initial shorthand.
Each numbered block still focuses on one rule or a closely related distinction.
Five of each lesson's seven questions are drawn per test. Both questions and
answer order shuffle; the next draw changes at least one question from the last.

`content.ts` owns the lessons, questions and references. Every question carries
its lesson index, used by the review links. The source bank's category names and
representative IDs document the curriculum's relationship to `questions.json`.
These are newly written comprehension questions, not a filtered copy of the bank.
The source question bank, vocabulary quiz and their scores are never modified.

`engine.ts` computes an unweighted mean of the latest five completed test
percentages for the selected theme, or all available tests while fewer than five
exist. Unseen mastery is null, displayed as a dash rather than a misleading 0%.
Skipped questions count as incorrect. An abandoned test does not create a run.
Clicking an answer locks it and immediately shows correct/incorrect feedback,
the French question, all translated choices and the explanation. French text is
initially blurred and hidden from assistive technology; the header's 🇫🇷 button
can reveal it before answering. Each new question starts with French blurred.
A separate click anywhere in the content (or Enter/Space/Right Arrow) advances;
a 300 ms guard prevents a quick double tap from skipping the correction. Header,
quit and dialog controls keep their own actions. Skipping also reveals feedback.
The last question's feedback precedes the saved result and full review.
`french.ts` supplies all 196 translations in the original answer order, so they
stay paired with their Catalan choices after shuffling. There is no time penalty.
A correct answer earns 1 point only without French assistance. Revealing French
before confirmation gives that question 0 points, even if correct. Automatic
reveal after confirmation does not count as assistance. Runs retain factual
`correct`, mastery `points`, and per-question `frenchUsed` flags. Results, history
and last-five mastery use points; legacy runs without points keep their original
score because their assistance usage was not recorded.

Inside a theme, the header replaces the logo with a return-to-themes button on
the left. During reading, numbered lesson buttons and Q provide direct access to
lessons and the test. During a test, lesson access is removed and guarded in the
handlers; returning to themes uses the quit/resume dialog. Lesson access returns
after completion. Lesson pages do not display the mastery panel. The same study
clock continues from reading through testing and corrections. Header controls are
disabled while a completed result is being saved.

`storage.ts` uses a separate IndexedDB database (`autoescola-revision`, version 2,
stores `runs` and `time`). Upgrading preserves existing version 1 scores. Run
records are idempotent by UUID and preserve question IDs, original
answer indices and scores. All completed runs are retained, while mastery and its
history display only the latest five per theme. Failed writes remain in memory,
can be retried, and are included in the dedicated JSON export. Browser clearing
can remove progress. In-progress tests are memory-only; refreshing abandons them.

## Study time

Opening a theme's lesson starts a visible header clock. Both lessons, tests and
correction reading share the same visit clock. Returning to the theme catalogue
or leaving Revision stops the visit. Opening another theme starts a new visit.
An abandoned test keeps its study time without adding a mastery score. The theme
catalogue shows lifetime study time per theme and across all Revision themes;
the result history also shows that theme's cumulative time.

`time.ts` measures monotonic elapsed time and splits intervals at local midnight.
`time-tracking.ts` pauses on visibility loss or pagehide and resumes on return.
Time counts while a lesson/test/correction is visible, including passive reading;
there is no inactivity timeout or answer-duration cap for Revision. The code does
not estimate reading time from scrolling or attempt to reconstruct past sessions.

Each visit/day has a cumulative `RevisionTime` checkpoint: ID, visit ID, theme ID,
local day, seconds. A synchronous localStorage journal is updated every second
and at pause/exit; IndexedDB checkpoints run every five seconds and at pause/exit.
The journal recovers updates when mobile teardown interrupts asynchronous writes.
An abrupt process kill may lose the fraction since the last tick. Max-by-ID
merging prevents replayed checkpoints from double-counting or rolling time back.
Storage failures are visible and retryable; exports include in-memory time.

Progression adds Revision in blue to daily bars and the all-activity lifetime
total. Driving and Català scoring and duration rules remain unchanged. The global
JSON export is version 5 (`revisionRuns`, `revisionTime`); the standalone
Revision export is version 3 (`runs`, `time`). Both include points and assistance
flags on new runs. Existing scores without a recorded
duration remain valid but contribute no invented time.

`index.ts` and `revision.css` own the UI. The shell's navigation entry, header,
unload guard, time aggregation and exports integrate with `main.ts`. Styles are scoped to
`.revision` / `rev-*`. The shell uses five navigation destinations; the Historique
navigation button is commented out while its page and records are preserved.

## Content sources and editorial choices

- `docs/Permis_Andorre_Synthese_FR_CA.pdf`: all 17 pages read; mechanical concepts,
  concise rule structure and bilingual vocabulary.
- `docs/QCM_Permis_Andorre_50_questions_CA_FR.pdf`: all 10 pages read; selected
  current rules and comprehension-question patterns.
- `src/data/questions.json`: categories and question anchors recorded per theme.
- `src/data/quizz.json`: contextual Catalan words, modals, negatives and connectors.
- [Andorran circulation code](https://portaljuridicandorra.ad/L2021012) and
  [2025 driving-permit regulation](https://portaljuridicandorra.ad/R20250702B),
  consulted 2026-09-11. Article references are visible in each driving theme.

Conflicts in the PDFs are resolved by the current code: 15 days for continuous
parking, seatbelts also at the rear, 90/60/50 generic speed limits, 1.5 m lateral
clearance when overtaking bicycles/two-wheelers outside built-up areas, danger signals
visible from at least 100 m, and the winter equipment period 1 November–15 May.
Unnecessary conflicting numbers (ITV first-inspection age, old licence masses,
historic motorcycle passenger ages, approximate braking multipliers) are omitted.
Mnemonics are memory associations, not etymological claims. Language questions
assess meaning and sentence comprehension independently from road knowledge.

## Verification

`npm test` includes `revision.test.ts`: curriculum integrity, source IDs, lesson
coverage, selection diversity, scoring, last-five boundaries and independent
idempotent persistence. `npm run build` checks types and production bundling.

Browser validation (headless Edge, isolated profile) covered all 28 lessons,
19 completed tests, abandon/resume, six-test rolling-average rollover, reload,
all existing navigation tabs and widths of 320, 390 and 1440 px. A separate run
injected a storage-write failure, verified wrong-answer corrections and JSON
export of the unsaved record, then retried and checked one durable record.
Screenshots of the dashboard, lesson, grammar, question and results were reviewed.
Native iPhone Safari remains a separate device check.

Time verification covers read/test continuity, pause/resume, separate themes,
local midnight, uncapped daily/lifetime totals, checkpoint idempotency and the
database migration. Browser checks cover abandon without a mastery score,
reload, the blue Progression segment, theme totals, failed-write journal recovery,
both JSON exports and the timer header at 320 px.

Immediate-feedback verification completed 14 tests (140 questions), checking
correct/wrong/skip feedback, translation pairing after answer shuffling, blurred
French and manual reveal, separate mouse/keyboard advancement, the double-tap
guard, quit/resume, saved scores after reload and widths of 320/390/1440 px.
The study-time browser checks also passed with this interaction flow.

Lesson/header validation visited all 28 rewritten lessons and checked sticky
navigation while scrolled. Current flow validation checks header-only return,
absence of the logo and lesson mastery panel, blocked lesson access during tests,
quit/resume, and zero French credit. A mixed test scored 50%, an all-French test
scored 0%, and their 25% mastery persisted after reload. Automatic correction
reveal preserved unassisted credit. Header layouts passed at 320/390/1440 px.
