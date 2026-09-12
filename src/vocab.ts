import quiz from "./data/quizz.json";
import type { QuizAttempt } from "./engine";
import { discover } from "./discovery";

export type VocabQuestion = {
  id: string;
  type: string;
  prompt: string;
  catalan: string;
  answers: string[];
  correct_option: number; // 1-based, as in the question bank.
  note: string;
  answer_lang?: string; // "ca" when the choices are Catalan words, not French.
};
export type QuizMode = "random" | "smart" | "discovery";

export const VOCAB_LENGTH = quiz.quiz_length;
export const vocabBank: VocabQuestion[] = quiz.questions;
export const vocabTypeName: Record<string, string> = quiz.types;

// Coverage of successful quiz answers. Repeating the same win cannot inflate
// the total, and attempts for removed/unknown questions do not count.
export function vocabCoverage(attempts: QuizAttempt[], questions: VocabQuestion[] = vocabBank) {
  const ids = new Set(questions.map(q => q.id));
  const won = new Set(attempts.filter(a => a.correct && !a.passed && ids.has(a.questionId)).map(a => a.questionId)).size;
  return { won, total: ids.size, percent: ids.size ? 100 * won / ids.size : 0 };
}

export interface VocabStats {
  id: string;
  shown: number;
  successes: number;
  failures: number; // Skips included: a word you cannot name is not known.
  passes: number;
  mastery: number;
  difficulty: number; // 100 - mastery.
  streak: number;
  lastAsked: string | null;
  priority: number;
}
// A known word is read at a glance, so only a quick answer earns full credit.
export const QUICK_SECONDS = 8;
// Never-seen words keep coming into the intelligent mode, but there are
// hundreds of them: any higher and they would crowd out the difficult ones.
export const UNSEEN_PRIORITY = 20;
const DAY = 86400000;
const clamp = (n: number) => Math.max(0, Math.min(100, n));

// Mastery starts halfway, so one answer already places a word: a miss makes
// it difficult, two quick successes make it known.
export function vocabStatsFor(
  id: string,
  attempts: QuizAttempt[],
  now = Date.now(),
): VocabStats {
  const rows = attempts
    .filter((a) => a.questionId === id)
    .sort((a, b) => a.at.localeCompare(b.at));
  let mastery = 50,
    streak = 0;
  for (const a of rows) {
    mastery = clamp(
      mastery + (a.correct ? (a.seconds <= QUICK_SECONDS ? 15 : 8) : -25),
    );
    streak = a.correct ? streak + 1 : 0;
  }
  const n = rows.length,
    successes = rows.filter((a) => a.correct).length,
    last = rows.at(-1);
  const age = last ? Math.max(0, (now - Date.parse(last.at)) / DAY) : 0;
  if (n) mastery = clamp(mastery - Math.max(0, age - 3) * 0.5);
  const difficulty = 100 - mastery;
  // A missed word is due again within the hour; each success in a row
  // doubles the wait, up to a month.
  const interval = last?.correct ? Math.min(30, 2 ** streak) : 1 / 24;
  const due = Math.min(2, age / interval);
  const suppression = Math.min(1, age / (10 / 1440));
  // Squared, so a difficult word (245 at worst) outweighs a known one (13 to
  // 33) many times over, instead of merely a few.
  const priority = n
    ? (5 + 0.02 * difficulty ** 2 + ((n - successes) / n) * 20 + due * 10) *
      suppression
    : UNSEEN_PRIORITY;
  return {
    id,
    shown: n,
    successes,
    failures: n - successes,
    passes: rows.filter((a) => a.passed).length,
    mastery,
    difficulty,
    streak,
    lastAsked: last?.at ?? null,
    priority,
  };
}
export function vocabStats(
  attempts: QuizAttempt[],
  now = Date.now(),
): Map<string, VocabStats> {
  const groups = new Map<string, QuizAttempt[]>();
  for (const a of attempts) {
    const g = groups.get(a.questionId) ?? [];
    g.push(a);
    groups.set(a.questionId, g);
  }
  return new Map(
    [...groups].map(([id, rows]) => [id, vocabStatsFor(id, rows, now)]),
  );
}
export type DifficultyTier = "hard" | "shaky" | "known" | "new";
export function difficultyTier(stats?: VocabStats): DifficultyTier {
  if (!stats?.shown) return "new";
  return stats.difficulty >= 55 ? "hard" : stats.difficulty > 25 ? "shaky" : "known";
}

// Random is a plain shuffle of the whole bank. Intelligent draws without
// replacement, weighted by priority, so difficult words come back often
// without the run locking onto the same handful.
export function drawVocab(
  count = VOCAB_LENGTH,
  bank: VocabQuestion[] = vocabBank,
  mode: QuizMode = "random",
  stats: Map<string, VocabStats> = new Map(),
  rng = Math.random,
): VocabQuestion[] {
  if (mode === "discovery") return discover(bank, count, stats, rng);
  if (mode === "smart")
    return bank
      .map((q) => ({
        q,
        key:
          -Math.log(Math.max(Number.EPSILON, rng())) /
          Math.max(0.1, stats.get(q.id)?.priority ?? UNSEEN_PRIORITY),
      }))
      .sort((a, b) => a.key - b.key)
      .slice(0, count)
      .map((x) => x.q);
  const pool = [...bank];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}
