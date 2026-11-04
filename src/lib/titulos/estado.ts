export type EstadoTitulo = "BAIXADO" | "ANTECIPADO_PENDENTE" | "EM_ABERTO";

// Estado derivado, nunca gravado. Baixado tem prioridade: depois que o cliente
// paga, o título está quitado mesmo que tenha sido antecipado antes.
export function estadoDoTitulo(
  titulo: { baixadoEm: Date | null },
  antecipacoes: { status: "ATIVA" | "CANCELADA" }[],
): EstadoTitulo {
  if (titulo.baixadoEm) return "BAIXADO";
  if (antecipacoes.some((a) => a.status === "ATIVA")) return "ANTECIPADO_PENDENTE";
  return "EM_ABERTO";
}

export const ESTADOS_TITULO: EstadoTitulo[] = ["EM_ABERTO", "ANTECIPADO_PENDENTE", "BAIXADO"];

// Lê o filtro da URL (?estado=...). Qualquer valor desconhecido vira "sem filtro".
export function lerFiltroEstado(valor: string | string[] | undefined): EstadoTitulo | undefined {
  return ESTADOS_TITULO.find((e) => e === valor);
}

// Quantidade e soma (em centavos) de títulos por estado, para os totais do topo.
export function totaisPorEstado(
  titulos: { estado: EstadoTitulo; valorCentavos: bigint }[],
): Record<EstadoTitulo, { quantidade: number; centavos: bigint }> {
  const totais = {
    EM_ABERTO: { quantidade: 0, centavos: 0n },
    ANTECIPADO_PENDENTE: { quantidade: 0, centavos: 0n },
    BAIXADO: { quantidade: 0, centavos: 0n },
  };
  for (const t of titulos) {
    totais[t.estado].quantidade += 1;
    totais[t.estado].centavos += t.valorCentavos;
  }
  return totais;
}
