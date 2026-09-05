import {
  createHmac,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import { serverConfig } from "./config";

export const SESSION_COOKIE = "meridian_session";
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
export function hashPassword(
  password: string,
  salt = randomBytes(16).toString("hex")
): string {
  return `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
}
export function verifyPassword(password: string, hash: string): boolean {
  try {
    const [salt, hex] = hash.split(":");
    if (!salt || !hex || hex.length !== 128) return false;
    const expected = Buffer.from(hex, "hex");
    const actual = scryptSync(password, salt, 64);
    return (
      expected.length === actual.length && timingSafeEqual(actual, expected)
    );
  } catch {
    return false;
  }
}
function signature(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64url");
}
export function issueSession(secret: string, now = Date.now()): string {
  const body = Buffer.from(
    JSON.stringify({
      sub: "owner",
      exp: Math.floor(now / 1000) + SESSION_SECONDS,
      nonce: randomBytes(16).toString("hex"),
    })
  ).toString("base64url");
  return `${body}.${signature(body, secret)}`;
}
export function verifySession(
  token: string,
  secret: string,
  now = Date.now()
): boolean {
  try {
    const [body, sig, ...extra] = token.split(".");
    if (!body || !sig || extra.length) return false;
    const actual = Buffer.from(sig);
    const expected = Buffer.from(signature(body, secret));
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
      return false;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    return (
      payload.sub === "owner" &&
      Number.isInteger(payload.exp) &&
      payload.exp > Math.floor(now / 1000)
    );
  } catch {
    return false;
  }
}
export async function isAuthenticated() {
  const config = serverConfig();
  if (config.development && !config.authConfigured) return true;
  if (!config.ready || !config.sessionSecret) return false;
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return Boolean(token && verifySession(token, config.sessionSecret));
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}
export async function requireOwner(request?: Request) {
  if (!serverConfig().ready)
    throw new ApiError(
      "Finish the database and sign-in setup to open Meridian.",
      503
    );
  if (!(await isAuthenticated()))
    throw new ApiError("Sign in to continue.", 401);
  if (request && request.method !== "GET") assertSameOrigin(request);
}
export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const requestUrl = new URL(request.url);
  // Next may normalize request.url to localhost. Host is browser-controlled
  // by the target URL; Vercel terminates HTTPS before the function runs.
  const host = request.headers.get("host") || requestUrl.host;
  const protocol = process.env.VERCEL ? "https:" : requestUrl.protocol;
  const expected = `${protocol}//${host}`;
  if (!origin || origin !== expected)
    throw new ApiError(
      "This request must come from your Meridian workspace.",
      403
    );
}
export async function readJson(
  request: Request,
  maxBytes = 4_000_000
): Promise<unknown> {
  if (Number(request.headers.get("content-length")) > maxBytes)
    throw new ApiError(
      "This update is too large. Export older records before adding more.",
      413
    );
  if (!request.headers.get("content-type")?.includes("application/json"))
    throw new ApiError("Expected JSON.", 415);
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError("Missing request body.", 400);
  const parts: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > maxBytes) {
      await reader.cancel();
      throw new ApiError("Request is too large.", 413);
    }
    parts.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(parts).toString("utf8"));
  } catch {
    throw new ApiError("Invalid JSON.", 400);
  }
}
export function apiError(error: unknown) {
  if (error instanceof ApiError)
    return Response.json({ error: error.message }, { status: error.status });
  const traceId = crypto.randomUUID().slice(0, 8);
  console.error(
    `[meridian:${traceId}]`,
    error instanceof Error ? error.name : "Unknown error"
  );
  return Response.json(
    {
      error:
        "Meridian could not reach your database. Your unsaved work is still in this tab.",
      traceId,
    },
    { status: 503 }
  );
}
