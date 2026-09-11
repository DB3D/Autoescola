import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { themes } from './content';
import { drawTest, finishRun, mastery, recentRuns, shuffle } from './engine';
import { readRuns, saveRun } from './storage';
import { readAll } from '../storage';
import type { RevisionRun } from './types';
import source from '../data/questions.json';

test('14 independent themes, 28 lessons and 196 unique, explicitly linked questions', () => {
  assert.equal(themes.length, 14);
  assert.equal(themes.filter(t => t.categories.includes('CATALA')).length, 2);
  const bank = new Map(source.tests.flatMap(t => t.questions).map(q => [q.question_id, q]));
  const ids = new Set<string>();
  for (const theme of themes) {
    assert.equal(theme.pages.length, 2);
    assert.equal(theme.questions.length, 14);
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
      assert.equal(q.answers.length, 3);
      assert.equal(new Set(q.answers).size, 3);
      assert.ok(q.answers[q.correct] && q.explanation && q.prompt);
      assert.ok(!/\b(aquest senyal|aquesta imatge)\b/i.test(q.prompt), `${q.id} depends on a missing image`);
    }
  }
  assert.equal(ids.size, 196);
});

test('random tests cover both lessons equally, have no repeats and change from the previous set', () => {
  for (const theme of themes) {
    let previous: string[] = [];
    for (let n = 0; n < 30; n++) {
      const questions = drawTest(theme, previous);
      assert.equal(questions.length, 10);
      assert.equal(new Set(questions.map(q => q.id)).size, 10);
      assert.equal(questions.filter(q => q.page === 0).length, 5);
      assert.equal(questions.filter(q => q.page === 1).length, 5);
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
  assert.equal(mastery([run], themes[0].id), 60);
  assert.throws(() => finishRun(themes[0].id, q, picks.slice(0, 9)));
  assert.throws(() => finishRun(themes[0].id, q, [...picks.slice(0, 9), 5]));
  assert.equal(finishRun(themes[0].id, q, q.map(() => null)).correct, 0);
  assert.equal(finishRun(themes[0].id, q, q.map(item => item.correct)).correct, 10);
});

test('mastery uses only the five latest completed tests for that theme, even out of order', () => {
  const q = drawTest(themes[0]);
  const runs: RevisionRun[] = [0, 2, 4, 6, 8, 10].map((correct, i) => ({ ...finishRun('routes', q, q.map(item => item.correct)), id: `run-${i}`, correct, completedAt: `2026-09-${String(i + 1).padStart(2, '0')}T12:00:00.000Z` }));
  assert.equal(mastery([], 'routes'), null);
  assert.equal(mastery([runs[0]], 'routes'), 0);
  assert.equal(mastery(runs.slice(0, 2), 'routes'), 10);
  assert.equal(mastery([...runs].reverse(), 'routes'), 60);
  assert.equal(recentRuns(runs, 'routes').length, 5);
  assert.equal(mastery([...runs, { ...runs[5], themeId: 'other', correct: 0 }], 'routes'), 60);
  assert.equal(mastery(runs, 'other'), null);
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
  assert.equal(mastery(loaded, themes[1].id), 100);
});
