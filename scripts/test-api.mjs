import { spawn } from "node:child_process";
import { mkdtemp, readdir, unlink, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes, scryptSync } from "node:crypto";
import assert from "node:assert/strict";

const root = path.resolve(await mkdtemp(path.join(tmpdir(), "meridian-api-")));
const origin = "http://localhost:3108";
const password = randomBytes(24).toString("base64url");
const salt = randomBytes(16).toString("hex");
const env = {
  ...process.env,
  NODE_ENV: "production",
  VERCEL: "",
  DATABASE_URL: "",
  MERIDIAN_DEV_STORAGE: "true",
  MERIDIAN_DATA_DIR: root,
  MERIDIAN_PASSWORD_HASH: `${salt}:${scryptSync(password, salt, 64).toString("hex")}`,
  MERIDIAN_SESSION_SECRET: randomBytes(48).toString("base64url"),
};
const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "start", "-p", "3108"],
  { env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true }
);
let output = "";
child.stdout.on("data", v => (output += v));
child.stderr.on("data", v => (output += v));
let cookie = "";
let checks = 0;
async function request(
  url,
  method = "GET",
  body,
  authenticated = true,
  requestOrigin = origin
) {
  const response = await fetch(origin + url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(method !== "GET" ? { Origin: requestOrigin } : {}),
      ...(authenticated && cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    redirect: "manual",
  });
  return response;
}
function check(value, message) {
  assert.ok(value, message);
  checks++;
}
try {
  let ready = false;
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null)
      throw new Error(
        "Test server exited before startup. " + output.slice(-2000)
      );
    try {
      const response = await fetch(origin + "/api/auth/session/");
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {}
    await new Promise(r => setTimeout(r, 250));
  }
  assert.ok(ready, "Server did not start.");
  const session = await (await request("/api/auth/session/")).json();
  check(
    session.authenticated === false,
    "Anonymous visitors must not receive owner access"
  );
  for (const url of [
    "/",
    "/path/",
    "/focus/",
    "/rhythm/",
    "/journal/",
    "/recall/",
    "/review/",
    "/portfolio/",
    "/library/",
    "/research/",
    "/settings/",
    "/login/",
    "/session/p0s1/",
    "/path/p0/",
    "/dsa/",
    "/first-seven-days/",
    "/safety-net/",
  ])
    check(
      (await request(url)).status === 200,
      `${url} should be accessible without Vercel auth`
    );
  check(
    (await request("/api/workspace/", "GET", undefined, false)).status === 401,
    "Study records require owner session"
  );
  check(
    (await request("/api/workspace/history/", "GET", undefined, false))
      .status === 401,
    "History requires owner session"
  );
  check(
    (await request("/api/research/search/", "POST", { query: "Python" }, false))
      .status === 401,
    "Paid research requires owner session"
  );
  check(
    (await request("/api/auth/session/", "POST", { password: "wrong" }, false))
      .status === 401,
    "Bad password must fail"
  );
  const login = await request(
    "/api/auth/session/",
    "POST",
    { password },
    false
  );
  check(login.status === 200, "Owner can sign in");
  const setCookie = login.headers.get("set-cookie");
  check(
    setCookie?.includes("HttpOnly") && setCookie?.includes("SameSite=strict"),
    "Session cookie must be HttpOnly and SameSite strict"
  );
  cookie = setCookie.split(";")[0];
  const numericHost = await fetch("http://127.0.0.1:3108/api/workspace/", {
    method: "PUT",
    headers: {
      Origin: "http://127.0.0.1:3108",
      "Content-Type": "application/json",
      Cookie: cookie,
    },
    body: "{}",
  });
  check(
    numericHost.status === 400,
    "Same-origin writes use the actual browser host and reach validation"
  );
  const empty = await (await request("/api/workspace/")).json();
  check(
    empty.revision === 0 && empty.state === null,
    "New account starts empty"
  );
  const state = {
    settings: { scheduleMode: "semester", timeZone: "Asia/Kolkata" },
    checks: { "p0s1.check.1": true },
    journals: [
      { id: "api-test", date: "2026-09-05", text: "A real saved note." },
    ],
  };
  const saved = await request("/api/workspace/", "PUT", { revision: 0, state });
  check(saved.status === 200, "Owner can save");
  check(
    (await request("/api/workspace/", "PUT", { revision: 0, state })).status ===
      409,
    "Stale writes return conflict"
  );
  check(
    (
      await request(
        "/api/workspace/",
        "PUT",
        { revision: 1, state },
        true,
        "https://untrusted.example"
      )
    ).status === 403,
    "Cross-site mutation blocked"
  );
  check(
    (
      await request("/api/workspace/", "PUT", {
        revision: 1,
        state: { ...state, setSetting: "bad" },
      })
    ).status === 400,
    "Invalid document rejected"
  );
  const stored = await (await request("/api/workspace/")).json();
  check(
    stored.state.journals[0].text === "A real saved note.",
    "Saved note survives a fresh request"
  );
  const update = await request("/api/workspace/", "PUT", {
    revision: 1,
    state: { ...state, journals: [] },
  });
  check(update.status === 200, "Subsequent save succeeds");
  const history = await (await request("/api/workspace/history/")).json();
  check(history.versions.length === 2, "Both versions retained");
  const restored = await request("/api/workspace/history/", "POST", {
    revision: 2,
    restoreRevision: 1,
  });
  check(restored.status === 200, "Recovery pipeline succeeds");
  check(
    (await restored.json()).state.journals[0].text === "A real saved note.",
    "Recovery restores original records"
  );
  check(
    (await request("/api/auth/session/", "DELETE")).status === 200,
    "Sign out succeeds"
  );
  cookie = "";
  check(
    (await request("/api/workspace/")).status === 401,
    "Signed-out requests cannot read records"
  );
  console.log(
    `Passed ${checks} production HTTP checks: public routes, private APIs, login, save, conflicts, validation, history, restore, and logout.`
  );
} catch (error) {
  console.error(error.message);
  console.error(output.slice(-3500));
  process.exitCode = 1;
} finally {
  child.kill();
  await Promise.race([
    new Promise(resolve => child.once("exit", resolve)),
    new Promise(resolve => setTimeout(resolve, 3000)),
  ]);
  // Delete only named files in the verified, freshly-created test directory.
  if (
    !root.startsWith(path.resolve(tmpdir()) + path.sep) ||
    !path.basename(root).startsWith("meridian-api-")
  )
    throw new Error("Unsafe test cleanup path");
  for (const name of await readdir(root)) {
    const file = path.resolve(root, name);
    if (path.dirname(file) !== root) throw new Error("Unsafe test file path");
    await unlink(file);
  }
  await rmdir(root);
}
