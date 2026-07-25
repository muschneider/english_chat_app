"use client";

import { useActionState } from "react";
import { changePasswordAction } from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/types";
import { ErrorNote, Field, SubmitButton } from "./AuthShell";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    changePasswordAction,
    null,
  );

  return (
    <form action={action} className="mt-4 space-y-4">
      <Field
        label="Senha atual"
        name="current"
        type="password"
        autoComplete="current-password"
        placeholder="••••••••"
        required
      />
      <Field
        label="Nova senha"
        name="password"
        type="password"
        autoComplete="new-password"
        placeholder="Mínimo de 8 caracteres"
        required
      />
      <Field
        label="Confirmar nova senha"
        name="confirm"
        type="password"
        autoComplete="new-password"
        placeholder="Digite novamente"
        required
      />
      {state?.error && <ErrorNote>{state.error}</ErrorNote>}
      {state?.success && (
        <p
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300"
        >
          {state.success}
        </p>
      )}
      <SubmitButton pending={pending}>Atualizar senha</SubmitButton>
    </form>
  );
}
