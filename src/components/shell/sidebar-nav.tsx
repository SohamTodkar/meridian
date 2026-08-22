"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  Check,
  ChevronDown,
  Compass,
  FlaskConical,
  PanelLeftClose,
  PanelLeftOpen,
  PenLine,
  Search,
  Settings2,
  ShieldCheck,
  X,
} from "lucide-react";
import GlideMenu from "@/components/primitives/GlideMenu";

/**
 * SIDEBAR NAV (adapted from the gallery kit) — Meridian's navigation:
 * a compact workspace switcher, primary icon navigation, a searchable
 * index of every section, live phase progress, and a collapse that
 * preserves icon alignment. On mobile it renders inside the shell's
 * overlay panel (forceExpanded keeps it open there).
 */

export interface NavSection {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  primary?: boolean;
  count?: string;
}

const WORKSPACE = { key: "meridian", name: "Meridian", monogram: "M" };

export interface SidebarProgress {
  phaseNumber: number;
  completed: number;
  total: number;
  percent: number;
  name: string;
}

const SIDEBAR_MOTION = {
  expandedWidth: 224,
  collapsedWidth: 52,
  duration: 280,
  copyDuration: 180,
  copyOffset: 8,
  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
};

const CHAT_SEARCH_MOTION = {
  duration: 180,
  closedWidth: 28,
  easing: "cubic-bezier(0.16, 1, 0.3, 1)",
};

const COLLAPSE_KEY = "meridian.sidebar.collapsed";

function GlideGroup({ children }: { children: ReactNode }) {
  return (
    <GlideMenu
      rowSelector="[data-row]"
      highlightClassName="sidebar-glide-highlight rounded-[7px] bg-hover-2"
      className="group/glide flex flex-col gap-px"
    >
      {children}
    </GlideMenu>
  );
}

function RailButton({
  icon,
  label,
  active = false,
  count,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  active?: boolean;
  count?: string;
  onClick?: () => void;
}) {
  return (
    <button
      data-row
      type="button"
      onClick={onClick}
      className={`sidebar-row relative z-10 mx-2 flex h-8 items-center rounded-[8px] px-2 text-left
        transition-[width,background-color,color,transform] duration-150 active:scale-[0.98]
        ${active ? "bg-hover-2 group-hover/glide:bg-transparent" : ""}`}
    >
      <span className={`flex size-5 shrink-0 items-center justify-center ${active ? "text-ink" : "text-ink-2"}`}>
        {icon}
      </span>
      <span className={`sidebar-copy ml-1.5 min-w-0 flex-1 truncate text-[14px] font-medium ${active ? "text-ink" : "text-ink-2"}`}>
        {label}
      </span>
      {count && (
        <span className="sidebar-copy mr-2 shrink-0 text-[12px] font-medium tabular-nums text-ink-3">
          {count}
        </span>
      )}
    </button>
  );
}

