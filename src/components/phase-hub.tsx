"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, ExternalLink } from "lucide-react";
import { Suspense, useMemo } from "react";
import type { CurriculumSection, Phase } from "@/data";
import { model } from "@/data";
import { getPhaseAccess, getPhaseProgress, getSessionAccess, phaseOverrideKey, isPhaseCleared } from "@/state/selectors";
import { useMeridianStore } from "@/state/store";
import { TickBox } from "./tick-box";
import { DisplayPair } from "./labeled-item";
import { ProgressionLock } from "./progression-lock";
import { PhaseGeometryViewer } from "./webgl/phase-geometry-viewer";
import { KineticText } from "./motion/kinetic-text";

type Tab = "overview" | "sessions" | "curriculum" | "resources" | "checkpoint";

function dedupEvidence(phase: Phase): Array<{ id: string; text: string }> {
  const raw = [
    ...phase.checkpoint.cockpit.requirements.map((text, index) => ({ id: `${phase.id}.checkpoint.requirement.${index + 1}`, text })),
    ...phase.checkpoint.northstar.map((text, index) => ({ id: `${phase.id}.gate.${index + 1}`, text })),
  ];
  const selected: Array<{ id: string; text: string }> = [];
  for (const item of raw) {
    const normalized = item.text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const duplicate = selected.find((existing) => {
      const existingNormalized = existing.text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      return existingNormalized === normalized || existingNormalized.includes(normalized) || normalized.includes(existingNormalized);
    });
    if (!duplicate) selected.push(item);
    else if (item.text.length > duplicate.text.length) {
      duplicate.text = item.text;
      duplicate.id = item.id;
    }
  }
  return selected;
}

function SectionItem({ section, index, checked, onChange }: { section: CurriculumSection; index: number; checked: boolean; onChange: () => void }) {
  let text = "";
  let meta = "";
  if (section.kind === "videos") {
    text = section.items[index];
  } else if (section.kind === "resources") {
    const item = section.items[index];
    text = item.name;
    meta = item.why;
  } else if (section.kind === "days") {
    const item = section.items[index];
    text = item.text;
    meta = `Day ${item.day}`;
  } else if (section.kind === "checktable") {
    const item = section.items[index];
    text = item.text;
    meta = item.why;
  } else if (section.kind === "projects") {
    const item = section.items[index];
    text = item.text;
    meta = item.detail;
  } else {
    const item = section.items[index];
    text = item.text;
    if (item.meta) meta = item.meta;
  }
  return (
    <div className="curriculum-item">
      <TickBox className="curriculum-check" checked={checked} label={`Mark ${text} ${checked ? "not done" : "done"}`} onChange={onChange} />
      <DisplayPair className="curriculum-item-copy" title={text} meta={meta || undefined} />
    </div>
  );
}

function CurriculumSectionView({ section, checked, onChange }: { section: CurriculumSection; checked: (index: number) => boolean; onChange: (index: number) => void }) {
  return (
    <article className="curriculum-section">
      <div className="curriculum-section-heading"><div>{section.title && <h3 className="curriculum-title">{section.title}</h3>}{section.note && <p className="curriculum-note">{section.note}</p>}</div><span className="eyebrow">{section.kind === "checklist" ? "Checklist" : section.kind === "checktable" ? "Table" : section.kind === "days" ? "Days" : section.kind === "videos" ? "Videos" : section.kind === "resources" ? "Resources" : section.kind === "projects" ? "Projects" : "Papers"}</span></div>
      <div className="curriculum-items">
        {section.items.map((_, index) => <SectionItem key={`${section.key}.${index}`} section={section} index={index} checked={checked(index)} onChange={() => onChange(index)} />)}
      </div>
    </article>
  );
}

