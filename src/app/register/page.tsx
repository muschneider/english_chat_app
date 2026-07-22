import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthShell } from "@/components/auth/AuthShell";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const dynamic = "force-dynamic";

export default async function RegisterPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "admin" || user.status === "approved" ? "/app" : "/pending");
  }
  return (
    <AuthShell
      title="Criar conta"
      subtitle="Cadastre-se — um admin precisa liberar seu acesso"
    >
      <RegisterForm />
    </AuthShell>
  );
}
