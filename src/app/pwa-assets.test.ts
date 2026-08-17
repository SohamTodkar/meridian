import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = resolve(process.cwd(), "public");

describe("offline install assets", () => {
  it("ships a standalone Meridian manifest with a local icon", () => {
    const manifest = JSON.parse(readFileSync(resolve(publicDir, "manifest.webmanifest"), "utf8")) as { display: string; start_url: string; icons: Array<{ src: string }> };
    expect(manifest).toMatchObject({ display: "standalone", start_url: "/" });
    expect(manifest.icons[0]?.src).toBe("/meridian-icon.svg");
    expect(existsSync(resolve(publicDir, "meridian-icon.svg"))).toBe(true);
  });

  it("ships a service worker that retains an offline shell without hiding new navigations behind a stale cache", () => {
    const worker = readFileSync(resolve(publicDir, "sw.js"), "utf8");
    expect(worker).toContain("meridian-shell-v2");
    expect(worker).toContain("caches.match");
    expect(worker).toContain('event.request.mode === "navigate"');
  });
});
