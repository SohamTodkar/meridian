import { neon } from "@neondatabase/serverless";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { serverConfig } from "./config";
import type { WorkspaceDocument } from "./schema";

export interface WorkspaceVersion {
  revision: number;
  state: WorkspaceDocument | null;
  updatedAt: string | null;
}
type LocalDatabase = { current: WorkspaceVersion; history: WorkspaceVersion[] };
let queue: Promise<unknown> = Promise.resolve();
const localPath = () =>
  path.resolve(process.env.MERIDIAN_DATA_DIR || ".meridian", "workspace.json");
const empty = (): LocalDatabase => ({
  current: { revision: 0, state: null, updatedAt: null },
  history: [],
});
async function localRead(): Promise<LocalDatabase> {
  if (!serverConfig().development)
    throw new Error("Database is not configured.");
  try {
    return JSON.parse(await readFile(localPath(), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return empty();
    throw error;
  }
}
function serial<T>(work: () => Promise<T>): Promise<T> {
  const next = queue.then(work, work);
  queue = next.catch(() => {});
  return next;
}
function sqlClient() {
  const url = serverConfig().databaseUrl;
  if (!url) throw new Error("Database is not configured.");
  return neon(url);
}
function rowVersion(row: Record<string, unknown>): WorkspaceVersion {
  return {
    revision: Number(row.revision),
    state: row.document as WorkspaceDocument,
    updatedAt: new Date(String(row.updated_at)).toISOString(),
  };
}

export async function readWorkspace(): Promise<WorkspaceVersion> {
  if (!serverConfig().databaseUrl) return (await localRead()).current;
  const sql = sqlClient();
  const rows =
    await sql`SELECT revision, document, updated_at FROM meridian_workspace WHERE id = 'owner'`;
  return rows.length ? rowVersion(rows[0]) : empty().current;
}

export async function saveWorkspace(
  state: WorkspaceDocument,
  revision: number
): Promise<WorkspaceVersion | null> {
  if (!serverConfig().databaseUrl)
    return serial(async () => {
      const db = await localRead();
      if (db.current.revision !== revision) return null;
      const next = {
        state,
        revision: revision + 1,
        updatedAt: new Date().toISOString(),
      };
      const data = {
        current: next,
        history: [next, ...db.history].slice(0, 50),
      };
      await mkdir(path.dirname(localPath()), { recursive: true });
      const temporary = `${localPath()}.${crypto.randomUUID()}.tmp`;
      await writeFile(temporary, JSON.stringify(data), {
        encoding: "utf8",
        mode: 0o600,
      });
      await rename(temporary, localPath());
      return next;
    });
  const sql = sqlClient();
  // The conditional upsert and history insert are one statement/transaction.
  const rows = await sql`WITH saved AS (
    INSERT INTO meridian_workspace (id,document,revision,updated_at)
    SELECT 'owner',${JSON.stringify(state)}::jsonb,1,now() WHERE ${revision}=0
    ON CONFLICT (id) DO UPDATE SET document=EXCLUDED.document,revision=meridian_workspace.revision+1,updated_at=now()
    WHERE meridian_workspace.revision=${revision}
    RETURNING revision,document,updated_at
  ), updated AS (
    UPDATE meridian_workspace SET document=${JSON.stringify(state)}::jsonb,revision=revision+1,updated_at=now()
    WHERE id='owner' AND revision=${revision} AND ${revision}>0
    RETURNING revision,document,updated_at
  ), result AS (SELECT * FROM saved UNION ALL SELECT * FROM updated), history AS (
    INSERT INTO meridian_history (revision,document,updated_at) SELECT revision,document,updated_at FROM result RETURNING revision
  ) SELECT result.* FROM result JOIN history USING (revision)`;
  if (!rows.length) return null;
  // Retention is independent of commit success and cannot mask a successful save.
  await sql`DELETE FROM meridian_history WHERE revision < (SELECT greatest(max(revision)-49,0) FROM meridian_history)`.catch(
    () => {}
  );
  return rowVersion(rows[0]);
}

export async function listHistory() {
  if (!serverConfig().databaseUrl)
    return (await localRead()).history.map(({ revision, updatedAt }) => ({
      revision,
      updatedAt,
    }));
  const sql = sqlClient();
  const rows =
    await sql`SELECT revision,updated_at FROM meridian_history ORDER BY revision DESC LIMIT 50`;
  return rows.map(row => ({
    revision: Number(row.revision),
    updatedAt: new Date(row.updated_at).toISOString(),
  }));
}
export async function readHistory(
  revision: number
): Promise<WorkspaceVersion | null> {
  if (!serverConfig().databaseUrl)
    return (
      (await localRead()).history.find(v => v.revision === revision) ?? null
    );
  const sql = sqlClient();
  const rows =
    await sql`SELECT revision,document,updated_at FROM meridian_history WHERE revision=${revision}`;
  return rows.length ? rowVersion(rows[0]) : null;
}

export async function databaseRateLimit(
  key: string,
  limit: number,
  seconds: number
): Promise<boolean> {
  if (!serverConfig().databaseUrl) {
    const { checkRateLimit } = await import("@/lib/rate-limit");
    return checkRateLimit(key, limit, seconds * 1000).allowed;
  }
  const sql = sqlClient();
  const rows =
    await sql`INSERT INTO meridian_rate_limits (key,hits,expires_at) VALUES (${key},1,now()+${seconds}*interval '1 second')
    ON CONFLICT (key) DO UPDATE SET hits=CASE WHEN meridian_rate_limits.expires_at<now() THEN 1 ELSE meridian_rate_limits.hits+1 END,
    expires_at=CASE WHEN meridian_rate_limits.expires_at<now() THEN now()+${seconds}*interval '1 second' ELSE meridian_rate_limits.expires_at END RETURNING hits`;
  return Number(rows[0].hits) <= limit;
}
