import { readTime, saveTime } from './storage';
import { mergeTime, StudyClock, studyDuration } from './time';
import type { RevisionTime } from './types';

const JOURNAL = 'autoescola-revision-time:';
export function createTimeTracking() {
  let rows = new Map<string, RevisionTime>();
  const pending = new Map<string, RevisionTime>();
  let failed = false;
  let flushing: Promise<void> | null = null;
  const clock = new StudyClock(row => {
    rows.set(row.id, row); pending.set(row.id, row);
    // Synchronous recovery journal: mobile page teardown may cancel IndexedDB.
    try { localStorage.setItem(JOURNAL + row.id, JSON.stringify(row)); } catch { /* IndexedDB is still attempted. */ }
  });
  function updateHeader() {
    document.querySelectorAll<HTMLElement>('[data-study-theme]').forEach(el => {
      el.textContent = studyDuration([...rows.values()].filter(row => row.themeId === el.dataset.studyTheme).reduce((sum, row) => sum + row.seconds, 0));
    });
    const el = document.querySelector<HTMLElement>('#revision-clock');
    if (!el) return;
    const seconds = Math.floor(clock.seconds()), hours = Math.floor(seconds / 3600);
    const minute = Math.floor(seconds / 60) % 60;
    el.textContent = hours ? `${hours}:${String(minute).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}` : `${minute}:${String(seconds % 60).padStart(2, '0')}`;
    el.title = 'Temps de cette révision · lecture et tests';
    const status = document.querySelector<HTMLElement>('#revision-time-status');
    if (status) { status.hidden = !failed; status.textContent = 'Temps non sauvegardé'; }
  }
  async function refresh() {
    const journal: RevisionTime[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)!;
        if (key.startsWith(JOURNAL)) {
          try { journal.push(JSON.parse(localStorage.getItem(key)!)); } catch { /* Ignore malformed recovery records. */ }
        }
      }
    } catch { /* The database can remain available when localStorage is blocked. */ }
    for (const row of mergeTime([...pending.values()], journal)) pending.set(row.id, row);
    let stored: RevisionTime[] = [];
    try { stored = await readTime(); failed = false; } catch { failed = true; }
    rows = new Map(mergeTime(stored, journal, [...rows.values()]).map(row => [row.id, row]));
    await flush();
  }
  function flush(): Promise<void> {
    if (flushing) return flushing.then(() => pending.size ? flush() : undefined);
    const snapshot = [...pending.values()];
    if (!snapshot.length) return Promise.resolve();
    flushing = (async () => {
      try {
        await saveTime(snapshot); failed = false;
        for (const row of snapshot) {
          if (pending.get(row.id)?.seconds === row.seconds) pending.delete(row.id);
          try {
            const key = JOURNAL + row.id, saved = JSON.parse(localStorage.getItem(key) ?? 'null');
            if (saved && saved.seconds <= row.seconds) localStorage.removeItem(key);
          } catch { /* The database has the checkpoint; journal cleanup can retry. */ }
        }
      } catch { failed = true; }
      finally { flushing = null; updateHeader(); }
    })();
    return flushing;
  }
  let ticks = 0;
  window.setInterval(() => {
    if (!clock.running()) return;
    clock.tick(); updateHeader();
    if (++ticks % 5 === 0) void flush();
  }, 1000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { clock.pause(); void flush(); }
    else clock.resume();
    updateHeader();
  });
  window.addEventListener('pagehide', () => { clock.pause(); void flush(); });
  window.addEventListener('pageshow', () => { if (!document.hidden) clock.resume(); });
  return {
    start(themeId: string) { clock.start(themeId, !document.hidden); },
    stop() { clock.stop(); void flush(); },
    checkpoint() { clock.tick(); void flush(); },
    header() { return clock.running() ? '<span id="revision-clock" class="clock revision-clock" role="timer" aria-label="Temps de révision">0:00</span><small id="revision-time-status" role="status" hidden></small>' : '<span class="rev-header-label">FR → Català</span>'; },
    updateHeader,
    refresh,
    entries() { return [...rows.values()]; },
    error() { return failed; },
    unsaved() { return failed && pending.size > 0; }
  };
}
