import test from "node:test";
import assert from "node:assert/strict";
import { recentMistakes, mistakesText, MISTAKE_WINDOW_MS, type MistakeHistory } from "../src/mistakes";
import type { Attempt, QuizAttempt } from "../src/engine";
import type { RevisionRun } from "../src/revision/types";
import { themes } from "../src/revision/content";

const now = Date.parse("2026-09-12T12:00:00Z");
const at = (age = 0) => new Date(now - age).toISOString();
const q = themes[0].questions[0];
const wrong = (q.correct + 1) % q.answers.length;
const attempt = (overrides: Partial<Attempt> = {}): Attempt => ({
  id: "a", sessionId: "s", questionId: "q", selected: 2, correct: false,
  passed: false, seconds: 10, slow_reflex: false, frenchVisible: false,
  frenchManuallyRevealed: false, at: at(), ...overrides,
});
const quizAttempt = (overrides: Partial<QuizAttempt> = {}): QuizAttempt => ({
  id: "v", runId: "v-run", questionId: "q", selected: 2, correct: false,
  passed: false, seconds: 5, at: at(), ...overrides,
});
const revisionRun = (overrides: Partial<RevisionRun> = {}): RevisionRun => ({
  id: "r", themeId: themes[0].id, questionIds: [q.id], picks: [wrong],
  correct: 0, total: 1, points: 0, frenchUsed: [false], completedAt: at(), ...overrides,
});
const history = (overrides: Partial<MistakeHistory> = {}): MistakeHistory => ({
  bank: [{ id: "q", question: "Què significa aquest senyal?", answers: ["La bona", "Una altra", "La triada"], correct: 0, image: "images/sign.jpg", category: "SIGNS" }],
  translations: { q: { question: "Que signifie ce panneau ?", answers: ["La bonne", "Une autre", "La choisie"] } },
  attempts: [], vocabBank: [{ id: "q", type: "word", prompt: "Traduis ce mot", catalan: "Aturar", answers: ["Arrêter", "Continuer", "Accélérer"], correct_option: 1, note: "Un arrêt" }],
  vocabTypes: { word: "Vocabulaire" }, quizAttempts: [], revisionThemes: themes, revisionRuns: [], ...overrides,
});

test("Recent errors combine all three activities by actual answer time and retain source/language", () => {
  const result = recentMistakes(history({
    attempts: [attempt({ frenchVisible: true, at: at(1000) })],
    quizAttempts: [quizAttempt({ at: at(2000) })],
    revisionRuns: [revisionRun({ answeredAt: [at(3000)] })],
  }), now);
  assert.equal(result.total, 3);
  assert.deepEqual(result.items.map(r => r.source), ["practice", "vocab", "revision"]);
  assert.deepEqual(result.items.map(r => r.context), ["assisted", "bilingual", "catalan"]);
  assert.equal(result.items[0].correctAnswer, "La bona");
  assert.equal(result.items[0].selectedAnswer, "La triada");
  assert.equal(result.items[0].selectedFrench, "La choisie");
  assert.equal(result.items[1].correctAnswer, "Arrêter");
  assert.equal(result.items[1].selectedAnswer, "Accélérer");
  assert.equal(result.items[2].correctAnswer, q.answers[q.correct]);
  assert.equal(result.items[2].selectedAnswer, q.answers[wrong]);
});

test("Assisted correct answers and slow correct answers are never errors, even at zero mastery points", () => {
  const result = recentMistakes(history({
    attempts: [attempt({ correct: true, frenchVisible: true, slow_reflex: true, seconds: 120 })],
    quizAttempts: [quizAttempt({ correct: true, seconds: 120 })],
    revisionRuns: [revisionRun({ picks: [q.correct], correct: 1, points: 0, frenchUsed: [true] })],
  }), now);
  assert.deepEqual(result, { total: 0, items: [] });
});

test("Skipped questions count in all activities and preserve whether French was visible", () => {
  const result = recentMistakes(history({
    attempts: [attempt({ selected: null, passed: true, frenchVisible: true })],
    quizAttempts: [quizAttempt({ selected: null, passed: true })],
    revisionRuns: [revisionRun({ picks: [null], frenchUsed: [true] })],
  }), now);
  assert.equal(result.items.length, 3);
  assert.ok(result.items.every(r => r.passed && r.selectedAnswer.includes("Question passée")));
  assert.equal(result.items.find(r => r.source === "revision")!.context, "assisted");
  const timeout = recentMistakes(history({ attempts: [attempt({ selected: null, timedOut: true })] }), now);
  assert.match(timeout.items[0].selectedAnswer, /temps écoulé/);
});

