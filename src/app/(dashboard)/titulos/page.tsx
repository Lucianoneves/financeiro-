import { connection } from "next/server";
import { Suspense } from "react";

import { criarTitulo } from "@/app/(dashboard)/actions";
import { Campo, FormularioAcao } from "@/components/formulario-acao";
import { getDb } from "@/lib/db";
import { estadoDoTitulo } from "@/lib/titulos/estado";

const ROTULO_ESTADO = {
  EM_ABERTO: "Em aberto",
  ANTECIPADO_PENDENTE: "Antecipado, pendente de baixa",
  BAIXADO: "Baixado",
} as const;

export default function TitulosPage() {
  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Títulos</h1>
      <FormularioAcao action={criarTitulo} rotuloEnviar="Cadastrar título">
        <Campo rotulo="Número" name="numero" required />
        <Campo rotulo="Cliente" name="cliente" required />
        <Campo rotulo="Valor (ex.: 1500,00)" name="valor" inputMode="decimal" required />
        <Campo rotulo="Vencimento" name="vencimento" type="date" required />
      </FormularioAcao>
      <Suspense fallback={<p>Carregando...</p>}>
        <ListaTitulos />
      </Suspense>
    </main>
  );
}

async function ListaTitulos() {
  await connection(); // lê o banco a cada requisição, nunca no prerender
  const titulos = await getDb().titulo.findMany({
    orderBy: { vencimento: "asc" },
    include: { antecipacoes: { select: { status: true } } },
  });
  if (titulos.length === 0) return <p>Nenhum título cadastrado.</p>;
  return (
    <table className="w-full max-w-4xl text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-200 dark:border-zinc-800">
          <th className="py-2">Número</th>
          <th>Cliente</th>
          <th>Valor</th>
          <th>Vencimento</th>
          <th>Estado</th>
        </tr>
      </thead>
      <tbody>
        {titulos.map((t) => (
          <tr key={t.id} className="border-b border-zinc-100 dark:border-zinc-900">
            <td className="py-2">{t.numero}</td>
            <td>{t.cliente}</td>
            <td>R$ {t.valor.toFixed(2)}</td>
            <td>{t.vencimento.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
            <td>{ROTULO_ESTADO[estadoDoTitulo(t, t.antecipacoes)]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
