import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { themes } from './content';
import { drawTest, drawMasteryTest, finishRun, mastery, overallMastery, recentRuns, runPercent, shuffle, MASTERY_TEST_ID } from './engine';
import { questionThemes } from './catalog';
import { readRuns, saveRun } from './storage';
import { readAll } from '../storage';
import type { RevisionRun } from './types';
import source from '../data/questions.json';

test('18 independent themes, 37 lessons and 259 unique bilingual questions linked to their lessons', () => {
  assert.equal(themes.length, 18);
  assert.equal(themes.filter(t => t.categories.includes('CATALA')).length, 5);
  assert.equal(themes.reduce((n, t) => n + t.pages.length, 0), 37);
  const bank = new Map(source.tests.flatMap(t => t.questions).map(q => [q.question_id, q]));
  const ids = new Set<string>();
  for (const theme of themes) {
    assert.equal(theme.pages.length, theme.id === 'code-expert' ? 3 : 2);
    assert.equal(theme.questions.length, theme.pages.length * 7);
    for (const id of theme.bankIds) assert.ok(bank.has(id), `${theme.id}: missing source ${id}`);
    for (const category of theme.categories.filter(c => c !== 'CATALA')) assert.ok([...bank.values()].some(q => q.category === category));
    theme.pages.forEach((page, i) => {
      assert.ok(page.facts.length >= 5);
      assert.ok(page.grammar.ca && page.grammar.fr && page.tip && page.words.length);
      assert.equal(theme.questions.filter(q => q.page === i).length, 7);
    });
    for (const q of theme.questions) {
      assert.ok(!ids.has(q.id)); ids.add(q.id);
      assert.ok(theme.pages[q.page]);
      assert.equal(questionThemes.get(q.id)?.id, theme.id);
      assert.equal(q.answers.length, 3);
      assert.equal(new Set(q.answers).size, 3);
      assert.ok(q.answers[q.correct] && q.explanation && q.prompt);
      assert.ok(q.french.prompt.trim(), `${q.id}: missing French question`);
      assert.equal(q.french.answers.length, q.answers.length);
      assert.ok(q.french.answers.every(answer => answer.trim()), `${q.id}: missing French answer`);
      assert.equal(new Set(q.french.answers).size, 3, `${q.id}: ambiguous French choices`);
      assert.ok(!/\b(aquest senyal|aquesta imatge)\b/i.test(q.prompt), `${q.id} depends on a missing image`);
    }
  }
  assert.equal(ids.size, 259);
});

test('random tests balance lesson coverage, have no repeats and change from the previous set', () => {
  for (const theme of themes) {
    let previous: string[] = [];
    for (let n = 0; n < 30; n++) {
      const questions = drawTest(theme, previous);
      assert.equal(questions.length, 10);
      assert.equal(new Set(questions.map(q => q.id)).size, 10);
      const coverage = theme.pages.map((_, p) => questions.filter(q => q.page === p).length).sort();
      assert.deepEqual(coverage, theme.pages.length === 3 ? [3, 3, 4] : [5, 5]);
      assert.ok(questions.some(q => !previous.includes(q.id)));
      previous = questions.map(q => q.id);
    }
    const first = drawTest(theme, [], () => 0.99);
    const second = drawTest(theme, first.map(q => q.id), () => 0.99);
    assert.ok(second.some(q => !first.some(previous => previous.id === q.id)), 'repeated random sequence still changes the set');
  }
});

test('answer shuffling changes presentation without mutating the answer key', () => {
  const original = [0, 1, 2];
  assert.deepEqual(shuffle(original, () => 0), [1, 2, 0]);
  assert.deepEqual(original, [0, 1, 2]);
});

test('scores count errors and skips as zero and reject incomplete tests', () => {
  const q = drawTest(themes[0]);
  const picks = q.map((item, i) => i < 6 ? item.correct : i < 8 ? 1 : null);
  const run = finishRun(themes[0].id, q, picks);
  assert.equal(run.correct, 6);
  assert.equal(run.total, 10);
  assert.equal(mastery([run], themes[0].id), 12);
  assert.throws(() => finishRun(themes[0].id, q, picks.slice(0, 9)));
  assert.throws(() => finishRun(themes[0].id, q, [...picks.slice(0, 9), 5]));
  assert.equal(finishRun(themes[0].id, q, q.map(() => null)).correct, 0);
  assert.equal(finishRun(themes[0].id, q, q.map(item => item.correct)).correct, 10);
});

test('mastery uses only the five latest completed tests for that theme, even out of order', () => {
  const q = drawTest(themes[0]);
  const runs: RevisionRun[] = [0, 2, 4, 6, 8, 10].map((correct, i) => ({ ...finishRun('routes', q, q.map(item => item.correct)), id: `run-${i}`, correct, points: correct, completedAt: `2026-09-${String(i + 1).padStart(2, '0')}T12:00:00.000Z` }));
  assert.equal(mastery([], 'routes'), 0);
  assert.equal(mastery([runs[0]], 'routes'), 0);
  assert.equal(mastery(runs.slice(0, 2), 'routes'), 4);
  assert.equal(mastery([...runs].reverse(), 'routes'), 60);
  assert.equal(recentRuns(runs, 'routes').length, 5);
  assert.equal(mastery([...runs, { ...runs[5], themeId: 'other', correct: 0 }], 'routes'), 60);
  assert.equal(mastery(runs, 'other'), 0);
});

