/**
 * Wipe ALL conversations from the database.
 *
 * Deletes every row from `sessions`, `messages` and `error_patterns`.
 * Cascading foreign keys handle `messages` and `error_patterns` when we
 * delete from `sessions` first.
 *
 * PRESERVED (intentionally):
 *   - users
 *   - auth_sessions (active logins)
 *   - user_memories (durable cross-conversation facts about the learner)
 *
 * Usage (env loaded from .env.local by mise or via --env-file):
 *   CONFIRM=YES mise run db:reset-conversations
 *
 * Standalone on purpose (raw SQL, no app imports) so it runs under Node's
 * native TypeScript support without path-alias resolution.
 */

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "✖ DATABASE_URL não definido. Use `mise run db:reset-conversations` (carrega .env.local) ou passe --env-file=.env.local.",
  );
  process.exit(1);
}

const { neon } = await import("@neondatabase/serverless");
const sql = neon(url);

const sessionsBefore = await sql`SELECT COUNT(*)::int AS n FROM sessions`;
const messagesBefore = await sql`SELECT COUNT(*)::int AS n FROM messages`;
const patternsBefore = await sql`SELECT COUNT(*)::int AS n FROM error_patterns`;

console.log("─── conversas encontradas ─────────────────────────────");
console.log(`  sessions:       ${sessionsBefore[0].n}`);
console.log(`  messages:       ${messagesBefore[0].n}`);
console.log(`  error_patterns: ${patternsBefore[0].n}`);
console.log("  (users, auth_sessions e user_memories NÃO serão tocados)");

if (process.env.CONFIRM !== "YES") {
  console.log("");
  console.error(
    "✖ Operação destrutiva. Reexecute com CONFIRM=YES para confirmar:",
  );
  console.error("    CONFIRM=YES mise run db:reset-conversations");
  process.exit(2);
}

// Order matters: child tables first, then sessions (FKs cascade either way,
// but going top-down keeps the transaction logically clean).
await sql`TRUNCATE TABLE error_patterns, messages, sessions RESTART IDENTITY CASCADE`;

const sessionsAfter = await sql`SELECT COUNT(*)::int AS n FROM sessions`;
const messagesAfter = await sql`SELECT COUNT(*)::int AS n FROM messages`;
const patternsAfter = await sql`SELECT COUNT(*)::int AS n FROM error_patterns`;

console.log("");
console.log("✔ conversas apagadas");
console.log("─── pós-limpeza ───────────────────────────────────────");
console.log(`  sessions:       ${sessionsAfter[0].n}`);
console.log(`  messages:       ${messagesAfter[0].n}`);
console.log(`  error_patterns: ${patternsAfter[0].n}`);
