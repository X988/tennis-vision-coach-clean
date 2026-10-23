const DB_NAME = 'tvc-progress';
const STORE = 'attempts';

export async function openDB(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id', autoIncrement: true });
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

export async function saveAttempt(scenarioId: string, chosen: string, correct: boolean) {
  const db = await openDB();
  return new Promise<void>((res) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).add({ scenarioId, chosen, correct, ts: Date.now() });
    tx.oncomplete = () => res();
  });
}

export async function getStats(): Promise<{ total: number; correct: number }> {
  const db = await openDB();
  return new Promise((res) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => {
      const all = req.result as any[];
      const correct = all.filter(a => a.correct).length;
      res({ total: all.length, correct });
    };
  });
}
