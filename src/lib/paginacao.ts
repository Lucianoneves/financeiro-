// Paginação das listas. Função pura: só decide qual página mostrar.
// Os totais das telas nunca dependem daqui; paginar afeta só as linhas visíveis.

export const TAMANHO_PAGINA = 50;

/** Lê `?pagina=` da URL. Qualquer valor que não seja inteiro positivo vira 1. */
export function lerPagina(valor: string | string[] | undefined): number {
  if (typeof valor !== "string" || !/^\d{1,9}$/.test(valor)) return 1;
  const pagina = Number(valor);
  return pagina >= 1 ? pagina : 1;
}

export type JanelaDePagina = {
  pagina: number;
  totalPaginas: number;
  /** Quantos registros pular (skip). */
  pular: number;
  /** Quantos registros pegar (take). */
  tomar: number;
};

/** Ajusta a página pedida ao total existente (página além da última mostra a última). */
export function janelaDaPagina(
  total: number,
  paginaPedida: number,
  tamanho: number = TAMANHO_PAGINA,
): JanelaDePagina {
  const totalPaginas = Math.max(1, Math.ceil(total / tamanho));
  const pagina = Math.min(Math.max(1, paginaPedida), totalPaginas);
  return { pagina, totalPaginas, pular: (pagina - 1) * tamanho, tomar: tamanho };
}
