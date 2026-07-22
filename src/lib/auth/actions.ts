"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { Theme } from "@/lib/db/schema";
import { hashPassword, verifyPassword } from "./password";
import {
  createUserSession,
  destroyCurrentSession,
  getCurrentUser,
  requireAdmin,
} from "./session";
import { loginSchema, registerSchema } from "./validation";
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
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, email, password } = parsed.data;

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
    .values({ name, email, passwordHash })
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
  redirect("/");
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
