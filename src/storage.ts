import {
  allStats,
  capAttempt,
  type Session,
  type Attempt,
  type QuizRun,
} from "./engine";
const DB = "autoescola-progress";
// Version 2 adds quizRuns. Existing databases only gain the new store, so a
// browser that already holds sessions, attempts and stats keeps them.
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 2);
    r.onupgradeneeded = () => {
      const names = r.result.objectStoreNames;
      for (const store of ["sessions", "attempts", "stats", "quizRuns"])
        if (!names.contains(store))
          r.result.createObjectStore(store, { keyPath: "id" });
    };
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
export async function readAll<T>(store: string): Promise<T[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store);
    const r = tx.objectStore(store).getAll();
    tx.oncomplete = () => {
      db.close();
      resolve(r.result);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
// A finished quiz run stores its cost in time and nothing else: no attempt, no
// question statistic, no mastery.
export async function saveQuizRun(run: QuizRun) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction("quizRuns", "readwrite");
    tx.objectStore("quizRuns").put(run);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Storage transaction failed"));
    };
  });
}
export async function saveSession(session: Session) {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(["sessions", "attempts", "stats"], "readwrite");
    const request = tx.objectStore("attempts").getAll();
    request.onsuccess = () => {
      const merged = new Map<string, Attempt>(
        (request.result as Attempt[]).map((a) => [a.id, a]),
      );
      session.attempts.forEach((a) => merged.set(a.id, a));
      tx.objectStore("sessions").put(session);
      session.attempts.forEach((a) => tx.objectStore("attempts").put(a));
      allStats([...merged.values()].map(capAttempt)).forEach((s) =>
        tx.objectStore("stats").put(s),
      );
    };
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Storage transaction failed"));
    };
  });
}
