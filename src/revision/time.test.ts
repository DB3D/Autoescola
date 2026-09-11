import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import { localDay, mergeTime, StudyClock } from './time';
import { readRuns, readTime, saveTime } from './storage';
import { practiceDays, totalPracticeSeconds, type Attempt } from '../engine';
import type { RevisionTime } from './types';

function fixture(start = new Date(2026, 8, 11, 12).getTime()) {
  let mono = 0, wall = start, id = 0;
  let entries: RevisionTime[] = [];
  const clock = new StudyClock(row => { entries = mergeTime(entries, [row]); }, () => mono, () => wall, () => `session-${++id}`);
  return { clock, entries: () => entries, advance(seconds: number) { mono += seconds * 1000; wall += seconds * 1000; } };
}

test('opening a theme starts timing; page/test transitions keep one clock; leaving stops it', () => {
  const f = fixture();
  f.advance(50); f.clock.tick(); assert.equal(f.entries().length, 0);
  f.clock.start('routes'); f.advance(90); f.clock.tick();
  f.clock.start('routes'); // Second lesson / test.
  f.advance(30); f.clock.stop();
  assert.equal(f.clock.seconds(), 120);
  assert.equal(f.entries().length, 1);
  f.advance(60); f.clock.tick(); assert.equal(f.clock.seconds(), 120);
  f.clock.start('routes'); f.advance(10); f.clock.stop();
  assert.equal(f.clock.seconds(), 10);
  assert.equal(f.entries().length, 2);
  assert.equal(f.entries().reduce((sum, row) => sum + row.seconds, 0), 130);
});

test('background/locked time is excluded; resumed reading and different themes remain separate', () => {
  const f = fixture();
  f.clock.start('routes'); f.advance(20); f.clock.pause();
  f.advance(3600); f.clock.tick(); assert.equal(f.clock.seconds(), 20);
  f.clock.resume(); f.clock.resume(); f.advance(10); f.clock.tick();
  f.clock.start('priorites'); f.advance(15); f.clock.stop();
  assert.deepEqual(f.entries().map(row => [row.themeId, row.seconds]), [['routes', 30], ['priorites', 15]]);
});

test('a hidden initial screen only starts counting when it becomes visible', () => {
  const f = fixture();
  f.clock.start('routes', false); f.advance(60); f.clock.tick();
  assert.equal(f.entries().length, 0);
  f.clock.resume(); f.advance(5); f.clock.stop();
  assert.equal(f.clock.seconds(), 5);
});

test('a reading interval crossing local midnight is allocated to both days', () => {
  const start = new Date(2026, 8, 11, 23, 59, 50);
  const f = fixture(start.getTime());
  f.clock.start('routes'); f.advance(25); f.clock.stop();
  assert.deepEqual(f.entries().map(row => [row.day, row.seconds]), [['2026-09-11', 10], ['2026-09-12', 15]]);
});

test('time recovery merges cumulative checkpoints by maximum without double-counting', () => {
  const row: RevisionTime = { id:'a', sessionId:'s', themeId:'routes', day:'2026-09-11', seconds:15 };
  assert.deepEqual(mergeTime([row], [{...row, seconds:20}], [{...row, seconds:10}]), [{...row, seconds:20}]);
  assert.equal(mergeTime([{...row, seconds:NaN}]).length, 0);
});

test('reading-only time contributes to daily and lifetime totals without the answer cap', () => {
  const today = new Date(2026, 8, 11, 12), day = localDay(today);
  const revision = [{day, seconds:600}, {day:'2026-09-01', seconds:1200}];
  const attempt = {seconds:30, at:today.toISOString()} as Attempt;
  const quiz = {id:'q', completedAt:today.toISOString(), questions:1, correct:1, seconds:40};
  const [bucket] = practiceDays([attempt], [quiz], 3, today, revision);
  assert.equal(bucket.revisionSeconds, 600);
  assert.equal(bucket.totalSeconds, 670);
  assert.equal(totalPracticeSeconds([attempt], [quiz], revision), 1870);
  assert.equal(totalPracticeSeconds([], [], revision), 1800);
});

test('version 1 revision results survive the upgrade adding time checkpoints', async () => {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open('autoescola-revision', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('runs', {keyPath:'id'});
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('runs', 'readwrite');
    tx.objectStore('runs').put({id:'legacy-score', themeId:'routes', correct:7,total:10});
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error);
  });
  db.close();
  const row: RevisionTime = {id:'study:2026-09-11',sessionId:'study',themeId:'routes',day:'2026-09-11',seconds:20};
  await saveTime([row]);
  await Promise.all([saveTime([{...row,seconds:30}]), saveTime([{...row,seconds:10}])]);
  assert.equal((await readRuns()).find(r=>r.id==='legacy-score')?.correct,7);
  assert.equal((await readTime()).length,1);
  assert.equal((await readTime())[0].seconds,30);
});
