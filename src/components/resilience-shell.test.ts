import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const shell = readFileSync(resolve(process.cwd(), "src/components/app-shell.tsx"), "utf8");
const runner = readFileSync(resolve(process.cwd(), "src/components/session-runner.tsx"), "utf8");
const modal = readFileSync(resolve(process.cwd(), "src/components/modal-portal.tsx"), "utf8");
const portfolio = readFileSync(resolve(process.cwd(), "src/components/stage3-views.tsx"), "utf8");
const offlineRuntime = readFileSync(resolve(process.cwd(), "src/components/offline-runtime.tsx"), "utf8");
const css = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");

describe("resilient accessible shell", () => {
  it("keeps a keyboard skip link and a focusable main landmark in both dashboard and session contexts", () => {
    expect(shell).toContain('href="#main-content"');
    expect(shell).toContain('id="main-content"');
    expect(shell).toContain('tabIndex={-1}');
  });

  it("renders an explicit resume-or-discard choice for a recovered local session attempt", () => {
    expect(runner).toContain("Recovered local attempt");
    expect(runner).toContain("Resume attempt");
    expect(runner).toContain("Discard draft");
  });

  it("restores focus after transient overlays and focuses direct evidence capture commands", () => {
    expect(modal).toContain("previousFocus.current?.focus()");
    expect(portfolio).toContain('window.location.hash === "#capture"');
    expect(portfolio).toContain("captureInput.current?.focus()");
  });

  it("announces offline readiness and names the recovered-session decision group", () => {
    expect(offlineRuntime).toContain('role="status"');
    expect(offlineRuntime).toContain('aria-live="polite"');
    expect(runner).toContain('aria-label="Recovered session choices"');
    expect(runner).toContain('aria-describedby="recovery-choice-help"');
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });
});
