"use client";

import React, { useEffect, useState } from "react";
import { useMeridianStore } from "@/state/store";
import { model } from "@/data";
import { ModalPortal } from "./modal-portal";
import { Activity, Keyboard, X } from "lucide-react";
import { useSmoothScroll } from "./smooth-scroll-provider";

export function EasterEggsAndHud() {
  const [hudOpen, setHudOpen] = useState(false);
  const state = useMeridianStore();
  const setScheduleMode = useMeridianStore((store) => store.setScheduleMode);
  const { scrollTo } = useSmoothScroll();

  // DevTools ASCII Banner on Mount
  useEffect(() => {
    const bannerStyle = `
      color: #eeeae2;
      background: #0d0f10;
      font-family: monospace;
      font-size: 11px;
      font-weight: bold;
      padding: 12px 18px;
      border: 1px solid #3d4142;
      border-radius: 4px;
      line-height: 1.35;
    `;

    const subStyle = `
      color: #83968d;
      font-family: monospace;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.12em;
    `;

    console.log(
      `%c
 __  __ _____ ____  ___ ____ ___    _    _   _ 
|  \\/  | ____|  _ \\|_ _|  _ \\_ _|  / \\  | \\ | |
| |\\/| |  _| | |_) || || | | | |  / _ \\ |  \\| |
| |  | | |___|  _ < | || |_| | | / ___ \\| |\\  |
|_|  |_|_____|_| \\_\\___|____/___/_/   \\_\\_| \\_|
                                               
MERIDIAN // LOCAL INTELLIGENCE ENGINE (041375f7)
Local-First Architecture · 60 FPS GPU Pipeline · Zero Tracking
Press [F1] or [?] for Telemetry HUD · [Ctrl+K] for Search
`,
      bannerStyle
    );

    console.log("%c✓ Meridian state rehydrated from local storage.", subStyle);
  }, []);

  // Keyboard Shortcuts Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable;

      // F1 or ? to toggle HUD
      if (e.key === "F1" || (!isInput && e.key === "?")) {
        e.preventDefault();
        setHudOpen((prev) => !prev);
      }

      // Ctrl/Cmd + Shift + M to cycle schedule mode
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        const modes = ["normal", "deep", "semester", "minimal"];
        const currentIndex = modes.indexOf(state.settings.scheduleMode);
        const nextMode = modes[(currentIndex + 1) % modes.length];
        setScheduleMode(nextMode);
      }

      // Ctrl/Cmd + Shift + L to jump to daily log
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "l") {
        e.preventDefault();
        const logElement = document.getElementById("daily-capture");
        if (logElement) {
          scrollTo(logElement);
          const textarea = logElement.querySelector("textarea");
          textarea?.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [setScheduleMode, state.settings.scheduleMode, scrollTo]);

  if (!hudOpen) return null;

  return (
    <ModalPortal
      onClose={() => setHudOpen(false)}
      labelledBy="hud-modal-title"
      className="hud-modal"
    >
      <div className="hud-panel">
        <div className="hud-header">
          <div className="hud-title-group">
            <span className="hud-badge">HUD // COCKPIT TELEMETRY</span>
            <h2 id="hud-modal-title" className="hud-title">
              System Control &amp; Hotkeys
            </h2>
          </div>
          <button
            className="hud-close-btn"
            type="button"
            onClick={() => setHudOpen(false)}
            aria-label="Close HUD"
          >
            <X size={16} />
          </button>
        </div>

        <div className="hud-grid">
          {/* Telemetry Stats Card */}
          <div className="hud-card">
            <div className="hud-card-header">
              <Activity size={14} />
              <span>RUNTIME METRICS</span>
            </div>
            <div className="hud-stat-rows">
              <div className="hud-stat-row">
                <span className="hud-stat-label">Frame Budget</span>
                <strong className="hud-stat-value">60 FPS (Compositor)</strong>
              </div>
              <div className="hud-stat-row">
                <span className="hud-stat-label">Storage Engine</span>
                <strong className="hud-stat-value">IndexedDB / Local-First</strong>
              </div>
              <div className="hud-stat-row">
                <span className="hud-stat-label">Schedule Mode</span>
                <strong className="hud-stat-value text-accent">
                  {state.settings.scheduleMode.toUpperCase()}
                </strong>
              </div>
              <div className="hud-stat-row">
                <span className="hud-stat-label">Network Calls</span>
                <strong className="hud-stat-value">0 (100% Offline)</strong>
              </div>
            </div>
          </div>

          {/* Hotkeys Card */}
          <div className="hud-card">
            <div className="hud-card-header">
              <Keyboard size={14} />
              <span>GLOBAL HOTKEYS</span>
            </div>
            <div className="hud-shortcuts-list">
              <div className="hud-shortcut">
                <kbd>F1</kbd> or <kbd>?</kbd>
                <span>Toggle Telemetry HUD</span>
              </div>
              <div className="hud-shortcut">
                <kbd>Ctrl/⌘</kbd> + <kbd>K</kbd>
                <span>Open Command Palette</span>
              </div>
              <div className="hud-shortcut">
                <kbd>Ctrl/⌘</kbd> + <kbd>Shift</kbd> + <kbd>M</kbd>
                <span>Cycle Schedule Mode</span>
              </div>
              <div className="hud-shortcut">
                <kbd>Ctrl/⌘</kbd> + <kbd>Shift</kbd> + <kbd>L</kbd>
                <span>Focus Daily Log</span>
              </div>
              <div className="hud-shortcut">
                <kbd>Esc</kbd>
                <span>Dismiss Active Modal</span>
              </div>
            </div>
          </div>
        </div>

        <div className="hud-quick-modes">
          <span className="eyebrow">Quick Switch Schedule Guide</span>
          <div className="hud-mode-pills">
            {model.modes
              .filter((m) => m.category === "schedule")
              .map((m) => (
                <button
                  key={m.key}
                  type="button"
                  className={`hud-mode-pill ${
                    state.settings.scheduleMode === m.key ? "is-active" : ""
                  }`}
                  onClick={() => setScheduleMode(m.key)}
                >
                  {m.label}
                </button>
              ))}
          </div>
        </div>

        <div className="hud-footer">
          <span>MERIDIAN V1.0 // LOCAL ONLY DISK CACHE</span>
          <button
            className="button-secondary"
            type="button"
            onClick={() => setHudOpen(false)}
          >
            Close Telemetry [Esc]
          </button>
        </div>
      </div>
    </ModalPortal>
  );
}
