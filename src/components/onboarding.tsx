"use client";

import { useState } from "react";
import { model } from "@/data";
import { useMeridianStore } from "@/state/store";
import { ModalPortal } from "./modal-portal";

export function Onboarding() {
  const state = useMeridianStore();
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState("normal");
  const [startDate, setStartDate] = useState("");
  if (!state.hydrated || state.onboardingComplete) return null;
  const finish = () => {
    state.setScheduleMode(mode);
    if (startDate) state.setSetting("startDate", startDate);
    state.completeOnboarding();
  };
  return <ModalPortal onClose={finish} labelledBy="onboarding-title" className="onboarding-modal"><div className="onboarding-panel">
    <div className="eyebrow">Meridian · local only</div>
    {step === 0 && <><h1 id="onboarding-title">A quieter place to learn.</h1><p>This is Soham’s evidence-driven learning path: one useful action, an honest proof, and a record that stays on this device.</p><div className="onboarding-actions"><button className="button-secondary" type="button" onClick={finish}>Open workspace</button><button className="button-primary" type="button" onClick={() => setStep(1)}>Continue</button></div></>}
    {step === 1 && <><h1 id="onboarding-title">Choose the guide.</h1><p>The mode changes the pace, not the capability gates.</p><div className="onboarding-options">{model.modes.filter((item) => item.category === "schedule").map((item) => <button className={mode === item.key ? "selected" : ""} type="button" key={item.key} onClick={() => setMode(item.key)}>{item.label}</button>)}</div><div className="onboarding-actions"><button className="button-secondary" type="button" onClick={finish}>Open workspace</button><button className="button-primary" type="button" onClick={() => setStep(2)}>Continue</button></div></>}
    {step === 2 && <><h1 id="onboarding-title">Set a starting line.</h1><p>Optional and cosmetic. It never decides which phase is active.</p><input type="date" aria-label="Optional start date" value={startDate} onChange={(event) => setStartDate(event.target.value)} /><div className="onboarding-actions"><button className="button-secondary" type="button" onClick={finish}>Skip</button><button className="button-primary" type="button" onClick={finish}>Enter Today</button></div></>}
    <div className="onboarding-progress">{step + 1} / 3</div>
  </div></ModalPortal>;
}
