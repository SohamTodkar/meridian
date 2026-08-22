import type { StateStorage } from "zustand/middleware";

const DATABASE_NAME = "meridian.local";
const STORE_NAME = "state";
const MIGRATION_KEY = "__meridian.v2.legacy-migration__";

export type PersistenceMode = "indexeddb" | "localStorage" | "unavailable";

export interface PersistenceStatus {
  mode: PersistenceMode;
  migratedLegacy: boolean;
}

export interface SyncStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export interface AsyncStorage {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
}

let currentStatus: PersistenceStatus = { mode: "unavailable", migratedLegacy: false };

export function getMeridianPersistenceStatus(): PersistenceStatus {
  return currentStatus;
}

function updateStatus(next: PersistenceStatus) {
  currentStatus = next;
}

function browserLocalStorage(): SyncStorage | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const probe = "__meridian_storage_probe__";
    window.localStorage.setItem(probe, "1");
    window.localStorage.removeItem(probe);
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function openIndexedDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Unable to open IndexedDB."));
  });
}

function browserIndexedDbStorage(): AsyncStorage | undefined {
  if (typeof indexedDB === "undefined") return undefined;
  const execute = async <T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>) => {
    const db = await openIndexedDb();
    try {
      return await new Promise<T>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const request = operation(transaction.objectStore(STORE_NAME));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed."));
      });
    } finally {
      db.close();
    }
  };
  return {
    getItem: async (key) => (await execute("readonly", (store) => store.get(key))) ?? null,
    setItem: async (key, value) => { await execute("readwrite", (store) => store.put(value, key)); },
    removeItem: async (key) => { await execute("readwrite", (store) => store.delete(key)); },
  };
}

export function createVersionedMeridianStorage(options: { primary?: AsyncStorage; fallback?: SyncStorage } = {}): StateStorage {
  const primary = options.primary ?? browserIndexedDbStorage();
  const fallback = options.fallback ?? browserLocalStorage();

  const runFallback = (operation: (storage: SyncStorage) => string | null | void): string | null | void => {
    if (!fallback) { updateStatus({ mode: "unavailable", migratedLegacy: false }); return null; }
    updateStatus({ mode: "localStorage", migratedLegacy: false });
    return operation(fallback);
  };

  return {
    getItem: async (name) => {
      if (!primary) return runFallback((storage) => storage.getItem(name)) as string | null;
      try {
        const saved = await primary.getItem(name);
        const migrated = (await primary.getItem(MIGRATION_KEY)) === "done";
        if (saved !== null) {
          updateStatus({ mode: "indexeddb", migratedLegacy: migrated });
          return saved;
        }
        const legacy = fallback?.getItem(name) ?? null;
        if (legacy !== null && !migrated) {
          await primary.setItem(name, legacy);
          await primary.setItem(MIGRATION_KEY, "done");
          updateStatus({ mode: "indexeddb", migratedLegacy: true });
          return legacy;
        }
        updateStatus({ mode: "indexeddb", migratedLegacy: migrated });
        return null;
      } catch {
        return runFallback((storage) => storage.getItem(name)) as string | null;
      }
    },
    setItem: async (name, value) => {
      if (!primary) return void runFallback((storage) => storage.setItem(name, value));
      try {
        await primary.setItem(name, value);
        updateStatus({ mode: "indexeddb", migratedLegacy: (await primary.getItem(MIGRATION_KEY)) === "done" });
      } catch {
        void runFallback((storage) => storage.setItem(name, value));
      }
    },
    removeItem: async (name) => {
      if (!primary) return void runFallback((storage) => storage.removeItem(name));
      try {
        await primary.removeItem(name);
        updateStatus({ mode: "indexeddb", migratedLegacy: (await primary.getItem(MIGRATION_KEY)) === "done" });
      } catch {
        void runFallback((storage) => storage.removeItem(name));
      }
    },
  };
}

export const meridianStateStorage = createVersionedMeridianStorage();
