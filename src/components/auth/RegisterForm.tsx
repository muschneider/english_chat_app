"use client";

import { useActionState } from "react";
import { registerAction } from "@/lib/auth/actions";
import type { AuthFormState } from "@/lib/auth/types";
import { AuthAltLink, ErrorNote, Field, SubmitButton } from "./AuthShell";

export function RegisterForm() {
  const [state, action, pending] = useActionState<AuthFormState, FormData>(
    registerAction,
    null,
  );

  return (
    <form action={action} className="space-y-4">
      <Field
        label="Nome"
        name="name"
        autoComplete="name"
        placeholder="Seu nome"
        required
      />
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
        autoComplete="new-password"
        placeholder="Mínimo de 8 caracteres"
        required
      />
      {state?.error && <ErrorNote>{state.error}</ErrorNote>}
      <SubmitButton pending={pending}>Criar conta</SubmitButton>
      <AuthAltLink prompt="Já tem conta?" href="/login" label="Entrar" />
    </form>
  );
}
