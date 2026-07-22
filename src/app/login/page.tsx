import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { AuthShell } from "@/components/auth/AuthShell";
import { LoginForm } from "@/components/auth/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "admin" || user.status === "approved" ? "/app" : "/pending");
  }
  return (
    <AuthShell title="Entrar" subtitle="Acesse sua conta para praticar inglês">
      <LoginForm />
    </AuthShell>
  );
}
