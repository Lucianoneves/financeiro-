import { connection } from "next/server";
import { Suspense } from "react";
import { z } from "zod";

import { hojeEmBrasilia } from "@/lib/producao/tempo";
import { PainelIndicadores } from "../painel-indicadores";

type SearchParams = Promise<{ [chave: string]: string | string[] | undefined }>;

const data = z.iso.date();

export default function IndicadoresPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Indicadores de produção</h1>
      <p className="max-w-3xl text-zinc-600 dark:text-zinc-400">
        Pelo dia de produção (início do apontamento). OEE = disponibilidade × desempenho ×
        qualidade; todas as paradas, inclusive intervalo, reduzem a disponibilidade.
      </p>
      <Suspense fallback={<p>Carregando...</p>}>
        <Filtrado searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

function primeiroValor(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

async function Filtrado({ searchParams }: { searchParams: SearchParams }) {
  await connection(); // a data de hoje só existe em tempo de requisição
  const hoje = hojeEmBrasilia();
  const params = await searchParams;
  const padraoDe = `${hoje.slice(0, 7)}-01`;
  // Valor inválido ou intervalo invertido volta ao padrão (mês corrente).
  let de = data.safeParse(primeiroValor(params.de)).data ?? padraoDe;
  let ate = data.safeParse(primeiroValor(params.ate)).data ?? hoje;
  if (de > ate) [de, ate] = [padraoDe, hoje];

  const estilo = "rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700";
  return (
    <>
      <form method="get" className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex flex-col gap-1">
          De
          <input type="date" name="de" defaultValue={de} className={estilo} />
        </label>
        <label className="flex flex-col gap-1">
          Até
          <input type="date" name="ate" defaultValue={ate} className={estilo} />
        </label>
        <button type="submit" className="rounded-md border border-zinc-300 px-4 py-2 dark:border-zinc-700">
          Filtrar
        </button>
      </form>
      <PainelIndicadores de={de} ate={ate} />
    </>
  );
}
