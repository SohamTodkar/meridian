"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  BookOpen,
  Brain,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  Compass,
  FileText,
  Flame,
  Layers,
  LayoutDashboard,
  Menu,
  Orbit,
  Search,
  Settings2,
  Sparkles,
  Timer,
  Trophy,
  X,
  Cloud,
  LoaderCircle,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { model } from "@/data";
import { getOverallProgress, getStreak } from "@/state/selectors";
import { useMeridianStore } from "@/state/store";
import { useCloudStore } from "@/state/cloud";
import { CommandPalette } from "./command-palette";
import { WorkspaceGate } from "./workspace-gate";
import { ModalPortal } from "./modal-portal";

const groups = [
  {
    label: "WORKSPACE",
    items: [
      { href: "/", label: "Overview", icon: LayoutDashboard },
      { href: "/path", label: "Learning map", icon: Orbit },
      { href: "/focus", label: "Focus room", icon: Timer },
      { href: "/rhythm", label: "Daily rhythm", icon: CalendarDays },
    ],
  },
  {
    label: "YOUR KNOWLEDGE",
    items: [
      { href: "/library", label: "Resource library", icon: BookOpen },
      { href: "/journal", label: "Study journal", icon: FileText },
      { href: "/recall", label: "Recall practice", icon: Brain },
      { href: "/research", label: "Research desk", icon: Sparkles },
    ],
  },
  {
    label: "THE BIGGER PICTURE",
    items: [
      { href: "/review", label: "Weekly review", icon: Compass },
      { href: "/portfolio", label: "Evidence vault", icon: Trophy },
      { href: "/dsa", label: "DSA track", icon: Layers },
    ],
  },
];
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <WorkspaceGate>
      <ObservatoryShell>{children}</ObservatoryShell>
    </WorkspaceGate>
  );
}
function ObservatoryShell({ children }: { children: ReactNode }) {
  const pathname = usePathname().replace(/\/$/, "") || "/";
  const state = useMeridianStore();
  const cloud = useCloudStore();
  const [mobile, setMobile] = useState(false);
  const progress = getOverallProgress(model, state);
  const streak = getStreak(state);
  const label =
    groups.flatMap(g => g.items).find(i => i.href === pathname)?.label ??
    (pathname.startsWith("/session")
      ? "Study session"
      : pathname.startsWith("/path/")
        ? "Phase detail"
        : pathname === "/settings"
          ? "Settings"
          : "Field guide");
  useEffect(() => {
    document.documentElement.dataset.motion = state.settings.reducedMotion
      ? "reduced"
      : "full";
  }, [state.settings.reducedMotion]);
  const openSearch = () =>
    window.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", ctrlKey: true })
    );
  const sidebar = (
    <>
      <Link href="/" className="obs-brand" onClick={() => setMobile(false)}>
        <Orbit size={30} strokeWidth={1.4} />
        <span>
          meridian<span className="brand-dot">.</span>
        </span>
      </Link>
      <div className="workspace-name">
        <span className="signal-dot" />
        PERSONAL OBSERVATORY
      </div>
      <button className="sidebar-search" onClick={openSearch}>
        <Search size={16} />
        <span>Find anything</span>
        <kbd>Ctrl K</kbd>
      </button>
      <nav aria-label="Main navigation">
        {groups.map(group => (
          <div className="obs-nav-group" key={group.label}>
            <div className="obs-nav-label">{group.label}</div>
            {group.items.map(({ href, label: navLabel, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobile(false)}
                className={`obs-nav-link ${pathname === href || (href !== "/" && pathname.startsWith(href + "/")) ? "active" : ""}`}
                aria-current={pathname === href ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={1.6} />
                <span>{navLabel}</span>
                {href === "/focus" && <span className="nav-shortcut">↗</span>}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="journey-mini">
          <div>
            <span>Your journey</span>
            <strong>{progress.percent}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progress.percent}%` }} />
          </div>
          <small>
            {Object.values(state.sessions).filter(s => s.completed).length} of{" "}
            {model.phases.flatMap(p => p.sessions).length} sessions completed
          </small>
        </div>
        <Link href="/safety-net" className="obs-nav-link">
          <CircleHelp size={18} />
          <span>When you feel stuck</span>
          <ArrowUpRight size={14} />
        </Link>
        <Link
          href="/settings"
          className={`obs-profile ${pathname === "/settings" ? "active" : ""}`}
        >
          <span className="avatar">S</span>
          <span>
            <strong>{model.profile.owner}</strong>
            <small>A little further, every day</small>
          </span>
          <Settings2 size={17} />
        </Link>
      </div>
    </>
  );
  return (
    <div className={`observatory ${pathname === "/focus" ? "is-focus" : ""}`}>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <aside className="obs-sidebar">{sidebar}</aside>
      {mobile && (
        <ModalPortal
          onClose={() => setMobile(false)}
          labelledBy="mobile-nav-title"
          className="mobile-obs-modal"
        >
          <div className="mobile-obs-sidebar">
            <h2 id="mobile-nav-title" className="sr-only">
              Navigation
            </h2>
            <button
              className="mobile-close icon-button"
              aria-label="Close navigation"
              onClick={() => setMobile(false)}
            >
              <X size={20} />
            </button>
            {sidebar}
          </div>
        </ModalPortal>
      )}
      <div className="obs-main">
        <header className="obs-topbar">
          <div className="obs-breadcrumb">
            <button
              className="obs-menu icon-button"
              aria-label="Open navigation"
              onClick={() => setMobile(true)}
            >
              <Menu size={20} />
            </button>
            <span className="breadcrumb-root">Workspace</span>
            <ChevronRight size={13} />
            <span>{label}</span>
          </div>
          <div className="obs-top-actions">
            <span
              className={`sync-state ${cloud.status}`}
              title={
                cloud.savedAt
                  ? `Saved ${new Date(cloud.savedAt).toLocaleString()}`
                  : "Your workspace is ready"
              }
            >
              {cloud.status === "saved" ? (
                <Cloud size={14} />
              ) : (
                <LoaderCircle size={14} />
              )}
              <span>
                {cloud.visitor
                  ? "Visitor preview"
                  : cloud.storage === "development"
                    ? "Development workspace"
                    : cloud.status === "saved"
                      ? "All changes saved"
                      : cloud.status === "saving" || cloud.status === "pending"
                        ? "Saving…"
                        : "Save needs attention"}
              </span>
            </span>
            <span className="streak-chip">
              <Flame size={15} />
              {streak}
              <span>day streak</span>
            </span>
            <button
              className="icon-button top-search"
              onClick={openSearch}
              aria-label="Search workspace"
            >
              <Search size={18} />
            </button>
          </div>
        </header>
        {cloud.visitor && (
          <div className="visitor-bar">
            Explore Meridian. Preview changes last for this visit.
            <a href="/login/">Owner sign-in</a>
          </div>
        )}
        <main id="main-content" tabIndex={-1}>
          {children}
        </main>
        <footer className="obs-footer">
          <span>
            <span className="signal-dot" /> A little further, every day.
          </span>
          <span>
            MERIDIAN <span className="footer-cross">+</span> YOUR STUDY
            OBSERVATORY
          </span>
        </footer>
      </div>
      <CommandPalette />
    </div>
  );
}
