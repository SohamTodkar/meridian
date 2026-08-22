"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { model } from "@/data";
import { getActivePhase, getOverallProgress, getStreak, getWeekMinutes } from "@/state/selectors";
import { rehydrateMeridian, useMeridianStore } from "@/state/store";
import { preloadVisualAssets } from "@/lib/assets";
import { whenIdle } from "@/lib/utils";
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
  if (pathname === "/research") return "Research desk";
  if (pathname === "/first-seven-days") return "First 7 days";
  if (pathname === "/safety-net") return "Safety net";
  if (pathname === "/settings") return "Settings";
  return "Today";
}

/** The full register, numbered like an instrument's channel strip. */
const RAIL_SECTIONS: Array<{
  group: string;
  items: Array<{ label: string; href: string; prefix: string }>;
}> = [
  {
    group: "Workspace",
    items: [
      { label: "Today", href: "/", prefix: "01" },
      { label: "Learning path", href: "/path", prefix: "02" },
      { label: "Settings", href: "/settings", prefix: "03" },
    ],
  },
  {
    group: "Practice",
    items: [
      { label: "Rhythm", href: "/rhythm", prefix: "04" },
      { label: "DSA track", href: "/dsa", prefix: "05" },
      { label: "Recall", href: "/recall", prefix: "06" },
      { label: "First 7 days", href: "/first-seven-days", prefix: "07" },
    ],
  },
  {
    group: "Record",
    items: [
      { label: "Journal", href: "/journal", prefix: "08" },
      { label: "Weekly review", href: "/review", prefix: "09" },
      { label: "Portfolio", href: "/portfolio", prefix: "10" },
    ],
  },
  {
    group: "Reference",
    items: [
      { label: "Library & network", href: "/library", prefix: "11" },
      { label: "Research desk", href: "/research", prefix: "12" },
      { label: "Safety net", href: "/safety-net", prefix: "13" },
    ],
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [railOpen, setRailOpen] = useState(false);
  const hydrated = useMeridianStore((state) => state.hydrated);
  const setHydrated = useMeridianStore((store) => store.setHydrated);
  const scheduleMode = useMeridianStore((state) => state.settings.scheduleMode);
  const setScheduleMode = useMeridianStore((store) => store.setScheduleMode);
  // Subscribe to exactly the slices the rail derives from, then compute from
  // a single snapshot — no whole-store subscription, no stale progress.
  useMeridianStore((state) => state.sessions);
  useMeridianStore((state) => state.checks);
  useMeridianStore((state) => state.dailyLogs);
  useMeridianStore((state) => state.progressionOverrides);
  const state = useMeridianStore.getState();
  const activePhase = getActivePhase(model, state);
  const overall = getOverallProgress(model, state);
  const streak = getStreak(state);
  const weekMinutes = getWeekMinutes(state);

  useEffect(() => {
    rehydrateMeridian();
    const fallback = window.setTimeout(() => setHydrated(true), 120);
    const cancelPreload = whenIdle(() => preloadVisualAssets(), 2500);
    return () => {
      window.clearTimeout(fallback);
      cancelPreload();
    };
  }, [setHydrated]);

  // Close the mobile rail whenever the route changes (deferred to avoid a
  // synchronous cascade inside the effect).
  useEffect(() => {
    const frame = requestAnimationFrame(() => setRailOpen(false));
    return () => cancelAnimationFrame(frame);
  }, [pathname]);

  if (!hydrated) {
    return <div className="empty-state" style={{ margin: 24 }}>Loading your local path.</div>;
  }

  if (pathname.startsWith("/session/")) {
    return (
      <>
        <a className="skip-link" href="#main-content">Skip to main content</a>
        <main id="main-content" className="app-main session-main" tabIndex={-1}>{children}</main>
      </>
    );
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      {/* data-lenis-prevent keeps wheel scrolling native inside the rail so
          the smooth-scroll engine never steals the sidebar's mouse wheel. */}
      <aside className={`rail ${railOpen ? "open" : ""}`} aria-label="Primary navigation" data-lenis-prevent>
        <div>
          <div className="brand">
            <span className="brand-mark" aria-hidden="true">M</span>
            <span className="brand-name">Meridian</span>
          </div>
          {RAIL_SECTIONS.map((section) => (
            <div className="rail-group" key={section.group}>
              <div className="eyebrow">{section.group}</div>
              <nav className="rail-nav" aria-label={section.group}>
                {section.items.map((item) => (
                  <Link className={`rail-link ${isActive(item.href) ? "active" : ""}`} href={item.href} key={item.href}>
                    <span className="rail-index" aria-hidden="true">{item.prefix}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </nav>
            </div>
          ))}
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
            <button
              className="mobile-menu"
              type="button"
              aria-label={railOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={railOpen}
              onClick={() => setRailOpen((open) => !open)}
            >
              {railOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
            <Link href="/">Meridian</Link>
            <span className="mono" aria-hidden="true" style={{ color: "var(--faint)" }}>/</span>
            <span className="breadcrumb-current">{titleForPath(pathname)}</span>
          </div>
          <div className="topbar-right">
            <label className="mode-chip">
              <span className="sr-only">Schedule mode</span>
              <select
                aria-label="Schedule mode"
                value={scheduleMode}
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
              <strong>{streak} days</strong>
            </div>
            <div className="stat">
              <span className="eyebrow">This week</span>
              <strong>{(weekMinutes / 60).toFixed(1)}h</strong>
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
