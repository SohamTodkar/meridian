"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock3, Lightbulb, Pause, Play, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { model } from "@/data";
import { getLocalDateKey } from "@/state/date";
import { getSessionAccess, sessionOverrideKey } from "@/state/selectors";
import { useMeridianStore } from "@/state/store";
import { TickBox } from "./tick-box";
import { DisplayPair } from "./labeled-item";
import { ProgressionLock } from "./progression-lock";
import { KineticTypography } from "./kinetic-typography";

export function SessionRunner({ sessionId }: { sessionId: string }) {
  const session = model.phases.flatMap((phase) => phase.sessions).find((item) => item.id === sessionId);
  const phase = model.phases.find((item) => item.sessions.some((sessionItem) => sessionItem.id === sessionId));
  const state = useMeridianStore();
  const setStep = useMeridianStore((store) => store.setSessionStep);
  const setTimer = useMeridianStore((store) => store.setTimer);
  const recordTime = useMeridianStore((store) => store.recordTime);
  const completeSession = useMeridianStore((store) => store.completeSession);
  const toggleCheck = useMeridianStore((store) => store.toggleCheck);
  const saveSessionAttempt = useMeridianStore((store) => store.saveSessionAttempt);
  const discardSessionAttempt = useMeridianStore((store) => store.discardSessionAttempt);
  const existingAttempt = session ? state.sessionAttempts?.[session.id] : undefined;
  const [proofMode, setProofMode] = useState(Boolean(existingAttempt?.proofMode));
  const [journal, setJournal] = useState(existingAttempt?.journal ?? "");
  const [confusion, setConfusion] = useState(existingAttempt?.confusion ?? "");
  const [nextQuestion, setNextQuestion] = useState(existingAttempt?.nextQuestion ?? "");
  const [hintOpen, setHintOpen] = useState(false);
  const [recoveryNotice, setRecoveryNotice] = useState(Boolean(existingAttempt));
  const progress = session ? state.sessions[session.id] : undefined;
  const access = session && phase ? getSessionAccess(model, phase, session.id, state) : undefined;
  const [seconds, setSeconds] = useState(existingAttempt?.timerSeconds ?? (state.timer.sessionId === sessionId ? state.timer.seconds : 0));

  useEffect(() => {
    if (!state.timer.running) return undefined;
    const interval = window.setInterval(() => {
      setSeconds((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [state.timer.running]);

  useEffect(() => {
    if (session && access?.allowed) setStep(session.id, progress?.currentStep ?? 0);
    // The step is intentionally initialized only when the session changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id, access?.allowed]);

  if (!session || !phase) {
    return <div className="content"><div className="empty-state"><h1 className="section-title">Session not found.</h1><Link className="quiet-link" href="/">Return to Today</Link></div></div>;
  }
  if (!access?.allowed) return <ProgressionLock title={`Session: ${session.title}`} requirements={access?.requirements ?? []} overrideKey={sessionOverrideKey(session.id)} returnHref={`/path/${phase.id}?tab=sessions`} />;

  const activeSession = session;
  const currentStep = Math.min(progress?.currentStep ?? 0, session.steps.length - 1);
  const complete = Boolean(progress?.completed);
  const sessionOverride = state.progressionOverrides?.[sessionOverrideKey(session.id)];
  const proofVerified = session.checks.every((_, index) => state.checks[`${session.id}.check.${index + 1}`]);
  const formatTime = (total: number) => `${Math.floor(total / 60).toString().padStart(2, "0")}:${(total % 60).toString().padStart(2, "0")}`;
  const today = getLocalDateKey(new Date(), state.settings.timeZone);

  function persistAttempt(overrides: Partial<{ currentStep: number; proofMode: boolean; journal: string; confusion: string; nextQuestion: string; timerSeconds: number }> = {}) {
    saveSessionAttempt({ sessionId: activeSession.id, currentStep: overrides.currentStep ?? currentStep, proofMode: overrides.proofMode ?? proofMode, journal: overrides.journal ?? journal, confusion: overrides.confusion ?? confusion, nextQuestion: overrides.nextQuestion ?? nextQuestion, timerSeconds: overrides.timerSeconds ?? seconds });
  }

  function recordElapsedTime() {
    if (state.timer.sessionId !== activeSession.id) return;
    const recordedSeconds = state.timer.recordedSeconds ?? 0;
    const elapsed = Math.max(0, seconds - recordedSeconds);
    if (elapsed > 0) recordTime({ date: today, seconds: elapsed, source: "session", sessionId: activeSession.id });
    setTimer({ sessionId: activeSession.id, running: false, seconds, recordedSeconds: seconds });
  }

  function toggleTimer() {
    if (state.timer.running) {
      recordElapsedTime();
      return;
    }
    setTimer({
      sessionId: activeSession.id,
      running: true,
      seconds,
      recordedSeconds: state.timer.sessionId === activeSession.id ? state.timer.recordedSeconds ?? 0 : 0,
    });
    persistAttempt({ timerSeconds: seconds });
  }

  function finish() {
    if (!session || !phase || !proofVerified) return;
    recordElapsedTime();
    completeSession(activeSession.id, { id: `${activeSession.id}.${today}`, date: today, sessionId: activeSession.id, text: journal.trim() || activeSession.proof, confusion: confusion.trim() || undefined, nextQuestion: nextQuestion.trim() || undefined }, {
      id: `evidence.${activeSession.id}.${today}`,
      kind: "session-proof",
      title: activeSession.proof,
      note: journal.trim() || activeSession.outcome,
      phaseId: phase.id,
      sessionId: activeSession.id,
      capability: phase.identity.northstarName,
      proofStatus: "verified",
    });
    setProofMode(false);
  }

  if (complete) {
    return (
      <div className="runner">
        <div className="eyebrow">Session complete</div>
        <h1 className="runner-title">You just proved something useful.</h1>
        <p className="runner-outcome"><DisplayPair title="Outcome" description={session.outcome} /></p>
        <div className="action-panel">
          <div className="eyebrow">What this unlocked</div>
          <p className="action-outcome" style={{ marginTop: 12 }}>The next session in {phase.identity.northstarName} is now available.</p>
          <Link className="button-primary" href="/">Stop for today <Check size={15} aria-hidden="true" /></Link>
        </div>
      </div>
    );
  }

  if (recoveryNotice && existingAttempt) {
    return <div className="runner"><div className="eyebrow">Recovered local attempt</div><h1 className="runner-title">Pick up where you left off?</h1><p className="runner-outcome">Meridian saved your step, timer, and reflection draft on this device {new Date(existingAttempt.updatedAt).toLocaleString()}.</p><div className="action-panel"><div className="eyebrow">Session recovery</div><p id="recovery-choice-help" className="action-outcome">Resume your previous attempt, or discard only the recovery draft and begin this session again.</p><div className="runner-controls" role="group" aria-label="Recovered session choices" aria-describedby="recovery-choice-help"><button className="button-primary" type="button" onClick={() => setRecoveryNotice(false)}>Resume attempt <ArrowRight size={15} aria-hidden="true" /></button><button className="button-secondary" type="button" onClick={() => { discardSessionAttempt(activeSession.id); setProofMode(false); setJournal(""); setConfusion(""); setNextQuestion(""); setSeconds(0); setRecoveryNotice(false); }}>Discard draft</button></div></div></div>;
  }

  if (proofMode) {
    return (
      <div className="runner">
        <div className="eyebrow">Proof · {session.title}</div>
        <h1 className="runner-title">Make the work count.</h1>
        <div className="proof-block">
          <div className="eyebrow">Deliverable</div>
          <h2 className="proof-title">{session.proof}</h2>
          <div className="eyebrow" style={{ marginTop: 30 }}>Evidence check</div>
          <div className="checklist">
            {session.checks.map((check, index) => {
              const id = `${session.id}.check.${index + 1}`;
              const checked = Boolean(state.checks[id]);
              return (
                <label className="checklist-label" key={id}>
                  <TickBox className="evidence-check" checked={checked} label={`Evidence: ${check}`} onChange={() => toggleCheck(id)} />
                  <DisplayPair title={check} />
                </label>
              );
            })}
          </div>
          <div className="stop-note"><strong>Stop here.</strong> {session.stop}</div>
          <label className="eyebrow" htmlFor="session-journal" style={{ display: "block", marginTop: 30 }}>One line for your journal</label>
          <textarea id="session-journal" className="journal-input" value={journal} onChange={(event) => { setJournal(event.target.value); persistAttempt({ journal: event.target.value }); }} placeholder="What did the evidence show?" />
          <div className="reflection-grid">
            <label className="eyebrow" htmlFor="session-confusion">What still feels unclear?<textarea id="session-confusion" className="journal-input" value={confusion} onChange={(event) => { setConfusion(event.target.value); persistAttempt({ confusion: event.target.value }); }} placeholder="Name the concept or step without judging it." /></label>
            <label className="eyebrow" htmlFor="session-next-question">Question to retrieve later<textarea id="session-next-question" className="journal-input" value={nextQuestion} onChange={(event) => { setNextQuestion(event.target.value); persistAttempt({ nextQuestion: event.target.value }); }} placeholder="Ask a question future-you should answer unaided." /></label>
          </div>
          {(confusion.trim() || nextQuestion.trim()) && <p className="hint">Meridian will add one local retrieval prompt when you complete this evidence.</p>}
          {!proofVerified && <p className="proof-policy">Complete every evidence check before Meridian records this session as verified.</p>}
          <div className="runner-controls">
            <button className="button-secondary" type="button" onClick={() => { persistAttempt({ proofMode: false }); setProofMode(false); }}>Back to steps</button>
            <button className="button-primary" type="button" disabled={!proofVerified} onClick={finish}>Complete session <ArrowRight size={15} aria-hidden="true" /></button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="runner">
      <div className="runner-header">
        <div>
          <div className="page-kicker eyebrow">Phase {phase.identity.number + 1} · Session {session.id.replace(`${phase.id}s`, "")}</div>
          <h1 className="runner-title">
            <KineticTypography as="span" variant="wave">
              {session.title}
            </KineticTypography>
          </h1>
        </div>
        <Link className="quiet-link" href="/">Exit runner</Link>
      </div>
      <p className="runner-outcome"><DisplayPair title="By the end" description={session.outcome} /></p>
      {sessionOverride && <aside className="override-notice"><span className="eyebrow">Sequence override</span><span>Opened {new Date(sessionOverride.createdAt).toLocaleDateString()} · {sessionOverride.reason}</span></aside>}
      <div className="step-progress" aria-label={`Step ${currentStep + 1} of ${session.steps.length}`}>
        {session.steps.map((step, index) => <span className={index <= currentStep ? "active" : ""} key={step} />)}
      </div>
      <div className="step-card">
        <div className="step-number">STEP {String(currentStep + 1).padStart(2, "0")} / {String(session.steps.length).padStart(2, "0")}</div>
        <p className="step-text">{session.steps[currentStep]}</p>
      </div>
      <div className="runner-controls">
        <button className="button-secondary" type="button" disabled={currentStep === 0} onClick={() => { persistAttempt({ currentStep: currentStep - 1 }); setStep(session.id, currentStep - 1); }}><ArrowLeft size={15} /> Back</button>
        {currentStep < session.steps.length - 1 ? (
          <button className="button-primary" type="button" onClick={() => { persistAttempt({ currentStep: currentStep + 1 }); setStep(session.id, currentStep + 1); }}>Next step <ArrowRight size={15} /></button>
        ) : (
          <button className="button-primary" type="button" onClick={() => { persistAttempt({ proofMode: true }); setProofMode(true); }}>Open proof <ArrowRight size={15} /></button>
        )}
      </div>
      <div className="runner-controls" style={{ justifyContent: "flex-start", marginTop: 34 }}>
        <button className="button-secondary" type="button" onClick={toggleTimer}>
          {state.timer.running ? <Pause size={14} /> : <Play size={14} />} {state.timer.running ? "Pause timer" : "Start silent timer"}
        </button>
        <span className="mono muted" style={{ padding: "11px 0", fontSize: 12 }}><Clock3 size={13} style={{ verticalAlign: "middle" }} /> {formatTime(seconds)} / {session.minutes}:00</span>
        <button className="button-secondary" type="button" aria-label="Reset timer" onClick={() => { setSeconds(0); persistAttempt({ timerSeconds: 0 }); setTimer({ sessionId: session.id, running: false, seconds: 0, recordedSeconds: 0 }); }}><RotateCcw size={14} /></button>
      </div>
      <button className="button-secondary" type="button" style={{ marginTop: 24 }} onClick={() => setHintOpen((open) => !open)}><Lightbulb size={14} /> {hintOpen ? "Hide hint" : "Need a hint?"}</button>
      {hintOpen && <p className="hint">{session.hint}</p>}
    </div>
  );
}
