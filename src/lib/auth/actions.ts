"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, desc, eq, ne } from "drizzle-orm";
import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { users, sessions, userMemories, authSessions } from "@/lib/db/schema";
import type { Theme } from "@/lib/db/schema";
import type { CEFRLevel } from "@/lib/ai/schema";
import { hashPassword, verifyPassword } from "./password";
import {
  createUserSession,
  destroyCurrentSession,
  getCurrentUser,
  requireAdmin,
} from "./session";
import {
  changePasswordSchema,
  englishLevelSchema,
  forgotPasswordSchema,
  loginSchema,
  nativeLanguageSchema,
  registerSchema,
  resetPasswordSchema,
} from "./validation";
import { setThemeCookie } from "@/lib/theme";
import {
  consumePasswordResetToken,
  countRecentPasswordResetRequests,
  createPasswordResetToken,
  findValidPasswordResetToken,
  RESET_RATE_LIMIT,
} from "./reset";
import { sendPasswordResetEmail } from "@/lib/email/resend";
import type { AuthFormState } from "./types";

const SESSION_COOKIE = "session";

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function getRequestIp(): Promise<string | null> {
  // Vercel/standard reverse proxies set x-forwarded-for; trust the first hop.
  const h = await headers();
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    h.get("x-real-ip") ??
    null
  );
}

/** Register a new account (starts as `pending`) and sign the user in. */
export async function registerAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = registerSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    englishLevel: formData.get("englishLevel"),
    nativeLanguage: formData.get("nativeLanguage"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, email, password, englishLevel, nativeLanguage } = parsed.data;

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);
  if (existing.length > 0) {
    return { error: "Este e-mail já está cadastrado." };
  }

  const passwordHash = await hashPassword(password);
  const [user] = await db
    .insert(users)
    .values({ name, email, passwordHash, englishLevel, nativeLanguage })
    .returning();

  await createUserSession(user.id);
  await setThemeCookie(user.theme);
  redirect("/pending");
}

/** Authenticate with email + password. */
export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: "E-mail ou senha inválidos." };
  }

  const { email, password } = parsed.data;
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Always run the hash comparison to avoid leaking which emails exist.
  const ok = user
    ? await verifyPassword(password, user.passwordHash)
    : await verifyPassword(password, "scrypt$0$0");
  if (!user || !ok) {
    return { error: "E-mail ou senha incorretos." };
  }

  await createUserSession(user.id);
  await setThemeCookie(user.theme);

  if (user.role !== "admin" && user.status !== "approved") redirect("/pending");
  redirect("/app");
}

/** Sign out and return to the login page. */
export async function logoutAction(): Promise<void> {
  await destroyCurrentSession();
  redirect("/login");
}

/** Admin: approve a pending account. */
export async function approveUserAction(formData: FormData): Promise<void> {
  await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  if (userId) {
    await db
      .update(users)
      .set({ status: "approved", updatedAt: new Date() })
      .where(eq(users.id, userId));
    revalidatePath("/admin");
  }
}

/** Admin: reject (block) an account. */
export async function rejectUserAction(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = String(formData.get("userId") ?? "");
  // An admin cannot lock themselves out.
  if (userId && userId !== admin.id) {
    await db
      .update(users)
      .set({ status: "rejected", updatedAt: new Date() })
      .where(eq(users.id, userId));
    revalidatePath("/admin");
  }
}

/** Persist the user's light/dark preference (cookie + DB). */
export async function setThemeAction(theme: Theme): Promise<void> {
  const normalized: Theme = theme === "dark" ? "dark" : "light";
  await setThemeCookie(normalized);
  const user = await getCurrentUser();
  if (user) {
    await db
      .update(users)
      .set({ theme: normalized, updatedAt: new Date() })
      .where(eq(users.id, user.id));
  }
}

/**
 * Update the learner's self-declared English level (used as the baseline for
 * new conversations). When `sessionId` is given (e.g. accepting an in-chat
 * assessment suggestion), the live conversation is nudged to the new level too.
 */
export async function updateEnglishLevelAction(
  level: CEFRLevel,
  sessionId?: string,
): Promise<{ ok: boolean; level: CEFRLevel } | { ok: false }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  const parsed = englishLevelSchema.safeParse(level);
  if (!parsed.success) return { ok: false };
  const normalized = parsed.data;

  await db
    .update(users)
    .set({ englishLevel: normalized, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  // Apply to a live conversation so the change is visible immediately: the
  // explicit session (e.g. accepting an in-chat suggestion), or otherwise the
  // learner's most recent conversation (e.g. saving from settings).
  let targetSessionId = sessionId;
  if (!targetSessionId) {
    const [latest] = await db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, user.id))
      .orderBy(desc(sessions.updatedAt))
      .limit(1);
    targetSessionId = latest?.id;
  }

  if (targetSessionId) {
    await db
      .update(sessions)
      .set({ currentLevel: normalized, updatedAt: new Date() })
      .where(and(eq(sessions.id, targetSessionId), eq(sessions.userId, user.id)));
  }

  revalidatePath("/settings");
  return { ok: true, level: normalized };
}

/**
 * Update the learner's native language (used by the in-app translator for the
 * tutor response, the feedback and the grammar tip). The change is global to
 * the user, not per session — the next opened panel re-fetches the value.
 */
