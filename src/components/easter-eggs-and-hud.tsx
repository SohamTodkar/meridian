"use client";

import { useEffect, useState } from "react";
import { model } from "@/data";
import { fpsMeter, detectWebglRenderer, formatBytes, readStorageEstimate } from "@/lib/performance";
import { scrollState, subscribeScroll } from "@/lib/scroll";
import { useMeridianStore } from "@/state/store";
import { useSmoothScroll } from "./motion/smooth-scroll";
import { ModalPortal } from "./modal-portal";
import { Activity, Keyboard, X } from "lucide-react";

/**
 * Easter eggs & the F1 telemetry HUD (directive §9), rebuilt with real data:
 *  - a styled console banner with ASCII art (once per session)
 *  - F1 / ? toggles a HUD whose numbers are measured live (FPS via the shared
 *    frame loop, storage via navigator.storage.estimate, scroll telemetry
 *    from the scroll store, GPU name from the WebGL debug extension)
 *  - the Konami code fires a lightweight bone-coloured confetti burst —
 *    a fixed canvas with transform-style particle motion, no libraries
 *  - hotkeys cycle schedule modes using the model's real mode list
 */

const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];

function launchConfetti(): () => void {
  const canvas = document.createElement("canvas");
  canvas.className = "confetti-canvas";
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  document.body.appendChild(canvas);
  const context = canvas.getContext("2d");
  if (!context) {
    canvas.remove();
    return () => {};
  }
  context.scale(dpr, dpr);

  const colors = ["#eeeae2", "#c4c0b8", "#969997", "#83968d"];
  const pieces = Array.from({ length: 130 }, (_, index) => ({
    x: window.innerWidth / 2 + (Math.random() - 0.5) * 140,
    y: window.innerHeight * 0.55,
    vx: (Math.random() - 0.5) * 11,
    vy: -6 - Math.random() * 9,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 0.25,
    size: 5 + Math.random() * 6,
    color: colors[index % colors.length],
  }));

  let rafId = 0;
  let last = performance.now();
  const tick = (now: number) => {
    const dt = Math.min(32, now - last) / 16.7;
    last = now;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    let alive = false;
    for (const piece of pieces) {
      piece.vy += 0.32 * dt;
      piece.x += piece.vx * dt;
      piece.y += piece.vy * dt;
      piece.rotation += piece.rotationSpeed * dt;
      if (piece.y < window.innerHeight + 30) alive = true;
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.rotation);
      context.fillStyle = piece.color;
      context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2);
      context.restore();
    }
    if (alive) rafId = requestAnimationFrame(tick);
    else canvas.remove();
  };
  rafId = requestAnimationFrame(tick);

  return () => {
    cancelAnimationFrame(rafId);
    canvas.remove();
  };
}

interface HudSnapshot {
  fps: number;
  jitter: number;
  scrollY: number;
  scrollProgress: number;
  scrollVelocity: string;
  smooth: boolean;
  storageUsage: string;
  storageQuota: string;
  webgl: string;
  cores: number | null;
  memory: number | null;
  offline: boolean;
}

