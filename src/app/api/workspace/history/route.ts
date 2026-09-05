import { apiError, requireOwner, readJson } from "@/lib/server/auth";
import { listHistory, readHistory, saveWorkspace } from "@/lib/server/database";
import { workspaceSchema } from "@/lib/server/schema";
import { z } from "zod";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireOwner();
    return Response.json(
      { versions: await listHistory() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    await requireOwner(request);
    const input = z
      .object({
        revision: z.number().int().nonnegative(),
        restoreRevision: z.number().int().positive(),
      })
      .safeParse(await readJson(request, 4096));
    if (!input.success)
      return Response.json(
        { error: "Choose a valid saved version." },
        { status: 400 }
      );
    const old = await readHistory(input.data.restoreRevision);
    if (!old?.state)
      return Response.json(
        { error: "This version is no longer available." },
        { status: 404 }
      );
    const next = await saveWorkspace(
      workspaceSchema.parse(old.state),
      input.data.revision
    );
    return next
      ? Response.json(next)
      : Response.json(
          {
            error:
              "The workspace changed. Refresh the history before restoring.",
          },
          { status: 409 }
        );
  } catch (e) {
    return apiError(e);
  }
}
