import { getDb } from "@/lib/db";
import type { ApontamentoInput } from "@/lib/validations/producao";
import { eSobreposicao, ErroProducao } from "./erros";
import { chaveDoNome } from "./nomes";
import { verificarApontamento } from "./regras";
import { diaDoHorarioLocal, formatarHorario, intervaloDe } from "./tempo";

// Registra o apontamento numa transação: confere máquina ativa, ordem aberta,
// velocidade nominal e paradas, e grava apontamento, paradas e perdas juntos.
// Turno, operador e motivos vêm como nome: se o cadastro não existe, é criado na
// hora (upsert pela chave normalizada). A velocidade nominal é copiada para o
// apontamento (histórico não muda se o cadastro for alterado). A restrição de
// exclusão do banco garante, mesmo sob concorrência, que a mesma máquina não
// tenha dois apontamentos sobrepostos.
export async function registrarApontamento(dados: ApontamentoInput, registradoPor: string) {
  const { inicio, fim, minutos } = intervaloDe(dados.inicio, dados.fim);
  const paradasMinutos = dados.paradas.reduce((s, p) => s + p.minutos, 0);

  try {
    return await getDb().$transaction(async (tx) => {
      const [ordem, maquina] = await Promise.all([
        tx.ordemProducao.findUnique({ where: { id: dados.ordemId } }),
        tx.maquina.findUnique({ where: { id: dados.maquinaId } }),
      ]);
      if (!ordem) throw new ErroProducao("Ordem de produção não encontrada.", "ordemId");
      if (!maquina?.ativo) throw new ErroProducao("Máquina não encontrada ou inativa.", "maquinaId");

      const velocidade = await tx.velocidadeNominal.findUnique({
        where: { maquinaId_produtoId: { maquinaId: maquina.id, produtoId: ordem.produtoId } },
      });

      verificarApontamento({
        ordemAberta: ordem.status === "ABERTA",
        velocidadeNominal: velocidade?.pecasPorHora ?? null,
        duracaoMinutos: minutos,
        paradasMinutos,
        quantidadeBoa: dados.quantidadeBoa,
        perdasQuantidade: dados.perdas.reduce((s, p) => s + p.quantidade, 0),
      });

      // Cadastros por nome: cada chave normalizada vira um registro (upsert não
      // falha por unicidade, o que abortaria a transação do Postgres).
      const cadastrar = (nome: string) => ({
        where: { nomeNormalizado: chaveDoNome(nome) },
        create: { nome, nomeNormalizado: chaveDoNome(nome) },
        update: { ativo: true },
      });
      const turno = await tx.turno.upsert(cadastrar(dados.turno));
      // Operador não usa upsert: o código sequencial (autoincrement) seria gasto a
      // cada apontamento, mesmo com o operador já cadastrado. Só cria se não existe.
      const chaveOperador = chaveDoNome(dados.operador);
      let operador = await tx.operador.findUnique({ where: { nomeNormalizado: chaveOperador } });
      if (!operador) {
        operador = await tx.operador.create({
          data: { nome: dados.operador, nomeNormalizado: chaveOperador },
        });
      } else if (!operador.ativo) {
        operador = await tx.operador.update({ where: { id: operador.id }, data: { ativo: true } });
      }

      const motivosParada = new Map<string, string>();
      for (const p of dados.paradas) {
        const chave = chaveDoNome(p.motivo);
        if (!motivosParada.has(chave)) {
          motivosParada.set(chave, (await tx.motivoParada.upsert(cadastrar(p.motivo))).id);
        }
      }
      const motivosPerda = new Map<string, string>();
      for (const p of dados.perdas) {
        const chave = chaveDoNome(p.motivo);
        if (!motivosPerda.has(chave)) {
          motivosPerda.set(chave, (await tx.motivoPerda.upsert(cadastrar(p.motivo))).id);
        }
      }

      // Checagem amigável antes do banco: diz com qual apontamento conflita.
      const conflito = await tx.apontamentoProducao.findFirst({
        where: { maquinaId: maquina.id, inicio: { lt: fim }, fim: { gt: inicio } },
        select: { inicio: true, fim: true },
      });
      if (conflito) {
        throw new ErroProducao(
          `Esta máquina já tem apontamento de ${formatarHorario(conflito.inicio)} a ${formatarHorario(conflito.fim)}, que se sobrepõe a este período.`,
          "inicio",
        );
      }

      return tx.apontamentoProducao.create({
        data: {
          data: new Date(`${diaDoHorarioLocal(dados.inicio)}T00:00:00.000Z`),
          turnoId: turno.id,
          maquinaId: maquina.id,
          operadorId: operador.id,
          ordemId: ordem.id,
          inicio,
          fim,
          quantidadeBoa: dados.quantidadeBoa,
          velocidadeNominal: velocidade!.pecasPorHora,
          registradoPor,
          paradas: {
            create: dados.paradas.map((p) => ({
              motivoId: motivosParada.get(chaveDoNome(p.motivo))!,
              minutos: p.minutos,
            })),
          },
          perdas: {
            create: dados.perdas.map((p) => ({
              motivoId: motivosPerda.get(chaveDoNome(p.motivo))!,
              quantidade: p.quantidade,
            })),
          },
        },
      });
    });
  } catch (e) {
    // Corrida entre duas requisições: a restrição do banco barrou a segunda.
    if (eSobreposicao(e)) {
      throw new ErroProducao(
        "Esta máquina já tem um apontamento que se sobrepõe a este período.",
        "inicio",
      );
    }
    throw e;
  }
}

export async function excluirApontamento(id: string) {
  // Paradas e perdas saem junto (onDelete: Cascade).
  const { count } = await getDb().apontamentoProducao.deleteMany({ where: { id } });
  if (count === 0) throw new ErroProducao("Apontamento não encontrado.");
}

// Encerrar e reabrir são updates condicionais: duas requisições simultâneas
// não fazem a transição duas vezes.
export async function encerrarOrdem(id: string) {
  await mudarStatusDaOrdem(id, "ABERTA", "ENCERRADA", "Esta ordem já está encerrada.");
}

export async function reabrirOrdem(id: string) {
  await mudarStatusDaOrdem(id, "ENCERRADA", "ABERTA", "Esta ordem já está aberta.");
}

async function mudarStatusDaOrdem(
  id: string,
  de: "ABERTA" | "ENCERRADA",
  para: "ABERTA" | "ENCERRADA",
  jaNoEstado: string,
) {
  const db = getDb();
  const { count } = await db.ordemProducao.updateMany({
    where: { id, status: de },
    data: { status: para },
  });
  if (count === 1) return;
  const ordem = await db.ordemProducao.findUnique({ where: { id }, select: { status: true } });
  if (!ordem) throw new ErroProducao("Ordem de produção não encontrada.");
  throw new ErroProducao(jaNoEstado);
}
