/**
 * Seed / ensure the admin account.
 *
 * Usage (env loaded from .env.local via `--env-file` or `mise run db:seed`):
 *   ADMIN_EMAIL="you@example.com" ADMIN_NAME="Your Name" \
 *     node --env-file=.env.local scripts/seed-admin.ts
 *
 * - If ADMIN_PASSWORD is set, it is used; otherwise a strong one is generated
 *   and printed once.
 * - Idempotent: if the email already exists, it is promoted to admin/approved
 *   and the password is left untouched.
 *
 * Standalone on purpose (raw SQL, no app imports) so it runs under Node's
 * native TypeScript support without path-alias resolution.
 */
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { neon } from "@neondatabase/serverless";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scryptAsync(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

function generatePassword(): string {
  // 18 random bytes -> 24 URL-safe characters (~144 bits of entropy).
  return randomBytes(18).toString("base64url");
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "✖ DATABASE_URL não definido. Use `mise run db:seed` (carrega .env.local) ou passe --env-file=.env.local.",
  );
  process.exit(1);
}

const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
const name = (process.env.ADMIN_NAME ?? "Admin").trim();
if (!email) {
  console.error(
    '✖ ADMIN_EMAIL não definido. Ex.: ADMIN_EMAIL=voce@exemplo.com ADMIN_NAME="Seu Nome" mise run db:seed',
  );
  process.exit(1);
}

const providedPassword = process.env.ADMIN_PASSWORD?.trim();
const password =
  providedPassword && providedPassword.length > 0
    ? providedPassword
    : generatePassword();

const sql = neon(url);

const existing = await sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`;

if (existing.length > 0) {
  await sql`
    UPDATE users
    SET role = 'admin', status = 'approved', updated_at = now()
    WHERE email = ${email}
  `;
  console.log(
    `✔ Admin já existia (${email}). Garantido role=admin, status=approved. Senha mantida.`,
  );
} else {
  const passwordHash = await hashPassword(password);
  await sql`
    INSERT INTO users (name, email, password_hash, role, status, theme)
    VALUES (${name}, ${email}, ${passwordHash}, 'admin', 'approved', 'light')
  `;
  console.log("✔ Admin criado com sucesso!");
  console.log("────────────────────────────────────────");
  console.log(`  Email: ${email}`);
  console.log(`  Senha: ${password}`);
  console.log("────────────────────────────────────────");
  if (!providedPassword) {
    console.log("  (Senha gerada automaticamente — guarde-a e troque após o 1º login.)");
  }
}
