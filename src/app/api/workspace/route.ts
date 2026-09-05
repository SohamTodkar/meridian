import { apiError, readJson, requireOwner } from "@/lib/server/auth";
import { readWorkspace, saveWorkspace } from "@/lib/server/database";
import { saveSchema } from "@/lib/server/schema";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireOwner();
    return Response.json(await readWorkspace(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function PUT(request: Request) {
  try {
    await requireOwner(request);
    const parsed = saveSchema.safeParse(await readJson(request));
    if (!parsed.success)
      return Response.json(
        {
          error:
            "Some study data is invalid. Export your changes and check your inputs.",
          issues: parsed.error.issues.map(i => ({
            path: i.path,
            message: i.message,
          })),
        },
        { status: 400 }
      );
    const saved = await saveWorkspace(parsed.data.state, parsed.data.revision);
    if (!saved)
      return Response.json(
        {
          error:
            "Your workspace changed in another tab or device. Download your changes before loading the latest version.",
        },
        { status: 409 }
      );
    return Response.json(
      { revision: saved.revision, updatedAt: saved.updatedAt },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return apiError(e);
  }
}
