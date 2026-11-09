import { connection } from "next/server";
import { Suspense } from "react";

import { BotaoAcao } from "@/components/botao-acao";
import { Campo } from "@/components/formulario-acao";
import { getDb } from "@/lib/db";
import { chaveDoPar } from "@/lib/producao/compatibilidade";
import { formatarMinutos, formatarNumero, rotuloDaMaquina, rotuloDoOperador } from "@/lib/producao/formato";
import { formatarHorario, minutosEntre } from "@/lib/producao/tempo";
import { exigirSessaoProducao } from "@/lib/sessao";
import { LINHAS_DE_PARADA_E_PERDA } from "@/lib/validations/producao";
import { excluirApontamentoAction, registrarApontamentoAction } from "../actions";
import { FormularioApontamento } from "./formulario-apontamento";
import { SelecaoOrdemMaquina } from "./selecao-ordem-maquina";

export default function ApontamentosPage() {
  return (
    <main className="flex flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold">Apontamentos</h1>
      <p className="max-w-3xl text-zinc-600 dark:text-zinc-400">
        Lance o período em que a máquina trabalhou numa ordem, as peças boas, as perdas e as
        paradas (com motivo). Os horários são de Brasília. Turno, operador e motivos podem ser
        escolhidos da lista ou digitados: se ainda não existirem, são criados neste lançamento.
        Paradas e perdas deixadas em branco são ignoradas.
      </p>
      <Suspense fallback={<p>Carregando...</p>}>
        <Apontamentos />
      </Suspense>
    </main>
  );
}

const linhas = Array.from({ length: LINHAS_DE_PARADA_E_PERDA }, (_, i) => i);

async function Apontamentos() {
  await connection(); // lê o banco a cada requisição, nunca no prerender
  await exigirSessaoProducao();
  const db = getDb();
  const [ordens, maquinas, operadores, turnos, motivosParada, motivosPerda, recentes, velocidades] =
    await Promise.all([
      db.ordemProducao.findMany({
        where: { status: "ABERTA" },
        include: { produto: { select: { nome: true } } },
        orderBy: { numero: "asc" },
      }),
      db.maquina.findMany({ where: { ativo: true }, orderBy: [{ codigo: "asc" }, { nome: "asc" }] }),
      db.operador.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
      db.turno.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
      db.motivoParada.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
      db.motivoPerda.findMany({ where: { ativo: true }, orderBy: { nome: "asc" } }),
      db.apontamentoProducao.findMany({
        take: 50,
        orderBy: { inicio: "desc" },
        include: {
          maquina: { select: { codigo: true, nome: true } },
          operador: { select: { numero: true, nome: true } },
          turno: { select: { nome: true } },
          ordem: { select: { numero: true } },
          paradas: { select: { minutos: true } },
          perdas: { select: { quantidade: true } },
        },
      }),
      db.velocidadeNominal.findMany({ select: { maquinaId: true, produtoId: true } }),
    ]);

  const pares = velocidades.map((v) => chaveDoPar(v.maquinaId, v.produtoId));

  const faltaCadastro = ordens.length === 0 || maquinas.length === 0;

  return (
    <>
      {faltaCadastro && (
        <p role="status" className="max-w-3xl text-sm text-amber-700">
          Para apontar é preciso ter ao menos uma ordem aberta e uma máquina ativa (e a velocidade
          nominal do produto na máquina). Veja Ordens e Cadastros.
        </p>
      )}
      <FormularioApontamento action={registrarApontamentoAction} rotuloEnviar="Registrar apontamento">
        <SelecaoOrdemMaquina
          ordens={ordens.map((o) => ({
            id: o.id,
            rotulo: `${o.numero} — ${o.produto.nome}`,
            produtoId: o.produtoId,
          }))}
          maquinas={maquinas.map((m) => ({ id: m.id, nome: rotuloDaMaquina(m) }))}
          pares={pares}
        />
        <Campo rotulo="Operador" name="operador" list="lista-operadores" required autoComplete="off" />
        <datalist id="lista-operadores">
          {operadores.map((o) => (
            <option key={o.id} value={o.nome} label={rotuloDoOperador(o)} />
          ))}
        </datalist>
        <Campo rotulo="Turno" name="turno" list="lista-turnos" required autoComplete="off" />
        <datalist id="lista-turnos">
          {turnos.map((t) => (
            <option key={t.id} value={t.nome} />
          ))}
        </datalist>
        <Campo rotulo="Início" name="inicio" type="datetime-local" required />
        <Campo rotulo="Fim" name="fim" type="datetime-local" required />
        <Campo rotulo="Peças boas" name="quantidadeBoa" inputMode="numeric" required />

        <fieldset className="flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <legend className="text-sm font-medium">Paradas</legend>
          <datalist id="lista-motivos-parada">
            {motivosParada.map((m) => (
              <option key={m.id} value={m.nome} />
            ))}
          </datalist>
          {linhas.map((i) => (
            <div key={i} className="grid grid-cols-[1fr_6rem] gap-2">
              <Campo rotulo={`Motivo ${i + 1}`} name={`paradaMotivo${i}`} list="lista-motivos-parada" autoComplete="off" />
              <Campo rotulo="Minutos" name={`paradaMinutos${i}`} inputMode="numeric" />
            </div>
          ))}
        </fieldset>

        <fieldset className="flex flex-col gap-2 border-t border-zinc-200 pt-3 dark:border-zinc-800">
          <legend className="text-sm font-medium">Perdas (refugo)</legend>
          <datalist id="lista-motivos-perda">
            {motivosPerda.map((m) => (
              <option key={m.id} value={m.nome} />
            ))}
          </datalist>
          {linhas.map((i) => (
            <div key={i} className="grid grid-cols-[1fr_6rem] gap-2">
              <Campo rotulo={`Motivo ${i + 1}`} name={`perdaMotivo${i}`} list="lista-motivos-perda" autoComplete="off" />
              <Campo rotulo="Peças" name={`perdaQuantidade${i}`} inputMode="numeric" />
            </div>
          ))}
        </fieldset>
      </FormularioApontamento>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Últimos apontamentos</h2>
        {recentes.length === 0 ? (
          <p>Nenhum apontamento ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 dark:border-zinc-800">
                  <th className="py-2">Período</th>
                  <th>Máquina</th>
                  <th>Operador</th>
                  <th>Turno</th>
                  <th>Ordem</th>
                  <th>Boas</th>
                  <th>Perdas</th>
                  <th>Parado</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {recentes.map((a) => (
                  <tr key={a.id} className="border-b border-zinc-100 dark:border-zinc-900">
                    <td className="py-2">
                      {formatarHorario(a.inicio)} → {formatarHorario(a.fim).slice(11)}
                      <span className="ml-1 text-zinc-500">({formatarMinutos(minutosEntre(a.inicio, a.fim))})</span>
                    </td>
                    <td>{rotuloDaMaquina(a.maquina)}</td>
                    <td>{rotuloDoOperador(a.operador)}</td>
                    <td>{a.turno.nome}</td>
                    <td>{a.ordem.numero}</td>
                    <td>{formatarNumero(a.quantidadeBoa)}</td>
                    <td>{formatarNumero(a.perdas.reduce((s, p) => s + p.quantidade, 0))}</td>
                    <td>{formatarMinutos(a.paradas.reduce((s, p) => s + p.minutos, 0))}</td>
                    <td>
                      <BotaoAcao action={excluirApontamentoAction} id={a.id} rotulo="Excluir" rotuloAcessivel={`Excluir o apontamento de ${rotuloDaMaquina(a.maquina)} em ${formatarHorario(a.inicio)}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
