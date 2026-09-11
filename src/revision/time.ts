import type { RevisionTime } from './types';

export const localDay = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
export function studyDuration(seconds: number) {
  const whole = Math.floor(seconds);
  if (whole < 60) return `${whole} s`;
  if (whole < 3600) return `${Math.floor(whole / 60)} min ${String(whole % 60).padStart(2, '0')} s`;
  return `${Math.floor(whole / 3600)} h ${String(Math.floor(whole / 60) % 60).padStart(2, '0')} min`;
}

// Clock logic is independent of the DOM and persistence. Monotonic elapsed time
// avoids clock adjustments; calendar boundaries assign seconds to local days.
export class StudyClock {
  private sessionId = '';
  private themeId = '';
  private last: number | null = null;
  private rows = new Map<string, RevisionTime>();
  constructor(private update: (row: RevisionTime) => void, private mono = () => performance.now(), private wall = () => Date.now(), private uuid: () => string = () => crypto.randomUUID()) {}
  start(themeId: string, visible = true) {
    if (this.themeId === themeId) return;
    this.stop();
    this.sessionId = this.uuid(); this.themeId = themeId; this.rows.clear();
    this.last = visible ? this.mono() : null;
  }
  tick() {
    if (this.last === null) return;
    const now = this.mono(), duration = Math.max(0, now - this.last);
    this.last = now;
    const end = this.wall();
    let cursor = end - duration;
    while (cursor < end) {
      const date = new Date(cursor), day = localDay(date);
      const midnight = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).getTime();
      const stop = Math.min(end, midnight);
      const prior = this.rows.get(day);
      const row = { id: `${this.sessionId}:${day}`, sessionId: this.sessionId, themeId: this.themeId, day, seconds: (prior?.seconds ?? 0) + (stop - cursor) / 1000 };
      this.rows.set(day, row); this.update({ ...row });
      cursor = stop;
    }
  }
  pause() { this.tick(); this.last = null; }
  resume() { if (this.themeId && this.last === null) this.last = this.mono(); }
  stop() { this.pause(); this.themeId = ''; }
  running() { return !!this.themeId; }
  seconds() { return [...this.rows.values()].reduce((sum, row) => sum + row.seconds, 0); }
}

export function mergeTime(...groups: RevisionTime[][]): RevisionTime[] {
  const rows = new Map<string, RevisionTime>();
  for (const row of groups.flat()) {
    if (!row || !Number.isFinite(row.seconds) || row.seconds < 0 || typeof row.id !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(row.day)) continue;
    if (!rows.has(row.id) || rows.get(row.id)!.seconds < row.seconds) rows.set(row.id, row);
  }
  return [...rows.values()];
}
