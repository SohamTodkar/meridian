"use client";

import Link from "next/link";
import { Download, FileCheck2, RotateCcw, ShieldCheck, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { model } from "@/data";
import { getPersistedMeridianState, useMeridianStore } from "@/state/store";
import { createVerifiedBackup, previewBackup, type BackupPreview } from "@/state/backups";
import { getMeridianPersistenceStatus } from "@/state/persistence";
import { DisplayPair } from "@/components/labeled-item";
import { KineticTypography } from "@/components/kinetic-typography";

export default function SettingsPage() {
  const state = useMeridianStore();
  const setMode = useMeridianStore((store) => store.setScheduleMode);
  const setSetting = useMeridianStore((store) => store.setSetting);
  const reset = useMeridianStore((store) => store.resetLocalState);
  const input = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const modes = model.modes.filter((mode) => mode.category === "schedule");
  const persistence = getMeridianPersistenceStatus();

  function exportData() {
    const raw = JSON.stringify(createVerifiedBackup(getPersistedMeridianState(state)), null, 2);
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "meridian-backup.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Verified Meridian backup downloaded. Keep it somewhere you control.");
  }

  function importData(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const result = previewBackup(JSON.parse(String(reader.result)), model);
        if (!result) throw new Error("invalid");
        setPreview(result);
        setMessage("Restore preview ready. Meridian has not changed yet.");
      } catch {
        setPreview(null);
        setMessage("That file is not a valid Meridian, Cockpit, or Northstar backup.");
      }
    };
    reader.readAsText(file);
  }

  function confirmRestore() {
    if (!preview) return;
    useMeridianStore.setState((current) => ({ ...current, ...preview.state, hydrated: true }));
    setMessage(`${preview.integrity === "verified" ? "Verified" : "Legacy"} ${preview.source} restore complete: ${preview.matched} matched, ${preview.skipped} skipped.`);
    setPreview(null);
    if (input.current) input.current.value = "";
  }

  return (
    <div className="content">
      <div className="page-kicker eyebrow">Settings · local only</div>
      <h1 className="page-title">
        <KineticTypography as="span" variant="wave">
          Set the pace.
        </KineticTypography>
      </h1>
      <p className="page-intro">Schedule mode changes the guide, not the capability gates.</p>
      <section className="section">
        <div className="section-heading"><div><div className="eyebrow">Schedule mode</div><h2 className="section-title">Choose one global guide.</h2></div></div>
        <div className="session-list">
          {modes.map((mode) => <button className="session-row" style={{ textAlign: "left", border: 0 }} type="button" key={mode.key} onClick={() => setMode(mode.key)}>
            <span className="row-index">{state.settings.scheduleMode === mode.key ? "ON" : "—"}</span>
            <DisplayPair className="session-copy" title={mode.label} description={mode.notes.join(" ")} meta={mode.weekly ? `${mode.weekly}h / week` : mode.minutes ? `${mode.minutes} min` : undefined} />
          </button>)}
        </div>
      </section>
      <section className="section">
        <div className="section-heading"><div><div className="eyebrow">Keyboard</div><h2 className="section-title">Shortcuts.</h2></div></div>
        <p className="dim"><kbd>Ctrl</kbd>/<kbd>Cmd</kbd> + <kbd>K</kbd> opens search. Use <kbd>↑</kbd> and <kbd>↓</kbd> to move, <kbd>Enter</kbd> to open, and <kbd>Esc</kbd> to close.</p>
      </section>
      <section className="section">
        <div className="section-heading"><div><div className="eyebrow">Pace overrides</div><h2 className="section-title">Adjust the guide.</h2></div></div>
        <div className="form-grid">
          <label className="eyebrow">Weekly hours<input type="number" value={state.settings.pace?.weeklyHours ?? ""} onChange={(e) => setSetting("pace", { ...state.settings.pace, weeklyHours: Number(e.target.value) })} /></label>
          <label className="eyebrow">Daily touch minutes<input type="number" value={state.settings.pace?.dailyTouchMinutes ?? ""} onChange={(e) => setSetting("pace", { ...state.settings.pace, dailyTouchMinutes: Number(e.target.value) })} /></label>
          <label className="eyebrow">Sleep floor<input value={state.settings.pace?.sleepFloor ?? ""} onChange={(e) => setSetting("pace", { ...state.settings.pace, sleepFloor: e.target.value })} placeholder="22:30" /></label>
          <label className="eyebrow">Anki cap<input type="number" value={state.settings.pace?.ankiCap ?? ""} onChange={(e) => setSetting("pace", { ...state.settings.pace, ankiCap: Number(e.target.value) })} /></label>
          <label className="eyebrow">Rest day<input value={state.settings.pace?.restDay ?? ""} onChange={(e) => setSetting("pace", { ...state.settings.pace, restDay: e.target.value })} placeholder="Sunday" /></label>
          <label className="eyebrow">Start date · cosmetic<input type="date" value={state.settings.startDate ?? ""} onChange={(e) => setSetting("startDate", e.target.value)} /></label>
        </div>
      </section>
      <section className="section">
        <div className="section-heading"><div><div className="eyebrow">Portable state</div><h2 className="section-title">Your data stays yours.</h2></div></div>
        <div className="persistence-status" role="status"><ShieldCheck size={16} aria-hidden="true" /><span><strong>{persistence.mode === "indexeddb" ? "IndexedDB active" : persistence.mode === "localStorage" ? "LocalStorage fallback" : "Local storage unavailable"}</strong>{persistence.mode === "indexeddb" && (persistence.migratedLegacy ? " · legacy Meridian data was copied once into this device’s durable store." : " · new local records are stored in this browser’s durable database.")}{persistence.mode === "localStorage" && " · this browser could not open IndexedDB, so Meridian is retaining its existing localStorage fallback."}</span></div>
        <p className="hint">Exports use a versioned, checksummed Meridian envelope. Imports are previewed before anything on this device changes; Cockpit and Northstar exports remain supported as legacy imports.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
          <button className="button-primary" type="button" onClick={exportData}><Download size={15} /> Export verified JSON</button>
          <button className="button-secondary" type="button" onClick={() => input.current?.click()}><Upload size={15} /> Preview restore</button>
          <input ref={input} type="file" accept="application/json" hidden onChange={(event) => event.target.files?.[0] && importData(event.target.files[0])} />
        </div>
        {message && <p className="hint">{message}</p>}
        {preview && <section className="backup-preview" aria-live="polite"><div className="section-heading"><div><div className="eyebrow">Restore preview · {preview.integrity}</div><h3 className="section-title">{preview.source} data is ready to restore.</h3></div><FileCheck2 size={20} aria-hidden="true" /></div><div className="backup-summary"><span><strong>{preview.summary.checks}</strong> checks</span><span><strong>{preview.summary.sessions}</strong> sessions</span><span><strong>{preview.summary.journals}</strong> journal entries</span><span><strong>{preview.summary.evidence}</strong> evidence records</span><span><strong>{preview.summary.retrievalPrompts}</strong> recall prompts</span></div><p className="hint">{preview.integrity === "verified" ? "Checksum verified. " : "Legacy format accepted. "}{preview.matched} curriculum records will be matched; {preview.skipped} unmatched records will be left out. Confirming replaces the corresponding local learning records only after this review.</p><div className="runner-controls"><button className="button-primary" type="button" onClick={confirmRestore}><FileCheck2 size={15} /> Confirm restore</button><button className="button-secondary" type="button" onClick={() => { setPreview(null); if (input.current) input.current.value = ""; }}><X size={15} /> Cancel</button></div></section>}
      </section>
      <section className="section">
        <div className="section-heading"><div><div className="eyebrow">Reset</div><h2 className="section-title">Clear local progress.</h2></div></div>
        <p className="dim">This removes checks, sessions, journal entries, reviews and portfolio entries from this device.</p>
        <button className="button-secondary" type="button" onClick={() => window.confirm("Reset all Meridian data on this device?") && reset()}><RotateCcw size={15} /> Reset local data</button>
      </section>
      <p style={{ marginTop: 60 }}><Link className="quiet-link" href="/">Return to Today</Link> <RotateCcw size={13} style={{ verticalAlign: "middle" }} aria-hidden="true" /></p>
    </div>
  );
}
