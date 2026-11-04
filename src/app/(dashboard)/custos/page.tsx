import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";

import {
  custoEmCentesimosDePercentual,
  relatorioDeCustos,
  type LinhaDeCusto,
} from "@/lib/antecipacoes/custos";
import { getDb } from "@/lib/db";
import { deCentavos } from "@/lib/dinheiro";
import { exigirSessao } from "@/lib/sessao";

type SearchParams = Promise<{ [chave: string]: string | string[] | undefined }>;

const data = z.iso.date();

export default function CustosPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Custo financeiro</h1>
      <p className="max-w-3xl text-zinc-600 dark:text-zinc-400">
        Juros e tarifas das antecipações ativas, pela data da antecipação. Antecipações
        canceladas não entram, e a baixa do título não altera estes números.
      </p>
      <Suspense fallback={<p>Carregando...</p>}>
        <Relatorio searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function primeiroValor(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function formatarPercentual(linha: LinhaDeCusto) {
  const c = custoEmCentesimosDePercentual(linha);
  if (c === null) return "—";
  return `${(Number(c) / 100).toFixed(2).replace(".", ",")}%`;
}

async function Relatorio({ searchParams }: { searchParams: SearchParams }) {
  await connection(); // a data de hoje e o banco só existem em tempo de requisição
  await exigirSessao();

  const hoje = new Date().toISOString().slice(0, 10);
  const params = await searchParams;
  const padraoDe = `${hoje.slice(0, 4)}-01-01`;
  // Valor inválido ou intervalo invertido volta ao padrão em vez de dar erro.
  let de = data.safeParse(primeiroValor(params.de)).data ?? padraoDe;
  let ate = data.safeParse(primeiroValor(params.ate)).data ?? hoje;
  if (de > ate) [de, ate] = [padraoDe, hoje];

  const antecipacoes = await getDb().antecipacao.findMany({
    where: {
      status: "ATIVA",
      dataAntecipacao: {
        gte: new Date(`${de}T00:00:00.000Z`),
        lte: new Date(`${ate}T00:00:00.000Z`),
      },
    },
    include: { conta: { select: { nome: true } } },
  });

  const r = relatorioDeCustos(
    antecipacoes.map((a) => ({
      status: a.status,
      dataAntecipacao: a.dataAntecipacao,
      contaId: a.contaId,
      contaNome: a.conta.nome,
      valorBruto: a.valorBruto.toFixed(2),
      juros: a.juros.toFixed(2),
      tarifas: a.tarifas.toFixed(2),
      valorLiquido: a.valorLiquido.toFixed(2),
    })),
  );

  return (
    <>
      <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          De
          <input type="date" name="de" defaultValue={de} className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" />
        </label>
        <label className="flex flex-col gap-1">
          Até
          <input type="date" name="ate" defaultValue={ate} className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700" />
        </label>
        <button type="submit" className="rounded-md border border-zinc-300 px-4 py-2 dark:border-zinc-700">
          Filtrar
        </button>
      </form>

      <section aria-label="Totais do período" className="grid max-w-4xl gap-3 sm:grid-cols-4">
        <Cartao rotulo="Antecipado (bruto)" valor={`R$ ${deCentavos(r.total.brutoCentavos)}`} nota={`${r.total.quantidade} antecipação(ões)`} />
        <Cartao rotulo="Juros" valor={`R$ ${deCentavos(r.total.jurosCentavos)}`} />
        <Cartao rotulo="Tarifas" valor={`R$ ${deCentavos(r.total.tarifasCentavos)}`} />
        <Cartao rotulo="Custo total" valor={`R$ ${deCentavos(r.total.custoCentavos)}`} nota={`${formatarPercentual(r.total)} do bruto`} destaque />
      </section>

      {r.total.quantidade === 0 ? (
        <p>Nenhuma antecipação ativa neste período.</p>
      ) : (
        <>
          <Tabela titulo="Por banco" primeiraColuna="Conta" linhas={r.porConta} />
          <Tabela titulo="Por mês" primeiraColuna="Mês" linhas={r.porMes} />
        </>
      )}
    </>
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

function Tabela({ titulo, primeiraColuna, linhas }: { titulo: string; primeiraColuna: string; linhas: LinhaDeCusto[] }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      <table className="w-full max-w-5xl text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-200 dark:border-zinc-800">
            <th className="py-2">{primeiraColuna}</th>
            <th>Qtd.</th>
            <th>Bruto</th>
            <th>Juros</th>
            <th>Tarifas</th>
            <th>Custo</th>
            <th>% do bruto</th>
            <th>Líquido recebido</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.chave} className="border-b border-zinc-100 dark:border-zinc-900">
              <td className="py-2">{l.rotulo}</td>
              <td>{l.quantidade}</td>
              <td>R$ {deCentavos(l.brutoCentavos)}</td>
              <td>R$ {deCentavos(l.jurosCentavos)}</td>
              <td>R$ {deCentavos(l.tarifasCentavos)}</td>
              <td>R$ {deCentavos(l.custoCentavos)}</td>
              <td>{formatarPercentual(l)}</td>
              <td>R$ {deCentavos(l.liquidoCentavos)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
