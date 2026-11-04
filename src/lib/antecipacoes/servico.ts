import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/lib/db";
import { ErroNegocio, verificarPodeAntecipar } from "./regras";
import { valorLiquido, type AntecipacaoInput } from "@/lib/validations/antecipacao";

// Registra a antecipação numa transação. O líquido é calculado aqui, no servidor.
// O índice único parcial do banco garante uma ATIVA por título mesmo sob concorrência.
export async function registrarAntecipacao(dados: AntecipacaoInput) {
  try {
    return await getDb().$transaction(async (tx) => {
      const titulo = await tx.titulo.findUnique({
        where: { id: dados.tituloId },
        include: { antecipacoes: { where: { status: "ATIVA" }, select: { id: true } } },
      });
      if (!titulo) throw new ErroNegocio("Título não encontrado.");

      const conta = await tx.contaBancaria.findUnique({ where: { id: dados.contaId } });
      if (!conta) throw new ErroNegocio("Conta bancária não encontrada.");

      verificarPodeAntecipar(
        { baixadoEm: titulo.baixadoEm, valor: titulo.valor.toFixed(2) },
        titulo.antecipacoes.length,
        dados.valorBruto,
      );

      return tx.antecipacao.create({
        data: {
          tituloId: dados.tituloId,
          contaId: dados.contaId,
          valorBruto: dados.valorBruto,
          juros: dados.jurosCobrados,
          tarifas: dados.tarifasCobradas,
          valorLiquido: valorLiquido(dados),
          dataAntecipacao: new Date(`${dados.dataAntecipacao}T00:00:00.000Z`),
        },
      });
    });
  } catch (e) {
    // Corrida entre duas requisições: o índice único parcial barrou a segunda.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new ErroNegocio("Este título já tem uma antecipação ativa.");
    }
    throw e;
  }
}

// O cancelamento é um update condicional: duas requisições simultâneas não
// cancelam duas vezes. Contra uma baixa concorrente a garantia é de melhor
// esforço (o filtro lê o título sem travá-lo); como a baixa tem prioridade
// no estado do título, o pior caso é uma antecipação cancelada no histórico.
export async function cancelarAntecipacao(id: string) {
  const db = getDb();
  const { count } = await db.antecipacao.updateMany({
    where: { id, status: "ATIVA", titulo: { baixadoEm: null } },
    data: { status: "CANCELADA" },
  });
  if (count === 1) return;

  // Nada foi alterado: descobre o motivo só para devolver uma mensagem clara.
  const antecipacao = await db.antecipacao.findUnique({
    where: { id },
    include: { titulo: { select: { baixadoEm: true } } },
  });
  if (!antecipacao) throw new ErroNegocio("Antecipação não encontrada.");
  if (antecipacao.status === "CANCELADA") {
    throw new ErroNegocio("Esta antecipação já está cancelada.");
  }
  if (antecipacao.titulo.baixadoEm) {
    throw new ErroNegocio("Não é possível cancelar a antecipação de um título já baixado.");
  }
  throw new ErroNegocio("O estado da antecipação mudou. Recarregue a página e tente de novo.");
}
