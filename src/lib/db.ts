import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";
import { getEnv } from "@/lib/env";

// Em desenvolvimento, o Next recarrega módulos a cada alteração. O singleton
// evita abrir uma nova conexão a cada reload.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: getEnv().DATABASE_URL });
  return new PrismaClient({ adapter });
}

// Criação lazy: importar este módulo não exige as variáveis de ambiente, então
// o `next build` funciona sem segredos. O cliente só nasce no primeiro uso.
export function getDb(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const client = createPrismaClient();
  if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = client;
  }
  return client;
}
