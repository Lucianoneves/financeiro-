import { connection } from "next/server";
import { Suspense } from "react";

import { BotaoAcao } from "@/components/botao-acao";
import { Campo, FormularioAcao, Selecao } from "@/components/formulario-acao";
import { getDb } from "@/lib/db";
import { formatarNumero, formatarPercentual } from "@/lib/producao/formato";
import { exigirSessaoProducao } from "@/lib/sessao";
import { criarOrdem, encerrarOrdemAction, reabrirOrdemAction } from "../actions";

export default function OrdensPage() {
  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Ordens de produção</h1>
      <p className="max-w-3xl text-zinc-600 dark:text-zinc-400">
        Cada ordem produz um produto numa quantidade planejada. O progresso soma as peças boas
        dos apontamentos. Só ordens abertas recebem apontamento.
      </p>
      <Suspense fallback={<p>Carregando...</p>}>
        <Ordens />
      </Suspense>
    </main>
  );
}

async function Ordens() {
  await connection(); // lê o banco a cada requisição, nunca no prerender
  await exigirSessaoProducao();
  const db = getDb();
  const [produtos, ordens, boas] = await Promise.all([
    db.produto.findMany({ where: { ativo: true }, orderBy: { codigo: "asc" } }),
    db.ordemProducao.findMany({
      include: { produto: { select: { codigo: true, nome: true } } },
      orderBy: { criadaEm: "desc" },
    }),
    db.apontamentoProducao.groupBy({ by: ["ordemId"], _sum: { quantidadeBoa: true } }),
  ]);
  const boasPorOrdem = new Map(boas.map((b) => [b.ordemId, b._sum.quantidadeBoa ?? 0]));

  return (
    <>
      <FormularioAcao action={criarOrdem} rotuloEnviar="Criar ordem">
        <Campo rotulo="Número da ordem" name="numero" required />
        <Selecao rotulo="Produto" name="produtoId" required defaultValue="">
          <option value="" disabled>Escolha...</option>
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>{p.codigo} — {p.nome}</option>
          ))}
        </Selecao>
        <Campo rotulo="Quantidade planejada (peças)" name="quantidadePlanejada" inputMode="numeric" required />
      </FormularioAcao>

      {ordens.length === 0 ? (
        <p>Nenhuma ordem cadastrada.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2">Ordem</th>
                <th>Produto</th>
                <th>Planejado</th>
                <th>Boas</th>
                <th>Progresso</th>
                <th>Situação</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {ordens.map((o) => {
                const feitas = boasPorOrdem.get(o.id) ?? 0;
                return (
                  <tr key={o.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2">{o.numero}</td>
                    <td>{o.produto.codigo} — {o.produto.nome}</td>
                    <td>{formatarNumero(o.quantidadePlanejada)}</td>
                    <td>{formatarNumero(feitas)}</td>
                    <td>{formatarPercentual(feitas / o.quantidadePlanejada)}</td>
                    <td>{o.status === "ABERTA" ? "Aberta" : "Encerrada"}</td>
                    <td>
                      {o.status === "ABERTA" ? (
                        <BotaoAcao action={encerrarOrdemAction} id={o.id} rotulo="Encerrar" rotuloAcessivel={`Encerrar a ordem ${o.numero}`} />
                      ) : (
                        <BotaoAcao action={reabrirOrdemAction} id={o.id} rotulo="Reabrir" rotuloAcessivel={`Reabrir a ordem ${o.numero}`} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
