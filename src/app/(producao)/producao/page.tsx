import { connection } from "next/server";
import { Suspense } from "react";

import { hojeEmBrasilia } from "@/lib/producao/tempo";
import { PainelIndicadores } from "./painel-indicadores";

export default function ResumoProducaoPage() {
  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Produção de hoje</h1>
      <p className="max-w-3xl text-zinc-600 dark:text-zinc-400">
        Indicadores dos apontamentos do dia, por máquina. Para outros períodos, operadores,
        produtos e motivos, veja Indicadores.
      </p>
      <Suspense fallback={<p>Carregando...</p>}>
        <Hoje />
      </Suspense>
    </main>
  );
}

// A data de hoje só existe em tempo de requisição, por isso fica dentro do Suspense.
async function Hoje() {
  await connection();
  const hoje = hojeEmBrasilia();
  return <PainelIndicadores de={hoje} ate={hoje} resumido />;
}
