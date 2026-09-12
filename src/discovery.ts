export interface Exposure {
  shown: number;
  catalanShown?: number;
  lastAsked: string | null;
}

// Strict exposure order, shared by driving practice and the Català quiz.
// Randomness only breaks identical total/Catalan count/date ties.
export function discover<T extends { id: string }>(
  bank: T[], count: number, stats: ReadonlyMap<string, Exposure>, rng = Math.random,
): T[] {
  return [...new Map(bank.map(q => [q.id, q])).values()]
    .map(q => {
      const s = stats.get(q.id);
      const shown = s?.shown ?? 0;
      const last = shown && s?.lastAsked ? Date.parse(s.lastAsked) : 0;
      // The Català quiz has no French reveal, so every attempt counts as Catalan.
      const catalanShown = shown ? (s?.catalanShown ?? shown) : 0;
      return { q, shown, catalanShown, last: Number.isFinite(last) ? last : 0, tie: rng() };
    })
    .sort((a, b) => a.shown - b.shown || a.catalanShown - b.catalanShown || a.last - b.last || a.tie - b.tie)
    .slice(0, count)
    .map(({ q }) => q);
}
