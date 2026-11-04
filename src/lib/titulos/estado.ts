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
