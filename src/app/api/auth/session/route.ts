import { cookies } from "next/headers";
import { z } from "zod";
import {
  apiError,
  assertSameOrigin,
  isAuthenticated,
  issueSession,
  readJson,
  SESSION_COOKIE,
  SESSION_SECONDS,
  verifyPassword,
} from "@/lib/server/auth";
import { serverConfig } from "@/lib/server/config";
import { databaseRateLimit } from "@/lib/server/database";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const c = serverConfig();
    return Response.json(
      {
        authenticated: await isAuthenticated(),
        configured: c.ready,
        storage: c.storage,
        research: Boolean(
          process.env.EXA_API_KEY && process.env.FIRECRAWL_API_KEY
        ),
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const c = serverConfig();
    if (!c.authConfigured)
      return Response.json(
        { error: "Sign-in has not been configured." },
        { status: 503 }
      );
    // Single owner: a global durable bucket cannot be bypassed with forged IP headers.
    if (!(await databaseRateLimit("owner-login", 10, 900)))
      return Response.json(
        { error: "Too many attempts. Try again in 15 minutes." },
        { status: 429, headers: { "Retry-After": "900" } }
      );
    const input = z
      .object({ password: z.string().min(1).max(1024) })
      .safeParse(await readJson(request, 4096));
    if (!input.success || !verifyPassword(input.data.password, c.passwordHash!))
      return Response.json(
        { error: "That password doesn’t match." },
        { status: 401 }
      );
    (await cookies()).set(SESSION_COOKIE, issueSession(c.sessionSecret!), {
      httpOnly: true,
      secure: !c.development,
      sameSite: "strict",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    return Response.json({ authenticated: true });
  } catch (e) {
    return apiError(e);
  }
}
export async function DELETE(request: Request) {
  try {
    assertSameOrigin(request);
    (await cookies()).delete(SESSION_COOKIE);
    return Response.json({ authenticated: false });
  } catch (e) {
    return apiError(e);
  }
}
