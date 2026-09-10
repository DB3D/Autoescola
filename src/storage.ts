import { allStats, type Session, type Attempt } from "./engine";
const DB = "autoescola-progress";
export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("sessions", { keyPath: "id" });
      r.result.createObjectStore("attempts", { keyPath: "id" });
      r.result.createObjectStore("stats", { keyPath: "id" });
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
      allStats([...merged.values()]).forEach((s) =>
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
