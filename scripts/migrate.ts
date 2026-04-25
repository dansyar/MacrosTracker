import { sql } from "@vercel/postgres";
import { readFileSync } from "node:fs";
import { join } from "node:path";

async function main() {
  const schemaPath = join(process.cwd(), "db", "schema.sql");
  const schema = readFileSync(schemaPath, "utf8");

  const statements = schema
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const stmt of statements) {
    process.stdout.write(`Running: ${stmt.slice(0, 60).replace(/\n/g, " ")}...\n`);
    await sql.query(stmt);
  }
  process.stdout.write("Migrations complete.\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
