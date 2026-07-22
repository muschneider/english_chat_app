import type { Metadata, Viewport } from "next";
import { getThemeCookie } from "@/lib/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "English Conversation Tutor",
  description:
    "Practice English conversation with an adaptive AI tutor: survival kits, scaffolding, and gentle real-time corrections.",
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const theme = await getThemeCookie();
  return (
    <html
      lang="en"
      className={theme === "dark" ? "dark" : undefined}
      suppressHydrationWarning
    >
      <body className="min-h-full text-slate-800 antialiased dark:text-slate-100">
        {children}
      </body>
    </html>
  );
}
