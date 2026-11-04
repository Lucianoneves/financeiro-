import { paraCentavos } from "@/lib/dinheiro";

export type AntecipacaoParaCusto = {
  status: "ATIVA" | "CANCELADA";
  dataAntecipacao: Date;
  contaId: string;
  contaNome: string;
  valorBruto: string;
  juros: string;
  tarifas: string;
  valorLiquido: string;
};

export type LinhaDeCusto = {
  chave: string;
  rotulo: string;
  quantidade: number;
  brutoCentavos: bigint;
  jurosCentavos: bigint;
  tarifasCentavos: bigint;
  liquidoCentavos: bigint;
  // juros + tarifas
  custoCentavos: bigint;
};

export type RelatorioDeCustos = {
  total: LinhaDeCusto;
  porConta: LinhaDeCusto[];
  porMes: LinhaDeCusto[];
};

function linhaVazia(chave: string, rotulo: string): LinhaDeCusto {
  return {
    chave,
    rotulo,
    quantidade: 0,
    brutoCentavos: 0n,
    jurosCentavos: 0n,
    tarifasCentavos: 0n,
    liquidoCentavos: 0n,
    custoCentavos: 0n,
  };
}

function somar(linha: LinhaDeCusto, a: AntecipacaoParaCusto) {
  const juros = paraCentavos(a.juros);
  const tarifas = paraCentavos(a.tarifas);
  linha.quantidade += 1;
  linha.brutoCentavos += paraCentavos(a.valorBruto);
  linha.jurosCentavos += juros;
  linha.tarifasCentavos += tarifas;
  linha.liquidoCentavos += paraCentavos(a.valorLiquido);
  linha.custoCentavos += juros + tarifas;
}

// Custo percentual sobre o valor bruto, em centésimos de ponto percentual
// (235 = 2,35%). Inteiro, para não usar ponto flutuante em dinheiro.
// Arredonda para o mais próximo. Sem valor bruto, devolve null.
export function custoEmCentesimosDePercentual(linha: LinhaDeCusto): bigint | null {
  if (linha.brutoCentavos === 0n) return null;
  return (linha.custoCentavos * 20000n + linha.brutoCentavos) / (linha.brutoCentavos * 2n);
}

// Agrupa só antecipações ATIVAS (as canceladas não custaram nada). A baixa do
// título não entra aqui: o custo existe desde que o banco adiantou o dinheiro.
export function relatorioDeCustos(
  antecipacoes: AntecipacaoParaCusto[],
): RelatorioDeCustos {
  const total = linhaVazia("total", "Total");
  const contas = new Map<string, LinhaDeCusto>();
  const meses = new Map<string, LinhaDeCusto>();

  for (const a of antecipacoes) {
    if (a.status !== "ATIVA") continue;
    somar(total, a);

    const conta = contas.get(a.contaId) ?? linhaVazia(a.contaId, a.contaNome);
    somar(conta, a);
    contas.set(a.contaId, conta);

    const mes = a.dataAntecipacao.toISOString().slice(0, 7);
    const linhaMes = meses.get(mes) ?? linhaVazia(mes, mes);
    somar(linhaMes, a);
    meses.set(mes, linhaMes);
  }

  return {
    total,
    // Maior custo primeiro; empate pelo nome para a ordem ser estável.
    porConta: [...contas.values()].sort(
      (x, y) =>
        Number(y.custoCentavos - x.custoCentavos) || x.rotulo.localeCompare(y.rotulo, "pt-BR"),
    ),
    // Mês mais recente primeiro.
    porMes: [...meses.values()].sort((x, y) => y.chave.localeCompare(x.chave)),
  };
}
