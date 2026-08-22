"use client";

import Link from "next/link";
import { ArrowRight, Check, Clock3, PenLine } from "lucide-react";
import { useMemo, useState } from "react";
import { model } from "@/data";
import { getLocalDateKey, shiftDateKey } from "@/state/date";
import { getActivePhase, getDailyPlanRecommendation, getNextAction, getOverallProgress } from "@/state/selectors";
import { useMeridianStore } from "@/state/store";
import { TickBox } from "./tick-box";
import { DisplayPair } from "./labeled-item";
import { MeridianHeroCanvas } from "./webgl/meridian-hero-canvas";
import { KineticText } from "./motion/kinetic-text";
import { Reveal } from "./motion/scroll-progress";

const blocks = ["morning", "afternoon", "evening"] as const;

export function TodayView() {
  const state = useMeridianStore();
  const day = getLocalDateKey(new Date(), state.settings.timeZone);
  const [log, setLog] = useState(state.dailyLogs[day]?.note ?? "");
  const [metrics, setMetrics] = useState({
    build: state.dailyLogs[day]?.build ?? 0,
    study: state.dailyLogs[day]?.study ?? 0,
    absorb: state.dailyLogs[day]?.absorb ?? 0,
    sleep: state.dailyLogs[day]?.sleep ?? 0,
  });
  const [saved, setSaved] = useState(false);
  const activePhase = getActivePhase(model, state);
  const next = getNextAction(model, state);
  const overall = getOverallProgress(model, state);
  const nextSession = next.sessionId
    ? activePhase.sessions.find((session) => session.id === next.sessionId)
    : undefined;
  const currentMode = model.modes.find((item) => item.category === "schedule" && item.key === state.settings.scheduleMode);
  const recommendation = useMemo(() => getDailyPlanRecommendation(model, state, day), [state, day]);
  const plan = state.dailyPlans?.[day];
  const planTasks = plan?.tasks ?? recommendation.tasks;
  const plannedMinutes = planTasks.filter((task) => task.status !== "deferred").reduce((total, task) => total + task.minutes, 0);
  const unallocatedMinutes = Math.max(0, recommendation.capacityMinutes - plannedMinutes);

  function savePlan() {
    state.setDailyPlan({
      schemaVersion: 1,
      date: day,
      capacityMinutes: recommendation.capacityMinutes,
      mode: recommendation.mode,
      generatedAt: new Date().toISOString(),
      tasks: recommendation.tasks,
    });
  }

  function completePlanTask(task: typeof planTasks[number]) {
    if (task.id === "habit:h.anki") {
      state.setHabit(day, "h.anki", !Boolean(state.dailyLogs[day]?.habits?.["h.anki"]));
      return;
    }
    state.setPlanTaskStatus(day, task.id, "completed");
  }

  const groupedHabits = useMemo(
    () => blocks.map((block) => ({ block, habits: model.habitStack.filter((habit) => habit.block === block) })),
    [],
  );

  function saveLog() {
    state.setDailyLog(day, metrics.build + metrics.study + metrics.absorb, log, metrics);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="content">
      {/* Hero: kinetic greeting + the multi-layer parallax astrolabe. */}
      <div className="hero-banner-wrapper">
        <div className="hero-copy-column">
          <div className="page-kicker eyebrow">Today · Phase {activePhase.identity.number + 1}</div>
          <h1 className="page-title">
            <KineticText as="span" trigger="hover">
              {`Good morning, ${model.profile.owner}.`}
            </KineticText>
          </h1>
          <p className="page-intro">
            One useful thing, then stop. Your current path is <span className="dim">{activePhase.identity.northstarName}</span>.
          </p>
        </div>
        <div className="hero-canvas-column">
          <MeridianHeroCanvas
            activePhaseNumber={activePhase.identity.number + 1}
            phaseProgress={overall.percent}
          />
          <div className="geometry-caption" style={{ maxWidth: 400, margin: "10px auto 0" }}>
            <span>move the cursor — you orbit the core</span>
            <span>lensed accretion · local render</span>
          </div>
        </div>
      </div>

      <Reveal as="section" className="action-panel" >
        <div className="eyebrow">{next.type === "checkpoint" ? "Checkpoint invitation" : "Your next action"}</div>
        {nextSession ? (
          <>
            <h2 id="next-action" className="action-title">
              <DisplayPair title={nextSession.title} description={nextSession.outcome} />
            </h2>
            <div className="action-meta">
              <span><Clock3 size={13} style={{ verticalAlign: "middle" }} aria-hidden="true" /> {nextSession.minutes} minutes</span>
              <span>Minimum version: complete the first proof-bearing attempt.</span>
            </div>
            <Link className="button-primary" href={`/session/${nextSession.id}`} onClick={() => state.startSession(nextSession.id)}>
              Start this session <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </>
        ) : (
          <>
            <h2 id="next-action" className="action-title">You have reached the phase checkpoint.</h2>
            <p className="action-outcome">{activePhase.checkpoint.cockpit.quote}</p>
            <div className="action-meta"><span>Capability evidence decides what opens next.</span></div>
            <Link className="button-primary" href={`/path/${activePhase.id}?tab=checkpoint`}>Open checkpoint <ArrowRight size={15} aria-hidden="true" /></Link>
          </>
        )}
      </Reveal>

      <Reveal as="section" className="action-panel plan-panel" aria-labelledby="daily-plan-heading">
        <div className="section-heading">
          <div>
            <div className="eyebrow">Adaptive daily plan · {plan ? "accepted" : "proposal"}</div>
            <h2 id="daily-plan-heading" className="section-title">{recommendation.isRestDay ? "Keep the floor. Protect the rest." : "A realistic plan for the capacity you chose."}</h2>
          </div>
          <div className="plan-budget"><span className="muted mono">{plannedMinutes} min proposed</span><span className="muted mono">{recommendation.capacityMinutes} min available · {recommendation.mode}</span></div>
        </div>
        <p className="action-outcome">{recommendation.reasons.join(" ")}</p>
        {unallocatedMinutes > 0 && <p className="hint">{unallocatedMinutes} minutes remain intentionally unscheduled for notes, breaks, or deeper work. The plan is a focused minimum, not a demand to fill your day.</p>}
        <div className="plan-task-list">
          {planTasks.map((task) => {
            const done = task.status === "completed";
            return <article className={`plan-task ${done ? "is-complete" : ""}`} key={task.id}>
              <div className="plan-task-copy"><div className="eyebrow">{task.kind} · {task.minutes} min · {task.status}</div><strong>{task.title}</strong><p>{task.detail}</p><span className="hint">Why now: {task.reason}</span></div>
              <div className="plan-task-actions">
                {task.sessionId ? <Link className="button-secondary" href={`/session/${task.sessionId}`} onClick={() => state.startSession(task.sessionId!)}>{done ? "Completed" : "Open session"}</Link> : task.retrievalPromptId ? <Link className="button-secondary" href="/recall">{done ? "Reviewed" : "Open recall"}</Link> : <button className="button-secondary" type="button" onClick={() => completePlanTask(task)}>{done ? "Completed" : task.kind === "habit" ? "Mark review done" : "Mark done"}</button>}
                {!done && plan && <button className="quiet-link" type="button" onClick={() => state.setPlanTaskStatus(day, task.id, "deferred", shiftDateKey(day, 1))}>Defer to tomorrow</button>}
              </div>
            </article>;
          })}
        </div>
        <div className="plan-controls">
          <button className="button-primary" type="button" onClick={savePlan}>{plan ? "Regenerate plan" : "Accept this plan"}</button>
          {plan && <span className="hint">Accepted {new Date(plan.acceptedAt ?? plan.generatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Deferred work appears in tomorrow’s proposal.</span>}
        </div>
      </Reveal>

      <Reveal as="section" className="section" aria-labelledby="rhythm-heading">
        <div className="section-heading">
          <div><div className="eyebrow">The daily rhythm</div><h2 id="rhythm-heading" className="section-title">Small anchors, grouped by energy.</h2></div>
          <span className="muted mono" style={{ fontSize: 11 }}>{currentMode?.label}</span>
        </div>
        {groupedHabits.map(({ block, habits }) => (
          <div className="habit-block" key={block}>
            <div className="eyebrow">{model.blocks[block].label} · {model.blocks[block].mode}</div>
            <div className="habit-list">
              {habits.map((habit) => {
                const checked = Boolean(state.dailyLogs[day]?.habits?.[habit.id]);
                return (
                  <div className="habit-row" key={habit.id}>
                    <TickBox className="habit-check" checked={checked} label={`Mark ${habit.label} ${checked ? "not done" : "done"}`} onChange={() => state.setHabit(day, habit.id, !checked)} />
                    <span className="habit-time">{habit.from}—{habit.to}</span>
                    <DisplayPair className="habit-label" title={habit.label} description={habit.detail} />
                    {habit.star && <span className="eyebrow">Core</span>}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </Reveal>

      <Reveal as="section" className="section" aria-labelledby="log-heading" id="daily-capture">
        <div className="section-heading"><div><div className="eyebrow">End of day</div><h2 id="log-heading" className="section-title">Leave one honest line.</h2></div><PenLine size={17} aria-hidden="true" /></div>
        <div className="form-grid" style={{ marginBottom: 14 }}>
          {(["build", "study", "absorb", "sleep"] as const).map((key) => <label className="eyebrow" key={key}>{key} minutes<input type="number" min="0" value={metrics[key]} onChange={(event) => setMetrics({ ...metrics, [key]: Number(event.target.value) || 0 })} /></label>)}
        </div>
        <textarea className="journal-input" aria-label="Daily log" value={log} onChange={(event) => setLog(event.target.value)} placeholder="What changed your mind today?" />
        <button className="button-secondary" type="button" onClick={saveLog}>{saved ? <><Check size={15} /> Saved</> : "Save daily log"}</button>
      </Reveal>

      <Reveal as="section" className="section" aria-labelledby="progress-heading">
        <div className="section-heading"><div><div className="eyebrow">The longer view</div><h2 id="progress-heading" className="section-title">Keep the thread.</h2></div><Link className="quiet-link" href="/path">Open path</Link></div>
        <div className="metric-grid" style={{ marginTop: 22 }}>
          <div className="metric"><span className="eyebrow">Capability</span><strong className="metric-value">{overall.percent}%</strong></div>
          <div className="metric"><span className="eyebrow">Active phase</span><strong className="metric-value">{String(activePhase.identity.number + 1).padStart(2, "0")}</strong></div>
          <div className="metric"><span className="eyebrow">Tomorrow</span><strong className="metric-value" style={{ fontSize: 16, marginTop: 12 }}>Return to the next action.</strong></div>
        </div>
      </Reveal>
    </div>
  );
}
