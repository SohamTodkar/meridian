import { serverConfig } from "@/lib/server/config";
import { readWorkspace } from "@/lib/server/database";
export const dynamic = "force-dynamic";
/**
 * GET /api/health — unauthenticated liveness/readiness probe.
 * Reports the storage mode and whether the workspace store is reachable,
 * without exposing configuration details beyond what /api/auth/session
 * already returns to anonymous visitors.
 */
export async function GET() {
  const c = serverConfig();
  const time = new Date().toISOString();
  const headers = { "Cache-Control": "no-store" };
  if (!c.ready)
    return Response.json(
      { ok: false, status: "setup-required", storage: c.storage, db: false, time },
      { status: 503, headers }
    );
  try {
    await readWorkspace();
    return Response.json(
      { ok: true, status: "ready", storage: c.storage, db: true, time },
      { headers }
    );
  } catch {
    return Response.json(
      {
        ok: false,
        status: "database-unavailable",
        storage: c.storage,
        db: false,
        time,
      },
      { status: 503, headers }
    );
  }
}
