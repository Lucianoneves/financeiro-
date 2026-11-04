import { z } from "zod";

// Schemas separados: quem só precisa do banco (login, páginas, scripts) não
// deve falhar por falta das chaves do GestãoClick.
const dbSchema = z.object({
  DATABASE_URL: z.url(),
});

const gestaoClickSchema = z.object({
  GESTAOCLICK_API_URL: z.url().default("https://api.gestaoclick.com"),
  GESTAOCLICK_ACCESS_TOKEN: z.string().min(1),
  GESTAOCLICK_SECRET_ACCESS_TOKEN: z.string().min(1),
});

const envSchema = dbSchema.extend(gestaoClickSchema.shape).extend({
  AUTH_SECRET: z.string().min(32),
});

export type Env = z.infer<typeof envSchema>;
export type GestaoClickEnv = z.infer<typeof gestaoClickSchema>;

let cached: Env | undefined;
let cachedDb: z.infer<typeof dbSchema> | undefined;
let cachedGestaoClick: GestaoClickEnv | undefined;

// Valida só quando usado, para o build do Next não exigir as variáveis.
export function getEnv(): Env {
  if (!cached) {
    cached = envSchema.parse(process.env);
  }
  return cached;
}

// Apenas DATABASE_URL: usado pela conexão com o banco.
export function getDatabaseUrl(): string {
  if (!cachedDb) {
    cachedDb = dbSchema.parse(process.env);
  }
  return cachedDb.DATABASE_URL;
}

// Apenas as variáveis do GestãoClick: usado pelo cliente da API do ERP.
export function getGestaoClickEnv(): GestaoClickEnv {
  if (!cachedGestaoClick) {
    cachedGestaoClick = gestaoClickSchema.parse(process.env);
  }
  return cachedGestaoClick;
}
