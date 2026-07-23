import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { userMemories } from "@/lib/db/schema";
import type { MemoryCategory, UserMemoryRow } from "@/lib/db/schema";
import { requireUser } from "@/lib/auth/session";
import { forgetMemoryAction, logoutAction } from "@/lib/auth/actions";
import { LevelSettingsForm } from "@/components/LevelSettingsForm";

export const dynamic = "force-dynamic";

const CATEGORY_LABEL: Record<MemoryCategory, string> = {
  personal: "Pessoal",
  family: "Família",
  work: "Trabalho",
  education: "Educação",
  preferences: "Preferências",
  goals: "Objetivos",
  health: "Saúde",
  other: "Outros",
};

export default async function SettingsPage() {
  const user = await requireUser();
  const memories: UserMemoryRow[] = await db
    .select()
    .from(userMemories)
    .where(eq(userMemories.userId, user.id))
    .orderBy(desc(userMemories.updatedAt));

  return (
    <main className="mx-auto min-h-[100dvh] max-w-2xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Configurações
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {user.name} · {user.email}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/app"
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            ← Ir ao tutor
          </Link>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Sair
            </button>
          </form>
        </div>
      </header>

      {/* English level */}
      <section className="mb-8 rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Nível de inglês
        </h2>
        <LevelSettingsForm initialLevel={user.englishLevel} />
      </section>

      {/* Memory */}
      <section className="rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          O que o tutor lembra sobre você
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          O tutor guarda fatos duráveis que você conta (família, trabalho,
          objetivos…) para lembrar de você em conversas futuras. Você pode apagar
          qualquer um.
        </p>

        {memories.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-slate-300 bg-white/50 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500">
            Nada guardado ainda. Conforme você conversa, o tutor vai te conhecendo.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {memories.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">
                    {m.fact}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
                    {CATEGORY_LABEL[m.category]}
                  </p>
                </div>
                <form action={forgetMemoryAction} className="shrink-0">
                  <input type="hidden" name="memoryId" value={m.id} />
                  <button
                    type="submit"
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-rose-50 hover:text-rose-600 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                  >
                    Esquecer
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-500">
        English Conversation Tutor
      </p>
    </main>
  );
}
