import {
  allStats,
  capAttempt,
  type Session,
  type Attempt,
  type QuizRun,
  type QuizAttempt,
} from "./engine";
const DB = "autoescola-progress";
// Version 2 adds quizRuns, version 3 quizAttempts. Existing databases only
// gain the new stores, so a browser that already holds data keeps it.
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 3);
    r.onupgradeneeded = () => {
      const names = r.result.objectStoreNames;
      for (const store of ["sessions", "attempts", "stats", "quizRuns", "quizAttempts"])
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
// Quiz records go to their own stores and never touch the driving attempts,
// statistics or mastery. Saving the same record twice keeps one row.
function putOne(store: "quizRuns" | "quizAttempts", row: QuizRun | QuizAttempt) {
  return openDB().then((db) => new Promise<void>((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(row);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onabort = tx.onerror = () => {
      db.close();
      reject(tx.error ?? new Error("Storage transaction failed"));
    };
  }));
}
// A quiz run stores its cost in time; the difficulty lives in quizAttempts.
export const saveQuizRun = (run: QuizRun) => putOne("quizRuns", run);
export const saveQuizAttempt = (attempt: QuizAttempt) =>
  putOne("quizAttempts", attempt);
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
