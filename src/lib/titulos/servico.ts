import { getDb } from "@/lib/db";
import { ErroNegocio } from "@/lib/antecipacoes/regras";

// "Cliente pagou": quitação sem entrada de caixa. Só marca o título como baixado;
// não mexe em antecipações, juros, tarifas nem no total recebido.
// O update condicional (baixadoEm: null) é atômico: duas baixas simultâneas
// não se atropelam e a segunda recebe a mensagem de "já baixado".
export async function baixarTitulo(id: string) {
  const db = getDb();
  const { count } = await db.titulo.updateMany({
    where: { id, baixadoEm: null },
    data: { baixadoEm: new Date() },
  });
  if (count === 1) return;

  const existe = await db.titulo.findUnique({ where: { id }, select: { id: true } });
  if (!existe) throw new ErroNegocio("Título não encontrado.");
  throw new ErroNegocio("Este título já foi baixado.");
}
