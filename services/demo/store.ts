import { createSeed, type DemoDb } from './seed';

// The demo "database" lives in localStorage so it survives reloads and is shared between tabs
// (e.g. the admin portal and a public review page opened from it). When storage is unavailable
// or full, it falls back to memory for the rest of the page's life.

const DB_KEY = 'reviewflow:demo:db:v2';

let memory: DemoDb | null = null;
let storageUsable = true;

const tryRead = (): DemoDb | null => {
  if (!storageUsable) return null;
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoDb;
    return parsed?.version === 1 ? parsed : null;
  } catch {
    return null;
  }
};

const tryWrite = (db: DemoDb) => {
  if (!storageUsable) return;
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  } catch {
    // Quota exceeded (large photos) or storage blocked: keep going in memory.
    storageUsable = false;
  }
};

const load = (): DemoDb => {
  const stored = tryRead();
  if (stored) return stored;
  if (!memory) {
    memory = createSeed();
    tryWrite(memory);
  }
  return memory;
};

/** A copy of the current demo data. */
export const readDb = (): DemoDb => structuredClone(load());

/** Apply a change to the demo data and persist it. */
export const updateDb = <T,>(change: (db: DemoDb) => T): T => {
  const db = load();
  const result = change(db);
  memory = db;
  tryWrite(db);
  return result;
};

export const resetDemoData = () => {
  memory = createSeed();
  storageUsable = true;
  tryWrite(memory);
};

/** Small artificial latency so loading states behave as they do against a real backend. */
export const latency = (ms = 80) => new Promise<void>((resolve) => setTimeout(resolve, ms));
