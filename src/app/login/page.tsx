import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ reset?: string | string[] }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "admin" || user.status === "approved" ? "/app" : "/pending");
  }
  const params = await searchParams;
  const justReset = Array.isArray(params.reset)
    ? params.reset[0] === "1"
    : params.reset === "1";

  return (
    <AuthShell title="Entrar" subtitle="Acesse sua conta para praticar inglês">
      {justReset && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          Senha redefinida com sucesso. Entre com a nova senha.
        </p>
      )}
      <LoginForm />
    </AuthShell>
  );
}