function WorkspaceMenu({
  position,
  onClose,
  onNavigate,
}: {
  position: { top: number; left: number };
  onClose: () => void;
  onNavigate: (href: string) => void;
}) {
  const items = [
    { label: "Settings", icon: <Settings2 size={16} />, href: "/settings" },
    { label: "Back up local data", icon: <ShieldCheck size={16} />, href: "/settings" },
  ];
  return createPortal(
    <div
      data-workspace-menu
      className="fixed z-50 w-64 rounded-[14px] bg-surface p-1.5 shadow-overlay"
      style={{
        top: position.top,
        left: position.left,
        animation: "pop-in 180ms cubic-bezier(0.23,1,0.32,1) both",
        transformOrigin: "top left",
      }}
      data-lenis-prevent
    >
      <GlideMenu className="flex flex-col gap-px" highlightClassName="inset-x-0 rounded-[8px] bg-hover-2">
        <button
          data-menu-row
          type="button"
          onClick={onClose}
          className="relative z-10 flex h-10 w-full items-center gap-1.5 rounded-[8px] px-2 text-left"
        >
          <span className="flex size-6 shrink-0 items-center justify-center rounded-[7px] bg-ink text-[11px] font-semibold text-surface">
            {WORKSPACE.monogram}
          </span>
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ink">{WORKSPACE.name}</span>
          <span className="shrink-0 text-ink"><Check size={14} strokeWidth={2.5} /></span>
        </button>
        <div className="my-1 h-px bg-line" />
        {items.map((item) => (
          <button
            key={item.label}
            data-menu-row
            type="button"
            onClick={() => {
              onNavigate(item.href);
              onClose();
            }}
            className="relative z-10 flex h-9 w-full items-center gap-1.5 rounded-[8px] px-2 text-left"
          >
            <span className="flex size-5 shrink-0 items-center justify-center text-ink-2">{item.icon}</span>
            <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{item.label}</span>
          </button>
        ))}
        <div className="my-1 h-px bg-line" />
        <button
          data-menu-row
          type="button"
          onClick={() => {
            // Toggle the telemetry HUD through the same F1 channel.
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "F1" }));
            onClose();
          }}
          className="relative z-10 flex h-9 w-full items-center gap-1.5 rounded-[8px] px-2 text-left"
        >
          <span className="flex size-5 shrink-0 items-center justify-center text-ink-2"><Compass size={16} /></span>
          <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">Telemetry HUD (F1)</span>
        </button>
      </GlideMenu>
    </div>,
    document.body,
  );
}

