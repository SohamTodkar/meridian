"use client";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Code2,
  LockKeyhole,
  Orbit,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { model } from "@/data";
import {
  getActivePhase,
  getPhaseAccess,
  getPhaseProgress,
  getSessionAccess,
  isPhaseCleared,
} from "@/state/selectors";
import { useMeridianStore } from "@/state/store";
import { Reveal } from "./motion/reveal";

/**
 * The live star map is client-only (canvas2D). While it loads — or if the
 * bundle ever fails — the caption, station buttons, and legend below remain
 * fully usable, so the map never blocks the journey.
 */
const ConstellationCanvas = dynamic(
  () =>
    import("@/components/webgl/constellation-canvas").then(
      mod => mod.ConstellationCanvas
    ),
  {
    ssr: false,
    loading: () => (
      <div
        className="constellation-canvas-container constellation-loading"
        aria-hidden="true"
      />
    ),
  }
);

const symbols = [Code2, Orbit, Sparkles, ShieldCheck];
export function PathView() {
  return (
    <Suspense>
      <LearningMap />
    </Suspense>
  );
}
function LearningMap() {
  const state = useMeridianStore();
  const active = getActivePhase(model, state);
  const params = useSearchParams();
  const [selected, setSelected] = useState(params.get("phase") ?? active.id);
  const [query, setQuery] = useState("");
  const phase = model.phases.find(p => p.id === selected) ?? active;
  const access = getPhaseAccess(model, phase, state);
  const progress = getPhaseProgress(model, phase, state);
  const sessions = phase.sessions.filter(s =>
    `${s.title} ${s.outcome}`.toLowerCase().includes(query.toLowerCase())
  );
  return (
    <div className="content map-page">
      <div className="dashboard-heading">
        <div>
          <div className="eyebrow">THE BIGGER PICTURE</div>
          <h1>
            Your learning universe<span className="greeting-dot">.</span>
          </h1>
          <p>
            From your first line of Python to the frontiers of beneficial AI.
          </p>
        </div>
        <Link
          className="button-secondary"
          href={`/path/${active.id}?tab=sessions`}
        >
          Continue your path
          <ArrowRight size={16} />
        </Link>
      </div>
      <section
        className="constellation-map"
        aria-label="Four phase learning map"
      >
        <div className="map-grid" />
        <ConstellationCanvas
          phases={model.phases.map(p => ({
            id: p.id,
            name: p.identity.northstarName,
            number: p.identity.number + 1,
            percent: getPhaseProgress(model, p, state).percent,
            active: active.id === p.id,
            cleared: isPhaseCleared(p, state),
          }))}
          selectedId={selected}
          onSelect={id => {
            setSelected(id);
            setQuery("");
          }}
        />
        <div className="map-caption">
          <span>
            <span className="signal-dot" /> YOUR TRAJECTORY
          </span>
          <span>
            4 PHASES <span className="label-dot">/</span> 65 SESSIONS
          </span>
        </div>
        <div className="constellation-stations">
          {model.phases.map((p, i) => {
            const Icon = symbols[i];
            const cleared = isPhaseCleared(p, state);
            return (
              <button
                key={p.id}
                className={`constellation-station station-${i} ${selected === p.id ? "selected" : ""} ${active.id === p.id ? "current" : ""}`}
                onClick={() => {
                  setSelected(p.id);
                  setQuery("");
                }}
                aria-pressed={selected === p.id}
              >
                <span className="constellation-node">
                  <span className="node-inner">
                    <Icon size={30} strokeWidth={1.2} />
                  </span>
                  {active.id === p.id && (
                    <span className="you-are-here">YOU ARE HERE</span>
                  )}
                </span>
                <small>PHASE 0{i + 1}</small>
                <strong>{p.identity.northstarName}</strong>
                <span>
                  {cleared
                    ? "Checkpoint cleared"
                    : `${p.sessions.filter(s => state.sessions[s.id]?.completed).length} / ${p.sessions.length} sessions`}
                </span>
              </button>
            );
          })}
        </div>
        <div className="map-bottom">
          <span>
            <span className="legend-dot violet-dot" />
            Current phase
          </span>
          <span>
            <span className="legend-dot" />
            Next frontier
          </span>
          <span>
            Select a phase to explore its sessions
            <ArrowUpRight size={13} />
          </span>
        </div>
      </section>
      <div className="map-detail-grid">
        <Reveal as="section" className="obs-panel map-session-panel" delay={0.08}>
          <div className="map-phase-header">
            <div className="eyebrow">PHASE 0{phase.identity.number + 1}</div>
            <h2>{phase.identity.northstarName}</h2>
            <p>{phase.identity.summary}</p>
            <div className="map-phase-meta">
              <span>
                <Clock3 size={14} />
                {phase.identity.typicalRange.replace("Typical range: ", "")}
              </span>
              <span>{phase.sessions.length} guided sessions</span>
              <span className="pill-violet">
                {access.allowed ? "Ready to explore" : "Prerequisite ahead"}
              </span>
            </div>
          </div>
          <div className="session-list-heading">
            <h3>Mission sequence</h3>
            <div className="map-search">
              <Search size={15} />
              <input
                aria-label="Search sessions"
                placeholder="Find a session…"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="map-session-list">
            {sessions.map(session => {
              const done = state.sessions[session.id]?.completed;
              const allowed = getSessionAccess(
                model,
                phase,
                session.id,
                state
              ).allowed;
              const index = phase.sessions.indexOf(session);
              return (
                <Link
                  href={`/session/${session.id}`}
                  className={`map-session-row ${done ? "complete" : ""} ${!allowed ? "locked" : ""}`}
                  key={session.id}
                >
                  <span className="session-index">
                    {done ? (
                      <Check size={16} />
                    ) : (
                      String(index + 1).padStart(2, "0")
                    )}
                  </span>
                  <span>
                    <strong>{session.title.replace(/^Tonight: /, "")}</strong>
                    <small>{session.outcome}</small>
                  </span>
                  <span className="session-duration">
                    {session.minutes} min
                  </span>
                  {allowed ? (
                    <ChevronRight size={16} />
                  ) : (
                    <LockKeyhole size={15} />
                  )}
                </Link>
              );
            })}
            {!sessions.length && (
              <div className="empty-state">
                No sessions match “{query}”.
                <button
                  className="text-link accent-link"
                  onClick={() => setQuery("")}
                >
                  Clear search
                </button>
              </div>
            )}
          </div>
        </Reveal>
        <aside>
          <Reveal as="section" className="obs-panel phase-brief" delay={0.14}>
            <span className="mini-icon">
              <Orbit size={24} />
            </span>
            <div className="eyebrow">YOUR DESTINATION</div>
            <h3>What you’ll be able to do</h3>
            <p>{phase.identity.promise}</p>
            <div className="phase-progress-label">
              <span>Capability progress</span>
              <strong>{progress.percent}%</strong>
            </div>
            <div className="progress-track">
              <span style={{ width: `${progress.percent}%` }} />
            </div>
            <Link
              className="button-primary"
              href={`/path/${phase.id}?tab=checkpoint`}
            >
              View checkpoint
              <ArrowRight size={16} />
            </Link>
          </Reveal>
          <Reveal as="section" className="obs-panel phase-resource" delay={0.2}>
            <div className="eyebrow">YOUR ANCHOR RESOURCE</div>
            <h3>{phase.identity.primary}</h3>
            <p>
              One trusted starting point. Go deeper when the work calls for it.
            </p>
            <Link
              className="text-link accent-link"
              href={`/path/${phase.id}?tab=resources`}
            >
              Open phase resources
              <ArrowUpRight size={16} />
            </Link>
          </Reveal>
          <Link href="/dsa" className="obs-panel side-track">
            <Code2 size={22} />
            <div>
              <strong>A parallel orbit</strong>
              <p>
                Practice data structures and algorithms alongside your main
                path.
              </p>
              <span className="text-link">
                Explore DSA
                <ArrowRight size={15} />
              </span>
            </div>
          </Link>
        </aside>
      </div>
    </div>
  );
}
