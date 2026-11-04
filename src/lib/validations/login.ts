import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("E-mail inválido").transform((e) => e.toLowerCase()),
  senha: z.string().min(1, "Informe a senha"),
});
