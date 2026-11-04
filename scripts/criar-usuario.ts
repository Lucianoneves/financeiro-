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
  const [email, nome, senha] = process.argv.slice(2);
  if (!email || !nome || !senha) {
    console.error('Uso: npm run usuario:criar -- email "Nome" "senha"');
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
    create: { email: dados.email, nome, senhaHash },
    update: { nome, senhaHash },
  });
  console.log(`Usuário ${dados.email} salvo.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