test('separate database persists completed runs idempotently and leaves driving stores untouched', async () => {
  const before = await readAll('attempts');
  const questions = drawTest(themes[1]);
  const run = finishRun(themes[1].id, questions, questions.map(q => q.correct));
  await Promise.all([saveRun(run), saveRun(run)]);
  const loaded = await readRuns();
  assert.equal(loaded.filter(r => r.id === run.id).length, 1);
  assert.deepEqual(loaded.find(r => r.id === run.id), run);
  assert.deepEqual(await readAll('attempts'), before);
  assert.equal(mastery(loaded, themes[1].id), 20);
});

test('French-assisted answers earn no mastery credit, even when correct', async () => {
  const q = drawTest(themes[0]);
  const picks = q.map((item, i) => i < 8 ? item.correct : i === 8 ? 1 : null);
  const french = q.map((_, i) => i >= 5);
  const run = finishRun('routes', q, picks, french);
  assert.equal(run.correct, 8);
  assert.equal(run.points, 5);
  assert.equal(runPercent(run), 50);
  french[0] = true;
  assert.equal(run.frenchUsed![0], false, 'saved assistance flags are copied');
  await saveRun(run);
  assert.deepEqual((await readRuns()).find(r => r.id === run.id), run);
  const allFrench = finishRun('routes', q, q.map(item => item.correct), q.map(() => true));
  assert.equal(allFrench.correct, 10);
  assert.equal(allFrench.points, 0);
  assert.equal(runPercent(allFrench), 0);
  assert.throws(() => finishRun('routes', q, picks, [true]));
});

test('last-five mastery mixes weighted scores and legacy scores without changing historical credit', () => {
  const q = drawTest(themes[0]);
  const legacy = { ...finishRun('routes', q, q.map(item => item.correct)), correct: 8 };
  delete legacy.points; delete legacy.frenchUsed;
  assert.equal(runPercent(legacy), 80);
  const weighted = finishRun('routes', q, q.map(item => item.correct), q.map(() => true));
  assert.equal(mastery([legacy, weighted], 'routes'), 16);
  const runs = Array.from({ length: 6 }, (_, i) => ({ ...weighted, id: `weighted-${i}`, points: i === 0 ? 10 : 0, completedAt: `2026-09-${10 + i}T12:00:00Z` }));
  assert.equal(mastery(runs, 'routes'), 0, 'sixth-oldest score falls out of the average');
  assert.equal(mastery([{ ...weighted, points: 0 }], 'routes'), 0, 'zero points do not fall back to correct count');
});

test('missing tests count as zero: 100% builds mastery from 20% to 100% over five runs', () => {
  const q = drawTest(themes[0]);
  const perfect = finishRun('routes', q, q.map(item => item.correct));
  const runs: RevisionRun[] = [];
  for (let i = 0; i < 5; i++) {
    runs.push({ ...perfect, id: `perfect-${i}`, completedAt: `2026-09-${10 + i}T12:00:00Z` });
    assert.equal(mastery(runs, 'routes'), (i + 1) * 20);
  }
  runs.push({ ...perfect, id: 'failed-latest', points: 0, correct: 0, completedAt: '2026-09-16T12:00:00Z' });
  assert.equal(mastery(runs, 'routes'), 80, 'a new zero replaces one old perfect test');
  assert.equal(overallMastery(runs.slice(0, 5), themes), 6, 'untested themes contribute zero');
  assert.equal(overallMastery([{ ...perfect, themeId: MASTERY_TEST_ID }], themes), 0, 'global assessment is independent');
});

test('global mastery draws 25 unique questions across every theme and retains source lesson links', () => {
  let previous: string[] = [];
  for (let i = 0; i < 50; i++) {
    const questions = drawMasteryTest(themes, previous);
    assert.equal(questions.length, 25);
    assert.equal(new Set(questions.map(q => q.id)).size, 25);
    assert.equal(new Set(questions.map(q => questionThemes.get(q.id)!.id)).size, 18);
    assert.ok(questions.some(q => !previous.includes(q.id)));
    for (const q of questions) assert.ok(questionThemes.get(q.id)!.pages[q.page]);
    previous = questions.map(q => q.id);
  }
  const first = drawMasteryTest(themes, [], () => 0.99);
  const second = drawMasteryTest(themes, first.map(q => q.id), () => 0.99);
  assert.ok(second.some(q => !first.some(p => p.id === q.id)));
  const run = finishRun(MASTERY_TEST_ID, first, first.map(q => q.correct));
  assert.equal(run.total, 25);
  assert.equal(runPercent(run), 100);
  assert.equal(mastery([run], MASTERY_TEST_ID), 20);
  assert.throws(() => finishRun(MASTERY_TEST_ID, first.slice(0, 24), first.slice(0, 24).map(q => q.correct)));
  assert.equal(runPercent(finishRun(MASTERY_TEST_ID, first, first.map(q => q.correct), first.map(() => true))), 0);
});
