import { connection } from "next/server";
import { Suspense } from "react";

import { criarConta } from "@/app/(dashboard)/actions";
import { Campo, FormularioAcao } from "@/components/formulario-acao";
import { getDb } from "@/lib/db";

export default function ContasPage() {
  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Contas bancárias</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Bancos onde o dinheiro das antecipações entra.
      </p>
      <FormularioAcao action={criarConta} rotuloEnviar="Cadastrar conta">
        <Campo rotulo="Nome do banco/conta" name="nome" required />
      </FormularioAcao>
      <Suspense fallback={<p>Carregando...</p>}>
        <ListaContas />
      </Suspense>
    </main>
  );
}

async function ListaContas() {
  await connection(); // lê o banco a cada requisição, nunca no prerender
  const contas = await getDb().contaBancaria.findMany({ orderBy: { nome: "asc" } });
  if (contas.length === 0) return <p>Nenhuma conta cadastrada.</p>;
  return (
    <ul className="list-disc pl-5">
      {contas.map((c) => (
        <li key={c.id}>{c.nome}</li>
      ))}
    </ul>
  );
}
