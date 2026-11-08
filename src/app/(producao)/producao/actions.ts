"use server";

import { revalidatePath } from "next/cache";
import type { ZodType } from "zod";

import type { EstadoForm } from "@/app/(dashboard)/actions";
import { getDb } from "@/lib/db";
import { eConflitoUnico, ErroProducao, type ResultadoApontamento } from "@/lib/producao/erros";
import { chaveDoNome } from "@/lib/producao/nomes";
import {
  encerrarOrdem,
  excluirApontamento,
  reabrirOrdem,
  registrarApontamento,
} from "@/lib/producao/servico";
import { exigirSessaoProducao } from "@/lib/sessao";
import {
  apontamentoSchema,
  errosDoFormulario,
  maquinaEdicaoSchema,
  maquinaSchema,
  montarApontamento,
  nomeEdicaoSchema,
  operadorEdicaoSchema,
  ordemSchema,
  produtoEdicaoSchema,
  produtoSchema,
  velocidadeSchema,
} from "@/lib/validations/producao";

// Ações do módulo de produção. Mesmo padrão do financeiro (sessão, Zod, mensagem
// de negócio na tela), mas com cópias próprias dos auxiliares para os dois
// módulos não dependerem um do outro.

function lerForm(formData: FormData) {
  const dados: Record<string, string> = {};
  for (const [chave, valor] of formData.entries()) {
    if (chave.startsWith("$ACTION") || typeof valor !== "string") continue;
    dados[chave] = valor.trim();
  }
  return dados;
}

function validar<T>(schema: ZodType<T>, entrada: unknown) {
  const r = schema.safeParse(entrada);
  if (r.success) return { dados: r.data };
  return { erro: r.error.issues.map((i) => i.message).join(" ") };
}

async function executar(fn: () => Promise<string>): Promise<EstadoForm> {
  try {
    return { sucesso: await fn() };
  } catch (e) {
    if (e instanceof ErroProducao) return { erro: e.message };
    if (eConflitoUnico(e)) return { erro: "Já existe um cadastro com esses dados." };
    console.error(e);
    return { erro: "Erro inesperado. Tente novamente." };
  }
}

const atualizar = () => revalidatePath("/producao", "layout");

// ---------------------------------------------------------------- cadastros

// Código e nome de máquina não podem repetir os de outra (`ignorarId` = a própria, na edição).
async function verificarMaquinaRepetida(
  { codigo, nome }: { codigo: string; nome: string },
  ignorarId?: string,
) {
  const db = getDb();
  const mesmoCodigo = await db.maquina.findFirst({
    where: { codigo, ...(ignorarId ? { NOT: { id: ignorarId } } : {}) },
    select: { nome: true },
  });
  if (mesmoCodigo) {
    throw new ErroProducao(`O código ${codigo} já é da máquina "${mesmoCodigo.nome}".`);
  }
  const mesmoNome = await db.maquina.findFirst({
    where: { nome, ...(ignorarId ? { NOT: { id: ignorarId } } : {}) },
    select: { codigo: true },
  });
  if (mesmoNome) {
    throw new ErroProducao(`Já existe a máquina "${nome}" (código ${mesmoNome.codigo}).`);
  }
}

export async function criarMaquina(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirSessaoProducao();
  const v = validar(maquinaSchema, lerForm(formData));
  if (v.erro) return { erro: v.erro };
  return executar(async () => {
    await verificarMaquinaRepetida(v.dados!);
    await getDb().maquina.create({ data: v.dados! });
    atualizar();
    return "Máquina cadastrada.";
  });
}

export async function criarProduto(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirSessaoProducao();
  const v = validar(produtoSchema, lerForm(formData));
  if (v.erro) return { erro: v.erro };
  return executar(async () => {
    await getDb().produto.create({ data: v.dados! });
    atualizar();
    return "Produto cadastrado.";
  });
}

// Cadastra ou atualiza a velocidade nominal (uma por máquina e produto).
// Apontamentos já lançados mantêm a velocidade que tinham.
export async function definirVelocidade(
  _: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirSessaoProducao();
  const v = validar(velocidadeSchema, lerForm(formData));
  if (v.erro) return { erro: v.erro };
  return executar(async () => {
    const { maquinaId, produtoId, pecasPorHora } = v.dados!;
    await getDb().velocidadeNominal.upsert({
      where: { maquinaId_produtoId: { maquinaId, produtoId } },
      create: { maquinaId, produtoId, pecasPorHora },
      update: { pecasPorHora },
    });
    atualizar();
    return "Velocidade nominal salva.";
  });
}

