"use client";

import { useActionState } from "react";
import Link from "next/link";
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
      <div>
        <Field
          label="Senha"
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          required
        />
        <div className="mt-1.5 text-right">
          <Link
            href="/forgot"
            className="text-xs font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
          >
            Esqueci minha senha
          </Link>
        </div>
      </div>
      {state?.error && <ErrorNote>{state.error}</ErrorNote>}
      <SubmitButton pending={pending}>Entrar</SubmitButton>
      <AuthAltLink prompt="Ainda não tem conta?" href="/register" label="Cadastre-se" />
    </form>
  );
}
