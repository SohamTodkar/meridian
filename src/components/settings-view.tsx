"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import {
  Cloud,
  Download,
  History,
  LogOut,
  ShieldCheck,
  Upload,
  Check,
  Database,
  ArrowUpRight,
} from "lucide-react";
import { model } from "@/data";
import { getInitialMeridianState, useMeridianStore } from "@/state/store";
import {
  downloadWorkspace,
  hasUnsavedChanges,
  initializeCloud,
  saveCloud,
  signOut,
  useCloudStore,
} from "@/state/cloud";
import { previewBackup, type BackupPreview } from "@/state/backups";
import { meridianStateStorage } from "@/state/persistence";
import { workspaceSchema } from "@/lib/server/schema";

export function SettingsView() {
  const state = useMeridianStore();
  const cloud = useCloudStore();
  const selectedMode = model.modes.find(
    mode =>
      mode.category === "schedule" && mode.key === state.settings.scheduleMode
  );
  const schedule =
    selectedMode?.category === "schedule" ? selectedMode : undefined;
  const file = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState("");
  const [preview, setPreview] = useState<BackupPreview | null>(null);
  const [versions, setVersions] = useState<
    Array<{ revision: number; updatedAt: string }>
  >([]);
  const [busy, setBusy] = useState(false);
  async function readFile(selected: File) {
    try {
      if (selected.size > 4_000_000)
        throw new Error("Please select a backup smaller than 4 MB.");
      const data = JSON.parse(await selected.text());
      const result = previewBackup(data, model);
      if (!result) throw new Error("This isn’t a valid Meridian backup.");
      setPreview(result);
      setMessage("");
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  async function restore() {
    if (!preview) return;
    try {
      const initial = getInitialMeridianState();
      const { hydrated: _hydrated, ...base } = initial;
      void _hydrated;
      const parsed = workspaceSchema.parse({ ...base, ...preview.state });
      useMeridianStore.setState({
        ...parsed,
        hydrated: true,
        timer: { ...parsed.timer, running: false },
      });
      await saveCloud();
      if (!cloud.visitor && hasUnsavedChanges())
        throw new Error(
          "Restore is in this tab but hasn’t saved yet. Use the save recovery message."
        );
      setPreview(null);
      setMessage(
        cloud.visitor
          ? "Backup opened in visitor preview. No server records were changed."
          : "Your backup has been restored and saved."
      );
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Unable to restore this backup."
      );
    }
  }
  async function importLegacy() {
    try {
      const raw = await meridianStateStorage.getItem("meridian.v1");
      if (!raw)
        throw new Error(
          "No old Meridian records were found in this browser. Import an exported JSON backup instead."
        );
      const result = previewBackup(JSON.parse(raw), model);
      if (!result)
        throw new Error(
          "The old record could not be read. Export it from the previous version first."
        );
      setPreview(result);
    } catch (e) {
      setMessage((e as Error).message);
    }
  }
  async function history() {
    setBusy(true);
    try {
      await saveCloud();
      if (hasUnsavedChanges())
        throw new Error(
          "Save your current changes before opening recovery history."
        );
      const response = await fetch("/api/workspace/history/", {
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setVersions(result.versions);
      setMessage(
        result.versions.length
          ? ""
          : "History appears after your first saved change."
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function restoreVersion(revision: number) {
    if (
      !window.confirm(
        `Restore saved version ${revision}? The current version remains in recovery history.`
      )
    )
      return;
    setBusy(true);
    try {
      await saveCloud();
      if (hasUnsavedChanges())
        throw new Error("Save your current changes before restoring.");
      const response = await fetch("/api/workspace/history/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: useCloudStore.getState().revision,
          restoreRevision: revision,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      await initializeCloud();
      setVersions([]);
      setMessage(
        "Saved version restored. Your previous work remains in recovery history."
      );
    } catch (e) {
      setMessage((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="content">
      <div className="dashboard-heading">
        <div>
          <div className="eyebrow">MAKE THIS SPACE YOURS</div>
          <h1>
            Your orbit, your pace<span className="greeting-dot">.</span>
          </h1>
          <p>Set a sustainable rhythm. Keep your learning connected.</p>
        </div>
      </div>
      <section className="cloud-settings">
        <div className="cloud-status-row">
          <Cloud size={21} />
          <strong>
            {cloud.visitor
              ? "Exploring as a visitor"
              : cloud.storage === "development"
                ? "Development workspace"
                : "Your private cloud workspace"}
          </strong>
          <span className="pill-violet">
            {cloud.visitor ? "PREVIEW" : cloud.status.toUpperCase()}
          </span>
        </div>
        <p>
          {cloud.visitor
            ? "Explore the curriculum and try the tools. Preview changes last for this visit. Owner sign-in opens the private, saved workspace."
            : cloud.storage === "development"
              ? "Your study records save to this development server. Connect PostgreSQL before deploying to keep your progress available across devices."
              : "Your learning records save to PostgreSQL. Sign in on another device to pick up where you left off."}
        </p>
        <div className="settings-actions">
          {cloud.visitor ? (
            <a className="button-primary" href="/login/">
              Owner sign-in
              <ArrowUpRight size={16} />
            </a>
          ) : (
            <>
              <button
                className="button-secondary"
                onClick={() => void saveCloud()}
              >
                <Check size={15} />
                Save now
              </button>
              <button
                className="button-secondary"
                disabled={busy}
                onClick={history}
              >
                <History size={15} />
                {busy ? "Opening…" : "Recovery history"}
              </button>
              {cloud.storage !== "development" && (
                <button
                  className="button-secondary"
                  onClick={() =>
                    void signOut().catch(e => setMessage(e.message))
                  }
                >
                  <LogOut size={15} />
                  Sign out
                </button>
              )}
            </>
          )}
        </div>
        {cloud.savedAt && (
          <p className="hint">
            Last saved {new Date(cloud.savedAt).toLocaleString()} · Version{" "}
            {cloud.revision}
          </p>
        )}
        {versions.length > 0 && (
          <div className="history-list">
            {versions.slice(0, 15).map(version => (
              <div className="history-row" key={version.revision}>
                <span>
                  Version {version.revision} ·{" "}
                  {new Date(version.updatedAt).toLocaleString()}
                </span>
                <button
                  className="text-link accent-link"
                  disabled={busy || version.revision === cloud.revision}
                  onClick={() => void restoreVersion(version.revision)}
                >
                  {version.revision === cloud.revision ? "Current" : "Restore"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
      <section className="section">
        <div className="section-heading">
          <h2 className="section-title">Make space for study.</h2>
          <span className="eyebrow">DAILY RHYTHM</span>
        </div>
        <p className="hint">
          Your pace changes the daily plan. Progress depends on what you can do.
        </p>
        <div className="form-grid">
          <label className="eyebrow">
            Study pace
            <select
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
          <label className="eyebrow">
            Weekly hours
            <input
              type="number"
              min="1"
              max="60"
              value={state.settings.pace?.weeklyHours ?? schedule?.weekly ?? 0}
              onChange={e =>
                state.setSetting("pace", {
                  ...state.settings.pace,
                  weeklyHours: Math.max(
                    1,
                    Math.min(60, Number(e.target.value) || 1)
                  ),
                })
              }
            />
          </label>
          <label className="eyebrow">
            Daily minimum (minutes)
            <input
              type="number"
              min="5"
              max="180"
              value={
                state.settings.pace?.dailyTouchMinutes ??
                schedule?.touchMin ??
                20
              }
              onChange={e =>
                state.setSetting("pace", {
                  ...state.settings.pace,
                  dailyTouchMinutes: Math.max(
                    5,
                    Math.min(180, Number(e.target.value) || 5)
                  ),
                })
              }
            />
          </label>
          <label className="eyebrow">
            Rest day
            <select
              value={state.settings.pace?.restDay ?? "Sunday"}
              onChange={e =>
                state.setSetting("pace", {
                  ...state.settings.pace,
                  restDay: e.target.value,
                })
              }
            >
              {[
                "Monday",
                "Tuesday",
                "Wednesday",
                "Thursday",
                "Friday",
                "Saturday",
                "Sunday",
              ].map(day => (
                <option key={day}>{day}</option>
              ))}
            </select>
          </label>
          <label className="eyebrow">
            Time zone
            <select
              value={state.settings.timeZone ?? "Asia/Kolkata"}
              onChange={e => state.setSetting("timeZone", e.target.value)}
            >
              {Array.from(
                new Set([
                  state.settings.timeZone ?? "Asia/Kolkata",
                  ...Intl.supportedValuesOf("timeZone"),
                ])
              ).map(zone => (
                <option key={zone}>{zone}</option>
              ))}
            </select>
          </label>
          <label className="eyebrow">
            Journey start
            <input
              type="date"
              value={state.settings.startDate ?? ""}
              onChange={e =>
                state.setSetting("startDate", e.target.value || undefined)
              }
            />
          </label>
          <label className="eyebrow">
            Focus session (minutes)
            <input
              type="number"
              min="5"
              max="180"
              value={state.settings.focusMinutes ?? 25}
              onChange={e =>
                state.setSetting(
                  "focusMinutes",
                  Math.max(5, Math.min(180, Number(e.target.value) || 25))
                )
              }
            />
          </label>
          <label className="eyebrow">
            Motion
            <select
              value={state.settings.reducedMotion ? "reduced" : "full"}
              onChange={e =>
                state.setSetting("reducedMotion", e.target.value === "reduced")
              }
            >
              <option value="full">Gentle motion</option>
              <option value="reduced">Keep things still</option>
            </select>
          </label>
        </div>
      </section>
      <section className="section">
        <div className="section-heading">
          <h2 className="section-title">Your data stays yours.</h2>
          <ShieldCheck size={20} />
        </div>
        <p className="hint">
          Export a verified backup anytime. Restore an existing backup after
          checking its contents, or bring your records over from the previous
          Meridian.
        </p>
        <div className="settings-actions">
          <button className="button-primary" onClick={downloadWorkspace}>
            <Download size={15} />
            Export backup
          </button>
          <button
            className="button-secondary"
            onClick={() => file.current?.click()}
          >
            <Upload size={15} />
            Import backup
          </button>
          <button className="button-secondary" onClick={importLegacy}>
            <Database size={15} />
            Find old browser data
          </button>
          <input
            type="file"
            ref={file}
            accept="application/json"
            hidden
            onChange={e =>
              e.target.files?.[0] && void readFile(e.target.files[0])
            }
          />
        </div>
        {preview && (
          <div className="cloud-settings">
            <h3>Review your backup</h3>
            <p>
              {preview.summary.sessions} sessions · {preview.summary.journals}{" "}
              journal entries · {preview.summary.evidence} evidence records ·{" "}
              {preview.summary.retrievalPrompts} recall prompts
            </p>
            <p>
              Restoring replaces your current learning record. Export a backup
              first if you want to keep both versions.
            </p>
            <div className="settings-actions">
              <button className="button-primary" onClick={restore}>
                Restore this backup
              </button>
              <button
                className="button-secondary"
                onClick={() => setPreview(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </section>
      <section className="section">
        <div className="section-heading">
          <h2 className="section-title">Research connections</h2>
          <span className="pill-violet">
            {cloud.research ? "CONNECTED" : "LIBRARY READY"}
          </span>
        </div>
        <p className="hint">
          Your curated resource library is always available. Add Exa and
          Firecrawl API keys in the server environment to enable live web
          discovery and source extraction.
        </p>
        <Link className="text-link accent-link" href="/research">
          Open research desk
          <ArrowUpRight size={15} />
        </Link>
      </section>
      {message && (
        <p className="cloud-settings" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
