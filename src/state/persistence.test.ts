import { describe, expect, it } from "vitest";
import { createVersionedMeridianStorage, getMeridianPersistenceStatus, type AsyncStorage, type SyncStorage } from "./persistence";

function memorySync(initial: Record<string, string> = {}): SyncStorage {
  const values = new Map(Object.entries(initial));
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value); }, removeItem: (key) => { values.delete(key); } };
}

function memoryAsync(initial: Record<string, string> = {}): AsyncStorage {
  const values = new Map(Object.entries(initial));
  return { getItem: async (key) => values.get(key) ?? null, setItem: async (key, value) => { values.set(key, value); }, removeItem: async (key) => { values.delete(key); } };
}

describe("versioned local persistence", () => {
  it("copies legacy localStorage state once into IndexedDB and preserves it thereafter", async () => {
    const primary = memoryAsync();
    const fallback = memorySync({ "meridian.v1": "legacy-snapshot" });
    const storage = createVersionedMeridianStorage({ primary, fallback });

    await expect(storage.getItem("meridian.v1")).resolves.toBe("legacy-snapshot");
    await primary.setItem("meridian.v1", "newer-indexeddb-snapshot");
    fallback.setItem("meridian.v1", "stale-localstorage-snapshot");

    await expect(storage.getItem("meridian.v1")).resolves.toBe("newer-indexeddb-snapshot");
    expect(getMeridianPersistenceStatus()).toEqual({ mode: "indexeddb", migratedLegacy: true });
  });

  it("uses localStorage without losing writes when IndexedDB is unavailable", async () => {
    const fallback = memorySync();
    const storage = createVersionedMeridianStorage({ fallback });

    await storage.setItem("meridian.v1", "fallback-snapshot");

    await expect(storage.getItem("meridian.v1")).resolves.toBe("fallback-snapshot");
    expect(getMeridianPersistenceStatus().mode).toBe("localStorage");
  });
});
