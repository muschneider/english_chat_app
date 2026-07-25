import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthShell } from "@/components/auth/AuthShell";
import { ForgotForm } from "@/components/auth/ForgotForm";

export const dynamic = "force-dynamic";

export default async function ForgotPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "admin" || user.status === "approved" ? "/app" : "/pending");
  }
  return (
    <AuthShell
      title="Esqueci minha senha"
      subtitle="Informe seu e-mail e enviaremos um link para redefinir"
    >
      <ForgotForm />
    </AuthShell>
  );
}
