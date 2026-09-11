# Révision

Independent learning area: 13 driving themes plus 5 Catalan language themes,
with 37 visual French lessons and 259 authored non-visual questions in Catalan.
The Code expert theme has three lessons; the other 17 have two each. All use
complete explanations, concrete examples, vocabulary, memory aids and contextual
grammar. Each numbered block focuses on a rule or a closely related distinction.
Theme tests draw 10 questions from seven per lesson: 5/5 for two lessons, or
3/3/4 for three, with the extra question's lesson chosen randomly. Questions and
answer order shuffle; the next draw changes at least one question from the last.

The third catalogue section, Test Maîtrise, starts a 25-question test directly.
It draws at least one question from every theme, then fills randomly without
duplicates. It has its own last-five gauge and time, stored under `test-maitrise`.
It does not change individual theme scores. Completed corrections link back to
each question's original theme and lesson; lessons remain unavailable during tests.

`content.ts` and `extra-content.ts` own the lessons, questions and references.
`catalog.ts` assembles the global assessment and question-to-theme lookup.
Every question carries
its lesson index, used by the review links. The source bank's category names and
representative IDs document the curriculum's relationship to `questions.json`.
These are newly written comprehension questions, not a filtered copy of the bank.
The source question bank, vocabulary quiz and their scores are never modified.

`engine.ts` sums the latest five completed test percentages and always divides
by five. Missing tests count as zero: one perfect run gives 20% mastery, five
perfect runs give 100%. An unseen theme shows 0% and “À découvrir”. The history
shows five slots, with unfilled slots labelled “À faire”. Progression's Revision
gauge averages all 18 theme masteries, including untouched themes; Test Maîtrise
is assessed separately, not included as a nineteenth theme in that average.
Skipped questions count as incorrect. An abandoned test does not create a run.
Clicking an answer locks it and immediately shows correct/incorrect feedback,
the French question, all translated choices and the explanation. French text is
initially blurred and hidden from assistive technology; the header's 🇫🇷 button
can reveal it before answering. Each new question starts with French blurred.
A separate click anywhere in the content (or Enter/Space/Right Arrow) advances;
a 300 ms guard prevents a quick double tap from skipping the correction. Header,
quit and dialog controls keep their own actions. Skipping also reveals feedback.
The last question's feedback precedes the saved result and full review.
`french.ts` supplies the original 196 translations; `extra-content.ts` pairs the
63 new questions with their French text. Translations retain original answer
indices, so they stay paired after shuffling. There is no time penalty.
A correct answer earns 1 point only without French assistance. Revealing French
before confirmation gives that question 0 points, even if correct. Automatic
reveal after confirmation does not count as assistance. Runs retain factual
`correct`, mastery `points`, and per-question `frenchUsed` flags. Results, history
and last-five mastery use points; legacy runs without points keep their original
score because their assistance usage was not recorded.

Inside a theme, the header replaces the logo with a return-to-themes button on
the left. During reading, numbered lesson buttons and Q provide direct access to
lessons and the test. The question counter (1/10 or 1/25) is in the header beside
the return control. During a test, lesson access is removed and guarded in the
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

Opening a theme's lesson or the direct Test Maîtrise starts a visible header clock.
All lessons, tests and
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

Progression adds Revision in blue to seven daily bars and the all-activity lifetime
total. Day labels show Aujourd’hui followed by weekday names in reverse order.
The separate Catalan mastered gauge counts distinct quiz questions successfully
answered at least once out of 300, excluding skips and unknown IDs. Repeat wins
cannot inflate coverage. Driving and Català scoring and duration rules remain unchanged. The global
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
- [CPNL weak pronouns](https://www.cpnl.cat/gramatica/66/37-els-pronoms-febles/nivell/basic-2)
  and [relative pronouns](https://www.cpnl.cat/gramatica/60/39-els-pronoms-relatius/nivell/tots)
  support the new language reinforcement and complex-sentence themes.

Code expert was selected by reviewing the non-visual bank for exceptions,
conditional wording and mechanical confusions. The source has no error-rate
ranking, so “expert” is an editorial difficulty selection. Its three lessons cover
priority exceptions and narrow roads, overtaking exceptions and continuous lines,
and clutch/parking/engine-braking traps. Articles 13, 15, 26–28 and 33 were checked.
Distractors deliberately omit a necessary condition or confuse a related rule.
The three new language themes cover similar words, weak pronouns and temporal
nuances, and longer sentences with relatives, conditions and exceptions.

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

Current browser validation (headless Edge, isolated mobile profile) covered all
18 themes and 37 lessons; 10 completed theme tests and two global tests (150
answers); 20/40/60/80/100% mastery buildup and sixth-run replacement; and zero
French credit. Global tests had 25 unique questions covering all 18 themes,
different selections, independent saved results and correct source-lesson links.
Reloading directly into Progression verified both gauges, repeated quiz wins
counted once, seven weekday rows and blue Revision time. Uniform theme accents
and fixed footer geometry passed on all five landing pages at 320/390/430 px,
both scroll extremes and two viewport heights. Screenshots were inspected.
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

Lesson/header validation checks sticky numbered tabs while scrolled, header-only
return, absence of the logo and lesson mastery panel, and blocked lesson access
during tests. Automatic correction reveal preserves unassisted credit. The fixed
five-slot denominator applies to previously saved scores without altering them.
