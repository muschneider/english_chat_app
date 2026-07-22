import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Informe seu nome (mín. 2 caracteres).").max(80),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(255),
  password: z.string().min(8, "A senha precisa ter ao menos 8 caracteres.").max(200),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("E-mail inválido.").max(255),
  password: z.string().min(1, "Informe a senha.").max(200),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