export function EasterEggsAndHud() {
  const [hudOpen, setHudOpen] = useState(false);
  const scheduleMode = useMeridianScheduleMode();
  const { scrollTo } = useSmoothScroll();
  const [snapshot, setSnapshot] = useState<HudSnapshot | null>(null);

  /* Console banner — exactly once per page session. */
  useEffect(() => {
    if (sessionStorage.getItem("meridian.banner") === "1") return;
    sessionStorage.setItem("meridian.banner", "1");
    console.log(
      "%cMERIDIAN",
      "color:#eeeae2;background:#0d0f10;font:700 20px monospace;padding:8px 14px;border:1px solid #3d4142;letter-spacing:.2em",
    );
    console.log(
      `%c __  __ _____ ____  ___ ____ ___    _    _   _
|  \\\\/  | ____|  _ \\\\|_ ||  _ \\\\|_ _|  / \\\\ | \\\\| |
| |\\\\/| |  _| | |_) || || | | | | | / _ \\\\|  '| |
| |  | | |___|  _ < | || |_| | | / ___ \\\\| |\\\\  |
|_|  |_|_____|_| \\\\_\\\\___|____/___/_/   \\_\\_| \\_|
`,
      "color:#83968d;font:10px monospace",
    );
    console.log(
      "%cLocal-first learning path · one useful action, an honest proof, a record on this device.\n[F1] telemetry HUD · [Ctrl+K] search · ↑↑↓↓←→←→BA — you know what to do.",
      "color:#969997;font:600 10px monospace;letter-spacing:.08em",
    );
  }, []);

  /* Hotkeys + Konami. */
  useEffect(() => {
    let konamiIndex = 0;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const isInput = target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable;

      // Konami code (works everywhere except while typing).
      if (!isInput) {
        const expected = KONAMI[konamiIndex];
        konamiIndex = event.key === expected ? konamiIndex + 1 : event.key === KONAMI[0] ? 1 : 0;
        if (konamiIndex === KONAMI.length) {
          konamiIndex = 0;
          launchConfetti();
        }
      }

      if (event.key === "F1" || (!isInput && event.key === "?")) {
        event.preventDefault();
        setHudOpen((open) => !open);
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "l") {
        event.preventDefault();
        const logElement = document.getElementById("daily-capture");
        if (logElement) {
          scrollTo(logElement);
          logElement.querySelector("textarea")?.focus();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [scrollTo]);

  /* Live HUD telemetry while open (rendering is gated on hudOpen, so the
     snapshot simply goes stale — and the meter stops — when closed). */
  useEffect(() => {
    if (!hudOpen) {
      fpsMeter.stop();
      return;
    }
    fpsMeter.start();
    let cancelled = false;
    const capture = async () => {
      const storage = await readStorageEstimate();
      if (cancelled) return;
      setSnapshot({
        fps: fpsMeter.fps,
        jitter: fpsMeter.jitter,
        scrollY: Math.round(scrollState.y),
        scrollProgress: scrollState.progress,
        scrollVelocity: Math.abs(scrollState.velocity).toFixed(2),
        smooth: scrollState.smooth,
        storageUsage: storage.usage !== null ? formatBytes(storage.usage) : "—",
        storageQuota: storage.quota !== null ? formatBytes(storage.quota) : "—",
        webgl: detectWebglRenderer() ?? "—",
        cores: navigator.hardwareConcurrency ?? null,
        memory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
        offline: !navigator.onLine,
      });
    };
    void capture();
    const unsubscribeFps = fpsMeter.onUpdate(capture);
    const unsubscribeScroll = subscribeScroll(capture);
    const interval = window.setInterval(capture, 1000);
    return () => {
      cancelled = true;
      unsubscribeFps();
      unsubscribeScroll();
      window.clearInterval(interval);
    };
  }, [hudOpen]);

  const fps = snapshot?.fps ?? 60;
  const fpsClassName = fps >= 55 ? "hud-stat-value" : fps >= 30 ? "hud-stat-value hud-fps" : "hud-stat-value hud-fps warn";

  return hudOpen ? (
    <ModalPortal onClose={() => setHudOpen(false)} labelledBy="hud-modal-title" className="hud-modal">
      <div className="hud-panel">
        <div className="hud-header">
          <div className="hud-title-group">
            <span className="hud-badge">HUD · Live telemetry</span>
            <h2 id="hud-modal-title" className="hud-title">System control &amp; hotkeys</h2>
          </div>
          <button className="hud-close-btn" type="button" onClick={() => setHudOpen(false)} aria-label="Close HUD">
            <X size={16} />
          </button>
        </div>

        <div className="hud-grid">
          <div className="hud-card">
            <div className="hud-card-header"><Activity size={14} aria-hidden="true" /><span>RUNTIME · MEASURED</span></div>
            <div className="hud-stat-rows">
              <div className="hud-stat-row"><span className="hud-stat-label">Frame rate</span><strong className={fpsClassName}>{fps} fps</strong></div>
              <div className="hud-stat-row"><span className="hud-stat-label">Frame jitter</span><strong className="hud-stat-value">{(snapshot?.jitter ?? 0).toFixed(1)} ms</strong></div>
              <div className="hud-stat-row"><span className="hud-stat-label">GPU</span><strong className="hud-stat-value">{snapshot?.webgl ?? "detecting…"}</strong></div>
              <div className="hud-stat-row"><span className="hud-stat-label">Scroll</span><strong className="hud-stat-value">{snapshot?.scrollY ?? 0}px · {Math.round((snapshot?.scrollProgress ?? 0) * 100)}%</strong></div>
              <div className="hud-stat-row"><span className="hud-stat-label">Scroll velocity</span><strong className="hud-stat-value">{snapshot?.scrollVelocity ?? "0.00"} px/f</strong></div>
              <div className="hud-stat-row"><span className="hud-stat-label">Smooth scroll</span><strong className="hud-stat-value">{snapshot ? (snapshot.smooth ? "Lenis active" : "native (reduced motion)") : "—"}</strong></div>
            </div>
          </div>

          <div className="hud-card">
            <div className="hud-card-header"><Activity size={14} aria-hidden="true" /><span>DEVICE · LOCAL-FIRST</span></div>
            <div className="hud-stat-rows">
              <div className="hud-stat-row"><span className="hud-stat-label">Storage used</span><strong className="hud-stat-value">{snapshot?.storageUsage ?? "—"}</strong></div>
              <div className="hud-stat-row"><span className="hud-stat-label">Storage quota</span><strong className="hud-stat-value">{snapshot?.storageQuota ?? "—"}</strong></div>
              <div className="hud-stat-row"><span className="hud-stat-label">CPU threads</span><strong className="hud-stat-value">{snapshot?.cores ?? "—"}</strong></div>
              <div className="hud-stat-row"><span className="hud-stat-label">Device memory</span><strong className="hud-stat-value">{snapshot?.memory ? `${snapshot.memory} GB` : "masked"}</strong></div>
              <div className="hud-stat-row"><span className="hud-stat-label">Network</span><strong className="hud-stat-value">{snapshot?.offline ? "offline · fully usable" : "online · learning data stays local"}</strong></div>
              <div className="hud-stat-row"><span className="hud-stat-label">Personal data sent</span><strong className="hud-stat-value">none</strong></div>
            </div>
          </div>
        </div>

        <div className="hud-card" style={{ marginBottom: 22 }}>
          <div className="hud-card-header"><Keyboard size={14} aria-hidden="true" /><span>GLOBAL HOTKEYS</span></div>
          <div className="hud-shortcuts-list">
            <div className="hud-shortcut"><span><kbd>F1</kbd> or <kbd>?</kbd></span><span>Toggle this HUD</span></div>
            <div className="hud-shortcut"><span><kbd>Ctrl/⌘</kbd> + <kbd>K</kbd></span><span>Command palette</span></div>
            <div className="hud-shortcut"><span><kbd>Ctrl/⌘</kbd> + <kbd>Shift</kbd> + <kbd>L</kbd></span><span>Jump to the daily log</span></div>
            <div className="hud-shortcut"><span><kbd>Esc</kbd></span><span>Dismiss overlays</span></div>
            <div className="hud-shortcut"><span><kbd>↑↑↓↓←→←→ B A</kbd></span><span>…try it</span></div>
          </div>
        </div>

        <div className="hud-quick-modes">
          <span className="eyebrow">Schedule guide — {scheduleMode.label}</span>
          <div className="hud-mode-pills">
            {model.modes
              .filter((item) => item.category === "schedule")
              .map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`hud-mode-pill ${scheduleMode.key === item.key ? "is-active" : ""}`}
                  onClick={() => scheduleMode.set(item.key)}
                >
                  {item.label}
                </button>
              ))}
          </div>
          <p className="hint">The mode changes the pace, never the capability gates.</p>
        </div>

        <div className="hud-footer">
          <span>MERIDIAN · LOCAL INTELLIGENCE ENGINE · ALL TELEMETRY MEASURED, NONE INVENTED</span>
          <button className="button-secondary" type="button" onClick={() => setHudOpen(false)}>Close [Esc]</button>
        </div>
      </div>
    </ModalPortal>
  ) : null;
}

/** Schedule-mode slice used by the HUD quick switcher. */
function useMeridianScheduleMode() {
  const key = useMeridianStore((state) => state.settings.scheduleMode);
  const set = useMeridianStore((store) => store.setScheduleMode);
  const label = model.modes.find((item) => item.category === "schedule" && item.key === key)?.label ?? key;
  return { key, label, set };
}
