import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import type { UserRow, UserStatus } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/session";
import {
  approveUserAction,
  logoutAction,
  rejectUserAction,
} from "@/lib/auth/actions";

export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<UserStatus, string> = {
  pending:
    "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900/60",
  approved:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900/60",
  rejected:
    "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900/60",
};

const STATUS_LABEL: Record<UserStatus, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Rejeitado",
};

function StatusBadge({ status }: { status: UserStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${STATUS_BADGE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function ApproveButton({ userId }: { userId: string }) {
  return (
    <form action={approveUserAction} className="inline">
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700"
      >
        Aprovar
      </button>
    </form>
  );
}

function RejectButton({ userId }: { userId: string }) {
  return (
    <form action={rejectUserAction} className="inline">
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
      >
        Rejeitar
      </button>
    </form>
  );
}

export default async function AdminPage() {
  const admin = await requireAdmin();
  const all: UserRow[] = await db
    .select()
    .from(users)
    .orderBy(desc(users.createdAt));

  const pending = all.filter((u) => u.status === "pending");

  return (
    <main className="mx-auto min-h-[100dvh] max-w-4xl px-4 py-8">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">
            Administração
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Aprove ou rejeite o acesso dos usuários.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/"
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

      {/* Pending queue */}
      <section className="mb-8">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Aguardando aprovação
          {pending.length > 0 && (
            <span className="rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">
              {pending.length}
            </span>
          )}
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-300 bg-white/50 px-4 py-6 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-500">
            Nenhum usuário pendente. 🎉
          </p>
        ) : (
          <ul className="space-y-2">
            {pending.map((u) => (
              <li
                key={u.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
                    {u.name}
                  </p>
                  <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                    {u.email}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ApproveButton userId={u.id} />
                  <RejectButton userId={u.id} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* All users */}
      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          Todos os usuários ({all.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Usuário</th>
                <th className="px-4 py-2.5 font-semibold">Papel</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {all.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800 dark:text-slate-100">
                      {u.name}
                      {u.id === admin.id && (
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          (você)
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {u.email}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-slate-600 dark:text-slate-300">
                      {u.role === "admin" ? "Admin" : "Usuário"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={u.status} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      {u.status !== "approved" && <ApproveButton userId={u.id} />}
                      {u.status !== "rejected" && u.id !== admin.id && (
                        <RejectButton userId={u.id} />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
