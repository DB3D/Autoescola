import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allStats,
  discoveryWeight,
  trialRemaining,
  sessionSettings,
  examPassed,
  examSummary,
  masteryCredit,
  selectQuestions,
  statsFor,
  type Attempt,
  type Question,
  type Session,
} from "../src/engine";
import "fake-indexeddb/auto";
import { readAll, saveSession } from "../src/storage";
const at = "2026-09-10T12:00:00.000Z",
  now = Date.parse(at);
function attempt(p: Partial<Attempt> = {}): Attempt {
  return {
    id: crypto.randomUUID(),
    sessionId: "session",
    questionId: "1",
    selected: 0,
    correct: true,
    passed: false,
    seconds: 10,
    slow_reflex: false,
    frenchVisible: false,
    frenchManuallyRevealed: false,
    at,
    ...p,
  };
}
test("French correct answers earn exactly half credit at every speed", () => {
  for (const seconds of [5, 30, 50, 80]) {
    const a = attempt({ seconds, slow_reflex: seconds >= 50 });
    assert.equal(
      masteryCredit({ ...a, frenchVisible: true }),
      masteryCredit(a) / 2,
    );
  }
  assert.equal(statsFor("1", [attempt()], now).mastery, 12);
  assert.equal(
    statsFor("1", [attempt({ frenchVisible: true })], now).mastery,
    6,
  );
});
test("pass and slow answers penalize mastery without losing factual correctness", () => {
  const success = Array.from({ length: 5 }, () => attempt());
  const regular = statsFor("1", success, now);
  assert.equal(regular.mastery, 60);
  const pass = statsFor(
    "1",
    [...success, attempt({ correct: false, passed: true, selected: null })],
    now,
  );
  assert.equal(pass.mastery, 38);
  assert.equal(pass.failures, 1);
  assert.equal(pass.passes, 1);
  const slow = statsFor(
    "1",
    [...success, attempt({ seconds: 51, slow_reflex: true })],
    now,
  );
  assert.equal(slow.successes, 6);
  assert.equal(slow.slowCount, 1);
  assert.ok(slow.mastery < regular.mastery);
});
test("all question statistics retain every time and French breakdown", () => {
  const rows = [
    attempt(),
    attempt({ frenchVisible: true, seconds: 20 }),
    attempt({
      correct: false,
      frenchVisible: true,
      seconds: 60,
      slow_reflex: true,
    }),
    attempt({ correct: false, selected: null, passed: true, seconds: 30 }),
  ];
  const s = statsFor("1", rows, now);
  assert.equal(s.shown, 4);
  assert.equal(s.successRate, 0.5);
  assert.equal(s.averageSeconds, 30);
  assert.deepEqual(s.responseTimes, [10, 20, 60, 30]);
  assert.equal(s.successesWithFrench, 1);
  assert.equal(s.failuresWithFrench, 1);
  assert.equal(s.successesWithoutFrench, 1);
  assert.equal(s.failuresWithoutFrench, 1);
  assert.equal(s.frenchDependency, 0.5);
  assert.equal(s.lastResult, "pass");
});
test("recency suppresses questions and difficult questions return sooner", () => {
  const bad = attempt({ correct: false });
  const fresh = statsFor("1", [bad], now);
  const later = statsFor("1", [bad], now + 86400000);
  assert.equal(fresh.priority, 0);
  assert.ok(later.priority > fresh.priority);
  const good = statsFor(
    "1",
    Array.from({ length: 8 }, () => attempt()),
    now + 86400000,
  );
  assert.ok(later.priority > good.priority);
});
const bank: Question[] = Array.from({ length: 100 }, (_, i) => ({
  id: String(i),
  question: `Question ${i}`,
  answers: ["A", "B", "C"],
  correct: 0,
  image: "x.jpg",
}));
test("all modes and lengths select without replacement even with duplicate input IDs", () => {
  for (const mode of ["random", "discovery", "smart", "exam"] as const)
    for (const count of [20, 40, 60, 80]) {
      const chosen = selectQuestions(
        [...bank, bank[0]],
        count,
        mode,
        new Map(),
      );
      assert.equal(chosen.length, count);
      assert.equal(new Set(chosen.map((q) => q.id)).size, count);
    }
  assert.equal(
    selectQuestions(bank.slice(0, 4), 60, "smart", new Map()).length,
    4,
  );
});
test("weighted selection favors smart weakness", () => {
  const s = allStats([attempt()], now);
  s.set("0", { ...statsFor("0", [], now), mastery: 50, priority: 100 });
  s.set("1", { ...statsFor("1", [], now), mastery: 100, priority: 1 });
  assert.equal(
    selectQuestions(bank.slice(0, 2), 1, "smart", s, () => 0.5)[0].id,
    "0",
  );
});
test("Discovery favors unseen, rare and overdue questions over recent repetition", () => {
  const recent = { ...statsFor("1", [attempt()], now), shown: 20 };
  const old = { ...recent, lastAsked: new Date(now - 30 * 86400000).toISOString() };
  const rare = { ...old, shown: 1 };
  assert.ok(discoveryWeight(undefined, now) > discoveryWeight(rare, now));
  assert.ok(discoveryWeight(rare, now) > discoveryWeight(old, now));
  assert.ok(discoveryWeight(old, now) > discoveryWeight(recent, now));
  assert.equal(discoveryWeight({ ...recent, shown: 0 }, now), 120);
  const s = new Map([["1", recent], ["2", old], ["3", rare]]);
  const selected = selectQuestions(bank.slice(0, 4), 4, "discovery", s, () => 0.5, now);
  assert.deepEqual(selected.map(q => q.id), ["0", "3", "2", "1"]);
});
test("Time trial provides one minute per question and expires against wall time", () => {
  for (const count of [20, 40, 60, 80]) {
    const session: Session = { id: 'trial', mode: 'discovery', startedAt: at, completedAt: '', duration: 0, questionIds: bank.slice(0, count).map(q => q.id), attempts: [], timeTrial: true, deadlineAt: new Date(now + count * 60000).toISOString() };
    assert.equal(trialRemaining(session, now), count * 60);
    assert.equal(trialRemaining(session, now + 60000), (count - 1) * 60);
    assert.equal(trialRemaining(session, now + count * 60000), 0);
    assert.equal(trialRemaining(session, now + count * 60000 + 600000), 0);
    assert.equal(trialRemaining({ ...session, timeTrial: false }, now), null);
  }
});
function examSession(correct: number, day: number): Session {
  return { id: `exam-${day}`, mode: "exam", startedAt: at, completedAt: new Date(now + day * 86400000).toISOString(), duration: 2400, timeTrial: true, questionIds: bank.slice(0, 40).map(q => q.id), attempts: bank.slice(0, 40).map((q, i) => attempt({ questionId: q.id, correct: i < correct })) };
}
test("Exam locks 40 questions, no French, and the global timer regardless of previous preferences", () => {
  for (const count of [20, 40, 60, 80]) for (const french of [true, false]) for (const trial of [true, false]) {
    assert.deepEqual(sessionSettings("exam", count, french, trial), { count: 40, french: false, trial: true });
  }
  assert.deepEqual(sessionSettings("discovery", 80, true, false), { count: 80, french: true, trial: false });
});
test("Exam threshold is 38/40 and dashboard counts only the last 20 completed exams", () => {
  assert.equal(examPassed(examSession(37, 0)), false);
  assert.equal(examPassed(examSession(38, 0)), true);
  assert.equal(examPassed({ ...examSession(40, 0), mode: "random" }), false);
  const recent = Array.from({ length: 25 }, (_, i) => examSession(i >= 20 ? 38 : 37, i));
  const summary = examSummary([...recent, { ...examSession(40, 100), mode: "smart" }, { ...examSession(40, 101), completedAt: "" }]);
  assert.equal(summary.recent.length, 20);
  assert.equal(summary.passed, 5);
  assert.equal(summary.rate, .25);
  assert.equal(summary.ready, true);
  assert.equal(examSummary([examSession(40, 1)]).ready, false);
  assert.equal(examSummary([...recent, examSession(37, 26)]).ready, false);
  assert.equal(examSummary([]).rate, null);
});
test("IndexedDB stores complete sessions atomically and retry does not duplicate attempts", async () => {
  const a = attempt();
  const s: Session = {
    id: "session",
    mode: "smart",
    startedAt: at,
    completedAt: at,
    duration: 10,
    questionIds: ["1"],
    attempts: [a],
  };
  await saveSession(s);
  await saveSession(s);
  assert.equal((await readAll<Attempt>("attempts")).length, 1);
  assert.deepEqual((await readAll<Session>("sessions"))[0], s);
  const second = attempt({ sessionId: "second", frenchVisible: true });
  await saveSession({ ...s, id: "second", attempts: [second] });
  assert.equal((await readAll<Attempt>("attempts")).length, 2);
  const rows = await readAll<{ shown: number }>("stats");
  assert.equal(rows[0].shown, 2);
});
