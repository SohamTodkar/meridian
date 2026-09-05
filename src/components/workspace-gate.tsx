"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { ArrowRight, Orbit, RefreshCw, LockKeyhole } from "lucide-react";
import {
  downloadWorkspace,
  hasUnsavedChanges,
  initializeCloud,
  refreshIfClean,
  saveCloud,
  useCloudStore,
} from "@/state/cloud";

export function WorkspaceGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const cloud = useCloudStore();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    void initializeCloud();
    const leave = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = "";
        void saveCloud();
      }
    };
    const visibility = () => {
      if (document.visibilityState === "hidden") void saveCloud();
      else void refreshIfClean();
    };
    const online = () => void saveCloud();
    window.addEventListener("beforeunload", leave);
    window.addEventListener("online", online);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("beforeunload", leave);
      window.removeEventListener("online", online);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  async function login(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/auth/session/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
        signal: AbortSignal.timeout(20000),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setPassword("");
      await initializeCloud();
      router.replace("/");
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (cloud.phase === "ready")
    return (
      <>
        {children}
        {(cloud.status === "error" || cloud.status === "conflict") && (
          <div className="save-alert" role="alert">
            <div>
              <strong>
                {cloud.status === "conflict"
                  ? "Another version was saved"
                  : "Your changes haven’t saved yet"}
              </strong>
              <p>{cloud.message}</p>
            </div>
            <button className="button-secondary" onClick={downloadWorkspace}>
              Download my changes
            </button>
            <button
              className="button-primary"
              onClick={() =>
                cloud.status === "conflict"
                  ? window.confirm(
                      "Load the server version? Download your changes first to keep this tab’s edits."
                    ) && void initializeCloud()
                  : void saveCloud()
              }
            >
              {cloud.status === "conflict"
                ? "Load server version"
                : "Retry save"}
            </button>
          </div>
        )}
      </>
    );
  return (
    <main className="gateway">
      <div className="gateway-image" />
      <div className="gateway-card">
        <Link className="obs-brand" href="/">
          <Orbit size={32} />
          <span>
            meridian<span className="brand-dot">.</span>
          </span>
        </Link>
        {cloud.phase === "loading" ? (
          <>
            <div className="eyebrow">STUDY OBSERVATORY</div>
            <h1>Finding your place.</h1>
            <p role="status">Opening your workspace…</p>
            <div className="loading-line" />
          </>
        ) : cloud.phase === "signed-out" ? (
          <>
            <span className="mini-icon">
              <LockKeyhole size={20} />
            </span>
            <h1>
              Your space to
              <br />
              go further.
            </h1>
            <p>Welcome back. Your next chapter is waiting.</p>
            <form onSubmit={login}>
              <label htmlFor="password">Workspace password</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoFocus
              />
              <button className="button-primary" disabled={busy}>
                {busy ? "Opening…" : "Enter your observatory"}
                <ArrowRight size={18} />
              </button>
              {message && (
                <p role="alert" className="form-error">
                  {message}
                </p>
              )}
            </form>
          </>
        ) : cloud.phase === "setup" ? (
          <>
            <div className="eyebrow">ONE-TIME SETUP</div>
            <h1>
              Give your progress
              <br />a home.
            </h1>
            <p>
              Connect the database and your private sign-in to start studying
              from any device.
            </p>
            <ol className="setup-steps">
              <li>Create a Neon Postgres database in Vercel Storage.</li>
              <li>
                Add DATABASE_URL, MERIDIAN_PASSWORD_HASH, and
                MERIDIAN_SESSION_SECRET to Vercel.
              </li>
              <li>Run the database migration and redeploy.</li>
            </ol>
            <p>The complete walkthrough is in the project’s README.</p>
            <button
              className="button-primary"
              onClick={() => void initializeCloud()}
            >
              Check connection
              <RefreshCw size={16} />
            </button>
          </>
        ) : (
          <>
            <h1>Let’s reconnect.</h1>
            <p role="alert">{cloud.message}</p>
            <button
              className="button-primary"
              onClick={() => void initializeCloud()}
            >
              Try again
              <RefreshCw size={16} />
            </button>
          </>
        )}
        <span className="gateway-footer">
          A little progress. A larger universe.
        </span>
      </div>
    </main>
  );
}
