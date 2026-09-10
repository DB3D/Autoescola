export type Mode = "random" | "discovery" | "smart" | "exam";
export interface Question {
  id: string;
  question: string;
  answers: string[];
  correct: number;
  image: string;
  category?: string;
}
export interface Translation {
  question: string;
  answers: string[];
  tip?: string;
}
export interface Attempt {
  id: string;
  sessionId: string;
  questionId: string;
  selected: number | null;
  correct: boolean;
  passed: boolean;
  seconds: number;
  slow_reflex: boolean;
  frenchVisible: boolean;
  frenchManuallyRevealed: boolean;
  at: string;
  timedOut?: boolean;
}
export interface Session {
  id: string;
  mode: Mode | "medium"; // Preserve the labels of previously completed sessions.
  startedAt: string;
  completedAt: string;
  duration: number;
  questionIds: string[];
  attempts: Attempt[];
  timeTrial?: boolean;
  deadlineAt?: string;
  timedOut?: boolean;
}
export function trialRemaining(session: Session, now = Date.now()): number | null {
  if (!session.timeTrial || !session.deadlineAt) return null;
  return Math.max(0, (Date.parse(session.deadlineAt) - now) / 1000);
}
export function sessionSettings(mode: Mode, count: number, french: boolean, trial: boolean) {
  return mode === "exam"
    ? { count: 40, french: false, trial: true }
    : { count, french, trial };
}
export function examPassed(session: Session): boolean {
  return session.mode === "exam" && session.questionIds.length === 40
    && session.attempts.filter(a => a.correct).length >= 38;
}
export function examSummary(sessions: Session[]) {
  const recent = sessions.filter(s => s.mode === "exam" && s.completedAt)
    .sort((a, b) => b.completedAt.localeCompare(a.completedAt)).slice(0, 20);
  const passed = recent.filter(examPassed).length;
  const ready = recent.length >= 5 && recent.slice(0, 5).every(examPassed);
  return { recent, passed, rate: recent.length ? passed / recent.length : null, ready };
}
export interface Stats {
  id: string;
  shown: number;
  successes: number;
  failures: number;
  passes: number;
  successRate: number;
  averageSeconds: number;
  responseTimes: number[];
  lastAsked: string | null;
  lastResult: string | null;
  successesWithFrench: number;
  failuresWithFrench: number;
  successesWithoutFrench: number;
  failuresWithoutFrench: number;
  frenchDependency: number;
  slowCount: number;
  mastery: number;
  priority: number;
  streak: number;
}
const clamp = (n: number) => Math.max(0, Math.min(100, n));
export function masteryCredit(a: Attempt) {
  return (
    (a.seconds <= 15 ? 12 : a.seconds < 50 ? 10 : 4) *
    (a.frenchVisible ? 0.5 : 1)
  );
}
export function statsFor(
  id: string,
  attempts: Attempt[],
  now = Date.now(),
): Stats {
  const rows = attempts
    .filter((a) => a.questionId === id)
    .sort((a, b) => a.at.localeCompare(b.at));
  let mastery = 0,
    streak = 0;
  for (const a of rows) {
    mastery = clamp(
      mastery + (a.correct ? masteryCredit(a) : -22) - (a.slow_reflex ? 6 : 0),
    );
    streak = a.correct ? streak + 1 : 0;
  }
  const n = rows.length,
    successes = rows.filter((a) => a.correct).length,
    fr = rows.filter((a) => a.frenchVisible),
    last = rows.at(-1);
  const age = last ? Math.max(0, (now - Date.parse(last.at)) / 86400000) : 0;
  mastery = clamp(mastery - Math.max(0, age - 3) * 0.6);
  const averageSeconds = n ? rows.reduce((s, a) => s + a.seconds, 0) / n : 0;
  const failures = n - successes,
    frenchDependency = n ? fr.length / n : 0;
  const interval = last?.correct ? Math.min(30, Math.pow(2, streak)) : 0.25;
  const due = Math.min(2, age / interval);
  const suppression = last ? Math.min(1, age / (10 / 1440)) : 0.8;
  const priority = n
    ? (10 +
        (100 - mastery) * 0.45 +
        (failures / n) * 25 +
        Math.min(20, averageSeconds / 3) +
        frenchDependency * 15 +
        due * 20) *
      suppression
    : 55;
  return {
    id,
    shown: n,
    successes,
    failures,
    passes: rows.filter((a) => a.passed).length,
    successRate: n ? successes / n : 0,
    averageSeconds,
    responseTimes: rows.map((a) => a.seconds),
    lastAsked: last?.at ?? null,
    lastResult: last
      ? last.passed
        ? "pass"
        : last.correct
          ? "correct"
          : "incorrect"
      : null,
    successesWithFrench: fr.filter((a) => a.correct).length,
    failuresWithFrench: fr.filter((a) => !a.correct).length,
    successesWithoutFrench: rows.filter((a) => !a.frenchVisible && a.correct)
      .length,
    failuresWithoutFrench: rows.filter((a) => !a.frenchVisible && !a.correct)
      .length,
    frenchDependency,
    slowCount: rows.filter((a) => a.slow_reflex).length,
    mastery,
    priority,
    streak,
  };
}
export function allStats(
  attempts: Attempt[],
  now = Date.now(),
): Map<string, Stats> {
  const groups = new Map<string, Attempt[]>();
  for (const a of attempts) {
    const g = groups.get(a.questionId) ?? [];
    g.push(a);
    groups.set(a.questionId, g);
  }
  return new Map(
    [...groups].map(([id, rows]) => [id, statsFor(id, rows, now)]),
  );
}
export function discoveryWeight(stats: Stats | undefined, now = Date.now()): number {
  if (!stats || stats.shown === 0) return 120;
  const ageDays = stats.lastAsked
    ? Math.max(0, (now - Date.parse(stats.lastAsked)) / 86400000)
    : 30;
  const rarity = 60 / Math.sqrt(stats.shown);
  const overdue = 40 * Math.min(ageDays / 30, 1);
  const recency = 0.25 + 0.75 * Math.min(ageDays, 1);
  return (5 + rarity + overdue) * recency;
}
export function selectQuestions(
  bank: Question[],
  count: number,
  mode: Mode,
  stats: Map<string, Stats>,
  rng = Math.random,
  now = Date.now(),
): Question[] {
  const unique = [...new Map(bank.map((q) => [q.id, q])).values()];
  return unique
    .map((q) => {
      const s = stats.get(q.id);
      const weight =
        mode === "random" || mode === "exam"
          ? 1
          : mode === "discovery"
            ? discoveryWeight(s, now)
            : Math.max(0.1, s?.priority ?? 55);
      return { q, key: -Math.log(Math.max(Number.EPSILON, rng())) / weight };
    })
    .sort((a, b) => a.key - b.key)
    .slice(0, count)
    .map((x) => x.q);
}
// Display order of the answers: position -> index in `question.answers`.
// The source bank always lists the three choices in the same order, so a
// fixed layout lets the position of the correct answer be memorised instead
// of its content. The order is drawn again at every presentation; stored
// attempts keep the original indices.
export function answerOrder(length: number, rng = Math.random): number[] {
  const order = [...Array(length).keys()];
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
