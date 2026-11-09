import { connection } from "next/server";
import { Suspense } from "react";

import { BotaoAcao } from "@/components/botao-acao";
import { Campo, FormularioAcao, Selecao } from "@/components/formulario-acao";
import { getDb } from "@/lib/db";
import { rotuloDaMaquina, rotuloDoOperador } from "@/lib/producao/formato";
import { exigirSessaoProducao } from "@/lib/sessao";
import {
  alternarAtivoAction,
  criarMaquina,
  criarProduto,
  definirVelocidade,
  editarMaquinaAction,
  editarNomeAction,
  editarOperadorAction,
  editarProdutoAction,
} from "../actions";
import { ItemEditavel, LinhaVelocidade, type Edicao } from "./editor-inline";

export default function CadastrosProducaoPage() {
  return (
    <main className="flex flex-col gap-8 p-8">
      <h1 className="text-2xl font-semibold">Cadastros de produção</h1>
      <p className="max-w-3xl text-zinc-600 dark:text-zinc-400">
       
        
      </p>
      <Suspense fallback={<p>Carregando...</p>}>
        <Cadastros />
      </Suspense>
    </main>
  );
}

type ItemSimples = { id: string; ativo: boolean; rotulo: string; edicao?: Edicao };

const AVISO_NOME =
  "Corrige o cadastro: apontamentos antigos e os indicadores passam a mostrar o nome novo.";

// Edição de nome de turno ou motivo.
function edicaoDeNome(tipo: string, id: string, nome: string): Edicao {
  return {
    action: editarNomeAction,
    ocultos: { tipo, id },
    campos: [{ name: "nome", rotulo: "Nome", valor: nome, obrigatorio: true }],
    aviso: AVISO_NOME,
  };
}

