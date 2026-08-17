"use client";

import Link from "next/link";
import { ArrowRight, LockKeyhole, Radio, ShieldCheck } from "lucide-react";
import { model } from "@/data";
import { getActivePhase, getPhaseAccess, getPhaseProgress, isPhaseCleared } from "@/state/selectors";
import { useMeridianStore } from "@/state/store";
import { DisplayPair } from "./labeled-item";
import { KineticTypography } from "./kinetic-typography";

export function PathView() {
  const state = useMeridianStore();
  const active = getActivePhase(model, state);
  return (
    <div className="content">
      <div className="page-kicker eyebrow">The learning path</div>
      <h1 className="page-title">
        <KineticTypography as="span" variant="wave">
          A path, not a pile.
        </KineticTypography>
      </h1>
      <p className="page-intro">Capability gates decide what opens next. Calendar windows are suggestions, not deadlines.</p>
      <div className="path-list">
        {model.phases.map((phase) => {
          const cleared = isPhaseCleared(phase, state);
          const current = active.id === phase.id && !cleared;
          const progress = getPhaseProgress(model, phase, state);
          const access = getPhaseAccess(model, phase, state);
          const locked = !access.allowed;
          const card = <>
            <span className="path-number">{String(phase.identity.number + 1).padStart(2, "0")}</span>
            <span>
              <DisplayPair
                className="path-copy"
                title={phase.identity.northstarName}
                description={phase.identity.promise}
                meta={`${phase.identity.typicalRange} · ${phase.identity.weeks} suggested calendar window`}
              />
            </span>
            <span className="path-state">
              {cleared ? <><ShieldCheck size={13} style={{ verticalAlign: "middle" }} /> Cleared</> : locked ? <><LockKeyhole size={13} style={{ verticalAlign: "middle" }} /> Prerequisite required</> : <><Radio size={13} style={{ verticalAlign: "middle" }} /> {access.overridden ? "Override" : current ? "Current" : "Open"} · {progress.percent}% capability</>}
              <ArrowRight size={14} style={{ verticalAlign: "middle", marginLeft: 8 }} aria-hidden="true" />
            </span>
          </>;
          return (
            <Link className={`path-item${locked ? " locked" : ""}`} href={`/path/${phase.id}`} key={phase.id} aria-label={`${locked ? "View prerequisite for" : "Open"} Phase ${phase.identity.number + 1}: ${phase.identity.northstarName}`}>{card}</Link>
          );
        })}
      </div>
    </div>
  );
}
