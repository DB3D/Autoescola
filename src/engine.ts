import { EXAM_QUOTAS, examGroup, questionCategory, categoryLabel, type ExamGroup } from "./categories";
import { discover } from "./discovery";

export type Mode = "random" | "discovery" | "smart" | "exam";
export interface Question {
  id: string;
  question: string;
  answers: string[];
  correct: number;
  image: string;
  category?: string;
  test?: number;
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
  endless?: boolean; // Runs until stopped: questionIds grows as questions are served.
}
// The endless length draws from the whole bank instead of a fixed count.
export const ENDLESS = Infinity;
// A question never times out, but a phone left awake would otherwise record
// hours on a single answer and distort average time, priority and totals.
export const MAX_ANSWER_SECONDS = 120;
export function cappedSeconds(seconds: number): number {
  return Math.min(Math.max(0, seconds), MAX_ANSWER_SECONDS);
}
// Attempts recorded before the cap existed can hold hours on one question.
export function capAttempt(attempt: Attempt): Attempt {
  return attempt.seconds > MAX_ANSWER_SECONDS
    ? { ...attempt, seconds: MAX_ANSWER_SECONDS }
    : attempt;
}
// The Catalan score counts only answers found without revealing the French
// text; the total score counts every correct answer, French-assisted included.
export function recentScores(attempts: Attempt[], size = 100) {
  const recent = [...attempts]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, size);
  const count = recent.length,
    catalan = recent.filter((a) => a.correct && !a.frenchVisible).length,
    total = recent.filter((a) => a.correct).length;
  return {
    count,
    catalan,
    total,
    catalanRate: count ? catalan / count : 0,
    totalRate: count ? total / count : 0,
  };
}
// What a Català quiz run cost in time, so that practice time can be counted
// alongside the question bank.
export interface QuizRun {
  id: string;
  completedAt: string;
  questions: number;
  correct: number;
  seconds: number;
}
// One answer in the Català quiz, the basis of its difficulty tracking. It is
// kept apart from Attempt so the quiz can never move a driving-question score.
export interface QuizAttempt {
  id: string;
  runId: string;
  questionId: string;
  selected: number | null; // Index in the file's answers; null when skipped.
  correct: boolean;
  passed: boolean;
  seconds: number;
  at: string;
}
export interface PracticeDay {
  key: string; // Local YYYY-MM-DD: practice is counted in the user's own days.
  date: Date;
  questionSeconds: number;
  quizSeconds: number;
  revisionSeconds: number;
  totalSeconds: number;
}
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
// Driving questions retain their answer cap. Revision supplies separate
// visible-study checkpoints already split by local day, without that cap.
export function practiceDays(
  attempts: Attempt[],
  runs: QuizRun[],
  days = 7,
  now = new Date(),
  revisionTime: { day: string; seconds: number }[] = [],
): PracticeDay[] {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const buckets = new Map<string, PracticeDay>();
  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    buckets.set(dayKey(date), {
      key: dayKey(date),
      date,
      questionSeconds: 0,
      quizSeconds: 0,
      revisionSeconds: 0,
      totalSeconds: 0,
    });
  }
  for (const a of attempts) {
    const day = buckets.get(dayKey(new Date(a.at)));
    if (day) day.questionSeconds += cappedSeconds(a.seconds);
  }
  for (const r of runs) {
    const day = buckets.get(dayKey(new Date(r.completedAt)));
    if (day) day.quizSeconds += Math.max(0, r.seconds);
  }
  for (const row of revisionTime) {
    const day = buckets.get(row.day);
    if (day && Number.isFinite(row.seconds)) day.revisionSeconds += Math.max(0, row.seconds);
  }
  for (const day of buckets.values())
    day.totalSeconds = day.questionSeconds + day.quizSeconds + day.revisionSeconds;
  return [...buckets.values()]; // Most recent first, as they were created.
}
// Lifetime time across driving, Català and Revision; scores remain separate.
export function totalPracticeSeconds(
  attempts: Attempt[],
  runs: QuizRun[],
  revisionTime: { seconds: number }[] = [],
): number {
  return (
    attempts.reduce((s, a) => s + cappedSeconds(a.seconds), 0) +
    runs.reduce((s, r) => s + Math.max(0, r.seconds), 0) +
    revisionTime.reduce((s, r) => s + (Number.isFinite(r.seconds) ? Math.max(0, r.seconds) : 0), 0)
  );
}
export function trialRemaining(session: Session, now = Date.now()): number | null {
  if (!session.timeTrial || !session.deadlineAt) return null;
  return Math.max(0, (Date.parse(session.deadlineAt) - now) / 1000);
}
export function sessionSettings(mode: Mode, count: number, french: boolean, trial: boolean) {
  // An endless session has no question count, so it can have no global clock.
  return mode === "exam"
    ? { count: 40, french: false, trial: true }
    : { count, french, trial: count === ENDLESS ? false : trial };
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
  catalanMastery: number;
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
    catalanMastery = 0,
    streak = 0;
  for (const a of rows) {
    mastery = clamp(
      mastery + (a.correct ? masteryCredit(a) : -22) - (a.slow_reflex ? 6 : 0),
    );
    catalanMastery = clamp(
      catalanMastery + (a.correct ? (a.frenchVisible ? 0 : masteryCredit(a)) : -22)
      - (a.slow_reflex ? 6 : 0),
    );
    streak = a.correct ? streak + 1 : 0;
  }
  const n = rows.length,
    successes = rows.filter((a) => a.correct).length,
    fr = rows.filter((a) => a.frenchVisible),
    last = rows.at(-1);
  const age = last ? Math.max(0, (now - Date.parse(last.at)) / 86400000) : 0;
  mastery = clamp(mastery - Math.max(0, age - 3) * 0.6);
  catalanMastery = clamp(catalanMastery - Math.max(0, age - 3) * 0.6);
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
    catalanMastery,
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
export interface MasterySummary {
  total: number;
  practiced: number;
  catalan: number;
  combined: number;
}
export function categoryProgress(bank: Question[], stats: ReadonlyMap<string, Stats>) {
  const groups = new Map<string, MasterySummary>();
  const total: MasterySummary = { total: 0, practiced: 0, catalan: 0, combined: 0 };
  for (const q of new Map(bank.map(q => [q.id, q])).values()) {
    const category = questionCategory(q);
    const group = groups.get(category) ?? { total: 0, practiced: 0, catalan: 0, combined: 0 };
    groups.set(category, group);
    const s = stats.get(q.id);
    for (const row of [group, total]) {
      row.total++;
      row.practiced += s?.shown ? 1 : 0;
      row.catalan += s?.catalanMastery ?? 0;
      row.combined += s?.mastery ?? 0;
    }
  }
  for (const row of [...groups.values(), total]) {
    row.catalan = row.total ? row.catalan / row.total : 0;
    row.combined = row.total ? row.combined / row.total : 0;
  }
  return {
    total,
    categories: [...groups].map(([id, row]) => ({ id, ...row }))
      .sort((a, b) => categoryLabel(a.id).localeCompare(categoryLabel(b.id), "fr")),
  };
}

function selectExam(bank: Question[], rng: () => number): Question[] {
  const groups: Record<ExamGroup, Question[]> = { normativa: [], seguretat: [], senyals: [] };
  for (const q of bank) groups[examGroup(q)].push(q);
  const selected: Question[] = [];
  for (const group of Object.keys(EXAM_QUOTAS) as ExamGroup[]) {
    const quota = EXAM_QUOTAS[group];
    if (groups[group].length < quota)
      throw new Error(`Pas assez de questions pour l’examen : ${group} (${groups[group].length}/${quota}).`);
    selected.push(...answerOrder(groups[group].length, rng).slice(0, quota).map(i => groups[group][i]));
  }
  return answerOrder(selected.length, rng).map(i => selected[i]);
}
export function selectQuestions(
  bank: Question[],
  count: number,
  mode: Mode,
  stats: Map<string, Stats>,
  rng = Math.random,
): Question[] {
  const unique = [...new Map(bank.map((q) => [q.id, q])).values()];
  if (mode === "discovery") return discover(unique, count, stats, rng);
  if (mode === "exam") return selectExam(unique, rng);
  return unique
    .map((q) => {
      const s = stats.get(q.id);
      const weight =
        mode === "random"
          ? 1
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