// Ativar/inativar qualquer cadastro. O botão compartilhado só envia um `id`, então
// ele vem no formato "tipo:id:ativar" ou "tipo:id:inativar" (idempotente).
export async function alternarAtivoAction(
  _: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirSessaoProducao();
  const [tipo, id, acao] = String(formData.get("id") ?? "").split(":");
  if (!id || (acao !== "ativar" && acao !== "inativar")) {
    return { erro: "Cadastro inválido." };
  }
  const ativo = acao === "ativar";
  const db = getDb();
  return executar(async () => {
    const where = { id };
    const data = { ativo };
    let alterados = 0;
    switch (tipo) {
      case "maquina":
        alterados = (await db.maquina.updateMany({ where, data })).count;
        break;
      case "produto":
        alterados = (await db.produto.updateMany({ where, data })).count;
        break;
      case "turno":
        alterados = (await db.turno.updateMany({ where, data })).count;
        break;
      case "operador":
        alterados = (await db.operador.updateMany({ where, data })).count;
        break;
      case "motivoParada":
        alterados = (await db.motivoParada.updateMany({ where, data })).count;
        break;
      case "motivoPerda":
        alterados = (await db.motivoPerda.updateMany({ where, data })).count;
        break;
      default:
        throw new ErroProducao("Cadastro inválido.");
    }
    if (alterados === 0) throw new ErroProducao("Cadastro não encontrado.");
    atualizar();
    return ativo ? "Ativado." : "Inativado.";
  });
}

// Corrige nome e matrícula de um operador. O nome novo não pode coincidir (sem
// contar maiúsculas, acentos e espaços) com o de outro operador, nem a matrícula.
// Apontamentos antigos passam a mostrar o nome novo: é a correção do cadastro.
export async function editarOperadorAction(
  _: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirSessaoProducao();
  const v = validar(operadorEdicaoSchema, lerForm(formData));
  if (v.erro) return { erro: v.erro };
  return executar(async () => {
    const { id, nome, matricula } = v.dados!;
    const db = getDb();
    if (!(await db.operador.findUnique({ where: { id }, select: { id: true } }))) {
      throw new ErroProducao("Operador não encontrado.");
    }
    const mesmoNome = await db.operador.findFirst({
      where: { nomeNormalizado: chaveDoNome(nome), NOT: { id } },
      select: { nome: true },
    });
    if (mesmoNome) {
      throw new ErroProducao(`Já existe o operador "${mesmoNome.nome}" com esse nome.`);
    }
    if (matricula) {
      const mesmaMatricula = await db.operador.findFirst({
        where: { matricula, NOT: { id } },
        select: { nome: true },
      });
      if (mesmaMatricula) {
        throw new ErroProducao(`A matrícula ${matricula} já é de "${mesmaMatricula.nome}".`);
      }
    }
    await db.operador.update({
      where: { id },
      data: { nome, nomeNormalizado: chaveDoNome(nome), matricula: matricula ?? null },
    });
    atualizar();
    return "Operador atualizado.";
  });
}

// Corrige código e nome de uma máquina. Ordens, velocidades e apontamentos apontam
// para a máquina pelo id, então passam a mostrar o código e o nome novos.
export async function editarMaquinaAction(
  _: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirSessaoProducao();
  const v = validar(maquinaEdicaoSchema, lerForm(formData));
  if (v.erro) return { erro: v.erro };
  return executar(async () => {
    const { id, codigo, nome } = v.dados!;
    const db = getDb();
    if (!(await db.maquina.findUnique({ where: { id }, select: { id: true } }))) {
      throw new ErroProducao("Máquina não encontrada.");
    }
    await verificarMaquinaRepetida({ codigo, nome }, id);
    await db.maquina.update({ where: { id }, data: { codigo, nome } });
    atualizar();
    return "Máquina atualizada.";
  });
}

// Corrige código e nome de um produto. O código não pode repetir o de outro produto.
export async function editarProdutoAction(
  _: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirSessaoProducao();
  const v = validar(produtoEdicaoSchema, lerForm(formData));
  if (v.erro) return { erro: v.erro };
  return executar(async () => {
    const { id, codigo, nome } = v.dados!;
    const db = getDb();
    if (!(await db.produto.findUnique({ where: { id }, select: { id: true } }))) {
      throw new ErroProducao("Produto não encontrado.");
    }
    const mesmoCodigo = await db.produto.findFirst({
      where: { codigo, NOT: { id } },
      select: { nome: true },
    });
    if (mesmoCodigo) {
      throw new ErroProducao(`O código ${codigo} já é do produto "${mesmoCodigo.nome}".`);
    }
    await db.produto.update({ where: { id }, data: { codigo, nome } });
    atualizar();
    return "Produto atualizado.";
  });
}

