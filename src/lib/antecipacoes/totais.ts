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

export type AntecipacaoComConta = AntecipacaoParaTotal & { contaId: string };

export type TotaisDaConta = TotaisAntecipacao & { quantidade: number };

// Totais por conta bancária (só antecipações ATIVAS). Contas sem nenhuma
// antecipação ativa não aparecem no resultado: quem chama preenche com zero.
export function totaisPorConta(
  antecipacoes: AntecipacaoComConta[],
): Map<string, TotaisDaConta> {
  const porConta = new Map<string, TotaisDaConta>();
  for (const a of antecipacoes) {
    if (a.status !== "ATIVA") continue;
    let totais = porConta.get(a.contaId);
    if (!totais) {
      totais = {
        quantidade: 0,
        recebidoCentavos: 0n,
        recebidoPendenteCentavos: 0n,
        jurosCentavos: 0n,
        tarifasCentavos: 0n,
      };
      porConta.set(a.contaId, totais);
    }
    const parcial = totaisDeAntecipacoes([a]);
    totais.quantidade += 1;
    totais.recebidoCentavos += parcial.recebidoCentavos;
    totais.recebidoPendenteCentavos += parcial.recebidoPendenteCentavos;
    totais.jurosCentavos += parcial.jurosCentavos;
    totais.tarifasCentavos += parcial.tarifasCentavos;
  }
  return porConta;
}

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