function PhaseHubContent({ phaseId }: { phaseId: string }) {
  const searchParams = useSearchParams();
  const candidate = searchParams.get("tab");
  const allowed: Tab[] = ["overview", "sessions", "curriculum", "resources", "checkpoint"];
  const tab: Tab = allowed.includes(candidate as Tab) ? candidate as Tab : "overview";
  const canonicalId = /^p\d$/.test(phaseId) ? phaseId : `p${phaseId}`;
  const phase = model.phases.find((item) => item.id === canonicalId);
  const state = useMeridianStore();
  const toggleCheck = useMeridianStore((store) => store.toggleCheck);
  const progress = phase ? getPhaseProgress(model, phase, state) : undefined;
  const evidence = useMemo(() => phase ? dedupEvidence(phase) : [], [phase]);
  if (!phase || !progress) return <div className="content"><div className="empty-state">This phase does not exist.</div></div>;
  const access = getPhaseAccess(model, phase, state);
  if (!access.allowed) return <ProgressionLock title={`Phase ${phase.identity.number + 1}: ${phase.identity.northstarName}`} requirements={access.requirements} overrideKey={phaseOverrideKey(phase.id)} />;
  const cleared = isPhaseCleared(phase, state);
  const phaseOverride = state.progressionOverrides?.[phaseOverrideKey(phase.id)];
  const tabs: Tab[] = ["overview", "sessions", "curriculum", "resources", "checkpoint"];
  return (
    <div className="content">
      <div className="page-kicker eyebrow">Phase {phase.identity.number + 1} · {progress.percent}% weighted capability · {progress.coverage.percent}% curriculum coverage</div>
      <h1 className="page-title">
        <KineticText as="span" trigger="view">
          {phase.identity.northstarName}
        </KineticText>
      </h1>
      <p className="page-intro">{phase.identity.promise}</p>

      {/* Scroll-reactive phase geometry (quaternion rotation bound to Lenis progress). */}
      <PhaseGeometryViewer
        phaseNumber={phase.identity.number + 1}
        phaseName={phase.identity.northstarName}
        cleared={cleared}
        locked={false}
        progressPercent={progress.percent}
      />

      {phaseOverride && <aside className="override-notice"><span className="eyebrow">Sequence override</span><span>Opened {new Date(phaseOverride.createdAt).toLocaleDateString()} · {phaseOverride.reason}</span></aside>}
      <nav className="phase-tabs" aria-label="Phase sections">
        {tabs.map((item) => <Link className={`phase-tab ${tab === item ? "active" : ""}`} href={`/path/${phase.id}?tab=${item}`} key={item}>{item}</Link>)}
      </nav>

      {tab === "overview" && (
        <div className="overview-grid">
          <div className="info-block"><div className="eyebrow">Promise</div><p>{phase.identity.promise}</p></div>
          <div className="info-block"><div className="eyebrow">Primary</div><p>{phase.identity.primary}</p></div>
          <div className="info-block"><div className="eyebrow">Duration</div><p>{phase.identity.typicalRange}</p><p>{phase.identity.weeks}{" "}<span className="muted">suggested calendar window · not a deadline</span></p></div>
          <div className="info-block"><div className="eyebrow">Objective</div><p>{phase.identity.objective}</p></div>
          <div className="info-block"><div className="eyebrow">Priorities</div><ul>{phase.priorities.map((item) => <li key={item}>{item}</li>)}</ul></div>
          <div className="info-block"><div className="eyebrow">Stretch</div><ul>{phase.stretch.map((item) => <li key={item}>{item}</li>)}</ul></div>
        </div>
      )}

      {tab === "sessions" && (
        <div className="session-list">
          {phase.sessions.map((session, index) => {
            const done = Boolean(state.sessions[session.id]?.completed);
            const sessionAccess = getSessionAccess(model, phase, session.id, state);
            const row = <>
              <span className="row-index">{String(index + 1).padStart(2, "0")}</span>
              <DisplayPair className="session-copy" title={<>{done && <Check size={14} style={{ verticalAlign: "middle", marginRight: 6 }} />}{session.title}</>} description={session.outcome} />
              <span className="row-meta">{sessionAccess.allowed ? `${session.minutes} min` : "Prerequisite required"} <ArrowRight size={13} style={{ verticalAlign: "middle" }} /></span>
            </>;
            return <Link className={`session-row${sessionAccess.allowed ? "" : " locked"}`} href={`/session/${session.id}`} key={session.id} aria-label={`${sessionAccess.allowed ? "Open" : "View prerequisite for"} session ${index + 1}: ${session.title}`}>{row}</Link>;
          })}
        </div>
      )}

      {tab === "curriculum" && (
        <div className="curriculum-group">
          {phase.curriculum.map((section) => <CurriculumSectionView key={section.key} section={section} checked={(index) => Boolean(state.checks[`${section.key}.${index + 1}`])} onChange={(index) => toggleCheck(`${section.key}.${index + 1}`)} />)}
        </div>
      )}

      {tab === "resources" && (
        <div className="resource-list">
          {phase.resources.map((resource) => <article className="resource-row" key={resource.id}>
            <div><h3 className="row-title">{resource.url ? <a href={resource.url} target="_blank" rel="noreferrer">{resource.name} <ExternalLink size={12} style={{ verticalAlign: "middle" }} /></a> : resource.name}</h3><p className="row-copy">{resource.role ?? resource.why}</p>{resource.note && <p className="row-copy">{resource.note}</p>}{resource.checked && <p className="resource-footnote">{resource.checked}</p>}</div>
            {resource.rating !== undefined && <span className="resource-rating">{"●".repeat(resource.rating)}<span className="muted">{"·".repeat(5 - resource.rating)}</span></span>}
          </article>)}
        </div>
      )}

      {tab === "checkpoint" && (
        <div className="section" style={{ marginTop: 28 }}>
          <div className="action-panel" style={{ marginTop: 0 }}>
            <div className="eyebrow">What done means</div>
            <h2 className="action-title" style={{ fontSize: "clamp(25px,4vw,39px)" }}>{phase.identity.promise}</h2>
            <p className="action-outcome">{phase.checkpoint.cockpit.quote}</p>
          </div>
          <div className="eyebrow" style={{ marginTop: 42 }}>Evidence · {evidence.filter((item) => state.checks[item.id]).length}/{evidence.length}</div>
          <div className="evidence-list">
            {evidence.map((item) => <label className="evidence-row" key={item.id}>
              <TickBox className="evidence-check" checked={Boolean(state.checks[item.id])} label={`Evidence: ${item.text}`} onChange={() => toggleCheck(item.id)} />
              <span className="row-copy" style={{ color: "var(--bone-dim)", margin: 0 }}>{item.text}</span>
              <span className="row-meta">{state.checks[item.id] ? "Done" : "Open"}</span>
            </label>)}
          </div>
          <div className="stop-note"><strong>{phase.checkpoint.cockpit.gate}</strong><br />{phase.checkpoint.cockpit.proof}</div>
          {cleared && <p className="dim" style={{ marginTop: 20 }}><Check size={15} style={{ verticalAlign: "middle" }} /> Capability evidence cleared. The next phase is open.</p>}
        </div>
      )}
    </div>
  );
}

export function PhaseHub({ phaseId }: { phaseId: string }) {
  return <Suspense fallback={<div className="content"><div className="empty-state">Loading phase…</div></div>}><PhaseHubContent phaseId={phaseId} /></Suspense>;
}
