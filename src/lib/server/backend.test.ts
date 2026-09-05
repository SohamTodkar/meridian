import { readFile } from "node:fs/promises";
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { PGlite } from "@electric-sql/pglite";

const connection = vi.hoisted(() => ({ db: null as unknown as PGlite }));
vi.mock("@neondatabase/serverless", () => ({
  neon:
    () =>
    async (strings: TemplateStringsArray, ...values: unknown[]) => {
      const text = strings.reduce(
        (result, part, i) => result + (i ? `$${i}` : "") + part,
        ""
      );
      return (await connection.db.query(text, values)).rows;
    },
}));
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => undefined }),
}));
import {
  databaseRateLimit,
  listHistory,
  readHistory,
  readWorkspace,
  saveWorkspace,
} from "./database";
import {
  hashPassword,
  verifyPassword,
  issueSession,
  verifySession,
  assertSameOrigin,
  readJson,
  requireOwner,
} from "./auth";
import { workspaceSchema } from "./schema";
import { serverConfig } from "./config";
import { elapsedSeconds } from "../focus-time";

describe("PostgreSQL workspace pipeline", () => {
  beforeAll(async () => {
    vi.stubEnv("DATABASE_URL", "postgres://test:example@localhost/test");
    connection.db = new PGlite();
    await connection.db.exec(
      await readFile("database/001_workspace.sql", "utf8")
    );
  }, 30000);
  afterAll(async () => {
    await connection.db.close();
    vi.unstubAllEnvs();
  });
  it("runs migrations idempotently and starts without fabricated progress", async () => {
    await connection.db.exec(
      await readFile("database/001_workspace.sql", "utf8")
    );
    expect(await readWorkspace()).toEqual({
      state: null,
      revision: 0,
      updatedAt: null,
    });
  });
  it("atomically saves study records with recovery versions", async () => {
    const data = workspaceSchema.parse({
      settings: { scheduleMode: "semester", timeZone: "Asia/Kolkata" },
    });
    data.checks["p0s1.check.1"] = true;
    const first = await saveWorkspace(data, 0);
    expect(first?.revision).toBe(1);
    expect((await readWorkspace()).state?.checks["p0s1.check.1"]).toBe(true);
    data.journals.push({
      id: "j1",
      date: "2026-09-05",
      text: "I can explain a traceback.",
    });
    const second = await saveWorkspace(data, 1);
    expect(second?.revision).toBe(2);
    expect((await readHistory(1))?.state?.journals).toEqual([]);
    expect(await listHistory()).toHaveLength(2);
  });
  it("rejects stale updates and simultaneous writes without dropping either saved version", async () => {
    const data = workspaceSchema.parse({});
    expect(await saveWorkspace(data, 0)).toBeNull();
    const writes = await Promise.all([
      saveWorkspace(data, 2),
      saveWorkspace(data, 2),
    ]);
    expect(writes.filter(Boolean)).toHaveLength(1);
    expect((await readWorkspace()).revision).toBe(3);
  });
  it("restores by adding a version, retaining the prior state", async () => {
    const first = await readHistory(1);
    const restored = await saveWorkspace(first!.state!, 3);
    expect(restored?.revision).toBe(4);
    expect((await readHistory(3))?.revision).toBe(3);
    expect(restored?.state?.checks["p0s1.check.1"]).toBe(true);
  });
  it("enforces server-wide rate limits independently of function instances", async () => {
    expect(await databaseRateLimit("test-login", 2, 60)).toBe(true);
    expect(await databaseRateLimit("test-login", 2, 60)).toBe(true);
    expect(await databaseRateLimit("test-login", 2, 60)).toBe(false);
    await connection.db.exec(
      "UPDATE meridian_rate_limits SET expires_at = now() - interval '1 second'"
    );
    expect(await databaseRateLimit("test-login", 2, 60)).toBe(true);
  });
});