// Renomear turno ou motivo de parada/perda. Mesma regra do operador: o nome novo
// não pode coincidir (sem contar maiúsculas, acentos e espaços) com outro do mesmo
// tipo, e apontamentos antigos passam a mostrar o nome novo.
function operacoesDeNome(tipo: "turno" | "motivoParada" | "motivoPerda") {
  const db = getDb();
  switch (tipo) {
    case "turno":
      return {
        rotulo: "turno",
        existe: async (id: string) =>
          !!(await db.turno.findUnique({ where: { id }, select: { id: true } })),
        outro: (chave: string, id: string) =>
          db.turno.findFirst({ where: { nomeNormalizado: chave, NOT: { id } }, select: { nome: true } }),
        salvar: (id: string, nome: string, chave: string) =>
          db.turno.update({ where: { id }, data: { nome, nomeNormalizado: chave } }),
      };
    case "motivoParada":
      return {
        rotulo: "motivo de parada",
        existe: async (id: string) =>
          !!(await db.motivoParada.findUnique({ where: { id }, select: { id: true } })),
        outro: (chave: string, id: string) =>
          db.motivoParada.findFirst({ where: { nomeNormalizado: chave, NOT: { id } }, select: { nome: true } }),
        salvar: (id: string, nome: string, chave: string) =>
          db.motivoParada.update({ where: { id }, data: { nome, nomeNormalizado: chave } }),
      };
    case "motivoPerda":
      return {
        rotulo: "motivo de perda",
        existe: async (id: string) =>
          !!(await db.motivoPerda.findUnique({ where: { id }, select: { id: true } })),
        outro: (chave: string, id: string) =>
          db.motivoPerda.findFirst({ where: { nomeNormalizado: chave, NOT: { id } }, select: { nome: true } }),
        salvar: (id: string, nome: string, chave: string) =>
          db.motivoPerda.update({ where: { id }, data: { nome, nomeNormalizado: chave } }),
      };
  }
}

export async function editarNomeAction(
  _: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirSessaoProducao();
  const v = validar(nomeEdicaoSchema, lerForm(formData));
  if (v.erro) return { erro: v.erro };
  return executar(async () => {
    const { tipo, id, nome } = v.dados!;
    const op = operacoesDeNome(tipo);
    if (!(await op.existe(id))) throw new ErroProducao("Cadastro não encontrado.");
    const chave = chaveDoNome(nome);
    const mesmoNome = await op.outro(chave, id);
    if (mesmoNome) {
      throw new ErroProducao(`Já existe o ${op.rotulo} "${mesmoNome.nome}" com esse nome.`);
    }
    await op.salvar(id, nome, chave);
    atualizar();
    return "Nome atualizado.";
  });
}

// ------------------------------------------------------------------- ordens

export async function criarOrdem(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirSessaoProducao();
  const v = validar(ordemSchema, lerForm(formData));
  if (v.erro) return { erro: v.erro };
  return executar(async () => {
    const produto = await getDb().produto.findUnique({ where: { id: v.dados!.produtoId } });
    if (!produto?.ativo) throw new ErroProducao("Produto não encontrado ou inativo.");
    await getDb().ordemProducao.create({ data: v.dados! });
    atualizar();
    return "Ordem de produção criada.";
  });
}

export async function encerrarOrdemAction(
  _: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirSessaoProducao();
  const id = String(formData.get("id") ?? "");
  return executar(async () => {
    await encerrarOrdem(id);
    atualizar();
    return "Ordem encerrada.";
  });
}

export async function reabrirOrdemAction(
  _: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirSessaoProducao();
  const id = String(formData.get("id") ?? "");
  return executar(async () => {
    await reabrirOrdem(id);
    atualizar();
    return "Ordem reaberta.";
  });
}

// -------------------------------------------------------------- apontamentos

// Devolve todos os erros de uma vez, cada um com o campo para a tela levar o usuário até ele.
export async function registrarApontamentoAction(
  _: ResultadoApontamento,
  formData: FormData,
): Promise<ResultadoApontamento> {
  const sessao = await exigirSessaoProducao();
  const dados = lerForm(formData);
  const r = apontamentoSchema.safeParse(montarApontamento(dados));
  if (!r.success) return { erros: errosDoFormulario(r.error.issues, dados) };
  const quem = sessao.user?.email ?? "desconhecido";
  try {
    await registrarApontamento(r.data, quem);
    atualizar();
    return { sucesso: "Apontamento registrado." };
  } catch (e) {
    if (e instanceof ErroProducao) return { erros: [{ campo: e.campo, mensagem: e.message }] };
    if (eConflitoUnico(e)) {
      return { erros: [{ mensagem: "Já existe um cadastro com esses dados." }] };
    }
    console.error(e);
    return { erros: [{ mensagem: "Erro inesperado. Tente novamente." }] };
  }
}

export async function excluirApontamentoAction(
  _: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirSessaoProducao();
  const id = String(formData.get("id") ?? "");
  return executar(async () => {
    await excluirApontamento(id);
    atualizar();
    return "Apontamento excluído.";
  });
}