test("The 72-hour window includes its boundary and excludes stale, future and invalid timestamps", () => {
  const timestamps = [at(MISTAKE_WINDOW_MS), at(MISTAKE_WINDOW_MS + 1), at(-1), "invalid"];
  const result = recentMistakes(history({ attempts: timestamps.map((time, i) => attempt({ id: String(i), at: time })) }), now);
  assert.equal(result.total, 1);
  assert.equal(result.items[0].at, timestamps[0]);
  assert.equal(result.items[0].occurrences, 1);
  const revision = recentMistakes(history({ revisionRuns: [revisionRun({ completedAt: at(), answeredAt: [at(MISTAKE_WINDOW_MS + 1)] })] }), now);
  assert.equal(revision.total, 0, "new Revision runs use answer time, not completion time");
});

test("Repeated errors show the latest failure once, count real attempts and remain after a later success", () => {
  const latest = attempt({ id: "latest", at: at(1000), frenchVisible: true, selected: 1 });
  const rows = [attempt({ at: at(2000) }), latest, latest, attempt({ id: "won", at: at(), correct: true })];
  const result = recentMistakes(history({ attempts: rows }), now);
  assert.equal(result.total, 1);
  assert.equal(result.items[0].occurrences, 2);
  assert.equal(result.items[0].selectedAnswer, "Una altra");
  assert.equal(result.items[0].context, "assisted");
  assert.equal(result.items[0].at, latest.at);
});

test("At most 100 distinct questions are returned after deduplication, with no filler rows", () => {
  const base = history();
  const bank = Array.from({ length: 120 }, (_, i) => ({ ...base.bank[0], id: String(i) }));
  const attempts = bank.flatMap((q, i) => [
    attempt({ id: `${i}-new`, questionId: q.id, at: at(i * 1000) }),
    attempt({ id: `${i}-old`, questionId: q.id, at: at(500000 + i * 1000) }),
  ]);
  const result = recentMistakes(history({ bank, attempts }), now, 500);
  assert.equal(result.total, 120);
  assert.equal(result.items.length, 100);
  assert.equal(result.items[0].questionId, "0");
  assert.equal(result.items.at(-1)!.questionId, "99");
  assert.ok(result.items.every(r => r.occurrences === 2));
  assert.equal(recentMistakes(history({ attempts: [attempt()] }), now).items.length, 1);
});

test("Legacy Revision runs use completion date without inventing French usage; unavailable questions are ignored", () => {
  const result = recentMistakes(history({
    attempts: [attempt({ questionId: "removed" })], quizAttempts: [quizAttempt({ questionId: "removed" })],
    revisionRuns: [revisionRun({ frenchUsed: undefined, questionIds: [q.id, "removed", themes[0].questions[1].id] })],
  }), now);
  assert.equal(result.total, 1);
  assert.equal(result.items[0].context, "unknown");
  assert.equal(result.items[0].at, at());
});

test("Clipboard text includes every displayed question, both answers, translations, context and image references", () => {
  const result = recentMistakes(history({
    attempts: [attempt({ frenchVisible: true })],
    quizAttempts: [quizAttempt({ passed: true, selected: null })],
    revisionRuns: [revisionRun()],
  }), now);
  const text = mistakesText(result.items, "https://example.test/Autoescola/");
  for (const row of result.items) {
    assert.ok(text.includes(row.question));
    assert.ok(text.includes(`Ma réponse (incorrecte) : ${row.selectedAnswer}`));
    assert.ok(text.includes(`Bonne réponse : ${row.correctAnswer}`));
  }
  assert.match(text, /Català \+ français/);
  assert.match(text, /Català seul/);
  assert.match(text, /quiz bilingue/);
  assert.match(text, /La choisie/);
  assert.match(text, /https:\/\/example.test\/Autoescola\/images\/sign.jpg/);
  assert.match(text, /Consigne : Traduis ce mot/);
  assert.ok(!text.includes("undefined"));
});
