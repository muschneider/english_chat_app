import { cookies } from "next/headers";
import type { Theme } from "@/lib/db/schema";

/**
 * The theme cookie mirrors the user's stored preference so the root layout can
 * render the correct light/dark classes on the very first byte (no flash),
 * even on unauthenticated pages.
 */
export const THEME_COOKIE = "theme";

export function normalizeTheme(value: string | undefined | null): Theme {
  return value === "dark" ? "dark" : "light";
}

export async function getThemeCookie(): Promise<Theme> {
  const jar = await cookies();
  return normalizeTheme(jar.get(THEME_COOKIE)?.value);
}

export async function setThemeCookie(theme: Theme): Promise<void> {
  const jar = await cookies();
  jar.set(THEME_COOKIE, theme, {
    httpOnly: false, // not sensitive; harmless if read client-side
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
