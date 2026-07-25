"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction } from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/types";
import { AuthAltLink, ErrorNote, Field, SubmitButton } from "./AuthShell";

export function ForgotForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    forgotPasswordAction,
    null,
  );

  if (state?.success) {
    return (
      <div className="space-y-4">
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {state.success}
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Verifique sua caixa de entrada (e o spam). O link expira em 1 hora.
        </p>
        <AuthAltLink prompt="Lembrou da senha?" href="/login" label="Voltar para entrar" />
      </div>
    );
  }

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
      {state?.error && <ErrorNote>{state.error}</ErrorNote>}
      <SubmitButton pending={pending}>Enviar link de redefinição</SubmitButton>
      <div className="flex items-center justify-between text-sm">
        <Link
          href="/login"
          className="font-semibold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
        >
          ← Voltar
        </Link>
        <Link
          href="/register"
          className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Criar conta
        </Link>
      </div>
    </form>
  );
}