export async function updateNativeLanguageAction(
  nativeLanguage: string,
): Promise<{ ok: boolean; nativeLanguage: string } | { ok: false }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false };

  const parsed = nativeLanguageSchema.safeParse(nativeLanguage);
  if (!parsed.success) return { ok: false };
  const normalized = parsed.data;

  await db
    .update(users)
    .set({ nativeLanguage: normalized, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  revalidatePath("/settings");
  return { ok: true, nativeLanguage: normalized };
}

/** Delete one remembered fact about the current user (privacy / correction). */
export async function forgetMemoryAction(formData: FormData): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const id = String(formData.get("memoryId") ?? "");
  if (!id) return;

  await db
    .delete(userMemories)
    .where(and(eq(userMemories.id, id), eq(userMemories.userId, user.id)));
  revalidatePath("/settings");
}

/**
 * Generic success message used by the forgot-password flow. We intentionally
 * don't reveal whether the email exists in the system — same anti-enumeration
 * pattern as `loginAction`.
 */
const FORGOT_GENERIC_MESSAGE =
  "Se o e-mail estiver cadastrado, enviaremos um link para redefinir a senha.";

/**
 * Step 1 of password recovery: the user submits their email, we mint a single-
 * use token (1h TTL) and email them a link. The response is the same whether
 * the email exists or not. Rate-limited to `RESET_RATE_LIMIT` requests per
 * 15 min per user to avoid spam.
 */
export async function forgotPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });
  if (!parsed.success) {
    // Still return success to avoid leaking which emails are valid; show the
    // generic message in the success slot rather than a hard error.
    return { success: FORGOT_GENERIC_MESSAGE };
  }

  const { email } = parsed.data;
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (user) {
    const recent = await countRecentPasswordResetRequests(user.id);
    if (recent < RESET_RATE_LIMIT) {
      try {
        const token = await createPasswordResetToken(user.id, await getRequestIp());
        await sendPasswordResetEmail(email, token);
      } catch (err) {
        // Don't expose infrastructure errors to the user; just log them so an
        // operator can see why emails aren't going out.
        console.error("[forgotPasswordAction] failed to send reset email:", err);
      }
    }
  }

  return { success: FORGOT_GENERIC_MESSAGE };
}

/**
 * Step 2 of password recovery: the user submits the token from their email
 * plus a new password. On success the token is consumed (single-use), the
 * password is updated, and every other session for this user is invalidated.
 * The current session is replaced with a fresh one so the user stays logged
 * in.
 */
export async function resetPasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { token, password } = parsed.data;
  const valid = await findValidPasswordResetToken(token);
  if (!valid) {
    return {
      error:
        "Link inválido ou expirado. Solicite um novo link em /forgot.",
    };
  }

  const newHash = await hashPassword(password);

  // Consume the token first; if it was already used between the lookup and
  // now, bail out before touching the password.
  const consumed = await consumePasswordResetToken(valid.id);
  if (!consumed) {
    return {
      error: "Este link já foi usado. Solicite um novo.",
    };
  }

  await db
    .update(users)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(users.id, valid.userId));

  // Invalidate every other session for this user, then start a fresh one so
  // the user is logged in after the redirect to /login.
  await db.delete(authSessions).where(eq(authSessions.userId, valid.userId));
  await createUserSession(valid.userId);

  // Look up the user once more to set the theme cookie to whatever they had
  // before — keeps the post-reset login experience consistent.
  const [resetUser] = await db
    .select({ theme: users.theme })
    .from(users)
    .where(eq(users.id, valid.userId))
    .limit(1);
  if (resetUser) await setThemeCookie(resetUser.theme);

  redirect("/login?reset=1");
}

/**
 * Logged-in users can change their password from /settings. Requires the
 * current password, rotates to a new one, and invalidates every OTHER
 * session for safety. The current session keeps working.
 */
export async function changePasswordAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: "Sua sessão expirou. Entre novamente." };
  }

  const parsed = changePasswordSchema.safeParse({
    current: formData.get("current"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const ok = await verifyPassword(parsed.data.current, user.passwordHash);
  if (!ok) {
    return { error: "Senha atual incorreta." };
  }

  const newHash = await hashPassword(parsed.data.password);
  await db
    .update(users)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(users.id, user.id));

  // Drop every session for this user EXCEPT the one currently in use.
  const jar = await cookies();
  const currentToken = jar.get(SESSION_COOKIE)?.value ?? "";
  const currentTokenHash = currentToken ? sha256(currentToken) : null;
  if (currentTokenHash) {
    await db
      .delete(authSessions)
      .where(
        and(
          eq(authSessions.userId, user.id),
          ne(authSessions.tokenHash, currentTokenHash),
        ),
      );
  } else {
    await db.delete(authSessions).where(eq(authSessions.userId, user.id));
  }

  revalidatePath("/settings");
  return { success: "Senha atualizada. As outras sessões foram desconectadas." };
}

/**
 * Convenience action for the "Sair de todos os outros dispositivos" button in
 * /settings. Keeps the current session alive.
 */
export async function logoutAllOtherSessionsAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;
  const jar = await cookies();
  const currentToken = jar.get(SESSION_COOKIE)?.value ?? "";
  const currentTokenHash = currentToken ? sha256(currentToken) : null;
  if (currentTokenHash) {
    await db
      .delete(authSessions)
      .where(
        and(
          eq(authSessions.userId, user.id),
          ne(authSessions.tokenHash, currentTokenHash),
        ),
      );
  } else {
    await db.delete(authSessions).where(eq(authSessions.userId, user.id));
  }
  revalidatePath("/settings");
}
