import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";
import { getDatabaseUrl } from "@/lib/env";

// O singleton fica em `globalThis` em qualquer ambiente: em desenvolvimento
// evita uma nova conexão a cada reload do Next; em produção evita criar um
// pool novo a cada chamada.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
  const adapter = new PrismaNeon({ connectionString: getDatabaseUrl() });
  return new PrismaClient({ adapter });
}

// Criação lazy: importar este módulo não exige as variáveis de ambiente, então
// o `next build` funciona sem segredos. O cliente só nasce no primeiro uso.
export function getDb(): PrismaClient {
  return (globalForPrisma.prisma ??= createPrismaClient());
}
