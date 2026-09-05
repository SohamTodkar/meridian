import { neon } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
try {
  process.loadEnvFile(".env.local");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
if (!process.env.DATABASE_URL) {
  console.error(
    "DATABASE_URL is missing. Add your Neon connection string to .env.local or the deployment environment."
  );
  process.exit(1);
}
const migration = await readFile(
  fileURLToPath(new URL("../database/001_workspace.sql", import.meta.url)),
  "utf8"
);
const sql = neon(process.env.DATABASE_URL);
const statements = migration
  .split(";")
  .map(s => s.trim())
  .filter(Boolean);
await sql.transaction(statements.map(statement => sql.query(statement, [])));
console.log("Meridian database is ready. Migration 001 applied successfully.");
