/**
 * Apply a single Drizzle migration file's statements directly to the database.
 *
 * Usage:
 *   node --env-file=.env.local scripts/apply-migration.ts [file.sql]
 *
 * With no argument it applies the latest file in ./drizzle. This mirrors what
 * `drizzle-kit push` would do for additive changes, but runs non-interactively
 * (the repo's config uses `strict: true`, which otherwise prompts).
 *
 * Standalone on purpose (no app imports) so it runs under Node's native
 * TypeScript support.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "drizzle-orm";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("✖ DATABASE_URL não definido. Use --env-file=.env.local.");
  process.exit(1);
}

const dir = join(process.cwd(), "drizzle");
const arg = process.argv[2];
const file =
  arg ??
  readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .at(-1);

if (!file) {
  console.error("✖ Nenhuma migração .sql encontrada em ./drizzle.");
  process.exit(1);
}

const migrationSql = readFileSync(join(dir, file), "utf8");
const statements = migrationSql
  .split("--> statement-breakpoint")
  .map((s) => s.trim())
  .filter(Boolean);

const db = drizzle(neon(url));

console.log(`▶ Aplicando ${statements.length} statement(s) de ${file}…`);
for (const statement of statements) {
  await db.execute(sql.raw(statement));
}
console.log("✔ Migração aplicada.");
