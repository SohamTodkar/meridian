import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const publicDir = resolve(process.cwd(), "public");

describe("install assets and offline cache retirement", () => {
  it("ships a standalone Meridian manifest with a local icon", () => {
    const manifest = JSON.parse(
      readFileSync(resolve(publicDir, "manifest.webmanifest"), "utf8")
    ) as { display: string; start_url: string; icons: Array<{ src: string }> };
    expect(manifest).toMatchObject({ display: "standalone", start_url: "/" });
    expect(manifest.icons[0]?.src).toBe("/meridian-icon.svg");
    expect(existsSync(resolve(publicDir, "meridian-icon.svg"))).toBe(true);
  });

  it("retires only Meridian caches without intercepting authenticated requests", () => {
    const worker = readFileSync(resolve(publicDir, "sw.js"), "utf8");
    expect(worker).toContain('key.startsWith("meridian-shell-")');
    expect(worker).toContain("caches.delete(key)");
    expect(worker).toContain("self.registration.unregister()");
    expect(worker).not.toContain('addEventListener("fetch"');
    expect(worker).not.toContain("caches.match");
  });
});