async function Cadastros() {
  await connection(); // lê o banco a cada requisição, nunca no prerender
  await exigirSessaoProducao();
  const db = getDb();
  const [maquinas, produtos, turnos, operadores, motivosParada, motivosPerda, velocidades] = await Promise.all([
    db.maquina.findMany({ orderBy: [{ codigo: "asc" }, { nome: "asc" }] }),
    db.produto.findMany({ orderBy: { codigo: "asc" } }),
    db.turno.findMany({ orderBy: { nome: "asc" } }),
    db.operador.findMany({ orderBy: { nome: "asc" } }),
    db.motivoParada.findMany({ orderBy: { nome: "asc" } }),
    db.motivoPerda.findMany({ orderBy: { nome: "asc" } }),
    db.velocidadeNominal.findMany({
      include: {
        maquina: { select: { codigo: true, nome: true, ativo: true } },
        produto: { select: { codigo: true, nome: true, ativo: true } },
      },
      orderBy: [{ maquina: { codigo: "asc" } }, { maquina: { nome: "asc" } }, { produto: { codigo: "asc" } }],
    }),
  ]);

  const comEdicaoDeNome = (tipo: string, lista: { id: string; ativo: boolean; nome: string }[]): ItemSimples[] =>
    lista.map((x) => ({
      id: x.id,
      ativo: x.ativo,
      rotulo: x.nome,
      edicao: edicaoDeNome(tipo, x.id, x.nome),
    }));

  return (
    <>
      <Secao titulo="Máquinas">
        <FormularioAcao action={criarMaquina} rotuloEnviar="Cadastrar máquina">
          <Campo rotulo="Código" name="codigo" required />
          <Campo rotulo="Nome" name="nome" required />
        </FormularioAcao>
        <Lista
          tipo="maquina"
          itens={maquinas.map((m) => ({
            id: m.id,
            ativo: m.ativo,
            rotulo: rotuloDaMaquina(m),
            edicao: {
              action: editarMaquinaAction,
              ocultos: { id: m.id },
              campos: [
                { name: "codigo", rotulo: "Código", valor: m.codigo ?? "", obrigatorio: true },
                { name: "nome", rotulo: "Nome", valor: m.nome, obrigatorio: true },
              ],
              aviso: "Corrige o cadastro: ordens, velocidades e apontamentos passam a mostrar o código e o nome novos.",
            },
          }))}
        />
      </Secao>

      <Secao titulo="Produtos">
        <FormularioAcao action={criarProduto} rotuloEnviar="Cadastrar produto">
          <Campo rotulo="Código" name="codigo" required />
          <Campo rotulo="Nome" name="nome" required />
        </FormularioAcao>
        <Lista
          tipo="produto"
          itens={produtos.map((p) => ({
            id: p.id,
            ativo: p.ativo,
            rotulo: `${p.codigo} — ${p.nome}`,
            edicao: {
              action: editarProdutoAction,
              ocultos: { id: p.id },
              campos: [
                { name: "codigo", rotulo: "Código", valor: p.codigo, obrigatorio: true },
                { name: "nome", rotulo: "Nome", valor: p.nome, obrigatorio: true },
              ],
              aviso: "Corrige o cadastro: ordens, velocidades e apontamentos passam a mostrar o código e o nome novos.",
            },
          }))}
        />
      </Secao>

      <Secao titulo="Velocidade nominal (peças por hora)">
        <p className="max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          Quantas peças o produto deveria sair por hora em cada máquina. É a base do
          desempenho no OEE. Obrigatória para apontar. Salvar de novo atualiza o valor, mas
          apontamentos já lançados mantêm a velocidade que tinham.
        </p>
        <FormularioAcao action={definirVelocidade} rotuloEnviar="Salvar velocidade">
          <Selecao rotulo="Máquina" name="maquinaId" required defaultValue="">
            <option value="" disabled>Escolha...</option>
            {maquinas.map((m) => (
              <option key={m.id} value={m.id}>{rotuloDaMaquina(m)}{m.ativo ? "" : " (inativa)"}</option>
            ))}
          </Selecao>
          <Selecao rotulo="Produto" name="produtoId" required defaultValue="">
            <option value="" disabled>Escolha...</option>
            {produtos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.codigo} — {p.nome}{p.ativo ? "" : " (inativo)"}
              </option>
            ))}
          </Selecao>
          <Campo rotulo="Peças por hora" name="pecasPorHora" inputMode="numeric" required />
        </FormularioAcao>
        {velocidades.length === 0 ? (
          <p className="text-sm">Nenhuma velocidade cadastrada.</p>
        ) : (
          <table className="w-full max-w-xl text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 dark:border-zinc-800">
                <th className="py-2">Máquina</th>
                <th>Produto</th>
                <th>Peças/h</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {velocidades.map((v) => (
                <LinhaVelocidade
                  key={v.id}
                  maquina={`${rotuloDaMaquina(v.maquina)}${v.maquina.ativo ? "" : " (inativa)"}`}
                  produto={`${v.produto.codigo} — ${v.produto.nome}${v.produto.ativo ? "" : " (inativo)"}`}
                  pecasPorHora={v.pecasPorHora}
                  edicao={{
                    action: definirVelocidade,
                    ocultos: { maquinaId: v.maquinaId, produtoId: v.produtoId },
                    campos: [
                      {
                        name: "pecasPorHora",
                        rotulo: "Peças por hora",
                        valor: String(v.pecasPorHora),
                        obrigatorio: true,
                        numerico: true,
                      },
                    ],
                    aviso: "Apontamentos já lançados mantêm a velocidade que tinham.",
                  }}
                />
              ))}
            </tbody>
          </table>
        )}
      </Secao>

      <Secao titulo="Turnos">
        <Lista tipo="turno" itens={comEdicaoDeNome("turno", turnos)} />
      </Secao>

      <Secao titulo="Operadores">
        <Lista
          tipo="operador"
          itens={operadores.map((o) => ({
            id: o.id,
            ativo: o.ativo,
            rotulo: o.matricula ? `${rotuloDoOperador(o)} (${o.matricula})` : rotuloDoOperador(o),
            edicao: {
              action: editarOperadorAction,
              ocultos: { id: o.id },
              campos: [
                { name: "nome", rotulo: "Nome", valor: o.nome, obrigatorio: true },
                { name: "matricula", rotulo: "Matrícula (opcional)", valor: o.matricula ?? "" },
              ],
              aviso:
                "Corrige o cadastro: apontamentos antigos passam a mostrar o nome novo. Matrícula vazia remove a matrícula.",
            },
          }))}
        />
      </Secao>

      <Secao titulo="Motivos de parada">
        <Lista tipo="motivoParada" itens={comEdicaoDeNome("motivoParada", motivosParada)} />
      </Secao>

      <Secao titulo="Motivos de perda">
        <Lista tipo="motivoPerda" itens={comEdicaoDeNome("motivoPerda", motivosPerda)} />
      </Secao>
    </>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">{titulo}</h2>
      {children}
    </section>
  );
}

function Lista({ tipo, itens }: { tipo: string; itens: ItemSimples[] }) {
  if (itens.length === 0) return <p className="text-sm">Nenhum cadastro ainda.</p>;

  const botaoAtivar = (i: ItemSimples) => (
    <BotaoAcao
      action={alternarAtivoAction}
      id={`${tipo}:${i.id}:${i.ativo ? "inativar" : "ativar"}`}
      rotulo={i.ativo ? "Inativar" : "Ativar"}
      rotuloAcessivel={`${i.ativo ? "Inativar" : "Ativar"} ${i.rotulo}`}
    />
  );

  return (
    <ul className="flex max-w-xl flex-col text-sm">
      {itens.map((i) =>
        i.edicao ? (
          <ItemEditavel key={i.id} rotulo={i.rotulo} ativo={i.ativo} edicao={i.edicao}>
            {botaoAtivar(i)}
          </ItemEditavel>
        ) : (
          <li
            key={i.id}
            className="flex items-center justify-between gap-4 border-t border-zinc-200 py-2 dark:border-zinc-800"
          >
            <span className={i.ativo ? "" : "text-zinc-500 line-through"}>
              {i.rotulo}
              {!i.ativo && " (inativo)"}
            </span>
            {botaoAtivar(i)}
          </li>
        ),
      )}
    </ul>
  );
}
