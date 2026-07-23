import Link from "next/link";
import type { ReactNode } from "react";
import { CEFR_LEVELS, type CEFRLevel } from "@/lib/ai/schema";
import { LEVEL_META } from "@/lib/levelMeta";

/** Centered card used by the login / register / pending pages. */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-2xl text-white shadow-md">
            🗣️
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-800 dark:text-slate-100">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
          {children}
        </div>

        <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
          English Conversation Tutor
        </p>
      </div>
    </main>
  );
}

export function Field({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-brand-500 dark:focus:ring-brand-900/60"
      />
    </label>
  );
}

/**
 * A labeled CEFR level picker used at registration and in settings. Renders as a
 * native <select> so it works inside a plain server-action form (no client JS).
 */
export function LevelSelectField({
  name = "englishLevel",
  label = "Seu nível de inglês",
  defaultValue = "A2",
  hint = "Você pode mudar depois nas configurações.",
}: {
  name?: string;
  label?: string;
  defaultValue?: CEFRLevel;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
        {label}
      </span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-slate-800 shadow-sm outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-brand-500 dark:focus:ring-brand-900/60"
      >
        {CEFR_LEVELS.map((level) => {
          const meta = LEVEL_META[level];
          return (
            <option key={level} value={level}>
              {level} · {meta.label}
            </option>
          );
        })}
      </select>
      {hint && (
        <span className="mt-1.5 block text-xs text-slate-400 dark:text-slate-500">
          {hint}
        </span>
      )}
    </label>
  );
}

export function SubmitButton({
  pending,
  children,
}: {
  pending?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Aguarde…" : children}
    </button>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p
      role="alert"
      className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
    >
      {children}
    </p>
  );
}

export function AuthAltLink({
  prompt,
  href,
  label,
}: {
  prompt: string;
  href: string;
  label: string;
}) {
  return (
    <p className="text-center text-sm text-slate-500 dark:text-slate-400">
      {prompt}{" "}
      <Link
        href={href}
        className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
      >
        {label}
      </Link>
    </p>
  );
}
