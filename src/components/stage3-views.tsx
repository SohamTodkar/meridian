/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ExternalLink, Pencil, Plus, Save, Trash2 } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { filterResourceTiers, model, selectResourcePlan, selectResourceTier } from "@/data";
import { getLocalDateKey, shiftDateKey } from "@/state/date";
import { getCapabilityTrajectory, getDsaProgress, getDueRetrievalPrompts, getLearningHeatmap, getLearningMinutes, getPhaseTimeBreakdown, getReviewWeekKey, getStreak, getUpcomingRetrievalPrompts, getWeeklyPlanSummary, orderJournalEntries, reviewCounts, type EvidenceRecord } from "@/state/selectors";
import { useMeridianStore } from "@/state/store";
import { TickBox } from "./tick-box";
import { DisplayPair, LabeledItem } from "./labeled-item";
import { KineticText } from "./motion/kinetic-text";
import { Reveal } from "./motion/scroll-progress";
import { LibraryExplorer } from "./library-explorer";

const source = model as typeof model & {
  doctrine: Record<string, any>;
  library: any;
  dsaTrack: any;
};

function PageFrame({ eyebrow, title, intro, children }: { eyebrow: string; title: string; intro?: string; children: React.ReactNode }) {
  return <div className="content"><div className="page-kicker eyebrow">{eyebrow}</div><h1 className="page-title"><KineticText as="span" trigger="view">{title}</KineticText></h1>{intro && <p className="page-intro">{intro}</p>}{children}</div>;
}

function SourceList({ title, items }: { title: string; items: string[] }) {
  return <section className="info-block"><div className="eyebrow">{title}</div><ul>{items.map((item) => <li key={item}>{item}</li>)}</ul></section>;
}

export function RhythmView() {
  const d = source.doctrine as any;
  return <PageFrame eyebrow="Daily rhythm · protocol" title="The protocol, in pieces." intro="Reference material for the way you work. Open one practice at a time.">
    <div className="reference-grid">
      <section className="reference-card"><div className="eyebrow">Pace doctrine</div><h2 className="section-title">{d.pace.headline}</h2><div className="stack-list">{d.pace.rules.map((r: any) => <LabeledItem key={r.k} name={r.k} qualifier={r.v} meta={r.why} />)}</div><p className="hint">{d.pace.replaces}</p></section>
      <section className="reference-card"><div className="eyebrow">Meta rules</div><ul>{d.metaRules.map((x: string) => <li key={x}>{x}</li>)}</ul></section>
      <section className="reference-card"><div className="eyebrow">Sustainability</div><div className="stack-list">{d.sustainability.points.map((x: any) => <LabeledItem key={x.k} name={x.k} qualifier={x.v} />)}</div></section>
      <section className="reference-card"><div className="eyebrow">Streak recovery</div><div className="stack-list">{d.streakRecovery.map((x: any) => <LabeledItem key={x.gap} name={x.gap} qualifier={x.action} />)}</div></section>
      <section className="reference-card"><div className="eyebrow">AI assistant rule</div><h2 className="section-title">{d.aiAssistant.verdict}</h2><p className="dim">{d.aiAssistant.reasoning}</p><SourceList title="Allowed" items={d.aiAssistant.allowed} /><SourceList title="Not yet" items={d.aiAssistant.forbidden} /><p className="hint">{d.aiAssistant.after}</p></section>
      <section className="reference-card"><div className="eyebrow">Anki discipline</div><h2 className="section-title">{d.ankiDiscipline.headline}</h2><div className="stack-list">{d.ankiDiscipline.rules.map((x: any) => <LabeledItem key={x.k} name={x.k} qualifier={x.v} />)}</div><div className="example-grid">{d.ankiDiscipline.examples.map((x: any) => <div key={x.bad}><LabeledItem name="Bad" qualifier={x.bad} /><LabeledItem name="Good" qualifier={x.good} /></div>)}</div></section>
      <section className="reference-card"><div className="eyebrow">Writing ritual</div><h2 className="section-title">{d.writingRitual.headline}</h2><p>{d.writingRitual.spec}</p><SourceList title="Why" items={d.writingRitual.why} /><p className="hint">{d.writingRitual.seeds}</p></section>
      <section className="reference-card"><div className="eyebrow">Stuck protocol</div><p>{d.stuckProtocol.trigger}</p><ol className="protocol-list">{d.stuckProtocol.steps.map((x: any) => <li key={x.n}><strong>{x.label}</strong><span>{x.detail}</span></li>)}</ol><div className="stop-note">{d.stuckProtocol.hardStop}</div></section>
      <section className="reference-card"><div className="eyebrow">Paper protocol</div><p>Starts at {d.paperProtocol.startsAt}.</p><div className="stack-list">{d.paperProtocol.passes.map((x: any) => <LabeledItem key={x.pass} name={x.pass} qualifier={x.time} meta={x.goal} />)}</div><div className="data-table">{d.paperProtocol.pace.map((x: any) => <DisplayPair className="data-table-row" key={x.when} title={x.when} description={x.rate} />)}</div></section>
      <section className="reference-card"><div className="eyebrow">Field drift</div><h2 className="section-title">{d.fieldDrift.headline}</h2><p>{d.fieldDrift.body}</p><SourceList title="Durable" items={d.fieldDrift.durable} /><SourceList title="Perishable" items={d.fieldDrift.perishable} /></section>
      <section className="reference-card"><div className="eyebrow">Success markers</div><div className="stack-list">{d.successMarkers.map((x: any) => <LabeledItem key={x.at} name={x.at} qualifier={x.evidence} />)}</div></section>
    </div>
  </PageFrame>;
}

