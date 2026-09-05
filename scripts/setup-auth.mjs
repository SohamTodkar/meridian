import { createInterface } from "node:readline/promises";
import { Writable } from "node:stream";
import { randomBytes, scryptSync } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
const hidden = new Writable({
  write(_chunk, _encoding, callback) {
    callback();
  },
});
const readline = createInterface({
  input: process.stdin,
  output: hidden,
  terminal: true,
});
process.stdout.write(
  "Choose a Meridian owner password (at least 12 characters; input is hidden): "
);
const password = await readline.question("");
process.stdout.write("\nConfirm password: ");
const confirmation = await readline.question("");
readline.close();
process.stdout.write("\n");
if (password.length < 12 || password !== confirmation) {
  console.error(
    "Passwords must match and contain at least 12 characters. Nothing changed."
  );
  process.exit(1);
}
const salt = randomBytes(16).toString("hex");
const hash = `${salt}:${scryptSync(password, salt, 64).toString("hex")}`;
let existing = "";
try {
  existing = await readFile(".env.local", "utf8");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
const updates = {
  MERIDIAN_PASSWORD_HASH: hash,
  MERIDIAN_SESSION_SECRET: randomBytes(48).toString("base64url"),
};
for (const [key, value] of Object.entries(updates)) {
  const pattern = new RegExp(`^${key}=.*$`, "m");
  existing = pattern.test(existing)
    ? existing.replace(pattern, `${key}=${value}`)
    : `${existing.trimEnd()}\n${key}=${value}\n`;
}
await writeFile(".env.local", existing.trimStart(), { mode: 0o600 });
console.log(
  "Owner authentication written to .env.local. Copy these two environment values into Vercel Settings, then redeploy. Your password was not stored."
);
