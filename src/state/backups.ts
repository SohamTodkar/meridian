import type { MeridianModel } from "@/data";
import type { MeridianStateSnapshot } from "./selectors";
import { importBackup, type ImportReport } from "./importers";

export interface MeridianBackupEnvelope {
  app: "Meridian";
  format: "meridian-backup";
  schemaVersion: 2;
  createdAt: string;
  checksum: string;
  state: Record<string, unknown>;
}

export interface BackupPreview extends ImportReport {
  integrity: "verified" | "legacy";
  summary: { checks: number; sessions: number; journals: number; evidence: number; retrievalPrompts: number };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function fnv1a(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function createVerifiedBackup(state: Record<string, unknown>, createdAt = new Date().toISOString()): MeridianBackupEnvelope {
  const payload = { app: "Meridian", format: "meridian-backup", schemaVersion: 2, createdAt, state } as const;
  return { ...payload, checksum: fnv1a(stableJson(payload)) };
}

function summary(state: Partial<MeridianStateSnapshot>): BackupPreview["summary"] {
  return {
    checks: Object.keys(state.checks ?? {}).length,
    sessions: Object.keys(state.sessions ?? {}).length,
    journals: state.journals?.length ?? 0,
    evidence: state.evidence?.length ?? 0,
    retrievalPrompts: state.retrievalPrompts?.length ?? 0,
  };
}

export function previewBackup(input: unknown, model: MeridianModel): BackupPreview | null {
  const record = input && typeof input === "object" && !Array.isArray(input) ? input as Record<string, unknown> : undefined;
  const verified = record?.app === "Meridian" && record.format === "meridian-backup" && record.schemaVersion === 2 && typeof record.createdAt === "string" && typeof record.checksum === "string" && record.state && typeof record.state === "object";
  if (verified) {
    const payload = { app: "Meridian", format: "meridian-backup", schemaVersion: 2, createdAt: record.createdAt, state: record.state };
    if (fnv1a(stableJson(payload)) !== record.checksum) return null;
  }
  const report = importBackup(input, model);
  if (!report) return null;
  return { ...report, integrity: verified ? "verified" : "legacy", summary: summary(report.state) };
}
