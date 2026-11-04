import { paraCentavos } from "@/lib/dinheiro";

type AntecipacaoParaTotal = {
  status: "ATIVA" | "CANCELADA";
  valorLiquido: string;
  juros: string;
  tarifas: string;
  // O título da antecipação já foi baixado (cliente pagou)?
  tituloBaixado: boolean;
};

export type TotaisAntecipacao = {
  // Dinheiro que entrou nas antecipações ativas. A baixa NÃO altera este valor:
  // quando o cliente paga, o dinheiro vai para o banco, não entra de novo.
  recebidoCentavos: bigint;
  // Parte do recebido cujo título ainda espera a baixa do cliente.
  recebidoPendenteCentavos: bigint;
  jurosCentavos: bigint;
  tarifasCentavos: bigint;
};

// Soma só antecipações ATIVAS; as canceladas não representam dinheiro recebido.
export function totaisDeAntecipacoes(
  antecipacoes: AntecipacaoParaTotal[],
): TotaisAntecipacao {
  const totais: TotaisAntecipacao = {
    recebidoCentavos: 0n,
    recebidoPendenteCentavos: 0n,
    jurosCentavos: 0n,
    tarifasCentavos: 0n,
  };
  for (const a of antecipacoes) {
    if (a.status !== "ATIVA") continue;
    const liquido = paraCentavos(a.valorLiquido);
    totais.recebidoCentavos += liquido;
    if (!a.tituloBaixado) totais.recebidoPendenteCentavos += liquido;
    totais.jurosCentavos += paraCentavos(a.juros);
    totais.tarifasCentavos += paraCentavos(a.tarifas);
  }
  return totais;
}
