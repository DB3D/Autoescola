import type { RevisionRun } from './types';
const DB_NAME = 'autoescola-revision';
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('runs', { keyPath: 'id' });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
export async function readRuns(): Promise<RevisionRun[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('runs');
    const request = tx.objectStore('runs').getAll();
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
export async function saveRun(run: RevisionRun): Promise<void> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('runs', 'readwrite');
    tx.objectStore('runs').put(run);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
