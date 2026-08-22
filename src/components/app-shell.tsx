"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  BookOpen,
  Brain,
  CalendarCheck,
  Compass,
  FileText,
  Home,
  Layers,
  Menu,
  Route,
  Search,
  Settings2,
  ShieldHalf,
  Timer,
  Trophy,
  X,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { model } from "@/data";
import { getLocalDateKey } from "@/state/date";
import { getActivePhase, getDueRetrievalPrompts, getOverallProgress, getStreak, getWeekMinutes } from "@/state/selectors";
import { rehydrateMeridian, useMeridianStore } from "@/state/store";
import { preloadVisualAssets } from "@/lib/assets";
import { whenIdle } from "@/lib/utils";
import { SidebarNav, type NavSection } from "@/components/shell/sidebar-nav";
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

/** The full register — primary items render as icon rows, all are searchable. */
const SECTIONS: NavSection[] = [
  { key: "today", label: "Today", href: "/", icon: <Home size={16} />, primary: true },
  { key: "path", label: "Learning path", href: "/path", icon: <Route size={16} />, primary: true },
  { key: "research", label: "Research desk", href: "/research", icon: <Search size={16} />, primary: true },
  { key: "settings", label: "Settings", href: "/settings", icon: <Settings2 size={16} />, primary: true },
  { key: "rhythm", label: "Rhythm", href: "/rhythm", icon: <Timer size={16} /> },
  { key: "dsa", label: "DSA track", href: "/dsa", icon: <Layers size={16} /> },
  { key: "recall", label: "Recall", href: "/recall", icon: <Brain size={16} /> },
  { key: "first7", label: "First 7 days", href: "/first-seven-days", icon: <CalendarCheck size={16} /> },
  { key: "journal", label: "Journal", href: "/journal", icon: <FileText size={16} /> },
  { key: "review", label: "Weekly review", href: "/review", icon: <Compass size={16} /> },
  { key: "portfolio", label: "Portfolio", href: "/portfolio", icon: <Trophy size={16} /> },
  { key: "library", label: "Library & network", href: "/library", icon: <BookOpen size={16} /> },
  { key: "safety", label: "Safety net", href: "/safety-net", icon: <ShieldHalf size={16} /> },
];

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const hydrated = useMeridianStore((state) => state.hydrated);
  const setHydrated = useMeridianStore((store) => store.setHydrated);
  const scheduleMode = useMeridianStore((state) => state.settings.scheduleMode);
  const setScheduleMode = useMeridianStore((store) => store.setScheduleMode);
  // Subscribe to exactly the slices the chrome derives from, then compute
  // from a single snapshot — no whole-store subscription, no stale progress.
  useMeridianStore((state) => state.sessions);
  useMeridianStore((state) => state.checks);
  useMeridianStore((state) => state.dailyLogs);
  useMeridianStore((state) => state.progressionOverrides);
  useMeridianStore((state) => state.retrievalPrompts);
  const state = useMeridianStore.getState();
  const activePhase = getActivePhase(model, state);
  const overall = getOverallProgress(model, state);
  const streak = getStreak(state);
  const weekMinutes = getWeekMinutes(state);
  const dueRecall = getDueRetrievalPrompts(state, getLocalDateKey(new Date(), state.settings.timeZone)).length;

  useEffect(() => {
    rehydrateMeridian();
    const fallback = window.setTimeout(() => setHydrated(true), 120);
    const cancelPreload = whenIdle(() => preloadVisualAssets(), 2500);
    return () => {
      window.clearTimeout(fallback);
      cancelPreload();
    };
  }, [setHydrated]);

  // Close the mobile overlay whenever the route changes.
  useEffect(() => {
    const frame = requestAnimationFrame(() => setMobileNavOpen(false));
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

  const navigate = (href: string) => router.push(href);

  const sidebar = (
    <SidebarNav
      sections={SECTIONS}
      activeHref={pathname}
      onNavigate={navigate}
      counts={{ recall: dueRecall > 0 ? String(dueRecall) : undefined }}
      progress={{
        phaseNumber: activePhase.identity.number + 1,
        completed: overall.completed,
        total: overall.total,
        percent: overall.percent,
        name: activePhase.identity.northstarName,
      }}
      fill
    />
  );

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      {/* data-lenis-prevent keeps wheel scrolling native inside the rail. */}
      <div className="rail desktop-rail" data-lenis-prevent>
        {sidebar}
      </div>
      {mobileNavOpen && (
        <div className="mobile-rail-host">
          <div className="mobile-rail-backdrop" onClick={() => setMobileNavOpen(false)} aria-hidden="true" />
          <div className="mobile-rail" data-lenis-prevent>
            {sidebar}
          </div>
        </div>
      )}
      <main id="main-content" className="app-main" tabIndex={-1}>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu"
              type="button"
              aria-label={mobileNavOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={mobileNavOpen}
              onClick={() => setMobileNavOpen((open) => !open)}
            >
              {mobileNavOpen ? <X size={16} /> : <Menu size={16} />}
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
