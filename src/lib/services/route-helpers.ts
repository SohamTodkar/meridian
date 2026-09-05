import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { checkRateLimit, clientKeyFromHeaders } from "@/lib/rate-limit";
import { apiError, readJson, requireOwner } from "@/lib/server/auth";
import { databaseRateLimit } from "@/lib/server/database";

/**
 * Shared plumbing for /api/research/* routes: body validation via Zod,
 * per-IP rate limiting (30 req/min), trace IDs on errors, and uniform JSON
 * error envelopes.
 */

export interface RouteContext {
  traceId: string;
}

export function jsonResponse<T>(data: T, init?: ResponseInit): NextResponse {
  return NextResponse.json(data, init);
}

export function errorResponse(
  traceId: string,
  message: string,
  status: number,
  extra: Record<string, unknown> = {}
): NextResponse {
  return NextResponse.json({ error: message, traceId, ...extra }, { status });
}

export async function handleResearchRequest<T>(
  request: Request,
  schema: ZodType<T>,
  handler: (input: T, context: RouteContext) => Promise<NextResponse>
): Promise<NextResponse> {
  const traceId = crypto.randomUUID().slice(0, 8);
  try {
    await requireOwner(request);
    if (!(await databaseRateLimit("owner-research", 30, 60)))
      return errorResponse(
        traceId,
        "Research is busy. Try again in a minute.",
        429
      );
  } catch (error) {
    return apiError(error) as NextResponse;
  }

  // Rate limit before touching the payload.
  const limit = checkRateLimit(
    `research:${clientKeyFromHeaders(request.headers)}`
  );
  if (!limit.allowed) {
    return errorResponse(
      traceId,
      "Rate limit reached (30 requests per minute). Try again shortly.",
      429,
      {
        retryAfterSeconds: limit.retryAfterSeconds,
      }
    );
  }

  let input: T;
  try {
    const body: unknown = await readJson(request, 16_000).catch(() => {
      throw new Error("Body is not valid JSON.");
    });
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.issues
        .map(issue => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ");
      return errorResponse(traceId, `Invalid request — ${issues}`, 400);
    }
    input = parsed.data;
  } catch (error) {
    return errorResponse(traceId, (error as Error).message, 400);
  }

  try {
    return await handler(input, { traceId });
  } catch (error) {
    const status =
      typeof (error as { status?: number }).status === "number"
        ? (error as { status: number }).status
        : 500;
    console.error(
      `[research:${traceId}]`,
      error instanceof Error ? error.name : "Upstream error"
    );
    return errorResponse(
      traceId,
      "The source service could not complete this request. Try again shortly, or search your library.",
      status === 429 ? 429 : status === 503 ? 503 : 502
    );
  }
}
