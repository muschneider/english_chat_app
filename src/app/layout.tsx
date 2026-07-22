import type { Metadata, Viewport } from "next";
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-full text-slate-800 antialiased">{children}</body>
    </html>
  );
}
