import { connection } from "next/server";
import { Suspense } from "react";

import { criarConta } from "@/app/(dashboard)/actions";
import { Campo, FormularioAcao } from "@/components/formulario-acao";
import { totaisPorConta } from "@/lib/antecipacoes/totais";
import { deCentavos } from "@/lib/dinheiro";
import { getDb } from "@/lib/db";
import { exigirSessao } from "@/lib/sessao";

export default function ContasPage() {
  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Contas bancárias</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Bancos onde o dinheiro das antecipações entra. Mostra o quanto entrou em cada
        banco; não é saldo bancário (não há saldo inicial nem saídas).
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
  await exigirSessao();
  const db = getDb();
  const [contas, antecipacoes] = await Promise.all([
    db.contaBancaria.findMany({ orderBy: { nome: "asc" } }),
    db.antecipacao.findMany({
      where: { status: "ATIVA" },
      select: {
        contaId: true,
        status: true,
        valorLiquido: true,
        juros: true,
        tarifas: true,
        titulo: { select: { baixadoEm: true } },
      },
    }),
  ]);
  if (contas.length === 0) return <p>Nenhuma conta cadastrada.</p>;

  const porConta = totaisPorConta(
    antecipacoes.map((a) => ({
      contaId: a.contaId,
      status: a.status,
      valorLiquido: a.valorLiquido.toFixed(2),
      juros: a.juros.toFixed(2),
      tarifas: a.tarifas.toFixed(2),
      tituloBaixado: a.titulo.baixadoEm !== null,
    })),
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-zinc-600 dark:text-zinc-400">
          <tr>
            <th className="py-2 pr-4 font-medium">Conta</th>
            <th className="py-2 pr-4 font-medium">Antecipações ativas</th>
            <th className="py-2 pr-4 font-medium">Recebido</th>
            <th className="py-2 pr-4 font-medium">Pendente de baixa</th>
            <th className="py-2 pr-4 font-medium">Juros</th>
            <th className="py-2 pr-4 font-medium">Tarifas</th>
          </tr>
        </thead>
        <tbody>
          {contas.map((c) => {
            const t = porConta.get(c.id);
            return (
              <tr key={c.id} className="border-t border-zinc-200 dark:border-zinc-800">
                <td className="py-2 pr-4">{c.nome}</td>
                <td className="py-2 pr-4">{t?.quantidade ?? 0}</td>
                <td className="py-2 pr-4">R$ {deCentavos(t?.recebidoCentavos ?? 0n)}</td>
                <td className="py-2 pr-4">R$ {deCentavos(t?.recebidoPendenteCentavos ?? 0n)}</td>
                <td className="py-2 pr-4">R$ {deCentavos(t?.jurosCentavos ?? 0n)}</td>
                <td className="py-2 pr-4">R$ {deCentavos(t?.tarifasCentavos ?? 0n)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
