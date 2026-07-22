"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/types";
import { AuthAltLink, ErrorNote, Field, SubmitButton } from "./AuthShell";

export function LoginForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    loginAction,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <Field
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        placeholder="voce@exemplo.com"
        required
      />
      <Field
        label="Senha"
        name="password"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        required
      />
      {state?.error && <ErrorNote>{state.error}</ErrorNote>}
      <SubmitButton pending={pending}>Entrar</SubmitButton>
      <AuthAltLink prompt="Ainda não tem conta?" href="/register" label="Cadastre-se" />
    </form>
  );
}
