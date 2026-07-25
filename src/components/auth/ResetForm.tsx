"use client";

import { useActionState } from "react";
import { resetPasswordAction } from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/types";
import { ErrorNote, Field, SubmitButton } from "./AuthShell";

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    resetPasswordAction,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
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
      <SubmitButton pending={pending}>Redefinir senha</SubmitButton>
    </form>
  );
}