describe("private workspace boundaries", () => {
  it("verifies passwords with scrypt and rejects malformed hashes", () => {
    const hash = hashPassword("this-is-a-long-test-password");
    expect(hash).not.toContain("this-is");
    expect(verifyPassword("this-is-a-long-test-password", hash)).toBe(true);
    expect(verifyPassword("wrong", hash)).toBe(false);
    expect(verifyPassword("wrong", "invalid")).toBe(false);
  });
  it("rejects tampered and expired sessions", () => {
    const secret = "a-test-secret-at-least-32-characters-long";
    const now = 1700000000000;
    const token = issueSession(secret, now);
    expect(verifySession(token, secret, now)).toBe(true);
    expect(verifySession(token + "x", secret, now)).toBe(false);
    expect(verifySession(token, "another-secret", now)).toBe(false);
    expect(verifySession(token, secret, now + 8 * 86400000)).toBe(false);
  });
  it("never enables development storage or anonymous owner access on Vercel", async () => {
    vi.stubEnv("VERCEL", "1");
    vi.stubEnv("MERIDIAN_DEV_STORAGE", "true");
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("MERIDIAN_SESSION_SECRET", "");
    expect(serverConfig().development).toBe(false);
    expect(serverConfig().ready).toBe(false);
    await expect(requireOwner()).rejects.toMatchObject({ status: 503 });
    vi.unstubAllEnvs();
  });
  it("rejects cross-site changes and missing origins", () => {
    expect(() =>
      assertSameOrigin(
        new Request("https://meridian.test/api/workspace", {
          method: "PUT",
          headers: { origin: "https://evil.test" },
        })
      )
    ).toThrow();
    expect(() =>
      assertSameOrigin(
        new Request("https://meridian.test/api/workspace", { method: "PUT" })
      )
    ).toThrow();
    expect(() =>
      assertSameOrigin(
        new Request("https://meridian.test/api/workspace", {
          method: "PUT",
          headers: { origin: "https://meridian.test" },
        })
      )
    ).not.toThrow();
  });
  it("uses the actual host when Next normalizes the internal request URL", () => {
    expect(() =>
      assertSameOrigin(
        new Request("http://localhost:3110/api/workspace/", {
          method: "PUT",
          headers: { host: "127.0.0.1:3110", origin: "http://127.0.0.1:3110" },
        })
      )
    ).not.toThrow();
    expect(() =>
      assertSameOrigin(
        new Request("http://localhost:3110/api/workspace/", {
          method: "PUT",
          headers: { host: "127.0.0.1:3110", origin: "http://localhost:3110" },
        })
      )
    ).toThrow();
  });
  it("bounds actual payload bytes, even without a content-length header", async () => {
    const request = new Request("https://meridian.test/api/workspace", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ data: "x".repeat(100) }),
    });
    await expect(readJson(request, 50)).rejects.toMatchObject({ status: 413 });
  });
  it("validates nested learning data and cannot inject store functions", () => {
    expect(workspaceSchema.safeParse({ setSetting: "replaced" }).success).toBe(
      false
    );
    expect(
      workspaceSchema.safeParse({
        settings: { scheduleMode: "normal", timeZone: "invalid" },
      }).success
    ).toBe(false);
    expect(
      workspaceSchema.safeParse({
        sessions: { p0s1: { completed: true, currentStep: -2 } },
      }).success
    ).toBe(false);
    expect(
      workspaceSchema.safeParse({
        portfolio: {
          entries: [
            {
              id: "e",
              title: "x",
              kind: "link",
              note: "",
              url: "javascript:alert(1)",
            },
          ],
        },
      }).success
    ).toBe(false);
  });
  it("uses wall time, including delayed ticks, without exceeding focus duration", () => {
    expect(elapsedSeconds(10, 1000, 51000)).toBe(60);
    expect(elapsedSeconds(10, 1000, 51000, 25)).toBe(25);
    expect(elapsedSeconds(0, 2000, 1000)).toBe(0);
  });
});
