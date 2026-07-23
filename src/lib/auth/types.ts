/** Shape returned by the auth server actions to drive `useActionState`. */
export type AuthFormState = { error: string } | null;

/**
 * Minimal, serializable user passed from Server Components to the client
 * ChatApp. Never includes the password hash. (Unions kept inline so this file
 * stays free of server-only imports and is safe in client bundles.)
 */
export type AppUser = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  theme: "light" | "dark";
  englishLevel: "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
};
