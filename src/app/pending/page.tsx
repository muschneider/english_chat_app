import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { logoutAction } from "@/lib/auth/actions";
import { AuthShell } from "@/components/auth/AuthShell";

export const dynamic = "force-dynamic";

export default async function PendingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin" || user.status === "approved") redirect("/");

  const rejected = user.status === "rejected";

  return (
    <AuthShell
      title={rejected ? "Acesso não liberado" : "Conta em análise"}
      subtitle={user.email}
    >
      <div className="space-y-4">
        <div
          className={
            rejected
              ? "rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300"
              : "rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
          }
        >
          {rejected ? (
            <p>
              Seu acesso não foi aprovado. Se você acredita que isto é um engano,
              fale com o administrador.
            </p>
          ) : (
            <p>
              Olá, <strong>{user.name}</strong>! Sua conta foi criada e está
              aguardando aprovação de um administrador. Você poderá acessar o
              tutor assim que for liberado.
            </p>
          )}
        </div>

        <form action={logoutAction}>
          <button
            type="submit"
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Sair
          </button>
        </form>
      </div>
    </AuthShell>
  );
}
