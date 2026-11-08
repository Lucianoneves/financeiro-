// Limite de tentativas de login por e-mail. O Auth.js não limita sozinho, e
// sem isso dá para testar senhas sem parar. Só falhas contam; o login correto
// zera o contador. O estado fica no banco porque o app roda em instâncias
// serverless, onde memória não é compartilhada.

export const MAX_FALHAS = 5;
export const JANELA_MS = 15 * 60 * 1000;

// Funções puras: usadas pelo servidor e nos testes.
export function bloqueado(falhasNaJanela: number) {
  return falhasNaJanela >= MAX_FALHAS;
}

export function inicioDaJanela(agora: number) {
  return new Date(agora - JANELA_MS);
}

// Acesso ao banco com import dinâmico, pelo mesmo motivo de src/lib/auth.ts:
// o build do Next não deve exigir as variáveis de ambiente.
async function db() {
  const { getDb } = await import("@/lib/db");
  return getDb();
}

export async function loginBloqueado(email: string, agora = Date.now()) {
  try {
    const falhas = await (await db()).tentativaLogin.count({
      where: { email, criadoEm: { gte: inicioDaJanela(agora) } },
    });
    return bloqueado(falhas);
  } catch (e) {
    // Se a tabela não existe ou o banco falha, não impede o login de quem
    // acerta a senha. O erro fica no log para ser corrigido.
    console.error("Falha ao consultar o limite de login", e);
    return false;
  }
}

export async function registrarFalhaDeLogin(email: string, agora = Date.now()) {
  try {
    const banco = await db();
    await banco.tentativaLogin.create({ data: { email } });
    // Limpeza oportunista: registros fora da janela não servem mais.
    await banco.tentativaLogin.deleteMany({
      where: { criadoEm: { lt: inicioDaJanela(agora) } },
    });
  } catch (e) {
    console.error("Falha ao registrar tentativa de login", e);
  }
}

export async function zerarFalhasDeLogin(email: string) {
  try {
    await (await db()).tentativaLogin.deleteMany({ where: { email } });
  } catch (e) {
    console.error("Falha ao limpar tentativas de login", e);
  }
}