export function SidebarNav({
  sections,
  activeHref,
  onNavigate,
  progress,
  counts,
  forceExpanded = false,
  fill = false,
  className = "",
}: {
  sections: NavSection[];
  activeHref: string;
  onNavigate: (href: string) => void;
  progress?: SidebarProgress;
  counts?: Record<string, string | undefined>;
  forceExpanded?: boolean;
  fill?: boolean;
  className?: string;
}) {
  const [userCollapsed, setUserCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const collapsed = forceExpanded ? false : userCollapsed;

  // Collapse preference persists locally (default expanded).
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        setUserCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
      } catch {
        /* preference stays default */
      }
      setHydrated(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const toggleCollapse = (next: boolean) => {
    setUserCollapsed(next);
    try {
      localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
    } catch {
      /* preference not persisted */
    }
  };

  const [workspaceOpen, setWorkspaceOpen] = useState(false);
  const [workspacePosition, setWorkspacePosition] = useState({ top: 0, left: 0 });
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const workspaceButtonRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const isActive = (href: string) => (href === "/" ? activeHref === "/" : activeHref.startsWith(href));
  const primary = sections.filter((section) => section.primary);
  const visibleSections = sections.filter((section) =>
    section.label.toLowerCase().includes(query.trim().toLowerCase()),
  );

  useEffect(() => {
    if (!workspaceOpen) return;
    const close = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!target.closest("[data-workspace-trigger]") && !target.closest("[data-workspace-menu]")) {
        setWorkspaceOpen(false);
      }
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [workspaceOpen]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const collapse = () => {
    toggleCollapse(true);
    setWorkspaceOpen(false);
    setSearchOpen(false);
    setQuery("");
  };

  const navigate = (href: string) => onNavigate(href);

  return (
    <aside
      data-sidebar-collapsed={hydrated && collapsed}
      aria-label="Primary navigation"
      className={`relative flex shrink-0 overflow-hidden transition-[width] ${fill ? "h-full" : ""} ${className}`}
      style={{
        width: collapsed ? SIDEBAR_MOTION.collapsedWidth : SIDEBAR_MOTION.expandedWidth,
        transitionDuration: `${SIDEBAR_MOTION.duration}ms`,
        transitionTimingFunction: SIDEBAR_MOTION.easing,
        "--sidebar-copy-duration": `${SIDEBAR_MOTION.copyDuration}ms`,
        "--sidebar-copy-offset": `${SIDEBAR_MOTION.copyOffset}px`,
        "--sidebar-easing": SIDEBAR_MOTION.easing,
      } as CSSProperties}
    >
      <div className="flex min-h-0 w-[224px] shrink-0 flex-col">
        {/* workspace header */}
        <div className="relative mb-2.5 h-10 shrink-0">
          <button
            ref={workspaceButtonRef}
            data-workspace-trigger
            type="button"
            aria-expanded={workspaceOpen}
            aria-hidden={collapsed}
            tabIndex={collapsed ? -1 : 0}
            onClick={() => {
              if (!workspaceOpen && workspaceButtonRef.current) {
                const rect = workspaceButtonRef.current.getBoundingClientRect();
                setWorkspacePosition({ top: rect.bottom + 6, left: rect.left });
              }
              setWorkspaceOpen((open) => !open);
            }}
            className="sidebar-workspace-control absolute left-2 top-1 flex h-8 w-[164px] items-center rounded-[8px] px-2 text-left transition-[background-color,transform] duration-100 hover:bg-hover-2 active:scale-[0.99]"
          >
            <span className="sidebar-logo flex size-5 shrink-0 items-center justify-center rounded-[5px] border border-line-strong text-ink">
              <span className="text-[10px] font-bold">{WORKSPACE.monogram}</span>
            </span>
            <span className="sidebar-copy ml-1.5 min-w-0 flex-1 truncate text-[14px] font-medium text-ink-2">
              {WORKSPACE.name}
            </span>
            <span className="sidebar-copy ml-1 flex shrink-0 text-ink-3">
              <ChevronDown size={14} />
            </span>
          </button>

          {workspaceOpen && (
            <WorkspaceMenu position={workspacePosition} onClose={() => setWorkspaceOpen(false)} onNavigate={navigate} />
          )}

          {!forceExpanded && (
            <>
              <button
                type="button"
                aria-label="Collapse sidebar"
                aria-hidden={collapsed}
                tabIndex={collapsed ? -1 : 0}
                onClick={collapse}
                className="sidebar-collapse-control absolute right-2 top-1 flex size-8 items-center justify-center rounded-[8px] text-ink-3 transition-[opacity,background-color,color] duration-150 hover:bg-hover-2 hover:text-ink"
              >
                <PanelLeftClose size={16} />
              </button>
              <button
                type="button"
                aria-label="Expand sidebar"
                aria-hidden={!collapsed}
                tabIndex={collapsed ? 0 : -1}
                onClick={() => toggleCollapse(false)}
                className="sidebar-expand-control absolute left-2 top-0.5 flex size-9 items-center justify-center rounded-[8px] text-ink-3 transition-[opacity,background-color,color] duration-150 hover:bg-hover-2 hover:text-ink"
              >
                <PanelLeftOpen size={16} />
              </button>
            </>
          )}
        </div>

        {/* primary navigation */}
        <GlideGroup>
          <RailButton
            icon={<FlaskConical size={16} />}
            label="New research"
            onClick={() => navigate("/research")}
          />
          {primary.map((section) => (
            <RailButton
              key={section.key}
              icon={section.icon}
              label={section.label}
              count={counts?.[section.key]}
              active={isActive(section.href)}
              onClick={() => navigate(section.href)}
            />
          ))}
        </GlideGroup>

        {/* searchable index of every section */}
        <div className="sidebar-only-expanded mt-3 min-h-0 flex-1 overflow-y-auto" data-lenis-prevent>
          <div className="sidebar-copy relative mx-2 mb-1 h-8">
            <div
              aria-hidden={searchOpen}
              className={`absolute inset-0 flex items-center gap-1.5 px-2 text-[12.5px] font-medium text-ink-3 transition-[opacity,transform] ${searchOpen ? "pointer-events-none -translate-x-1 opacity-0" : "translate-x-0 opacity-100"}`}
              style={{ transitionDuration: `${CHAT_SEARCH_MOTION.duration}ms`, transitionTimingFunction: CHAT_SEARCH_MOTION.easing }}
            >
              <ChevronDown size={14} />
              <span>All places</span>
            </div>

            <button
              type="button"
              aria-label="Search sections"
              aria-expanded={searchOpen}
              onClick={() => setSearchOpen(true)}
              className={`absolute right-0 top-0 z-10 flex size-8 items-center justify-center rounded-[8px] text-ink-3 transition-[opacity,background-color,color,transform] hover:bg-hover-2 hover:text-ink active:scale-[0.96] ${searchOpen ? "pointer-events-none opacity-0" : "opacity-100"}`}
              style={{ transitionDuration: `${CHAT_SEARCH_MOTION.duration}ms` }}
            >
              <Search size={14} />
            </button>

            <div
              className={`absolute right-0 top-0 z-20 flex h-8 items-center overflow-hidden rounded-[8px] bg-field text-ink-3 shadow-hairline transition-[width,opacity] focus-within:text-ink-2 ${searchOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
              style={{
                width: searchOpen ? "100%" : CHAT_SEARCH_MOTION.closedWidth,
                transitionDuration: `${CHAT_SEARCH_MOTION.duration}ms`,
                transitionTimingFunction: CHAT_SEARCH_MOTION.easing,
              }}
            >
              <span className="ml-2 flex shrink-0 items-center justify-center">
                <Search size={13} />
              </span>
              <input
                ref={searchRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setSearchOpen(false);
                    setQuery("");
                  }
                  if (event.key === "Enter" && visibleSections[0]) {
                    navigate(visibleSections[0].href);
                    setSearchOpen(false);
                    setQuery("");
                  }
                }}
                placeholder="Search sections"
                aria-label="Search sections"
                className="ml-1.5 min-w-0 flex-1 bg-transparent text-[13px] font-medium text-ink outline-none placeholder:text-ink-3"
              />
              <button
                type="button"
                aria-label="Close section search"
                onClick={() => {
                  setSearchOpen(false);
                  setQuery("");
                }}
                className="flex size-8 shrink-0 items-center justify-center rounded-[8px] text-ink-3 transition-[background-color,color,transform] duration-150 hover:bg-hover-2 hover:text-ink active:scale-[0.96]"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          <GlideGroup>
            {visibleSections.map((section) => (
              <button
                key={section.key}
                data-row
                type="button"
                title={section.label}
                onClick={() => navigate(section.href)}
                className={`sidebar-row relative z-10 mx-2 flex h-8 items-center rounded-[8px] px-2 text-left transition-[width,background-color,color,transform] duration-150 active:scale-[0.98] ${
                  isActive(section.href) ? "bg-hover-2 group-hover/glide:bg-transparent" : ""
                }`}
              >
                <span className={`sidebar-copy min-w-0 flex-1 truncate text-[14px] font-medium ${isActive(section.href) ? "text-ink" : "text-ink-2"}`}>
                  {section.label}
                </span>
                {counts?.[section.key] && (
                  <span className="sidebar-copy shrink-0 text-[11.5px] font-medium tabular-nums text-ink-3">
                    {counts[section.key]}
                  </span>
                )}
              </button>
            ))}
            {query && visibleSections.length === 0 && (
              <div className="sidebar-copy mx-2 px-2 py-2 text-[12.5px] text-ink-3">No sections found</div>
            )}
          </GlideGroup>
        </div>

        {/* live progress + footer */}
        {progress && (
          <div className="sidebar-only-expanded sidebar-copy mx-2 mt-3 w-[208px] border-t border-line pt-3">
            <div className="flex items-baseline justify-between px-2 pb-1.5">
              <span className="text-[11px] font-medium text-ink-2">
                Phase {progress.phaseNumber} · {progress.name}
              </span>
              <span className="text-[11px] tabular-nums text-ink-3">
                {progress.completed}/{progress.total}
              </span>
            </div>
            <div className="sidebar-progress-track mx-2">
              <span style={{ width: `${progress.percent}%` }} />
            </div>
            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="mt-3 flex h-8 w-full items-center justify-center gap-1.5 rounded-control bg-hover-2 text-[12.5px] font-medium text-ink transition-[background-color,transform] duration-150 hover:bg-line-strong active:scale-[0.98]"
            >
              <PenLine size={13} />
              Back up my data
            </button>
            <p className="mt-2 px-1 text-[9.5px] font-medium tracking-[0.06em] text-ink-3 uppercase">
              Local only — your work stays on this device
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
