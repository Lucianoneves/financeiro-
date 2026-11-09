import { connection } from "next/server";
import { Suspense } from "react";

import {
  cancelarAntecipacaoAction,
  registrarAntecipacaoAction,
} from "@/app/(dashboard)/actions";
import { Campo, FormularioAcao, Selecao } from "@/components/formulario-acao";
import { BotaoAcao } from "@/components/botao-acao";
import { Paginacao } from "@/components/paginacao";
import { getDb } from "@/lib/db";
import { janelaDaPagina, lerPagina } from "@/lib/paginacao";
import { exigirSessao } from "@/lib/sessao";

type SearchParams = Promise<{ [chave: string]: string | string[] | undefined }>;

export default function AntecipacoesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Antecipações</h1>
      <Suspense fallback={<p>Carregando...</p>}>
        <NovaAntecipacao />
        <ListaAntecipacoes searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function NovaAntecipacao() {
  await connection(); // lê o banco a cada requisição, nunca no prerender
  await exigirSessao();
  const db = getDb();
  const [titulos, contas] = await Promise.all([
    db.titulo.findMany({
      where: { baixadoEm: null, antecipacoes: { none: { status: "ATIVA" } } },
      orderBy: { vencimento: "asc" },
    }),
    db.contaBancaria.findMany({ orderBy: { nome: "asc" } }),
  ]);

  if (titulos.length === 0 || contas.length === 0) {
    return (
      <p className="text-zinc-600 dark:text-zinc-400">
        Para antecipar, cadastre ao menos uma conta bancária e um título em aberto.
      </p>
    );
  }

  return (
    <FormularioAcao action={registrarAntecipacaoAction} rotuloEnviar="Registrar antecipação">
      <Selecao rotulo="Título em aberto" name="tituloId" required>
        {titulos.map((t) => (
          <option key={t.id} value={t.id}>
            {t.numero} · {t.cliente} · R$ {t.valor.toFixed(2)}
          </option>
        ))}
      </Selecao>
      <Selecao rotulo="Conta de entrada" name="contaId" required>
        {contas.map((c) => (
          <option key={c.id} value={c.id}>
            {c.nome}
          </option>
        ))}
      </Selecao>
      <Campo rotulo="Valor bruto (ex.: 1500,00)" name="valorBruto" inputMode="decimal" required />
      <Campo rotulo="Juros cobrados" name="jurosCobrados" inputMode="decimal" defaultValue="0" required />
      <Campo rotulo="Tarifas cobradas" name="tarifasCobradas" inputMode="decimal" defaultValue="0" required />
      <Campo rotulo="Data da antecipação" name="dataAntecipacao" type="date" required />
      <p className="text-xs text-zinc-500">
        Digite juros e tarifas como aparecem no borderô (espelho da antecipação)
        do banco: o ERP e o extrato não trazem esses valores. O valor líquido
        (bruto − juros − tarifas) é calculado ao salvar.
      </p>
    </FormularioAcao>
  );
}

async function ListaAntecipacoes({ searchParams }: { searchParams: SearchParams }) {
  await connection(); // lê o banco a cada requisição, nunca no prerender
  await exigirSessao();
  const db = getDb();
  // Esta tela não mostra totais, então a paginação é feita no banco.
  const total = await db.antecipacao.count();
  if (total === 0) return <p>Nenhuma antecipação registrada.</p>;
  const janela = janelaDaPagina(total, lerPagina((await searchParams).pagina));
  const antecipacoes = await db.antecipacao.findMany({
    orderBy: [{ criadaEm: "desc" }, { id: "desc" }], // id desempata: página estável
    skip: janela.pular,
    take: janela.tomar,
    include: { titulo: true, conta: true },
  });

  return (
    <>
    <table className="w-full max-w-5xl text-left text-sm">
      <thead>
        <tr className="border-b border-zinc-200 dark:border-zinc-800">
          <th className="py-2">Título</th>
          <th>Conta</th>
          <th>Bruto</th>
          <th>Juros</th>
          <th>Tarifas</th>
          <th>Líquido</th>
          <th>Status</th>
          <th />
        </tr>
      </thead>
      <tbody>
        {antecipacoes.map((a) => (
          <tr key={a.id} className="border-b border-zinc-100 dark:border-zinc-900">
            <td className="py-2">
              {a.titulo.numero} · {a.titulo.cliente}
            </td>
            <td>{a.conta.nome}</td>
            <td>R$ {a.valorBruto.toFixed(2)}</td>
            <td>R$ {a.juros.toFixed(2)}</td>
            <td>R$ {a.tarifas.toFixed(2)}</td>
            <td>R$ {a.valorLiquido.toFixed(2)}</td>
            <td>
              {a.status === "CANCELADA"
                ? "Cancelada"
                : a.titulo.baixadoEm
                  ? "Ativa · título baixado"
                  : "Ativa · pendente de baixa"}
            </td>
            <td>
              {a.status === "ATIVA" && !a.titulo.baixadoEm && (
                <BotaoAcao
                  action={cancelarAntecipacaoAction}
                  id={a.id}
                  rotulo="Cancelar"
                  rotuloAcessivel={`Cancelar antecipação do título ${a.titulo.numero}`}
                />
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    <Paginacao caminho="/antecipacoes" pagina={janela.pagina} totalPaginas={janela.totalPaginas} />
    </>
  );
}
