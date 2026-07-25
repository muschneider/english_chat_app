import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { passwordResetTokens } from "@/lib/db/schema";

/** How long a reset link stays valid. */
export const RESET_TTL_MS = 60 * 60 * 1000; // 1 hour
/** Cap on how many reset requests one user can fire in 15 minutes. */
export const RESET_RATE_LIMIT = 3;
const RESET_RATE_WINDOW_MS = 15 * 60 * 1000;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Issue a new password-reset token for `userId`. Any unused tokens previously
 * issued for the same user are deleted first so a fresh request always
 * invalidates older links. The raw token is returned (it will be embedded in
 * the email link); only its SHA-256 hash is persisted.
 */
export async function createPasswordResetToken(
  userId: string,
  requestIp?: string | null,
): Promise<string> {
  await db
    .delete(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.userId, userId),
        isNull(passwordResetTokens.usedAt),
      ),
    );

  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + RESET_TTL_MS);

  await db.insert(passwordResetTokens).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
    requestIp: requestIp ?? null,
  });

  return token;
}

/**
 * Look up a token and return the associated `userId` if it is still valid
 * (not expired, not consumed). Returns `null` for any failure mode so callers
 * can show a generic "link expired or already used" message.
 */
export async function findValidPasswordResetToken(
  token: string,
): Promise<{ id: string; userId: string } | null> {
  const [row] = await db
    .select({
      id: passwordResetTokens.id,
      userId: passwordResetTokens.userId,
    })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.tokenHash, hashToken(token)),
        gt(passwordResetTokens.expiresAt, new Date()),
        isNull(passwordResetTokens.usedAt),
      ),
    )
    .limit(1);
  return row ?? null;
}

/** Mark a token as consumed. Idempotent: returns false if it was already used. */
export async function consumePasswordResetToken(
  id: string,
): Promise<boolean> {
  const [updated] = await db
    .update(passwordResetTokens)
    .set({ usedAt: new Date() })
    .where(
      and(eq(passwordResetTokens.id, id), isNull(passwordResetTokens.usedAt)),
    )
    .returning({ id: passwordResetTokens.id });
  return Boolean(updated);
}

/**
 * Count the number of reset tokens created for `userId` within the last
 * `RESET_RATE_WINDOW_MS` ms. Used to throttle spam on `/forgot`.
 */
export async function countRecentPasswordResetRequests(
  userId: string,
): Promise<number> {
  const since = new Date(Date.now() - RESET_RATE_WINDOW_MS);
  const rows = await db
    .select({ id: passwordResetTokens.id })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.userId, userId),
        gt(passwordResetTokens.createdAt, since),
      ),
    );
  return rows.length;
}
