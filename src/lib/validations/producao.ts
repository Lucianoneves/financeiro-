import { z } from "zod";

import { horarioLocalValido } from "@/lib/producao/tempo";

const LINHAS_POR_LISTA = 5;
// Cabe folgado num Int do Postgres e barra digitação absurda.
const LIMITE_PECAS = 10_000_000;

function inteiro(rotulo: string, minimo: number, maximo = LIMITE_PECAS) {
  return z
    .string()
    .regex(/^\d+$/, `${rotulo}: use um número inteiro`)
    .transform(Number)
    .refine((n) => n >= minimo && n <= maximo, `${rotulo}: informe entre ${minimo} e ${maximo}`);
}

const id = (mensagem: string) => z.string().min(1, mensagem);

const nome = (mensagem: string) => z.string().trim().min(2, mensagem).max(80);

export const maquinaSchema = z.object({
  codigo: z.string().trim().min(1, "Informe o código da máquina").max(40, "Código: máximo de 40 caracteres"),
  nome: nome("Informe o nome da máquina"),
});

// Edição de uma máquina já cadastrada.
export const maquinaEdicaoSchema = maquinaSchema.extend({ id: id("Máquina inválida") });

// Turno, operador e motivos não têm tela de cadastro: são digitados no apontamento
// e criados na hora se ainda não existirem (ver servico.ts).
const nomeDeCadastro = (rotulo: string) =>
  z.string().trim().min(1, `${rotulo}: informe o nome`).max(80, `${rotulo}: máximo de 80 caracteres`);

// Edição de um operador já cadastrado (nome e matrícula). Matrícula vazia remove a matrícula.
export const operadorEdicaoSchema = z.object({
  id: id("Operador inválido"),
  nome: nomeDeCadastro("Operador"),
  matricula: z
    .string()
    .trim()
    .max(40, "Matrícula: máximo de 40 caracteres")
    .optional()
    .transform((v) => (v ? v : undefined)),
});

// Renomear turno ou motivo de parada/perda já cadastrado.
export const nomeEdicaoSchema = z.object({
  tipo: z.enum(["turno", "motivoParada", "motivoPerda"], "Cadastro inválido"),
  id: id("Cadastro inválido"),
  nome: nomeDeCadastro("Nome"),
});

export const produtoSchema = z.object({
  codigo: z.string().trim().min(1, "Informe o código do produto").max(40),
  nome: z.string().trim().min(2, "Informe o nome do produto").max(120),
});

// Edição de um produto já cadastrado (código e nome).
export const produtoEdicaoSchema = produtoSchema.extend({ id: id("Produto inválido") });

export const velocidadeSchema = z.object({
  maquinaId: id("Escolha a máquina"),
  produtoId: id("Escolha o produto"),
  pecasPorHora: inteiro("Peças por hora", 1, 1_000_000),
});

export const ordemSchema = z.object({
  numero: z.string().trim().min(1, "Informe o número da ordem").max(40),
  produtoId: id("Escolha o produto"),
  quantidadePlanejada: inteiro("Quantidade planejada", 1),
});

const horario = (rotulo: string) =>
  z.string().refine(horarioLocalValido, `${rotulo}: data ou hora inválida`);

export const apontamentoSchema = z.object({
  ordemId: id("Escolha a ordem de produção"),
  maquinaId: id("Escolha a máquina"),
  operador: nomeDeCadastro("Operador"),
  turno: nomeDeCadastro("Turno"),
  inicio: horario("Início"),
  fim: horario("Fim"),
  quantidadeBoa: inteiro("Quantidade boa", 0),
  paradas: z.array(
    z.object({
      motivo: nomeDeCadastro("Parada: motivo"),
      minutos: inteiro("Parada: minutos", 1, 24 * 60),
    }),
  ),
  perdas: z.array(
    z.object({
      motivo: nomeDeCadastro("Perda: motivo"),
      quantidade: inteiro("Perda: quantidade", 1),
    }),
  ),
});

export type ApontamentoInput = z.infer<typeof apontamentoSchema>;

// O formulário manda as linhas de parada e de perda como campos soltos
// (paradaMotivo0, paradaMinutos0, perdaMotivo0, perdaQuantidade0, ...).
// Linhas totalmente vazias são ignoradas; linha pela metade vira erro de validação.
// Índices (0 a 4) das linhas que têm algo preenchido. Linha vazia não entra na lista.
function linhasPreenchidas(dados: Record<string, string>, prefixo: string, campoValor: string) {
  const indices: number[] = [];
  for (let i = 0; i < LINHAS_POR_LISTA; i++) {
    if (dados[`${prefixo}Motivo${i}`] || dados[`${prefixo}${campoValor}${i}`]) indices.push(i);
  }
  return indices;
}

export function montarApontamento(dados: Record<string, string>) {
  const linhas = (prefixo: string, campoValor: string) =>
    linhasPreenchidas(dados, prefixo, campoValor).map((i) => ({
      motivo: dados[`${prefixo}Motivo${i}`] ?? "",
      [campoValor.toLowerCase()]: dados[`${prefixo}${campoValor}${i}`] ?? "",
    }));

  return {
    ordemId: dados.ordemId ?? "",
    maquinaId: dados.maquinaId ?? "",
    operador: dados.operador ?? "",
    turno: dados.turno ?? "",
    inicio: dados.inicio ?? "",
    fim: dados.fim ?? "",
    quantidadeBoa: dados.quantidadeBoa ?? "",
    paradas: linhas("parada", "Minutos"),
    perdas: linhas("perda", "Quantidade"),
  };
}

// Nome do campo do formulário de um erro do Zod. Erro de linha de parada ou perda
// volta ao número da linha original, porque linhas vazias são descartadas.
export function campoDoErro(caminho: PropertyKey[], dados: Record<string, string>): string | undefined {
  const [raiz, indice, sub] = caminho;
  if (raiz === "paradas" || raiz === "perdas") {
    const prefixo = raiz === "paradas" ? "parada" : "perda";
    const campoValor = raiz === "paradas" ? "Minutos" : "Quantidade";
    const linha = linhasPreenchidas(dados, prefixo, campoValor)[Number(indice)];
    if (linha === undefined) return undefined;
    const sufixo = sub === "motivo" ? "Motivo" : campoValor;
    return `${prefixo}${sufixo}${linha}`;
  }
  return typeof raiz === "string" ? raiz : undefined;
}

// Uma mensagem por campo (a primeira), na ordem em que aparecem no formulário.
export function errosDoFormulario(
  erros: { path: PropertyKey[]; message: string }[],
  dados: Record<string, string>,
) {
  const vistos = new Set<string>();
  const resultado: { campo?: string; mensagem: string }[] = [];
  for (const e of erros) {
    const campo = campoDoErro(e.path, dados);
    const chave = campo ?? e.message;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    resultado.push({ campo, mensagem: e.message });
  }
  return resultado;
}

export const LINHAS_DE_PARADA_E_PERDA = LINHAS_POR_LISTA;
