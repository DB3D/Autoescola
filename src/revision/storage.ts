import type { RevisionRun, RevisionTime } from './types';
const DB_NAME = 'autoescola-revision';
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 2);
    request.onupgradeneeded = () => {
      for (const store of ['runs', 'time'])
        if (!request.result.objectStoreNames.contains(store)) request.result.createObjectStore(store, { keyPath: 'id' });
    };
    request.onsuccess = () => {
      request.result.onversionchange = () => request.result.close();
      resolve(request.result);
    };
    request.onerror = () => reject(request.error);
  });
}
export async function readTime(): Promise<RevisionTime[]> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('time');
    const request = tx.objectStore('time').getAll();
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
// Retrying an older checkpoint cannot overwrite a newer one, even across tabs.
export async function saveTime(rows: RevisionTime[]): Promise<void> {
  if (!rows.length) return;
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('time', 'readwrite');
    const store = tx.objectStore('time');
    for (const row of rows) {
      const request = store.get(row.id);
      request.onsuccess = () => {
        if (!request.result || request.result.seconds < row.seconds) store.put(row);
      };
    }
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error); };
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
