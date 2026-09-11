import type { RevisionQuestion, RevisionRun, RevisionTheme } from './types';
export const TEST_LENGTH = 10;
export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
// Equal coverage of the two lessons, no duplicate questions. Ensure the next
// test changes at least one question even if the random draw repeats the set.
export function drawTest(theme: RevisionTheme, previous: string[] = [], random = Math.random): RevisionQuestion[] {
  const selected = theme.pages.flatMap((_, page) => shuffle(theme.questions.filter(q => q.page === page), random).slice(0, 5));
  if (selected.length !== TEST_LENGTH) throw new Error('Banque de révision incomplète');
  if (selected.every(q => previous.includes(q.id))) {
    const replacement = shuffle(theme.questions.filter(q => q.page === selected[0].page && !previous.includes(q.id)), random)[0];
    if (replacement) selected[0] = replacement;
  }
  return shuffle(selected, random);
}
export function recentRuns(runs: RevisionRun[], themeId: string): RevisionRun[] {
  return runs.filter(r => r.themeId === themeId).sort((a, b) => b.completedAt.localeCompare(a.completedAt) || b.id.localeCompare(a.id)).slice(0, 5);
}
export function mastery(runs: RevisionRun[], themeId: string): number | null {
  const recent = recentRuns(runs, themeId);
  return recent.length ? Math.round(recent.reduce((sum, r) => sum + 100 * r.correct / r.total, 0) / recent.length) : null;
}
export function finishRun(themeId: string, questions: RevisionQuestion[], picks: (number | null)[]): RevisionRun {
  if (questions.length !== TEST_LENGTH || picks.length !== questions.length || picks.some((p, i) => p !== null && (!Number.isInteger(p) || p < 0 || p >= questions[i].answers.length))) throw new Error('Test incomplet');
  return { id: crypto.randomUUID(), themeId, completedAt: new Date().toISOString(), questionIds: questions.map(q => q.id), picks: [...picks], correct: questions.filter((q, i) => picks[i] === q.correct).length, total: questions.length };
}
