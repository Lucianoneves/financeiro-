import { getDb } from "@/lib/db";
import { ErroNegocio } from "@/lib/antecipacoes/regras";
import { GestaoClickError } from "./client";
import { planejarSincronizacao } from "./plano";
import {
  listarRecebimentos,
  recebimentoParaTitulo,
  type TituloDoErp,
} from "./recebimentos";

export type RelatorioSincronizacao = {
  criados: number;
  atualizados: number;
  ignoradosInvalidos: number;
  valorDivergente: number;
  naoVerificados: number;
};

// Quantos títulos em aberto que sumiram da janela são consultados um a um.
const MAXIMO_CONSULTAS_INDIVIDUAIS = 50;

function converter(recebimentos: Awaited<ReturnType<typeof listarRecebimentos>>) {
  const titulos: TituloDoErp[] = [];
  let invalidos = 0;
  for (const r of recebimentos) {
    const c = recebimentoParaTitulo(r);
    if ("titulo" in c) titulos.push(c.titulo);
    else invalidos += 1;
  }
  return { titulos, invalidos };
}

async function lerDoErp<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof GestaoClickError) {
      if (e.status === 401 || e.status === 403) {
        throw new ErroNegocio("O GestãoClick recusou as chaves de acesso. Confira as chaves no ambiente.");
      }
      throw new ErroNegocio(`O GestãoClick respondeu com erro ${e.status}. Tente de novo em instantes.`);
    }
    throw e;
  }
}

// Sincronização SOMENTE LEITURA do ERP: nada é escrito no GestãoClick.
// A baixa do ERP não é importada (ela marca o pagamento da antecipação pelo
// banco, não o do cliente): só "Cliente pagou" baixa um título aqui.
// A janela vale para a data de fluxo do ERP (vencimento; data da baixa quando
// já baixado). Títulos em aberto que saíram da janela são conferidos pelo
// código, que o ERP busca ignorando o período.
export async function sincronizarTitulos(janela: {
  dataInicio: string;
  dataFim: string;
}): Promise<RelatorioSincronizacao> {
  const db = getDb();

  const daJanela = await lerDoErp(() => listarRecebimentos(janela));
  const { titulos: remotos, invalidos } = converter(daJanela);
  const idsRemotos = new Set(remotos.map((r) => r.idExterno));

  const locaisBanco = await db.titulo.findMany({
    where: {
      origem: "GESTAOCLICK",
      OR: [{ idExterno: { in: [...idsRemotos] } }, { baixadoEm: null }],
    },
    include: { antecipacoes: { where: { status: "ATIVA" }, select: { id: true } } },
  });

  // Em aberto aqui, mas fora da janela: a data de fluxo do ERP pode ter mudado
  // (vencimento alterado, ou baixa no ERP), então consulta pelo código.
  const sumidos = locaisBanco.filter(
    (l) => !l.baixadoEm && l.idExterno && !idsRemotos.has(l.idExterno),
  );
  const consultar = sumidos.slice(0, MAXIMO_CONSULTAS_INDIVIDUAIS);
  let invalidosExtras = 0;
  for (const l of consultar) {
    const achados = await lerDoErp(() => listarRecebimentos({ codigo: l.numero }));
    const { titulos, invalidos: inv } = converter(achados);
    invalidosExtras += inv;
    const igual = titulos.find((t) => t.idExterno === l.idExterno);
    if (igual) remotos.push(igual);
  }

  const plano = planejarSincronizacao(
    remotos,
    locaisBanco.map((l) => ({
      id: l.id,
      idExterno: l.idExterno!,
      numero: l.numero,
      cliente: l.cliente,
      valor: l.valor.toFixed(2),
      vencimento: l.vencimento,
      temAntecipacaoAtiva: l.antecipacoes.length > 0,
    })),
  );

  await db.$transaction([
    db.titulo.createMany({
      data: plano.criar.map((t) => ({
        numero: t.numero,
        cliente: t.cliente,
        valor: t.valor,
        vencimento: t.vencimento,
        origem: "GESTAOCLICK" as const,
        idExterno: t.idExterno,
      })),
      skipDuplicates: true,
    }),
    ...plano.atualizar.map((a) => db.titulo.update({ where: { id: a.id }, data: a.dados })),
  ]);

  return {
    criados: plano.criar.length,
    atualizados: plano.atualizar.length,
    ignoradosInvalidos: invalidos + invalidosExtras,
    valorDivergente: plano.valorDivergente,
    naoVerificados: sumidos.length - consultar.length,
  };
}
