"use client";
import { create } from "zustand";
import {
  getInitialMeridianState,
  getPersistedMeridianState,
  useMeridianStore,
  type MeridianState,
} from "./store";
import { createVerifiedBackup } from "./backups";

type Phase = "loading" | "setup" | "signed-out" | "ready" | "error";
type SaveStatus = "saved" | "saving" | "pending" | "error" | "conflict";
export const useCloudStore = create<{
  phase: Phase;
  status: SaveStatus;
  storage: string;
  research: boolean;
  revision: number;
  message: string;
  savedAt: string | null;
  visitor: boolean;
}>(() => ({
  phase: "loading",
  status: "saved",
  storage: "",
  research: false,
  revision: 0,
  message: "",
  savedAt: null,
  visitor: false,
}));
let baseline = "";
let writing: Promise<void> | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
let unsubscribe: (() => void) | undefined;
let opening: Promise<void> | null = null;
let applying = false;
export function downloadWorkspace() {
  const blob = new Blob(
    [
      JSON.stringify(
        createVerifiedBackup(
          getPersistedMeridianState(useMeridianStore.getState())
        ),
        null,
        2
      ),
    ],
    { type: "application/json" }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `meridian-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function jsonRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  const body = await response.json();
  if (!response.ok)
    throw Object.assign(new Error(body.error || "Unable to reach Meridian."), {
      status: response.status,
    });
  return body;
}
function documentJson() {
  return JSON.stringify(getPersistedMeridianState(useMeridianStore.getState()));
}
export function hasUnsavedChanges() {
  return (
    !useCloudStore.getState().visitor &&
    useCloudStore.getState().phase === "ready" &&
    documentJson() !== baseline
  );
}
export async function saveCloud(): Promise<void> {
  clearTimeout(timer);
  if (writing) return writing;
  const cloud = useCloudStore.getState();
  if (cloud.visitor || cloud.phase !== "ready" || cloud.status === "conflict")
    return;
  const current = documentJson();
  if (current === baseline) {
    useCloudStore.setState({ status: "saved" });
    return;
  }
  useCloudStore.setState({ status: "saving", message: "" });
  writing = (async () => {
    try {
      const result = await jsonRequest("/api/workspace/", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revision: cloud.revision,
          state: JSON.parse(current),
        }),
      });
      baseline = current;
      useCloudStore.setState({
        revision: result.revision,
        savedAt: result.updatedAt,
        status: documentJson() === current ? "saved" : "pending",
        message: "",
      });
    } catch (error) {
      const e = error as Error & { status?: number };
      useCloudStore.setState({
        status: e.status === 409 ? "conflict" : "error",
        message: e.message,
      });
    } finally {
      writing = null;
      if (useCloudStore.getState().status === "pending")
        timer = setTimeout(() => void saveCloud(), 150);
    }
  })();
  return writing;
}
function changed() {
  if (
    applying ||
    useCloudStore.getState().visitor ||
    useCloudStore.getState().phase !== "ready" ||
    useCloudStore.getState().status === "conflict" ||
    documentJson() === baseline
  )
    return;
  useCloudStore.setState({ status: writing ? "saving" : "pending" });
  clearTimeout(timer);
  timer = setTimeout(() => void saveCloud(), 600);
}
export function initializeCloud(): Promise<void> {
  if (opening) return opening;
  opening = (async () => {
    try {
      useCloudStore.setState({ phase: "loading", message: "" });
      const session = await jsonRequest("/api/auth/session/");
      useCloudStore.setState({
        storage: session.storage,
        research: session.research,
        visitor: false,
      });
      if (
        !session.authenticated &&
        !window.location.pathname.startsWith("/login")
      ) {
        unsubscribe?.();
        useMeridianStore.setState({
          ...getInitialMeridianState(),
          hydrated: true,
          onboardingComplete: true,
        });
        baseline = documentJson();
        useCloudStore.setState({
          phase: "ready",
          visitor: true,
          status: "saved",
          storage: "visitor",
          revision: 0,
          savedAt: null,
        });
        return;
      }
      if (!session.configured) {
        useCloudStore.setState({ phase: "setup" });
        return;
      }
      if (!session.authenticated) {
        useCloudStore.setState({ phase: "signed-out" });
        return;
      }
      const workspace = await jsonRequest("/api/workspace/");
      applying = true;
      const data = {
        ...getInitialMeridianState(),
        ...(workspace.state || {}),
        hydrated: true,
        onboardingComplete: true,
      };
      data.timer = { ...data.timer, running: false };
      useMeridianStore.setState(data as Partial<MeridianState>);
      baseline = documentJson();
      applying = false;
      useCloudStore.setState({
        phase: "ready",
        status: "saved",
        revision: workspace.revision,
        savedAt: workspace.updatedAt,
        message: "",
      });
      unsubscribe?.();
      unsubscribe = useMeridianStore.subscribe(changed);
    } catch (e) {
      applying = false;
      useCloudStore.setState({ phase: "error", message: (e as Error).message });
    } finally {
      opening = null;
    }
  })();
  return opening;
}
export async function signOut() {
  await saveCloud();
  if (hasUnsavedChanges())
    throw new Error(
      "Save or download your unsaved changes before signing out."
    );
  await jsonRequest("/api/auth/session/", { method: "DELETE" });
  unsubscribe?.();
  clearTimeout(timer);
  useMeridianStore.setState(getInitialMeridianState());
  baseline = "";
  useCloudStore.setState({ phase: "signed-out", status: "saved" });
}
export async function refreshIfClean() {
  const before = useCloudStore.getState();
  if (
    before.visitor ||
    hasUnsavedChanges() ||
    writing ||
    before.phase !== "ready"
  )
    return;
  const startingDocument = documentJson();
  try {
    const result = await jsonRequest("/api/workspace/");
    const current = useCloudStore.getState();
    // Edits, saves, or sign-out during the request always win over a background refresh.
    if (
      current.visitor ||
      current.phase !== "ready" ||
      writing ||
      hasUnsavedChanges() ||
      current.revision !== before.revision ||
      documentJson() !== startingDocument
    )
      return;
    if (result.revision > current.revision && result.state) {
      applying = true;
      useMeridianStore.setState({
        ...getInitialMeridianState(),
        ...result.state,
        hydrated: true,
        timer: { ...result.state.timer, running: false },
      });
      baseline = documentJson();
      applying = false;
      useCloudStore.setState({
        revision: result.revision,
        savedAt: result.updatedAt,
        status: "saved",
      });
    }
  } catch {
    applying = false;
  }
}
