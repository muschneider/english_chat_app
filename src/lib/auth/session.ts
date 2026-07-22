import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, authSessions } from "@/lib/db/schema";
import type { UserRow } from "@/lib/db/schema";

const SESSION_COOKIE = "session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Issue a new server session for `userId` and set the HttpOnly cookie. */
export async function createUserSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

  await db.insert(authSessions).values({
    userId,
    tokenHash: hashToken(token),
    expiresAt,
  });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Delete the current session (DB row + cookie), if any. */
export async function destroyCurrentSession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(authSessions).where(eq(authSessions.tokenHash, hashToken(token)));
    jar.delete(SESSION_COOKIE);
  }
}

/** Resolve the currently logged-in user from the session cookie, or null. */
export async function getCurrentUser(): Promise<UserRow | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({ user: users })
    .from(authSessions)
    .innerJoin(users, eq(users.id, authSessions.userId))
    .where(
      and(
        eq(authSessions.tokenHash, hashToken(token)),
        gt(authSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);

  return rows[0]?.user ?? null;
}

/** Require a logged-in user in a Server Component/action; redirect otherwise. */
export async function requireUser(): Promise<UserRow> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Require a logged-in AND approved user; route unapproved users to /pending. */
export async function requireApprovedUser(): Promise<UserRow> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin" && user.status !== "approved") redirect("/pending");
  return user;
}

/** Require an admin; non-admins are sent to the app, guests to login. */
export async function requireAdmin(): Promise<UserRow> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/app");
  return user;
}
