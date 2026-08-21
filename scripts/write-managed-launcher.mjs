import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const destination = path.join(process.cwd(), "dist", "index.js");
const launcher = `import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";

const nextCli = path.join(process.cwd(), "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextCli, "start"], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: "production" },
  stdio: "inherit",
});

child.on("exit", (code) => process.exit(code ?? 1));
`;

await mkdir(path.dirname(destination), { recursive: true });
await writeFile(destination, launcher, "utf8");
