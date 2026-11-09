// Cria (ou atualiza a senha de) um usuário.
// Uso: npm run usuario:criar -- email@exemplo.com "Nome" "senha"
import "dotenv/config";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../src/generated/prisma/client";
import { gerarHashSenha } from "../src/lib/senha";
import { loginSchema } from "../src/lib/validations/login";

// Usa só o DATABASE_URL (não o getEnv), para não exigir as demais variáveis.
const db = new PrismaClient({
  adapter: new PrismaNeon({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const [email, nome, senha, perfilTexto] = process.argv.slice(2);
  if (!email || !nome || !senha) {
    console.error('Uso: npm run usuario:criar -- email "Nome" "senha" [admin|producao]');
    process.exit(1);
  }

  // admin = financeiro, acesso total (padrão ao criar). producao = gestor de
  // produção, só /producao. Sem o 4º argumento, um usuário existente mantém o perfil.
  const perfis = { admin: "ADMIN", producao: "PRODUCAO" } as const;
  const perfil = perfilTexto
    ? perfis[perfilTexto.toLowerCase() as keyof typeof perfis]
    : undefined;
  if (perfilTexto && !perfil) {
    console.error('Perfil inválido. Use "admin" ou "producao".');
    process.exit(1);
  }

  const dados = loginSchema.parse({ email, senha });
  if (senha.length < 8) {
    console.error("A senha deve ter pelo menos 8 caracteres.");
    process.exit(1);
  }

  const senhaHash = await gerarHashSenha(senha);
  await db.usuario.upsert({
    where: { email: dados.email },
    create: { email: dados.email, nome, senhaHash, perfil: perfil ?? "ADMIN" },
    update: { nome, senhaHash, ...(perfil && { perfil }) },
  });
  console.log(`Usuário ${dados.email} salvo${perfil ? ` (perfil ${perfil})` : ""}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
