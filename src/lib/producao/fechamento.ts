// Resumo por ordem de produção para o fechamento de turno. Função pura, sem banco.

export type ApontamentoDeOrdem = {
  ordemId: string;
  ordemNumero: string;
  produtoNome: string;
  quantidadeBoa: number;
  pecasPerdidas: number;
};

export type LinhaDeOrdem = {
  ordemId: string;
  ordemNumero: string;
  produtoNome: string;
  apontamentos: number;
  pecasBoas: number;
  pecasPerdidas: number;
};

// Soma boas e perdidas por ordem. Ordenado pelo número da ordem (OP-2 antes de OP-10).
export function resumoPorOrdem(itens: ApontamentoDeOrdem[]): LinhaDeOrdem[] {
  const ordens = new Map<string, LinhaDeOrdem>();
  for (const i of itens) {
    const linha = ordens.get(i.ordemId) ?? {
      ordemId: i.ordemId,
      ordemNumero: i.ordemNumero,
      produtoNome: i.produtoNome,
      apontamentos: 0,
      pecasBoas: 0,
      pecasPerdidas: 0,
    };
    linha.apontamentos += 1;
    linha.pecasBoas += i.quantidadeBoa;
    linha.pecasPerdidas += i.pecasPerdidas;
    ordens.set(i.ordemId, linha);
  }
  return [...ordens.values()].sort((x, y) =>
    x.ordemNumero.localeCompare(y.ordemNumero, "pt-BR", { numeric: true }),
  );
}