export function DsaView() {
  const state = useMeridianStore();
  const dsa = source.dsaTrack;
  const ids = dsa.phases.flatMap((p: any) => p.sections.flatMap((s: any) => s.items.map((_: unknown, i: number) => `dsa.${p.key}.${s.key}.${i + 1}`)));
  const progress = getDsaProgress(state, ids);
  return <PageFrame eyebrow={`DSA track · ${progress.percent}%`} title="Keep the fundamentals close." intro={dsa.purpose}>
    <div className="metric-grid" style={{ marginTop: 34 }}><div className="metric"><span className="eyebrow">Checked</span><strong className="metric-value">{progress.completed}/{progress.total}</strong></div><div className="metric"><span className="eyebrow">Philosophy</span><strong className="metric-value" style={{ fontSize: 16 }}>{dsa.philosophy}</strong></div><div className="metric"><span className="eyebrow">First target</span><strong className="metric-value">{dsa.targets[0].count}</strong></div></div>
    <section className="reference-card warning-card" style={{ marginTop: 26 }}><div className="eyebrow">The trap</div><p>{dsa.warning}</p></section>
    <section className="section"><div className="section-heading"><div><div className="eyebrow">Rules</div><h2 className="section-title">A supplement, not the destination.</h2></div></div><ul className="clean-list">{dsa.rules.map((x: string) => <li key={x}>{x}</li>)}</ul></section>
    <section className="section"><div className="eyebrow">Allocation</div><div className="data-table">{dsa.allocation.map((x: any) => <DisplayPair className="data-table-row" key={x.phase} title={x.phase} description={`${x.weeks} · ${x.time}`} meta={x.focus} />)}</div></section>
    <section className="section"><div className="eyebrow">Targets</div><div className="data-table">{dsa.targets.map((x: any) => <DisplayPair className="data-table-row" key={x.milestone} title={x.milestone} description={x.count} meta={x.when} />)}</div></section>
    <div className="dsa-phase-list">{dsa.phases.map((p: any) => <article className="reference-card" key={p.key}><div className="eyebrow">DSA phase {p.num} · {p.weeks}</div><h2 className="section-title">{p.name}</h2><p>{p.intro}</p>{p.sections.map((s: any) => <div className="curriculum-section" key={s.key}><div className="curriculum-section-heading">{s.title && <h3 className="curriculum-title">{s.title}</h3>}<span className="eyebrow">{s.kind === "dsatable" ? "Topic table" : s.kind === "patterns" ? "Patterns" : s.kind === "checklist" ? "Checklist" : "Reference"}</span></div>{s.head && <div className="data-table table-head">{s.head.filter(Boolean).map((h: string, index: number) => <span key={`${h}-${index}`}>{index > 0 && <span aria-hidden="true"> · </span>}{h}</span>)}</div>}<div className="curriculum-items">{s.items.map((item: any, i: number) => { const id = `dsa.${p.key}.${s.key}.${i + 1}`; return <label className="curriculum-item" key={id}><TickBox className="curriculum-check" checked={Boolean(state.checks[id])} label={`Mark ${item.text} done`} onChange={() => useMeridianStore.getState().toggleCheck(id)} /><DisplayPair className="curriculum-item-copy" title={item.text} description={item.concept ?? item.what} meta={item.problems} /></label>; })}</div></div>)}<div className="stop-note">{p.milestone}{p.proof && <><br />{p.proof}</>}</div></article>)}</div>
  </PageFrame>;
}

