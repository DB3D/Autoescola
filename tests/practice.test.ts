import test from "node:test";
import assert from "node:assert/strict";
import {
  practiceDays,
  totalPracticeSeconds,
  MAX_ANSWER_SECONDS,
  type Attempt,
  type QuizRun,
} from "../src/engine";
import "fake-indexeddb/auto";
import { readAll, saveQuizRun } from "../src/storage";

const NOW = new Date(2026, 8, 10, 14, 30); // 10 September 2026, local time.
const at = (daysAgo: number, hour = 12) =>
  new Date(
    NOW.getFullYear(),
    NOW.getMonth(),
    NOW.getDate() - daysAgo,
    hour,
  ).toISOString();

function attempt(daysAgo: number, seconds: number, hour = 12): Attempt {
  return {
    id: `a${daysAgo}-${seconds}-${hour}`,
    sessionId: "s",
    questionId: "q",
    selected: 0,
    correct: true,
    passed: false,
    seconds,
    slow_reflex: false,
    frenchVisible: false,
    frenchManuallyRevealed: false,
    at: at(daysAgo, hour),
  };
}
function run(daysAgo: number, seconds: number, hour = 12): QuizRun {
  return {
    id: `r${daysAgo}-${seconds}-${hour}`,
    completedAt: at(daysAgo, hour),
    questions: 20,
    correct: 17,
    seconds,
  };
}

test("practice time splits the last three days between questions and the quiz", () => {
  const days = practiceDays(
    [attempt(0, 30), attempt(0, 20), attempt(1, 45), attempt(2, 10)],
    [run(0, 300), run(2, 120)],
    3,
    NOW,
  );
  assert.equal(days.length, 3);
  assert.deepEqual(
    days.map((d) => [d.questionSeconds, d.quizSeconds, d.totalSeconds]),
    [
      [50, 300, 350], // Today
      [45, 0, 45], // Yesterday
      [10, 120, 130], // The day before
    ],
  );
});

test("a day with no practice at all still gets a row", () => {
  const days = practiceDays([attempt(0, 30)], [], 3, NOW);
  assert.deepEqual(
    days.map((d) => d.totalSeconds),
    [30, 0, 0],
  );
});

test("practice outside the window is left out entirely", () => {
  const days = practiceDays(
    [attempt(3, 600), attempt(40, 600)],
    [run(3, 600)],
    3,
    NOW,
  );
  assert.deepEqual(
    days.map((d) => d.totalSeconds),
    [0, 0, 0],
  );
});

test("days follow the local calendar, not a rolling 24 hours", () => {
  // Just after midnight today and just before midnight yesterday are one hour
  // apart but belong to two different days.
  const days = practiceDays(
    [attempt(0, 30, 0), attempt(1, 40, 23)],
    [],
    3,
    NOW,
  );
  assert.deepEqual(
    days.map((d) => d.questionSeconds),
    [30, 40, 0],
  );
});

test("an idle phone cannot inflate a day beyond the per-question ceiling", () => {
  const [today] = practiceDays([attempt(0, 4000)], [], 3, NOW);
  assert.equal(today.questionSeconds, MAX_ANSWER_SECONDS);
});

test("quiz runs persist on their own and saving one twice keeps one row", async () => {
  await saveQuizRun(run(0, 300));
  await saveQuizRun(run(0, 300)); // Same id: a repeated save must not double it.
  await saveQuizRun(run(1, 240));
  const stored = await readAll<QuizRun>("quizRuns");
  assert.equal(stored.length, 2);
  assert.equal(
    stored.reduce((s, r) => s + r.seconds, 0),
    540,
  );
  // The quiz stores its cost in time, never an attempt or a question statistic.
  assert.equal((await readAll("attempts")).length, 0);
  assert.equal((await readAll("stats")).length, 0);
});

test("the lifetime total counts quiz time alongside every attempt", () => {
  const attempts = [attempt(0, 30), attempt(400, 90)];
  const runs = [run(0, 300), run(400, 250)];
  assert.equal(totalPracticeSeconds(attempts, []), 120);
  assert.equal(totalPracticeSeconds([], runs), 550);
  assert.equal(totalPracticeSeconds(attempts, runs), 670);
  // Uncapped legacy attempts are capped on the way in, as elsewhere.
  assert.equal(totalPracticeSeconds([attempt(0, 9999)], []), MAX_ANSWER_SECONDS);
});
