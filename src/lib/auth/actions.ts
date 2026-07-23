"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, sessions, userMemories } from "@/lib/db/schema";
import type { Theme } from "@/lib/db/schema";
import type { CEFRLevel } from "@/lib/ai/schema";
import { hashPassword, verifyPassword } from "./password";
import {
  createUserSession,
  destroyCurrentSession,
  getCurrentUser,
  requireAdmin,
} from "./session";
import { englishLevelSchema, loginSchema, registerSchema } from "./validation";
import { setThemeCookie } from "@/lib/theme";
import type { AuthFormState } from "./types";

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
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, email, password, englishLevel } = parsed.data;

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
    .values({ name, email, passwordHash, englishLevel })
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
