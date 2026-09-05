"use client";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Brain,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  Code2,
  Compass,
  Crosshair,
  Flame,
  Orbit,
  Play,
  Plus,
  Sparkles,
  Target,
  Timer,
} from "lucide-react";
import { useState } from "react";
import { model } from "@/data";
import { getLocalDateKey, getWeekStartKey, shiftDateKey } from "@/state/date";
import {
  getActivePhase,
  getDailyPlanRecommendation,
  getDueRetrievalPrompts,
  getLearningMinutes,
  getNextAction,
  getOverallProgress,
  getStreak,
  getWeekMinutes,
} from "@/state/selectors";
import { useMeridianStore } from "@/state/store";
import { TickBox } from "./tick-box";

export function TodayView() {
  const state = useMeridianStore();
  const today = getLocalDateKey(new Date(), state.settings.timeZone);
  const active = getActivePhase(model, state);
  const next = getNextAction(model, state);
  const overall = getOverallProgress(model, state);
  const session = model.phases
    .flatMap(p => p.sessions)
    .find(s => s.id === next.sessionId);
  const recommendation = getDailyPlanRecommendation(model, state, today);
  const plan = state.dailyPlans?.[today];
  const tasks = plan?.tasks ?? recommendation.tasks;
  const recall = getDueRetrievalPrompts(state, today);
  const minutes = getLearningMinutes(state.dailyLogs[today]);
  const week = getWeekMinutes(state);
  const completed = Object.values(state.sessions).filter(
    s => s.completed
  ).length;
  const total = model.phases.flatMap(p => p.sessions).length;
  const [note, setNote] = useState(state.dailyLogs[today]?.note ?? "");
  const [saved, setSaved] = useState(false);
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: state.settings.timeZone,
    }).format(new Date())
  );
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const accept = () =>
    state.setDailyPlan({
      schemaVersion: 1,
      date: today,
      capacityMinutes: recommendation.capacityMinutes,
      mode: recommendation.mode,
      generatedAt: new Date().toISOString(),
      tasks: recommendation.tasks,
    });
  const primaryHref = session
    ? `/session/${session.id}`
    : `/path/${active.id}?tab=checkpoint`;
  const phaseDone = active.sessions.filter(
    s => state.sessions[s.id]?.completed
  ).length;
  const weekStart = getWeekStartKey(new Date(), state.settings.timeZone);
  const days = Array.from({ length: 7 }, (_, i) => shiftDateKey(weekStart, i));
  function saveNote() {
    state.setDailyLog(today, state.dailyLogs[today]?.manualMinutes ?? 0, note);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }
  return (
    <div className="dashboard content">
      <div className="dashboard-heading">
        <div>
          <div className="eyebrow">
            <span className="tiny-cross">+</span> YOUR DAILY COORDINATES
          </div>
          <h1>
            {greeting}, {model.profile.owner}
            <span className="greeting-dot">.</span>
          </h1>
          <p>A clear mind. A small step. A little closer.</p>
        </div>
        <div className="date-label">
          <CalendarIcon />
          <span>
            {new Intl.DateTimeFormat("en", {
              weekday: "short",
              month: "short",
              day: "numeric",
              timeZone: state.settings.timeZone,
            }).format(new Date())}
          </span>
        </div>
      </div>
      <section className="cosmic-hero" aria-labelledby="hero-title">
        <Image
          src="/assets/meridian-observatory.png"
          alt="A luminous violet accretion disk orbiting a black hole in a quiet field of stars"
          fill
          priority
          sizes="(max-width: 800px) 100vw, 80vw"
          className="cosmic-image"
        />
        <div className="hero-shade" />
        <div className="cosmic-copy">
          <span className="hero-tag">
            <span className="signal-dot" /> YOUR NEXT FRONTIER
          </span>
          <h2 id="hero-title">
            Less noise.
            <br />
            <em>More discovery.</em>
          </h2>
          <p>
            Your universe gets bigger with every session.
            <br />
            Let’s make this one count.
          </p>
          <Link className="button-primary hero-button" href={primaryHref}>
            <Play size={14} fill="currentColor" />
            {session ? "Continue learning" : "Open phase checkpoint"}
            <ArrowRight size={16} />
          </Link>
        </div>
        <div className="hero-coordinate">
          <Crosshair size={14} />
          <span>
            PHASE {String(active.identity.number + 1).padStart(2, "0")} / 04
          </span>
          <span className="coord-line" />
          <span>{active.identity.northstarName}</span>
        </div>
        <span className="hero-corner top-left" />
        <span className="hero-corner bottom-right" />
      </section>
      <section className="stat-strip" aria-label="Your study progress">
        <div>
          <span className="stat-icon violet">
            <Clock3 size={19} />
          </span>
          <div>
            <span className="stat-label">Focus today</span>
            <strong>
              {minutes}
              <small> min</small>
            </strong>
            <span className="stat-caption">
              of {recommendation.capacityMinutes} min planned
            </span>
          </div>
        </div>
        <div>
          <span className="stat-icon teal">
            <CheckCheck size={19} />
          </span>
          <div>
            <span className="stat-label">Sessions completed</span>
            <strong>
              {completed}
              <small> / {total}</small>
            </strong>
            <span className="stat-caption">Building a real foundation</span>
          </div>
        </div>
        <div>
          <span className="stat-icon amber">
            <Flame size={19} />
          </span>
          <div>
            <span className="stat-label">Current streak</span>
            <strong>
              {getStreak(state)}
              <small> days</small>
            </strong>
            <span className="stat-caption">Keep showing up for yourself</span>
          </div>
        </div>
        <div>
          <span className="stat-icon blue">
            <Orbit size={19} />
          </span>
          <div>
            <span className="stat-label">Journey progress</span>
            <strong>
              {overall.percent}
              <small>%</small>
            </strong>
            <span className="stat-caption">Four phases. One direction.</span>
          </div>
        </div>
      </section>
      <div className="dashboard-columns">
        <div className="dashboard-primary">
          <section className="obs-panel next-session">
            <div className="panel-heading">
              <h2>
                <span className="signal-dot" /> Up next
              </h2>
              <Link
                href={`/path/${active.id}?tab=sessions`}
                className="text-link"
              >
                View phase
                <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="next-session-body">
              <span className="session-code">
                <Code2 size={22} />
              </span>
              <div>
                <div className="eyebrow">
                  {active.identity.northstarName}{" "}
                  <span className="label-dot">·</span> SESSION{" "}
                  {String(phaseDone + 1).padStart(2, "0")}
                </div>
                <h3>
                  {session?.title.replace(/^Tonight: /, "") ??
                    "Prove what you’ve learned"}
                </h3>
                <p>{session?.outcome ?? active.checkpoint.cockpit.quote}</p>
                <div className="session-pills">
                  <span>
                    <Clock3 size={13} />
                    {session?.minutes ?? 20} min
                  </span>
                  <span>
                    <Target size={13} />
                    {session
                      ? `${session.steps.length} guided steps`
                      : "Capability checkpoint"}
                  </span>
                  <span className="pill-violet">
                    {state.sessionAttempts?.[session?.id ?? ""]
                      ? "In progress"
                      : "Ready when you are"}
                  </span>
                </div>
              </div>
            </div>
            <div className="next-session-footer">
              <span>
                <span className="small-track">
                  <span
                    style={{
                      width: `${(phaseDone / active.sessions.length) * 100}%`,
                    }}
                  />
                </span>
                {phaseDone} / {active.sessions.length} in this phase
              </span>
              <Link className="text-link accent-link" href={primaryHref}>
                {state.sessionAttempts?.[session?.id ?? ""]
                  ? "Resume session"
                  : "Start session"}
                <ArrowRight size={16} />
              </Link>
            </div>
          </section>
          <section className="obs-panel plan-card" id="daily-plan-heading">
            <div className="panel-heading">
              <h2>
                <Compass size={18} /> Today’s flight plan
              </h2>
              <span className="muted">
                {tasks.filter(t => t.status === "completed").length}/
                {tasks.length} done
              </span>
            </div>
            <div className="plan-summary">
              <span>
                {recommendation.isRestDay
                  ? "A lighter day to recharge."
                  : "A little structure for your next few steps."}
              </span>
              <label className="pace-select">
                <span className="sr-only">Study pace</span>
                <select
                  aria-label="Study pace"
                  value={state.settings.scheduleMode}
                  onChange={e => state.setScheduleMode(e.target.value)}
                >
                  {model.modes
                    .filter(m => m.category === "schedule")
                    .map(m => (
                      <option key={m.key} value={m.key}>
                        {m.label}
                      </option>
                    ))}
                </select>
              </label>
            </div>
            <div className="flight-tasks">
              {tasks.map((task, index) => {
                const done = task.status === "completed";
                return (
                  <div
                    className={`flight-task ${done ? "done" : ""} ${task.status === "deferred" ? "deferred" : ""}`}
                    key={task.id}
                  >
                    <span className={`task-marker ${done ? "complete" : ""}`}>
                      {done ? (
                        <Check size={14} />
                      ) : (
                        String(index + 1).padStart(2, "0")
                      )}
                    </span>
                    <div>
                      <strong>{task.title}</strong>
                      <span>
                        {task.minutes} min <span className="label-dot">·</span>{" "}
                        {task.kind === "session"
                          ? "Guided learning"
                          : task.kind === "retrieval"
                            ? "Keep it in memory"
                            : task.kind === "reflection"
                              ? "Capture what changed"
                              : "Daily anchor"}
                        {task.status === "deferred"
                          ? " · Deferred to tomorrow"
                          : ""}
                      </span>
                    </div>
                    {task.sessionId ? (
                      <Link
                        className="icon-button"
                        href={`/session/${task.sessionId}`}
                        aria-label={`Open ${task.title}`}
                      >
                        <ArrowUpRight size={17} />
                      </Link>
                    ) : task.retrievalPromptId ? (
                      <Link
                        className="icon-button"
                        href="/recall"
                        aria-label="Open recall"
                      >
                        <ArrowUpRight size={17} />
                      </Link>
                    ) : (
                      <TickBox
                        className="flight-check"
                        checked={done}
                        label={`Complete ${task.title}`}
                        onChange={() => {
                          if (!plan) accept();
                          if (task.kind === "habit")
                            state.setHabit(today, "h.anki", !done);
                          else
                            state.setPlanTaskStatus(
                              today,
                              task.id,
                              done ? "accepted" : "completed"
                            );
                        }}
                      />
                    )}
                    {plan && !done && task.status !== "deferred" && (
                      <button
                        className="defer-button"
                        onClick={() =>
                          state.setPlanTaskStatus(
                            today,
                            task.id,
                            "deferred",
                            shiftDateKey(today, 1)
                          )
                        }
                        aria-label={`Defer ${task.title} to tomorrow`}
                        title="Defer to tomorrow"
                      >
                        ↪
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {!plan && (
              <button className="accept-plan" onClick={accept}>
                <Plus size={15} />
                Accept today’s plan
                <span>{recommendation.capacityMinutes} min available</span>
              </button>
            )}
            {plan && (
              <div className="accepted-plan">
                <Check size={14} />
                Plan accepted<span>Adjust your pace in Settings</span>
              </div>
            )}
          </section>
          <section className="obs-panel mini-map">
            <div className="panel-heading">
              <h2>
                <Orbit size={18} /> Your learning trajectory
              </h2>
              <Link href="/path" className="text-link">
                Explore map
                <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className="trajectory-stations">
              {model.phases.map((phase, i) => (
                <Link
                  href={`/path?phase=${phase.id}`}
                  className={`trajectory-station ${active.id === phase.id ? "current" : ""}`}
                  key={phase.id}
                >
                  <span className="station-orbit">
                    {active.id === phase.id ? <span /> : i + 1}
                  </span>
                  <small>PHASE 0{i + 1}</small>
                  <strong>{phase.identity.northstarName}</strong>
                  <span>
                    {active.id === phase.id
                      ? "You are here"
                      : i < active.identity.number
                        ? "Explored"
                        : "Ahead of you"}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        </div>
        <aside className="dashboard-secondary">
          <section className="obs-panel focus-invite">
            <div className="panel-heading">
              <h2>
                <Timer size={18} /> A little space to focus
              </h2>
              <span className="pill-violet">DEEP WORK</span>
            </div>
            <div className="focus-dial-mini">
              <span>
                25<span>:00</span>
              </span>
              <small>ONE THING AT A TIME</small>
            </div>
            <p>
              Close the extra tabs.
              <br />
              Give your next idea some room.
            </p>
            <Link href="/focus" className="button-primary">
              <Play size={14} fill="currentColor" />
              Enter focus room
              <ArrowRight size={16} />
            </Link>
          </section>
          <section className="obs-panel week-card">
            <div className="panel-heading">
              <h2>This week, so far</h2>
              <Link
                href="/review"
                aria-label="Open weekly review"
                className="icon-button"
              >
                <ArrowUpRight size={16} />
              </Link>
            </div>
            <div className="week-total">
              {(week / 60).toFixed(1)}
              <span>hours of focused work</span>
            </div>
            <div className="week-bars">
              {days.map(day => {
                const value = getLearningMinutes(state.dailyLogs[day]);
                return (
                  <div key={day} className={day === today ? "today" : ""}>
                    <div className="bar-space">
                      <span
                        style={{
                          height: `${Math.max(4, Math.min(100, (value / Math.max(60, ...days.map(d => getLearningMinutes(state.dailyLogs[d])))) * 100))}%`,
                        }}
                        title={`${day}: ${value} minutes`}
                      />
                    </div>
                    <small>
                      {new Intl.DateTimeFormat("en", {
                        weekday: "narrow",
                        timeZone: "UTC",
                      }).format(new Date(day + "T12:00:00Z"))}
                    </small>
                  </div>
                );
              })}
            </div>
            <p>
              {week === 0
                ? "Your first session starts the story."
                : "Every focused minute moves you forward."}
            </p>
          </section>
          <Link className="obs-panel recall-nudge" href="/recall">
            <span className="stat-icon violet">
              <Brain size={20} />
            </span>
            <span>
              <strong>
                {recall.length
                  ? `${recall.length} ideas to revisit`
                  : "Make it stick"}
              </strong>
              <small>
                {recall.length
                  ? "A quick recall keeps them close."
                  : "Your recall queue is clear."}
              </small>
            </span>
            <ChevronRight size={16} />
          </Link>
          <section className="obs-panel quick-note">
            <div className="panel-heading">
              <h2>
                <BookOpen size={17} /> A thought worth keeping
              </h2>
            </div>
            <textarea
              aria-label="Daily reflection"
              placeholder="What clicked today? What’s still a question?"
              value={note}
              onChange={e => {
                setNote(e.target.value);
                setSaved(false);
              }}
            />
            <div>
              <Link className="text-link" href="/journal">
                Open journal
                <ArrowUpRight size={13} />
              </Link>
              <button className="text-link accent-link" onClick={saveNote}>
                {saved ? (
                  <>
                    <Check size={14} />
                    Captured
                  </>
                ) : (
                  "Save note"
                )}
              </button>
            </div>
          </section>
        </aside>
      </div>
      <div className="dashboard-bottom-note">
        <Sparkles size={15} />
        <span>
          You don’t need to see the whole universe. Just your next step.
        </span>
        <Link href="/first-seven-days">
          Your first seven days
          <ArrowUpRight size={13} />
        </Link>
      </div>
    </div>
  );
}
function CalendarIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M16 3v4M8 3v4M3 11h18" />
    </svg>
  );
}
