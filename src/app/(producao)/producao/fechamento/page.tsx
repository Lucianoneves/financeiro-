import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";

import { getDb } from "@/lib/db";
import { resumoPorOrdem } from "@/lib/producao/fechamento";
import { formatarMinutos, formatarNumero, rotuloDaMaquina, rotuloDoOperador } from "@/lib/producao/formato";
import { formatarHorario, hojeEmBrasilia } from "@/lib/producao/tempo";
import { exigirSessaoProducao } from "@/lib/sessao";
import { PainelIndicadores } from "../painel-indicadores";
import { BotaoImprimir } from "./botao-imprimir";

type SearchParams = Promise<{ [chave: string]: string | string[] | undefined }>;

const data = z.iso.date();

export default function FechamentoPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Fechamento de turno</h1>
      <p className="max-w-3xl text-zinc-600 dark:text-zinc-400 print:hidden">
        Resumo de um dia de produção, de um turno ou de todos. O dia é o do início do
        apontamento: um turno que atravessa a meia-noite fica no dia em que começou.
      </p>
      <Suspense fallback={<p>Carregando...</p>}>
        <Fechamento searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function primeiroValor(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

async function Fechamento({ searchParams }: { searchParams: SearchParams }) {
  await connection(); // a data de hoje e o banco só existem em tempo de requisição
  await exigirSessaoProducao();
  const params = await searchParams;
  // Data inválida volta para hoje; turno desconhecido vira "todos os turnos".
  const dia = data.safeParse(primeiroValor(params.data)).data ?? hojeEmBrasilia();
  const db = getDb();
  const turnos = await db.turno.findMany({ orderBy: { nome: "asc" } });
  const turno = turnos.find((t) => t.id === primeiroValor(params.turno));

  const apontamentos = await db.apontamentoProducao.findMany({
    where: {
      data: new Date(`${dia}T00:00:00.000Z`),
      ...(turno ? { turnoId: turno.id } : {}),
    },
    orderBy: [{ inicio: "asc" }, { maquina: { codigo: "asc" } }, { maquina: { nome: "asc" } }],
    include: {
      maquina: { select: { codigo: true, nome: true } },
      operador: { select: { numero: true, nome: true } },
      turno: { select: { nome: true } },
      ordem: { select: { numero: true, produto: { select: { nome: true } } } },
      paradas: { select: { minutos: true } },
      perdas: { select: { quantidade: true } },
    },
  });

  const porOrdem = resumoPorOrdem(
    apontamentos.map((a) => ({
      ordemId: a.ordemId,
      ordemNumero: a.ordem.numero,
      produtoNome: a.ordem.produto.nome,
      quantidadeBoa: a.quantidadeBoa,
      pecasPerdidas: a.perdas.reduce((s, p) => s + p.quantidade, 0),
    })),
  );

  const diaTexto = dia.split("-").reverse().join("/");
  const estilo = "rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700";

  return (
    <>
      <form method="get" className="flex flex-wrap items-end gap-3 text-sm print:hidden">
        <label className="flex flex-col gap-1">
          Dia
          <input type="date" name="data" defaultValue={dia} className={estilo} />
        </label>
        <label className="flex flex-col gap-1">
          Turno
          <select name="turno" defaultValue={turno?.id ?? ""} className={estilo}>
            <option value="">Todos os turnos</option>
            {turnos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
                {t.ativo ? "" : " (inativo)"}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-md border border-zinc-300 px-4 py-2 dark:border-zinc-700">
          Ver
        </button>
        <BotaoImprimir />
      </form>

      <h2 className="text-lg font-semibold">
        {turno ? `Turno ${turno.nome}` : "Todos os turnos"} — {diaTexto}
      </h2>

      {apontamentos.length === 0 ? (
        <p>Nenhum apontamento neste dia{turno ? " e turno" : ""}.</p>
      ) : (
        <>
          <PainelIndicadores de={dia} ate={dia} turnoId={turno?.id} />

          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Por ordem de produção</h2>
            <table className="w-full max-w-3xl text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2">Ordem</th>
                  <th>Produto</th>
                  <th>Apontamentos</th>
                  <th>Boas</th>
                  <th>Perdas</th>
                </tr>
              </thead>
              <tbody>
                {porOrdem.map((o) => (
                  <tr key={o.ordemId} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2">{o.ordemNumero}</td>
                    <td>{o.produtoNome}</td>
                    <td>{o.apontamentos}</td>
                    <td>{formatarNumero(o.pecasBoas)}</td>
                    <td>{formatarNumero(o.pecasPerdidas)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="flex flex-col gap-2 overflow-x-auto">
            <h2 className="text-lg font-semibold">Apontamentos do período</h2>
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2">Período</th>
                  <th>Máquina</th>
                  <th>Operador</th>
                  {!turno && <th>Turno</th>}
                  <th>Ordem</th>
                  <th>Boas</th>
                  <th>Perdas</th>
                  <th>Parado</th>
                  <th>Lançado por</th>
                </tr>
              </thead>
              <tbody>
                {apontamentos.map((a) => (
                  <tr key={a.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2">
                      {formatarHorario(a.inicio).slice(11)} → {formatarHorario(a.fim).slice(11)}
                    </td>
                    <td>{rotuloDaMaquina(a.maquina)}</td>
                    <td>{rotuloDoOperador(a.operador)}</td>
                    {!turno && <td>{a.turno.nome}</td>}
                    <td>{a.ordem.numero}</td>
                    <td>{formatarNumero(a.quantidadeBoa)}</td>
                    <td>{formatarNumero(a.perdas.reduce((s, p) => s + p.quantidade, 0))}</td>
                    <td>{formatarMinutos(a.paradas.reduce((s, p) => s + p.minutos, 0))}</td>
                    <td>{a.registradoPor}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
    </>
  );
}
