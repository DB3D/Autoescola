import type { RevisionQuestion, RevisionRun, RevisionTheme } from './types';
export const TEST_LENGTH = 10;
export const MASTERY_TEST_ID = 'test-maitrise';
export const MASTERY_TEST_LENGTH = 25;
export const FRENCH_CREDIT = 0;
export const runPercent = (run: RevisionRun) => Math.round(100 * (run.points ?? run.correct) / run.total);
export function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
// Balanced coverage of two or three lessons, no duplicate questions. Ensure the next
// test changes at least one question even if the random draw repeats the set.
export function drawTest(theme: RevisionTheme, previous: string[] = [], random = Math.random): RevisionQuestion[] {
  const extraPages = shuffle(theme.pages.map((_, i) => i), random).slice(0, TEST_LENGTH % theme.pages.length);
  const selected = theme.pages.flatMap((_, page) => shuffle(theme.questions.filter(q => q.page === page), random).slice(0, Math.floor(TEST_LENGTH / theme.pages.length) + Number(extraPages.includes(page))));
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
export function mastery(runs: RevisionRun[], themeId: string): number {
  const recent = recentRuns(runs, themeId);
  return Math.round(recent.reduce((sum, r) => sum + 100 * (r.points ?? r.correct) / r.total, 0) / 5);
}
export function overallMastery(runs: RevisionRun[], themes: RevisionTheme[]): number {
  return themes.length ? Math.round(themes.reduce((sum, theme) => sum + mastery(runs, theme.id), 0) / themes.length) : 0;
}
// At least one question from every theme, then a random fill. No theme scores
// are written by this independent assessment, and no question can repeat.
export function drawMasteryTest(themes: RevisionTheme[], previous: string[] = [], random = Math.random): RevisionQuestion[] {
  const pool = [...new Map(themes.flatMap(t => t.questions).map(q => [q.id, q])).values()];
  if (pool.length < MASTERY_TEST_LENGTH || themes.length > MASTERY_TEST_LENGTH || themes.some(t => !t.questions.length)) throw new Error('Banque de maîtrise incomplète');
  const selected = themes.map(t => shuffle(t.questions, random)[0]);
  const chosen = new Set(selected.map(q => q.id));
  selected.push(...shuffle(pool.filter(q => !chosen.has(q.id)), random).slice(0, MASTERY_TEST_LENGTH - selected.length));
  if (selected.every(q => previous.includes(q.id))) {
    const owner = themes.find(t => t.questions.some(q => q.id === selected[0].id))!;
    const replacement = shuffle(owner.questions.filter(q => !previous.includes(q.id)), random)[0];
    if (replacement) selected[0] = replacement;
    else {
      const alternate = shuffle(pool.filter(q => !previous.includes(q.id)), random)[0];
      if (alternate) selected[selected.length - 1] = alternate;
    }
  }
  return shuffle(selected, random);
}
export function finishRun(themeId: string, questions: RevisionQuestion[], picks: (number | null)[], frenchUsed = questions.map(() => false)): RevisionRun {
  if (questions.length !== (themeId === MASTERY_TEST_ID ? MASTERY_TEST_LENGTH : TEST_LENGTH) || picks.length !== questions.length || picks.some((p, i) => p !== null && (!Number.isInteger(p) || p < 0 || p >= questions[i].answers.length))) throw new Error('Test incomplet');
  if (frenchUsed.length !== questions.length || frenchUsed.some(used => typeof used !== 'boolean')) throw new Error('Aide française invalide');
  const points = Math.round(10 * questions.reduce((sum, q, i) => sum + (picks[i] === q.correct ? frenchUsed[i] ? FRENCH_CREDIT : 1 : 0), 0)) / 10;
  return { id: crypto.randomUUID(), themeId, completedAt: new Date().toISOString(), questionIds: questions.map(q => q.id), picks: [...picks], correct: questions.filter((q, i) => picks[i] === q.correct).length, total: questions.length, points, frenchUsed: [...frenchUsed] };
}
