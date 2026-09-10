import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allStats,
  answerOrder,
  discoveryWeight,
  trialRemaining,
  sessionSettings,
  examPassed,
  examSummary,
  masteryCredit,
  cappedSeconds,
  recentScores,
  selectQuestions,
  statsFor,
  ENDLESS,
  MAX_ANSWER_SECONDS,
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
    for (const count of [10, 20, 40, 60, 80]) {
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
  for (const count of [10, 20, 40, 60, 80]) {
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
test("Endless draws the whole bank in order and rules out the global timer", () => {
  for (const french of [true, false])
    for (const trial of [true, false]) {
      const settings = sessionSettings("smart", ENDLESS, french, trial);
      assert.equal(settings.count, ENDLESS);
      assert.equal(settings.french, french);
      assert.equal(settings.trial, false); // No count, so no deadline to compute.
    }
  const drawn = selectQuestions([...bank, bank[0]], ENDLESS, "smart", new Map());
  assert.equal(drawn.length, bank.length);
  assert.equal(new Set(drawn.map((q) => q.id)).size, bank.length);
  assert.equal(sessionSettings("smart", 20, false, true).trial, true);
});
test("Exam locks 40 questions, no French, and the global timer regardless of previous preferences", () => {
  for (const count of [10, 20, 40, 60, 80]) for (const french of [true, false]) for (const trial of [true, false]) {
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
test("answer time is capped so an idle phone cannot distort the statistics", () => {
  assert.equal(cappedSeconds(12.5), 12.5);
  assert.equal(cappedSeconds(MAX_ANSWER_SECONDS), MAX_ANSWER_SECONDS);
  assert.equal(cappedSeconds(7200), MAX_ANSWER_SECONDS);
  assert.equal(cappedSeconds(-5), 0);
  const idle = statsFor("1", [attempt({ seconds: cappedSeconds(7200) })], now);
  assert.equal(idle.averageSeconds, MAX_ANSWER_SECONDS);
});
test("recent scores separate Catalan successes from the assisted total", () => {
  const rows = [
    ...Array.from({ length: 60 }, (_, i) =>
      attempt({ at: new Date(now - i * 60000).toISOString() }),
    ),
    ...Array.from({ length: 30 }, (_, i) =>
      attempt({
        frenchVisible: true,
        at: new Date(now - (60 + i) * 60000).toISOString(),
      }),
    ),
    ...Array.from({ length: 10 }, (_, i) =>
      attempt({
        correct: false,
        at: new Date(now - (90 + i) * 60000).toISOString(),
      }),
    ),
    // Older than the window: never counted.
    ...Array.from({ length: 50 }, (_, i) =>
      attempt({ at: new Date(now - (200 + i) * 60000).toISOString() }),
    ),
  ];
  const scores = recentScores(rows);
  assert.equal(scores.count, 100);
  assert.equal(scores.catalan, 60);
  assert.equal(scores.total, 90); // Catalan plus the 30 answered with French.
  assert.equal(scores.catalanRate, 0.6);
  assert.equal(scores.totalRate, 0.9);
  const short = recentScores([attempt(), attempt({ frenchVisible: true })]);
  assert.equal(short.count, 2);
  assert.equal(short.catalanRate, 0.5);
  assert.equal(short.totalRate, 1);
  assert.deepEqual(recentScores([]), {
    count: 0,
    catalan: 0,
    total: 0,
    catalanRate: 0,
    totalRate: 0,
  });
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
test("answer order is a fresh permutation that spreads the correct answer over every letter", () => {
  let seed = 7;
  const rng = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const seen = new Map<string, number>();
  const letters = [0, 0, 0];
  for (let i = 0; i < 6000; i++) {
    const order = answerOrder(3, rng);
    assert.deepEqual([...order].sort(), [0, 1, 2]);
    seen.set(order.join(""), (seen.get(order.join("")) ?? 0) + 1);
    letters[order.indexOf(2)]++; // Position shown for the same original answer.
  }
  assert.equal(seen.size, 6);
  for (const n of seen.values()) assert.ok(n > 700 && n < 1300, `permutation share ${n}`);
  for (const n of letters) assert.ok(n > 1800 && n < 2200, `letter share ${n}`);
  assert.deepEqual(answerOrder(1), [0]);
  assert.deepEqual(answerOrder(0), []);
});
