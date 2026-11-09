import { z } from "zod";

import { deCentavos, paraCentavos, valorMonetarioValido } from "@/lib/dinheiro";
import { gestaoClickFetch } from "./client";

// Só os campos que usamos. O resto da resposta é ignorado de propósito, para a
// integração não quebrar se o GestãoClick acrescentar campos. `liquidado` e
// `data_liquidacao` ficam de fora de propósito: a baixa do ERP significa que o
// banco pagou a antecipação, não que o cliente pagou, então não é importada.
const textoOuNulo = z.string().nullable().optional();

const recebimentoSchema = z.object({
  id: z.string().min(1),
  codigo: z.string().min(1),
  descricao: textoOuNulo,
  valor_total: z.string(),
  nome_cliente: textoOuNulo,
  nome_fornecedor: textoOuNulo,
  data_vencimento: z.string(),
});

// A documentação do GestãoClick não traz `meta` na resposta de /recebimentos:
// a paginação é decidida pelo tamanho da página, não por contadores do ERP.
// Lista vazia vem como 200 sem `data` ("Nenhuma movimentação foi encontrada!").
const paginaSchema = z.object({
  data: z.array(recebimentoSchema).default([]),
});

export type Recebimento = z.infer<typeof recebimentoSchema>;

export type TituloDoErp = {
  idExterno: string;
  numero: string;
  cliente: string;
  valor: string;
  vencimento: Date;
};

const DATA = /^\d{4}-\d{2}-\d{2}$/;

function dataUtc(texto: string): Date | null {
  if (!DATA.test(texto)) return null;
  const d = new Date(`${texto}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Converte um recebimento do ERP em título. Devolve o motivo quando não dá,
// para o relatório da sincronização contar o que foi ignorado.
export function recebimentoParaTitulo(
  r: Recebimento,
): { titulo: TituloDoErp } | { ignorado: string } {
  if (!valorMonetarioValido(r.valor_total) || Number(r.valor_total) <= 0) {
    return { ignorado: "valor inválido ou zerado" };
  }
  const vencimento = dataUtc(r.data_vencimento);
  if (!vencimento) return { ignorado: "vencimento inválido" };

  return {
    titulo: {
      idExterno: r.id,
      numero: r.codigo,
      cliente: r.nome_cliente?.trim() || r.nome_fornecedor?.trim() || "(sem cliente)",
      // valor_total = valor + juros - desconto: é o que o cliente paga no boleto.
      valor: deCentavos(paraCentavos(r.valor_total)),
      vencimento,
    },
  };
}

const LIMITE_POR_PAGINA = 100;
// Trava de segurança contra laço infinito se a paginação do ERP mudar.
const MAXIMO_DE_PAGINAS = 200;

type Filtros = {
  dataInicio?: string;
  dataFim?: string;
  codigo?: string;
  lojaId?: string;
};

// Lê todas as páginas de /recebimentos. Somente leitura (GET).
export async function listarRecebimentos(filtros: Filtros): Promise<Recebimento[]> {
  const todos: Recebimento[] = [];

  for (let pagina = 1; pagina <= MAXIMO_DE_PAGINAS; pagina++) {
    const q = new URLSearchParams({
      limite: String(LIMITE_POR_PAGINA),
      pagina: String(pagina),
    });
    if (filtros.dataInicio) q.set("data_inicio", filtros.dataInicio);
    if (filtros.dataFim) q.set("data_fim", filtros.dataFim);
    if (filtros.codigo) q.set("codigo", filtros.codigo);
    if (filtros.lojaId) q.set("loja_id", filtros.lojaId);

    const resposta = paginaSchema.parse(
      await gestaoClickFetch<unknown>(`/recebimentos?${q}`),
    );
    todos.push(...resposta.data);

    // Página com menos registros que o limite é a última.
    if (resposta.data.length < LIMITE_POR_PAGINA) return todos;
  }
  throw new Error("Paginação do GestãoClick passou do limite de segurança.");
}
