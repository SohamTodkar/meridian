import { serverConfig } from "@/lib/server/config";
import { readWorkspace } from "@/lib/server/database";
export const dynamic = "force-dynamic";
export async function GET() {
  const c = serverConfig();
  if (!c.ready)
    return Response.json({ status: "setup-required" }, { status: 503 });
  try {
    await readWorkspace();
    return Response.json({ status: "ready" });
  } catch {
    return Response.json({ status: "database-unavailable" }, { status: 503 });
  }
}
