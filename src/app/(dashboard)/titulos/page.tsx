import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { baixarTituloAction, criarTitulo } from "@/app/(dashboard)/actions";
import { Campo, FormularioAcao } from "@/components/formulario-acao";
import { BotaoAcao } from "@/components/botao-acao";
import { getDb } from "@/lib/db";
import { exigirSessao } from "@/lib/sessao";
import { totaisDeAntecipacoes } from "@/lib/antecipacoes/totais";
import { deCentavos, paraCentavos } from "@/lib/dinheiro";
import {
  ESTADOS_TITULO,
  estadoDoTitulo,
  lerFiltroEstado,
  totaisPorEstado,
} from "@/lib/titulos/estado";

const ROTULO_ESTADO = {
  EM_ABERTO: "Em aberto",
  ANTECIPADO_PENDENTE: "Antecipado, pendente de baixa",
  BAIXADO: "Baixado",
} as const;

type SearchParams = Promise<{ [chave: string]: string | string[] | undefined }>;

export default function TitulosPage({ searchParams }: { searchParams: SearchParams }) {
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
        <ListaTitulos searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function ListaTitulos({ searchParams }: { searchParams: SearchParams }) {
  await connection(); // lê o banco a cada requisição, nunca no prerender
  await exigirSessao();
  const filtro = lerFiltroEstado((await searchParams).estado);

  const todos = await getDb().titulo.findMany({
    orderBy: { vencimento: "asc" },
    include: {
      antecipacoes: {
        select: {
          status: true,
          valorLiquido: true,
          juros: true,
          tarifas: true,
          conta: { select: { nome: true } },
        },
      },
    },
  });
  const titulos = todos.map((t) => ({
    ...t,
    estado: estadoDoTitulo(t, t.antecipacoes),
    // No máximo uma ATIVA por título (garantido pelo banco).
    ativa: t.antecipacoes.find((a) => a.status === "ATIVA"),
  }));
  const recebidos = totaisDeAntecipacoes(
    titulos.flatMap((t) =>
      t.antecipacoes.map((a) => ({
        status: a.status,
        valorLiquido: a.valorLiquido.toFixed(2),
        juros: a.juros.toFixed(2),
        tarifas: a.tarifas.toFixed(2),
        tituloBaixado: t.baixadoEm !== null,
      })),
    ),
  );
  const totais = totaisPorEstado(
    titulos.map((t) => ({ estado: t.estado, valorCentavos: paraCentavos(t.valor.toFixed(2)) })),
  );
  const visiveis = filtro ? titulos.filter((t) => t.estado === filtro) : titulos;

  return (
    <>
      <section className="grid max-w-4xl gap-3 sm:grid-cols-3">
        {ESTADOS_TITULO.map((estado) => (
          <div key={estado} className="rounded-md border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">{ROTULO_ESTADO[estado]}</p>
            <p className="text-lg font-semibold">R$ {deCentavos(totais[estado].centavos)}</p>
            <p className="text-xs text-zinc-500">{totais[estado].quantidade} título(s)</p>
          </div>
        ))}
      </section>

      <section
        aria-label="Dinheiro recebido nas antecipações"
        className="grid max-w-4xl gap-3 sm:grid-cols-4"
      >
        <Cartao
          rotulo="Recebido (antecipações ativas)"
          valor={recebidos.recebidoCentavos}
          nota="Não muda quando o cliente paga"
        />
        <Cartao
          rotulo="Recebido, pendente de baixa"
          valor={recebidos.recebidoPendenteCentavos}
          nota="Cliente ainda não pagou"
          destaque
        />
        <Cartao rotulo="Juros pagos" valor={recebidos.jurosCentavos} />
        <Cartao rotulo="Tarifas pagas" valor={recebidos.tarifasCentavos} />
      </section>

      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filtrar por estado">
        <FiltroLink ativo={!filtro} href="/titulos">
          Todos
        </FiltroLink>
        {ESTADOS_TITULO.map((estado) => (
          <FiltroLink key={estado} ativo={filtro === estado} href={`/titulos?estado=${estado}`}>
            {ROTULO_ESTADO[estado]}
          </FiltroLink>
        ))}
      </nav>

      {visiveis.length === 0 ? (
        <p>{titulos.length === 0 ? "Nenhum título cadastrado." : "Nenhum título neste estado."}</p>
      ) : (
        <table className="w-full max-w-4xl text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 dark:border-zinc-800">
              <th className="py-2">Número</th>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Vencimento</th>
              <th>Estado</th>
              <th>Recebido (líquido)</th>
              <th>Juros + tarifas</th>
              <th>Conta</th>
              <th>
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visiveis.map((t) => (
              <tr key={t.id} className="border-b border-zinc-100 dark:border-zinc-900">
                <td className="py-2">{t.numero}</td>
                <td>{t.cliente}</td>
                <td>R$ {t.valor.toFixed(2)}</td>
                <td>{t.vencimento.toLocaleDateString("pt-BR", { timeZone: "UTC" })}</td>
                <td
                  className={
                    t.estado === "ANTECIPADO_PENDENTE" ? "font-medium text-amber-700 dark:text-amber-400" : undefined
                  }
                >
                  {ROTULO_ESTADO[t.estado]}
                </td>
                <td>{t.ativa ? `R$ ${t.ativa.valorLiquido.toFixed(2)}` : "—"}</td>
                <td>
                  {t.ativa
                    ? `R$ ${deCentavos(
                        paraCentavos(t.ativa.juros.toFixed(2)) +
                          paraCentavos(t.ativa.tarifas.toFixed(2)),
                      )}`
                    : "—"}
                </td>
                <td>{t.ativa ? t.ativa.conta.nome : "—"}</td>
                <td>
                  {t.estado !== "BAIXADO" && (
                    <BotaoAcao
                      action={baixarTituloAction}
                      id={t.id}
                      rotulo="Cliente pagou"
                      rotuloAcessivel={`Cliente pagou: título ${t.numero} de ${t.cliente}`}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function Cartao({
  rotulo,
  valor,
  nota,
  destaque,
}: {
  rotulo: string;
  valor: bigint;
  nota?: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`rounded-md border p-3 ${
        destaque
          ? "border-amber-500 dark:border-amber-400"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      <p className="text-xs text-zinc-500">{rotulo}</p>
      <p className="text-lg font-semibold">R$ {deCentavos(valor)}</p>
      {nota && <p className="text-xs text-zinc-500">{nota}</p>}
    </div>
  );
}

function FiltroLink({
  ativo,
  href,
  children,
}: {
  ativo: boolean;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={`rounded-full border px-3 py-1 ${
        ativo
          ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
          : "border-zinc-200 dark:border-zinc-800"
      }`}
    >
      {children}
    </Link>
  );
}
