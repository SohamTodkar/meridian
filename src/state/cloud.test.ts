import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.stubGlobal("window", { location: { pathname: "/" } });
});
afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

async function workspace() {
  const store = await import("./store");
  const cloud = await import("./cloud");
  const fetcher = vi.fn<typeof fetch>();
  fetcher.mockResolvedValueOnce(
    Response.json({
      authenticated: true,
      configured: true,
      storage: "postgres",
      research: false,
    })
  );
  fetcher.mockResolvedValueOnce(
    Response.json({
      revision: 1,
      state: store.getInitialMeridianState(),
      updatedAt: "2026-09-05T08:00:00Z",
    })
  );
  vi.stubGlobal("fetch", fetcher);
  await cloud.initializeCloud();
  return { store, cloud, fetcher };
}

describe("cloud save coordination", () => {
  it("does not overwrite edits made while a clean-tab refresh is in flight", async () => {
    const { store, cloud, fetcher } = await workspace();
    let respond!: (response: Response) => void;
    fetcher.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          respond = resolve;
        })
    );
    const refreshing = cloud.refreshIfClean();
    store.useMeridianStore
      .getState()
      .setDailyLog("2026-09-05", 0, "New thought while loading");
    respond(
      Response.json({
        revision: 2,
        state: store.getInitialMeridianState(),
        updatedAt: "2026-09-05T08:01:00Z",
      })
    );
    await refreshing;
    expect(store.useMeridianStore.getState().dailyLogs["2026-09-05"].note).toBe(
      "New thought while loading"
    );
    expect(cloud.useCloudStore.getState().revision).toBe(1);
    expect(cloud.hasUnsavedChanges()).toBe(true);
  });
  it("queues edits made during a save against the newly accepted revision", async () => {
    const { store, cloud, fetcher } = await workspace();
    let respond!: (response: Response) => void;
    fetcher.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          respond = resolve;
        })
    );
    store.useMeridianStore
      .getState()
      .setDailyLog("2026-09-05", 0, "First thought");
    const saving = cloud.saveCloud();
    store.useMeridianStore
      .getState()
      .setDailyLog("2026-09-05", 0, "Second thought");
    respond(Response.json({ revision: 2, updatedAt: "2026-09-05T08:01:00Z" }));
    await saving;
    expect(cloud.useCloudStore.getState().status).toBe("pending");
    fetcher.mockResolvedValueOnce(
      Response.json({ revision: 3, updatedAt: "2026-09-05T08:02:00Z" })
    );
    await vi.advanceTimersByTimeAsync(151);
    const request = JSON.parse(fetcher.mock.calls[3][1]!.body as string);
    expect(request.revision).toBe(2);
    expect(request.state.dailyLogs["2026-09-05"].note).toBe("Second thought");
    expect(cloud.hasUnsavedChanges()).toBe(false);
    expect(cloud.useCloudStore.getState().status).toBe("saved");
  });
  it("stops automatic writes after a conflict and retains the edits", async () => {
    const { store, cloud, fetcher } = await workspace();
    store.useMeridianStore
      .getState()
      .setDailyLog("2026-09-05", 0, "Keep this version");
    fetcher.mockResolvedValueOnce(
      Response.json({ error: "Another tab saved first." }, { status: 409 })
    );
    await cloud.saveCloud();
    await cloud.saveCloud();
    await vi.advanceTimersByTimeAsync(2000);
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(cloud.useCloudStore.getState().status).toBe("conflict");
    expect(cloud.hasUnsavedChanges()).toBe(true);
  });
  it("opens public preview without reading or writing private study records", async () => {
    const store = await import("./store");
    const cloud = await import("./cloud");
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        Response.json({
          authenticated: false,
          configured: true,
          storage: "postgres",
          research: false,
        })
      );
    vi.stubGlobal("fetch", fetcher);
    await cloud.initializeCloud();
    store.useMeridianStore
      .getState()
      .setDailyLog("2026-09-05", 0, "Visitor exploration");
    await cloud.saveCloud();
    await vi.advanceTimersByTimeAsync(1000);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(cloud.useCloudStore.getState().visitor).toBe(true);
  });
});
