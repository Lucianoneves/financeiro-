import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.url(),
  AUTH_SECRET: z.string().min(32),
  GESTAOCLICK_API_URL: z.url().default("https://api.gestaoclick.com"),
  GESTAOCLICK_ACCESS_TOKEN: z.string().min(1),
  GESTAOCLICK_SECRET_ACCESS_TOKEN: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

// Valida só quando usado, para o build do Next não exigir as variáveis.
export function getEnv(): Env {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}
