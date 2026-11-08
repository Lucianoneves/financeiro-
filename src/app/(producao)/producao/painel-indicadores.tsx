import { connection } from "next/server";

import { getDb } from "@/lib/db";
import {
  relatorioDeProducao,
  type Indicadores,
  type LinhaDeIndicador,
  type LinhaDeMotivo,
} from "@/lib/producao/indicadores";
import {
  formatarMinutos,
  formatarNumero,
  formatarPercentual,
  rotuloDaMaquina,
  rotuloDoOperador,
} from "@/lib/producao/formato";
import { minutosEntre } from "@/lib/producao/tempo";
import { exigirSessaoProducao } from "@/lib/sessao";

// Indicadores de um período (dias de produção, inclusive). Usado no resumo do dia
// e na tela de indicadores. `resumido` mostra só os cartões e a tabela por máquina.
export async function PainelIndicadores({
  de,
  ate,
  resumido = false,
  turnoId,
}: {
  de: string;
  ate: string;
  resumido?: boolean;
  // Se informado, considera só os apontamentos desse turno (fechamento de turno).
  turnoId?: string;
}) {
  await connection(); // lê o banco a cada requisição, nunca no prerender
  await exigirSessaoProducao();

  const apontamentos = await getDb().apontamentoProducao.findMany({
    where: {
      data: {
        gte: new Date(`${de}T00:00:00.000Z`),
        lte: new Date(`${ate}T00:00:00.000Z`),
      },
      ...(turnoId ? { turnoId } : {}),
    },
    include: {
      maquina: { select: { codigo: true, nome: true } },
      operador: { select: { numero: true, nome: true } },
      ordem: { select: { produtoId: true, produto: { select: { nome: true } } } },
      paradas: { include: { motivo: { select: { nome: true } } } },
      perdas: { include: { motivo: { select: { nome: true } } } },
    },
  });

  const r = relatorioDeProducao(
    apontamentos.map((a) => ({
      maquinaId: a.maquinaId,
      maquinaNome: rotuloDaMaquina(a.maquina),
      operadorId: a.operadorId,
      operadorNome: rotuloDoOperador(a.operador),
      produtoId: a.ordem.produtoId,
      produtoNome: a.ordem.produto.nome,
      minutosPlanejados: minutosEntre(a.inicio, a.fim),
      quantidadeBoa: a.quantidadeBoa,
      velocidadeNominal: a.velocidadeNominal,
      paradas: a.paradas.map((p) => ({
        motivoId: p.motivoId,
        motivoNome: p.motivo.nome,
        minutos: p.minutos,
      })),
      perdas: a.perdas.map((p) => ({
        motivoId: p.motivoId,
        motivoNome: p.motivo.nome,
        quantidade: p.quantidade,
      })),
    })),
  );

  if (r.total.apontamentos === 0) return <p>Nenhum apontamento neste período.</p>;

  return (
    <>
      <Cartoes total={r.total} />
      <TabelaIndicadores titulo="Por máquina" primeiraColuna="Máquina" linhas={r.porMaquina} />
      {!resumido && (
        <>
          <TabelaIndicadores titulo="Por operador" primeiraColuna="Operador" linhas={r.porOperador} />
          <TabelaIndicadores titulo="Por produto" primeiraColuna="Produto" linhas={r.porProduto} />
          <TabelaMotivos titulo="Paradas por motivo" unidade="min" linhas={r.paradasPorMotivo} baseRotulo="do tempo planejado" />
          <TabelaMotivos titulo="Perdas por motivo" unidade="peças" linhas={r.perdasPorMotivo} baseRotulo="das peças produzidas" />
        </>
      )}
    </>
  );
}

function Cartoes({ total }: { total: Indicadores }) {
  return (
    <section aria-label="Totais do período" className="grid max-w-5xl gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Cartao rotulo="OEE" valor={formatarPercentual(total.oee)} destaque />
      <Cartao rotulo="Disponibilidade" valor={formatarPercentual(total.disponibilidade)} nota={`${formatarMinutos(total.minutosOperando)} operando`} />
      <Cartao rotulo="Desempenho" valor={formatarPercentual(total.desempenho)} />
      <Cartao rotulo="Qualidade" valor={formatarPercentual(total.qualidade)} />
      <Cartao rotulo="Peças boas" valor={formatarNumero(total.pecasBoas)} nota={`${formatarNumero(total.pecasProduzidas)} produzidas`} />
      <Cartao rotulo="Perdas" valor={formatarNumero(total.pecasPerdidas)} nota={`${formatarPercentual(total.indicePerdas)} das produzidas`} />
    </section>
  );
}

function Cartao({ rotulo, valor, nota, destaque }: { rotulo: string; valor: string; nota?: string; destaque?: boolean }) {
  return (
    <div className={`rounded-md border p-3 ${destaque ? "border-amber-500 dark:border-amber-400" : "border-zinc-200 dark:border-zinc-800"}`}>
      <p className="text-xs text-zinc-500">{rotulo}</p>
      <p className="text-lg font-semibold">{valor}</p>
      {nota && <p className="text-xs text-zinc-500">{nota}</p>}
    </div>
  );
}

function TabelaIndicadores({ titulo, primeiraColuna, linhas }: { titulo: string; primeiraColuna: string; linhas: LinhaDeIndicador[] }) {
  return (
    <section className="flex flex-col gap-2 overflow-x-auto">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <table className="w-full max-w-6xl text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2">{primeiraColuna}</th>
            <th>OEE</th>
            <th>Disponib.</th>
            <th>Desempenho</th>
            <th>Qualidade</th>
            <th>Boas</th>
            <th>Perdas</th>
            <th>% perdas</th>
            <th>Parado</th>
            <th>Peças boas/h</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.chave} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">{l.rotulo}</td>
              <td className="font-medium">{formatarPercentual(l.oee)}</td>
              <td>{formatarPercentual(l.disponibilidade)}</td>
              <td>
                {formatarPercentual(l.desempenho)}
                {l.desempenho !== null && l.desempenho > 1 && (
                  <span title="Acima de 100%: confira a velocidade nominal cadastrada" className="ml-1 text-amber-600">
                    ⚠
                  </span>
                )}
              </td>
              <td>{formatarPercentual(l.qualidade)}</td>
              <td>{formatarNumero(l.pecasBoas)}</td>
              <td>{formatarNumero(l.pecasPerdidas)}</td>
              <td>{formatarPercentual(l.indicePerdas)}</td>
              <td>{formatarMinutos(l.minutosParados)}</td>
              <td>{formatarNumero(l.produtividade, 1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function TabelaMotivos({ titulo, unidade, linhas, baseRotulo }: { titulo: string; unidade: string; linhas: LinhaDeMotivo[]; baseRotulo: string }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {linhas.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhum registro no período.</p>
      ) : (
        <table className="w-full max-w-xl text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2">Motivo</th>
              <th>Total ({unidade})</th>
              <th>% {baseRotulo}</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.chave} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2">{l.rotulo}</td>
                <td>{formatarNumero(l.quantidade)}</td>
                <td>{formatarPercentual(l.participacao)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
