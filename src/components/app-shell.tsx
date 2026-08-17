"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Brain, ChevronRight, Menu, Route, Settings2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { model } from "@/data";
import { getActivePhase, getOverallProgress, getStreak, getWeekMinutes } from "@/state/selectors";
import { rehydrateMeridian, useMeridianStore } from "@/state/store";
import { CommandPalette } from "./command-palette";
import { Onboarding } from "./onboarding";

function titleForPath(pathname: string): string {
  if (pathname.startsWith("/session/")) return "Session";
  if (pathname.startsWith("/path/")) return "Phase";
  if (pathname === "/path") return "Learning path";
  if (pathname === "/rhythm") return "Rhythm";
  if (pathname === "/dsa") return "DSA track";
  if (pathname === "/journal") return "Journal";
  if (pathname === "/recall") return "Recall";
  if (pathname === "/review") return "Weekly review";
  if (pathname === "/portfolio") return "Portfolio";
  if (pathname === "/library") return "Library & network";
  if (pathname === "/first-seven-days") return "First 7 days";
  if (pathname === "/safety-net") return "Safety net";
  if (pathname === "/settings") return "Settings";
  return "Today";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [railOpen, setRailOpen] = useState(false);
  const hydrated = useMeridianStore((state) => state.hydrated);
  const state = useMeridianStore();
  const setScheduleMode = useMeridianStore((store) => store.setScheduleMode);
  const setHydrated = useMeridianStore((store) => store.setHydrated);
  const activePhase = getActivePhase(model, state);
  const overall = getOverallProgress(model, state);

  useEffect(() => {
    rehydrateMeridian();
    const fallback = window.setTimeout(() => setHydrated(true), 120);
    return () => window.clearTimeout(fallback);
  }, [setHydrated]);

  if (!hydrated) {
    return <div className="empty-state" style={{ margin: 24 }}>Loading your local path.</div>;
  }

  if (pathname.startsWith("/session/")) return <><a className="skip-link" href="#main-content">Skip to main content</a><main id="main-content" className="app-main session-main" tabIndex={-1}>{children}</main></>;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className={`rail ${railOpen ? "open" : ""}`} aria-label="Primary navigation">
        <div>
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">M</span>
            <span className="brand-name">Meridian</span>
          </div>
          <nav className="rail-nav" aria-label="Meridian">
            <Link className={`rail-link ${pathname === "/" ? "active" : ""}`} href="/">
              <BookOpen size={15} aria-hidden="true" /> Today
            </Link>
            <Link className={`rail-link ${pathname.startsWith("/path") ? "active" : ""}`} href="/path">
              <Route size={15} aria-hidden="true" /> Learning path
            </Link>
            <Link className="rail-link" href="/settings">
              <Settings2 size={15} aria-hidden="true" /> Settings
            </Link>
          </nav>
          <div className="rail-group">
            <div className="eyebrow">Practice</div>
            <nav className="rail-nav" aria-label="Practice">
              <Link className={`rail-link ${pathname.startsWith("/rhythm") ? "active" : ""}`} href="/rhythm"><BookOpen size={15} aria-hidden="true" /> Rhythm</Link>
              <Link className={`rail-link ${pathname.startsWith("/dsa") ? "active" : ""}`} href="/dsa"><Route size={15} aria-hidden="true" /> DSA track</Link>
              <Link className={`rail-link ${pathname.startsWith("/recall") ? "active" : ""}`} href="/recall"><Brain size={15} aria-hidden="true" /> Recall</Link>
              <Link className={`rail-link ${pathname.startsWith("/first-seven-days") ? "active" : ""}`} href="/first-seven-days"><Route size={15} aria-hidden="true" /> First 7 days</Link>
            </nav>
          </div>
          <div className="rail-group">
            <div className="eyebrow">Record</div>
            <nav className="rail-nav" aria-label="Record">
              <Link className={`rail-link ${pathname.startsWith("/journal") ? "active" : ""}`} href="/journal"><BookOpen size={15} aria-hidden="true" /> Journal</Link>
              <Link className={`rail-link ${pathname.startsWith("/review") ? "active" : ""}`} href="/review"><BookOpen size={15} aria-hidden="true" /> Weekly review</Link>
              <Link className={`rail-link ${pathname.startsWith("/portfolio") ? "active" : ""}`} href="/portfolio"><Route size={15} aria-hidden="true" /> Portfolio</Link>
            </nav>
          </div>
          <div className="rail-group">
            <div className="eyebrow">Reference</div>
            <nav className="rail-nav" aria-label="Reference">
              <Link className={`rail-link ${pathname.startsWith("/library") ? "active" : ""}`} href="/library"><BookOpen size={15} aria-hidden="true" /> Library &amp; network</Link>
              <Link className={`rail-link ${pathname.startsWith("/safety-net") ? "active" : ""}`} href="/safety-net"><Route size={15} aria-hidden="true" /> Safety net</Link>
            </nav>
          </div>
          <div className="rail-progress">
            <div className="rail-progress-row eyebrow"><span>Phase {activePhase.identity.number + 1} · {overall.percent}%</span></div>
            <strong className="rail-progress-value">{overall.completed}<span className="muted">/{overall.total}</span></strong>
            <div className="progress-line" style={{ marginTop: 13 }}><span style={{ width: `${overall.percent}%` }} /></div>
            <p className="muted" style={{ fontSize: 12, margin: "13px 0 0" }}>{activePhase.identity.northstarName}</p>
          </div>
        </div>
        <p className="privacy-note">Local only. <span aria-hidden="true">—</span> Your work stays on this device.</p>
      </aside>
      <main id="main-content" className="app-main" tabIndex={-1}>
        <header className="topbar">
          <div className="breadcrumb">
            <button className="mobile-menu" type="button" aria-label={railOpen ? "Close navigation" : "Open navigation"} onClick={() => setRailOpen((open) => !open)}>
              {railOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <Link href="/">Meridian</Link>
            <ChevronRight size={13} aria-hidden="true" />
            <span className="breadcrumb-current">{titleForPath(pathname)}</span>
          </div>
          <div className="topbar-right">
            <label className="mode-chip">
              <span className="sr-only">Schedule mode</span>
              <select
                aria-label="Schedule mode"
                value={state.settings.scheduleMode}
                onChange={(event) => setScheduleMode(event.target.value)}
                style={{ border: 0, background: "transparent", color: "inherit", font: "inherit", outline: 0 }}
              >
                {model.modes.filter((item) => item.category === "schedule").map((item) => (
                  <option key={item.key} value={item.key}>{item.label}</option>
                ))}
              </select>
            </label>
            <div className="stat">
              <span className="eyebrow">Streak</span>
              <strong>{getStreak(state)} days</strong>
            </div>
            <div className="stat">
              <span className="eyebrow">This week</span>
              <strong>{(getWeekMinutes(state) / 60).toFixed(1)}h</strong>
            </div>
          </div>
        </header>
        {children}
      </main>
      <CommandPalette />
      <Onboarding />
    </div>
  );
}
