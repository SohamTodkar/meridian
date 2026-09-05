import { spawnSync } from "node:child_process";
// Vercel invokes this script after install. Database migration must succeed before building.
const run = (file, args = []) => {
  const result = spawnSync(process.execPath, [file, ...args], {
    stdio: "inherit",
    windowsHide: true,
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
};
if (process.env.DATABASE_URL) run("scripts/migrate.mjs");
else
  console.log(
    "No DATABASE_URL: building the public visitor experience. Owner workspace requires database setup."
  );
run("node_modules/next/dist/bin/next", ["build"]);
