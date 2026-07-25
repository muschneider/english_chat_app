import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/session";
import { findValidPasswordResetToken } from "@/lib/auth/reset";
import { AuthShell } from "@/components/auth/AuthShell";
import { ResetForm } from "@/components/auth/ResetForm";
import { ErrorNote } from "@/components/auth/AuthShell";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ token?: string | string[] }>;

export default async function ResetPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "admin" || user.status === "approved" ? "/app" : "/pending");
  }

  const params = await searchParams;
  const rawToken = Array.isArray(params.token) ? params.token[0] : params.token;
  const token = rawToken?.trim() ?? "";

  if (!token) {
    return (
      <AuthShell
        title="Redefinir senha"
        subtitle="O link parece estar incompleto"
      >
        <ErrorNote>Link inválido. Solicite um novo abaixo.</ErrorNote>
        <div className="mt-4 text-center text-sm">
          <Link
            href="/forgot"
            className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Pedir um novo link
          </Link>
        </div>
      </AuthShell>
    );
  }

  const valid = await findValidPasswordResetToken(token);
  if (!valid) {
    return (
      <AuthShell
        title="Redefinir senha"
        subtitle="Este link não pode mais ser usado"
      >
        <ErrorNote>
          Link inválido, expirado ou já utilizado. Solicite um novo abaixo.
        </ErrorNote>
        <div className="mt-4 text-center text-sm">
          <Link
            href="/forgot"
            className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Pedir um novo link
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Definir nova senha"
      subtitle="Escolha uma senha com ao menos 8 caracteres"
    >
      <ResetForm token={token} />
    </AuthShell>
  );
}