export function JournalView() {
  const state = useMeridianStore();
  const [kind, setKind] = useState("all");
  const entries = orderJournalEntries([...state.journals, ...Object.values(state.dailyLogs).filter((x) => x.note).map((x) => ({ id: `daily.${x.date}`, date: x.date, text: x.note ?? "" }))]);
  const filtered = entries.filter((x) => kind === "all" || (kind === "session" ? Boolean(x.sessionId) : !x.sessionId));
  const exportMarkdown = () => {
    const markdown = filtered.map((entry) => `## ${entry.date}\n\n${entry.text}`).join("\n\n");
    const url = URL.createObjectURL(new Blob([markdown], { type: "text/markdown" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "meridian-journal.md";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return <PageFrame eyebrow="Journal · proof of progress" title="Keep the record." intro="Session completions, daily logs and reflections, newest first.">
    <div className="filter-row"><label className="eyebrow" htmlFor="journal-kind">Show</label><select id="journal-kind" value={kind} onChange={(e) => setKind(e.target.value)}><option value="all">Everything</option><option value="session">Session completions</option><option value="daily">Daily logs</option></select><button className="button-secondary" type="button" onClick={exportMarkdown}>Export Markdown</button></div>
    {filtered.length ? <div className="journal-list">{filtered.map((entry) => <article className="journal-entry" key={entry.id}><div className="eyebrow">{entry.date} · {entry.sessionId ? "Session completion" : "Daily log"}</div><p>{entry.text}</p>{entry.confusion && <p className="reflection-note"><strong>Still unclear</strong> {entry.confusion}</p>}{entry.nextQuestion && <p className="reflection-note"><strong>Retrieve later</strong> {entry.nextQuestion}</p>}</article>)}</div> : <div className="empty-state section">Your record is empty. Completed sessions and daily logs will appear here.</div>}
  </PageFrame>;
}

export function RecallView() {
  const state = useMeridianStore();
  const date = getLocalDateKey(new Date(), state.settings.timeZone);
  const due = getDueRetrievalPrompts(state, date);
  const upcoming = getUpcomingRetrievalPrompts(state, date).slice(0, 4);
  return <PageFrame eyebrow="Recall · local only" title="Answer before you look." intro="Confusions and next questions become small, private retrieval prompts. Recall the idea in your own words, then check the original entry or resource.">
    <section className="metric-grid recall-summary"><div className="metric"><span className="eyebrow">Due now</span><strong className="metric-value">{due.length}</strong></div><div className="metric"><span className="eyebrow">Upcoming</span><strong className="metric-value">{upcoming.length}</strong></div><div className="metric"><span className="eyebrow">Rule</span><strong className="metric-value" style={{ fontSize: 16 }}>Retrieval first</strong><span className="muted">Notes second</span></div></section>
    <section className="section"><div className="section-heading"><div><div className="eyebrow">Due prompts</div><h2 className="section-title">The smallest useful review.</h2></div><span className="mono muted">{date}</span></div>{due.length ? <div className="recall-list">{due.map((prompt) => <article className="recall-card" key={prompt.id}><div className="eyebrow">Due {prompt.dueDate} · reviewed {prompt.repetitions} time{prompt.repetitions === 1 ? "" : "s"}</div><h3>{prompt.question}</h3>{prompt.context && <details><summary>Show the confusion that made this prompt</summary><p>{prompt.context}</p></details>}<div className="runner-controls"><button className="button-primary" type="button" onClick={() => state.reviewRetrievalPrompt(prompt.id, date)}>I recalled it</button><button className="button-secondary" type="button" onClick={() => state.snoozeRetrievalPrompt(prompt.id, date)}>Snooze one day</button><button className="quiet-link" type="button" onClick={() => state.masterRetrievalPrompt(prompt.id)}>Mastered</button></div></article>)}</div> : <div className="empty-state"><p>No prompts are due. Add an honest confusion or next question when completing a guided session, then return here when it is due.</p><Link className="button-secondary" href="/path">Open learning path</Link></div>}</section>
    <section className="section"><div className="eyebrow">Next up</div>{upcoming.length ? <div className="data-table">{upcoming.map((prompt) => <DisplayPair className="data-table-row" key={prompt.id} title={prompt.question} description={`Due ${prompt.dueDate}`} meta={prompt.context} />)}</div> : <p className="hint">Upcoming prompts will appear after you complete a session with a confusion or next question.</p>}</section>
  </PageFrame>;
}

export function ReviewView() {
  const state = useMeridianStore();
  const ritualData = model.weeklyRituals as Array<{ id: string; label: string; detail: string }>;
  const week = getReviewWeekKey(new Date(), state.settings.timeZone);
  const prior = state.reviews?.[week];
  const [answers, setAnswers] = useState<Record<string, string | boolean>>(prior?.answers ?? {});
  const [rituals, setRituals] = useState<Record<string, boolean>>(prior?.rituals ?? {});
  const [decisions, setDecisions] = useState(prior?.decisions ?? { continue: "", stop: "", start: "" });
  const save = () => useMeridianStore.getState().setReview(week, { answers, rituals, decisions, savedAt: new Date().toISOString() });
  const weekEnd = shiftDateKey(week, 6);
  const logs = Object.values(state.dailyLogs).filter((log) => log.date >= week && log.date <= weekEnd);
  const totals = logs.reduce((sum, log) => ({ build: sum.build + (log.build ?? 0), study: sum.study + (log.study ?? 0), absorb: sum.absorb + (log.absorb ?? 0), minutes: sum.minutes + getLearningMinutes(log), touched: sum.touched + (log.touched ? 1 : 0), sleep: sum.sleep + (log.sleep ?? 0), sleepNights: sum.sleepNights + (log.sleep ? 1 : 0) }), { build: 0, study: 0, absorb: 0, minutes: 0, touched: 0, sleep: 0, sleepNights: 0 });
  const mode = model.modes.find((item) => item.category === "schedule" && item.key === state.settings.scheduleMode);
  const target = state.settings.pace?.weeklyHours ?? (mode?.category === "schedule" ? mode.weekly ?? 0 : 0);
  const restDay = state.settings.pace?.restDay ?? "Sunday";
  const planSummary = getWeeklyPlanSummary(state, week);
  const today = getLocalDateKey(new Date(), state.settings.timeZone);
  const heatmap = getLearningHeatmap(state, today);
  const phaseTime = getPhaseTimeBreakdown(model, state);
  const trajectory = getCapabilityTrajectory(model, state);
  const radarPoints = trajectory.map((item, index) => {
    const angle = (Math.PI * 2 * index) / trajectory.length - Math.PI / 2;
    const radius = 34 * (item.percent / 100);
    return `${50 + Math.cos(angle) * radius},${50 + Math.sin(angle) * radius}`;
  }).join(" ");
  const field = (key: string, label: string, placeholder?: string) => <label><span className="eyebrow">{label}</span><textarea className="journal-input" placeholder={placeholder} value={typeof answers[key] === "string" ? answers[key] as string : ""} onChange={(e) => setAnswers({ ...answers, [key]: e.target.value })} /></label>;
  return <PageFrame eyebrow={`Weekly review · week of ${week}`} title="Look back honestly." intro="The weekly review is what catches drift before it becomes a fade. Do it even in a week you broke the streak — especially then.">
    <div className="metric-grid review-stats">
      <div className="metric"><span className="eyebrow">Build</span><strong className="metric-value">{(totals.build / 60).toFixed(1)}h</strong></div>
      <div className="metric"><span className="eyebrow">Study</span><strong className="metric-value">{(totals.study / 60).toFixed(1)}h</strong></div>
      <div className="metric"><span className="eyebrow">Absorb</span><strong className="metric-value">{(totals.absorb / 60).toFixed(1)}h</strong></div>
      <div className="metric"><span className="eyebrow">Week total</span><strong className="metric-value">{(totals.minutes / 60).toFixed(1)}h <span className="muted">/ {target}h</span></strong></div>
      <div className="metric"><span className="eyebrow">Days touched</span><strong className="metric-value">{totals.touched}/6</strong><span className="muted">{restDay} is the rest day</span></div>
      <div className="metric"><span className="eyebrow">Sleep average</span><strong className="metric-value">{totals.sleepNights ? (totals.sleep / totals.sleepNights / 60).toFixed(1) : "—"}h</strong><span className="muted">floor {state.settings.pace?.sleepFloor ?? "source default"}</span></div>
    </div>
    <section className="reference-card review-plan-ledger"><div className="eyebrow">Plan ledger · local only</div><h2 className="section-title">See the plan beside the work you actually did.</h2><div className="metric-grid"><div className="metric"><span className="eyebrow">Planned</span><strong className="metric-value">{(planSummary.plannedMinutes / 60).toFixed(1)}h</strong></div><div className="metric"><span className="eyebrow">Completed plan</span><strong className="metric-value">{(planSummary.completedMinutes / 60).toFixed(1)}h</strong></div><div className="metric"><span className="eyebrow">Deferred</span><strong className="metric-value">{planSummary.deferredTasks}</strong><span className="muted">deliberate, not silently piled up</span></div></div><p className="hint">Measured time remains the source of truth for effort. This ledger shows whether the daily plan was realistic; it does not turn a deferred task into a debt.</p><Link className="button-secondary" href="/#daily-plan-heading">Open today’s plan</Link></section>
    <section className="section analytics-panel" aria-labelledby="private-insight-heading"><div className="section-heading"><div><div className="eyebrow">Private learning analytics</div><h2 id="private-insight-heading" className="section-title">See the signal, not a score.</h2></div><span className="mono muted">{getStreak(state)} day streak</span></div><div className="analytics-grid"><div className="analytics-card"><div className="eyebrow">Last 28 days</div><div className="learning-heatmap" aria-label="Learning activity heatmap">{heatmap.map((day) => <span className={`heatmap-cell ${day.touched ? "is-touched" : ""} ${day.minutes >= 60 ? "is-deep" : ""}`} title={`${day.date}: ${day.minutes} minutes`} aria-label={`${day.date}: ${day.minutes} minutes`} key={day.date} />)}</div><p className="hint">A touch marks any intentional local learning record; darker cells reflect 60+ measured or logged minutes.</p></div><div className="analytics-card"><div className="eyebrow">Measured time by phase</div><div className="phase-time-bars">{phaseTime.map((phase) => <div className="phase-time-row" key={phase.phaseId}><span>{phase.label}</span><div aria-label={`${phase.label}: ${phase.minutes} minutes`}><i style={{ width: `${Math.min(100, (phase.minutes / Math.max(...phaseTime.map((item) => item.minutes), 1)) * 100)}%` }} /></div><strong>{phase.minutes}m</strong></div>)}</div><p className="hint">Only recorded session-timer entries are assigned to phases; manual totals remain honest but unassigned.</p></div><div className="analytics-card capability-card"><div className="eyebrow">Capability trajectory</div><svg className="capability-radar" viewBox="0 0 100 100" role="img" aria-label="Capability progress across the four phases"><polygon className="radar-grid" points="50,14 86,50 50,86 14,50" /><line x1="50" y1="14" x2="50" y2="86" /><line x1="14" y1="50" x2="86" y2="50" /><polygon className="radar-data" points={radarPoints || "50,50"} /></svg><div className="radar-key">{trajectory.map((phase) => <span key={phase.phaseId}>{phase.label} <strong>{phase.percent}%</strong></span>)}</div><p className="hint">This follows Meridian’s evidence-weighted capability measure, not superficial time spent.</p></div></div></section>
    <section className="reference-card"><div className="eyebrow">The questions</div><div className="review-list">{field("shipped", "What I shipped", "Concrete artefacts. Repos, commits, notebooks, posts.")}{field("struggled", "What I struggled with")}{field("insight", "Biggest insight this week — this is your explainer topic", "The thing that clicked. Turn this into 300–800 public words.")}</div>
      <div className="review-subsection"><div className="eyebrow">Public explainer</div><div className="form-grid"><label><span className="eyebrow">Title</span><input value={typeof answers.writeTitle === "string" ? answers.writeTitle : ""} placeholder="Backpropagation is just the chain rule" onChange={(e) => setAnswers({ ...answers, writeTitle: e.target.value })} /></label><label><span className="eyebrow">Link</span><input value={typeof answers.writeUrl === "string" ? answers.writeUrl : ""} placeholder="https://" onChange={(e) => setAnswers({ ...answers, writeUrl: e.target.value })} /></label></div><p className="hint">{(model.doctrine.writingRitual as { spec: string }).spec}</p></div>
      <div className="review-subsection"><div className="eyebrow">Trajectory</div><div className="segmented"><button className={answers.onTrack === "yes" ? "selected" : ""} type="button" onClick={() => setAnswers({ ...answers, onTrack: "yes" })}>On track</button><button className={answers.onTrack === "behind" ? "selected" : ""} type="button" onClick={() => setAnswers({ ...answers, onTrack: "behind" })}>Behind</button></div>{field("catchup", "Adjustment (if behind — lower the target, do not break the habit)", "Switch to Semester mode for two weeks.")}</div>
      <div className="review-subsection"><div className="eyebrow">Next week’s top 3 priorities</div>{field("priority1", "Priority 1")}{field("priority2", "Priority 2")}{field("priority3", "Priority 3")}</div>
      <div className="review-subsection"><div className="eyebrow">Three decisions</div><p className="hint">Make each commitment observable and small enough to survive a difficult week.</p><div className="decision-grid"><label><span className="eyebrow">Continue</span><textarea className="journal-input" value={decisions.continue} onChange={(event) => setDecisions({ ...decisions, continue: event.target.value })} placeholder="One practice that deserves another week." /></label><label><span className="eyebrow">Stop</span><textarea className="journal-input" value={decisions.stop} onChange={(event) => setDecisions({ ...decisions, stop: event.target.value })} placeholder="One source of friction to remove or reduce." /></label><label><span className="eyebrow">Start</span><textarea className="journal-input" value={decisions.start} onChange={(event) => setDecisions({ ...decisions, start: event.target.value })} placeholder="One experiment to try next week." /></label></div></div>
      <button className="button-primary" type="button" onClick={save}><Save size={15} /> Save review</button></section>
    <section className="section"><div className="eyebrow">Weekly rituals</div><div className="checklist">{ritualData.map((ritual) => <div className="checklist-label" key={ritual.id}><TickBox className="evidence-check" checked={Boolean(rituals[ritual.id])} label={`Mark ${ritual.label} done`} onChange={() => setRituals((current) => ({ ...current, [ritual.id]: !current[ritual.id] }))} /><LabeledItem name={ritual.label} qualifier={ritual.detail} /></div>)}</div></section>
    <section className="section"><div className="eyebrow">Saved history</div>{Object.entries(state.reviews ?? {}).length ? <div className="journal-list">{Object.entries(state.reviews ?? {}).sort(([a], [b]) => b.localeCompare(a)).map(([key, item]) => { const counts = reviewCounts(item); return <article className="journal-entry" key={key}><div className="eyebrow">{key}</div><p>{counts.answers} answers · {counts.rituals} rituals checked</p></article>; })}</div> : <div className="empty-state">Saved reviews will appear here.</div>}</section>
  </PageFrame>;
}

export function PortfolioView() {
  const state = useMeridianStore();
  const captureInput = useRef<HTMLInputElement>(null);
  const emptyDraft: { kind: "session-proof" | "artifact" | "note" | "link"; title: string; url: string; note: string; capability: string; proofStatus: "verified" | "captured" | "planned" } = { kind: "artifact", title: "", url: "", note: "", capability: "", proofStatus: "captured" };
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [filter, setFilter] = useState("all");
  const [pendingDelete, setPendingDelete] = useState<EvidenceRecord | undefined>();
  const [undoRecord, setUndoRecord] = useState<EvidenceRecord | undefined>();
  const add = () => {
    if (!draft.title.trim()) return;
    const payload = { ...draft, title: draft.title.trim(), note: draft.note.trim(), url: draft.url.trim() || undefined, capability: draft.capability.trim() || undefined };
    if (editingId) useMeridianStore.getState().updateEvidence(editingId, payload);
    else useMeridianStore.getState().addEvidence({ ...payload, id: `evidence.manual.${Date.now()}` });
    setDraft(emptyDraft); setEditingId(undefined);
  };
  const confirmDelete = () => {
    if (!pendingDelete) return;
    useMeridianStore.getState().removeEvidence(pendingDelete.id);
    setUndoRecord(pendingDelete);
    setPendingDelete(undefined);
  };
  const undoDelete = () => {
    if (!undoRecord) return;
    const { schemaVersion: _s, createdAt: _c, updatedAt: _u, ...record } = undoRecord;
    void _s; void _c; void _u;
    useMeridianStore.getState().addEvidence(record);
    setUndoRecord(undefined);
  };
  const visibleEvidence = (state.evidence ?? []).filter((item) => filter === "all" || item.kind === filter);
  useEffect(() => {
    if (window.location.hash === "#capture") window.requestAnimationFrame(() => captureInput.current?.focus());
  }, []);
  return <PageFrame eyebrow="Evidence vault · local" title="Keep proof attached to the learning." intro="Verified session evidence, project artifacts, notes, and links stay on this device alongside the learning record.">
    <section id="capture" className="reference-card evidence-capture"><div className="eyebrow">{editingId ? "Edit evidence" : "Capture evidence"}</div><div className="form-grid"><select value={draft.kind} onChange={(e) => setDraft({ ...draft, kind: e.target.value as typeof draft.kind })}><option value="artifact">Artifact</option><option value="link">Link</option><option value="note">Note</option><option value="session-proof">Session proof</option></select><select value={draft.proofStatus} onChange={(e) => setDraft({ ...draft, proofStatus: e.target.value as typeof draft.proofStatus })}><option value="captured">Captured</option><option value="verified">Verified</option><option value="planned">Planned</option></select><input ref={captureInput} placeholder="Evidence title" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /><input placeholder="Capability or topic" value={draft.capability} onChange={(e) => setDraft({ ...draft, capability: e.target.value })} /><input placeholder="URL (optional)" value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} /><textarea className="journal-input" placeholder="What does this prove?" value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} /></div><div className="runner-controls"><button className="button-primary" type="button" onClick={add}><Plus size={15} /> {editingId ? "Save evidence" : "Capture evidence"}</button>{editingId && <button className="button-secondary" type="button" onClick={() => { setDraft(emptyDraft); setEditingId(undefined); }}>Cancel</button>}</div></section>
    {undoRecord && <section className="evidence-recovery" role="status"><span><strong>Evidence removed locally.</strong> The original journal record was left intact.</span><div className="runner-controls"><button className="button-secondary" type="button" onClick={undoDelete}>Undo removal</button><button className="quiet-link" type="button" onClick={() => setUndoRecord(undefined)}>Dismiss</button></div></section>}
    <div className="filter-row"><label className="eyebrow" htmlFor="evidence-filter">Show</label><select id="evidence-filter" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All evidence</option><option value="session-proof">Verified session proofs</option><option value="artifact">Artifacts</option><option value="link">Links</option><option value="note">Notes</option></select><span className="muted">{visibleEvidence.length} local record{visibleEvidence.length === 1 ? "" : "s"}</span></div>
    <div className="journal-list">{visibleEvidence.length ? visibleEvidence.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).map((entry) => <article className="journal-entry evidence-entry" key={entry.id}><div className="eyebrow">{entry.proofStatus} · {entry.kind.replace("-", " ")} · {new Date(entry.updatedAt).toLocaleDateString()}</div><h2 className="section-title">{entry.title}</h2>{entry.capability && <p className="evidence-capability">Capability · {entry.capability}</p>}<p>{entry.note}</p>{entry.url && <a className="quiet-link" href={entry.url} target="_blank" rel="noreferrer">{entry.url}</a>}<div className="evidence-actions"><button className="icon-button" type="button" aria-label={`Edit ${entry.title}`} onClick={() => { setEditingId(entry.id); setDraft({ kind: entry.kind === "session-proof" ? "session-proof" : entry.kind, title: entry.title, url: entry.url ?? "", note: entry.note, capability: entry.capability ?? "", proofStatus: entry.proofStatus }); }}><Pencil size={14} /></button><button className="icon-button" type="button" aria-label={`Remove ${entry.title}`} onClick={() => { setPendingDelete(entry); setUndoRecord(undefined); }}><Trash2 size={14} /></button></div>{pendingDelete?.id === entry.id && <div className="evidence-delete-confirm" role="alert"><p>Remove this evidence record from this device? Its original journal entry will stay intact.</p><div className="runner-controls"><button className="button-secondary" type="button" onClick={() => setPendingDelete(undefined)}>Keep evidence</button><button className="button-danger" type="button" onClick={confirmDelete}>Remove evidence</button></div></div>}</article>) : <div className="empty-state">Complete a verified session or capture an artifact, note, or link here.</div>}</div>
    {(state.portfolio?.entries ?? []).length > 0 && <section className="section"><div className="eyebrow">Portfolio archive</div><p className="hint">Your original portfolio entries remain unchanged while you build a richer evidence record.</p><div className="journal-list">{state.portfolio?.entries.map((entry) => <article className="journal-entry" key={entry.id}><div className="eyebrow">{entry.kind}</div><h2 className="section-title">{entry.title}</h2><p>{entry.note}</p>{entry.url && <a className="quiet-link" href={entry.url} target="_blank" rel="noreferrer">{entry.url}</a>}</article>)}</div></section>}
    <section className="section"><div className="eyebrow">Evidence policy</div><ul className="clean-list"><li>Guided sessions become verified evidence only after every stated check is complete.</li><li>Captured evidence can be refined later; planned evidence is not progress credit.</li><li>Keep one clear title, a short explanation of proof, and a link only when it adds context.</li></ul></section>
  </PageFrame>;
}

export function LibraryView() {
  const state = useMeridianStore();
  const l = source.library;
  const params = useSearchParams();
  const activeTab = params.get("tab") ?? "roadmap";
  const tabs = [
    ["roadmap", "Resource roadmap"],
    ["communities", "Communities"],
    ["people", "People"],
    ["tools", "Tools & compute"],
    ["books", "Books & budget"],
    ["university", "University play"],
  ] as const;
  const tab = (key: string) => tabs.find(([id]) => id === key)?.[1] ?? tabs[0][1];
  const activePlan = selectResourcePlan(model.resourcePlans, params.get("phase"));
  const activeTier = selectResourceTier(activePlan, params.get("tier"));
  const roadmapHref = (phaseId: string, tier = activeTier) => `/library?tab=roadmap&phase=${phaseId}${tier === "all" ? "" : `&tier=${tier}`}`;
  return <PageFrame eyebrow="Library & network" title="Use the right resource at the right time." intro="A phase-first resource map keeps the core course visible and every useful reference in its proper place.">
    <nav className="tab-row" aria-label="Library sections">{tabs.map(([id, label]) => <a className={activeTab === id ? "active" : ""} href={`/library?tab=${id}`} key={id}>{label}</a>)}</nav>
    {activeTab === "roadmap" && <section className="library-roadmap">
      <div className="library-roadmap-header"><div><div className="eyebrow">Your curriculum shelf</div><h2 className="section-title">{activePlan.phaseLabel} · {activePlan.title}</h2><p>{activePlan.summary}</p></div><div className="library-primary"><span className="eyebrow">Start with</span><strong>{activePlan.primary}</strong></div></div>
      <nav className="phase-switcher" aria-label="Resource phases">{model.resourcePlans.map((plan) => <a className={plan.phaseId === activePlan.phaseId ? "active" : ""} href={roadmapHref(plan.phaseId)} key={plan.phaseId}><span>{plan.phaseLabel}</span><small>{plan.title}</small></a>)}</nav>
      <div className="tier-legend" aria-label="Resource tiers">{activePlan.tiers.map((tier) => <div key={tier.id}><span>{tier.label}</span><small>{tier.description}</small></div>)}</div>
      <nav className="tier-filter" aria-label="Filter selected phase resources by tier"><a className={activeTier === "all" ? "active" : ""} href={roadmapHref(activePlan.phaseId, "all")}>All tiers</a>{activePlan.tiers.map((tier) => <a className={activeTier === tier.id ? "active" : ""} href={roadmapHref(activePlan.phaseId, tier.id)} key={tier.id}>{tier.label.replace("Tier ", "")}</a>)}</nav>
      <div className="tier-stack">{filterResourceTiers(activePlan, activeTier).map((tier) => <section className="resource-tier" key={tier.id}><div className="resource-tier-heading"><div className="eyebrow">{tier.label}</div><p>{tier.description}</p></div><div className="resource-tier-list">{tier.resources.map((resource) => { const resourceState = state.resourceStates?.[resource.id]; return <article className="library-resource" key={resource.id}><div className="library-resource-topline"><span className="resource-guidance">{resource.guidance}</span>{resource.rating !== undefined && <span className="resource-rating" aria-label={`${resource.rating} out of 5 rating`}>{"●".repeat(resource.rating)}<span className="muted">{"·".repeat(5 - resource.rating)}</span></span>}</div><h3>{resource.url ? <a href={resource.url} target="_blank" rel="noreferrer">{resource.name} <ExternalLink size={12} aria-hidden="true" /></a> : resource.name}</h3><p>{resource.why ?? resource.role ?? "Use as a deliberate part of this phase."}</p>{resource.note && <p className="library-resource-note">{resource.note}</p>}<div className="resource-state"><label className="eyebrow" htmlFor={`resource-${resource.id}`}>Your state</label><select id={`resource-${resource.id}`} value={resourceState?.status ?? "saved"} onChange={(event) => useMeridianStore.getState().setResourceState(resource.id, event.target.value as "saved" | "active" | "completed" | "paused", resourceState?.note)}><option value="saved">Saved</option><option value="active">Active</option><option value="completed">Completed</option><option value="paused">Paused</option></select><input aria-label={`Note for ${resource.name}`} placeholder="Personal note (optional)" defaultValue={resourceState?.note ?? ""} onBlur={(event) => useMeridianStore.getState().setResourceState(resource.id, resourceState?.status ?? "saved", event.target.value)} /></div>{resource.checked && <p className="resource-footnote">{resource.checked}</p>}</article>; })}</div></section>)}</div>
      <Reveal>
        <LibraryExplorer initialPhase={activePlan.phaseLabel} />
      </Reveal>
    </section>}
    {activeTab !== "roadmap" && <section className="reference-card library-tab"><div className="eyebrow">{tab(activeTab)}</div>
      {activeTab === "communities" && <>{l.communities.map((group: any, groupIndex: number) => <details key={`${group.tier}-${groupIndex}`} open={group.urgency === "now"}><summary>{group.tier}</summary>{group.items.map((x: any, itemIndex: number) => <LabeledItem key={`${group.tier}-${x.key}-${itemIndex}`} name={x.name} qualifier={x.platform} meta={x.how}><p>{x.why}</p></LabeledItem>)}</details>)}</>}
      {activeTab === "people" && Object.entries(l.people).map(([group, people], groupIndex) => { const labels: Record<string, string> = { twitter: "Twitter / X", youtube: "YouTube", newsletters: "Newsletters" }; return <details key={`${group}-${groupIndex}`} open><summary>{labels[group] ?? "People"}</summary>{(people as any[]).map((x, index) => <LabeledItem key={`${group}-${x.name}-${index}`} name={x.name} qualifier={x.handle ?? x.by} meta={x.phase}>{x.why ?? x.what}</LabeledItem>)}</details>; })}
      {activeTab === "tools" && <>{l.tools.map((x: any, index: number) => <LabeledItem key={`${x.key}-${index}`} name={x.name} qualifier={x.what} meta={x.when} />)}<h2 className="section-title">{l.compute.headline}</h2><p>{l.compute.note}</p>{l.compute.options.map((x: any, index: number) => <LabeledItem key={`${x.name}-${index}`} name={x.name} qualifier={x.gives} meta={`${x.cost} · ${x.when}`}>{x.note}</LabeledItem>)}</>}
      {activeTab === "books" && <>{l.books.map((x: any, index: number) => <LabeledItem key={`${x.title}-${index}`} name={x.title} qualifier={`${x.author} · ${x.rating}/5`} meta={x.when}>{x.note}</LabeledItem>)}</>}
      {activeTab === "university" && <>{l.university.years.map((x: any, index: number) => <LabeledItem key={`${x.year}-${index}`} name={x.year} qualifier={x.focus}>{x.why}</LabeledItem>)}</>}
    </section>}
    {activeTab === "books" && <section className="section"><div className="eyebrow">Budget</div><div className="data-table">{l.budget.map((x: any, index: number) => <DisplayPair className="data-table-row" key={`${x.item}-${index}`} title={x.item} description={`${x.cost} · ${x.when}`} meta={x.worth} />)}</div></section>}
    {activeTab === "university" && <section className="section"><div className="eyebrow">Plays</div><div className="data-table">{l.university.plays.map((x: any, index: number) => <DisplayPair className="data-table-row" key={`${x.key}-${index}`} title={x.text} description={x.detail} />)}</div></section>}
    {activeTab === "communities" && <section className="section"><div className="eyebrow">Trap</div><p>{l.trap}</p></section>}
  </PageFrame>;
}

export function FirstSevenDaysView() {
  const state = useMeridianStore();
  return <PageFrame eyebrow="First 7 days · on-ramp" title="Start with seven days." intro="A guided, checkable sequence from the cockpit.">
    <div className="dsa-phase-list">{model.firstSevenDays.map((day) => <article className="reference-card" key={day.day}><div className="eyebrow">Day {day.day}</div><div className="checklist">{day.actions.map((action, i) => { const id = `first7.day${day.day}.${i + 1}`; return <label className="checklist-label" key={id}><TickBox className="evidence-check" checked={Boolean(state.checks[id])} label={`Mark ${action} done`} onChange={() => useMeridianStore.getState().toggleCheck(id)} /><span>{action}</span></label>; })}</div></article>)}</div>
  </PageFrame>;
}

export function SafetyNetView() {
  return <PageFrame eyebrow="Safety net · fundamentals and career" title="Keep the floor beneath the path." intro="Northstar's safety net, kept close to the learning path."><div className="overview-grid"><SourceList title="CS fundamentals" items={model.safetyNet.cs} /><SourceList title="Career" items={model.safetyNet.career} /></div></PageFrame>;
}
