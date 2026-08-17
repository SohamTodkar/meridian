"use client";

import Link from "next/link";
import { LockKeyhole, Unlock } from "lucide-react";
import { useState } from "react";
import type { ProgressionRequirement } from "@/state/selectors";
import { useMeridianStore } from "@/state/store";

export function ProgressionLock({ title, requirements, overrideKey, returnHref = "/path" }: { title: string; requirements: ProgressionRequirement[]; overrideKey: string; returnHref?: string }) {
  const [reason, setReason] = useState("");
  const setOverride = useMeridianStore((store) => store.setProgressionOverride);
  return (
    <div className="content">
      <section className="progression-lock" aria-labelledby="progression-lock-title">
        <div className="eyebrow"><LockKeyhole size={13} style={{ verticalAlign: "middle" }} /> Prerequisite required</div>
        <h1 className="page-title" id="progression-lock-title">{title} is not open yet.</h1>
        <p className="page-intro">Meridian keeps the guided path sequential so the next task has the context it needs. You can still make a deliberate override when the sequence no longer fits your situation.</p>
        <div className="lock-requirements">
          {requirements.map((requirement) => <p key={requirement.key}>• {requirement.label}</p>)}
        </div>
        <div className="lock-override">
          <label className="eyebrow" htmlFor="override-reason">Reason for opening this early</label>
          <input id="override-reason" className="journal-input" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Example: I already completed this work elsewhere." />
          <div className="runner-controls" style={{ justifyContent: "flex-start" }}>
            <button className="button-primary" type="button" disabled={reason.trim().length < 3} onClick={() => setOverride(overrideKey, reason)}><Unlock size={15} /> Override and continue</button>
            <Link className="quiet-link" href={returnHref}>Return to path</Link>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: "14px 0 0" }}>Overrides are saved locally with a timestamp and reason. They do not mark the prerequisite as complete.</p>
        </div>
      </section>
    </div>
  );
}
