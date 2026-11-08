// Indicadores de produção. Funções puras, sem banco: a tela monta os apontamentos
// e chama relatorioDeProducao. Tudo é derivado; nada disto é gravado.
//
// OEE = Disponibilidade x Desempenho x Qualidade, com TODAS as paradas contando
// contra a disponibilidade (inclusive intervalo), por decisão do negócio.
//   Disponibilidade = tempo operando / tempo planejado
//   Desempenho      = peças produzidas / peças teóricas
//   Qualidade       = peças boas / peças produzidas
// As somas são feitas antes das divisões, então apontamentos longos pesam mais.

export type ApontamentoParaIndicador = {
  maquinaId: string;
  maquinaNome: string;
  operadorId: string;
  operadorNome: string;
  produtoId: string;
  produtoNome: string;
  minutosPlanejados: number;
  quantidadeBoa: number;
  velocidadeNominal: number; // peças por hora, copiada no lançamento
  paradas: { motivoId: string; motivoNome: string; minutos: number }[];
  perdas: { motivoId: string; motivoNome: string; quantidade: number }[];
};

export type Indicadores = {
  apontamentos: number;
  minutosPlanejados: number;
  minutosParados: number;
  minutosOperando: number;
  pecasBoas: number;
  pecasPerdidas: number;
  pecasProduzidas: number;
  // Quanto a máquina deveria ter produzido no tempo em que operou.
  pecasTeoricas: number;
  disponibilidade: number | null;
  desempenho: number | null;
  qualidade: number | null;
  oee: number | null;
  // perdas / produzidas
  indicePerdas: number | null;
  // peças boas por hora de operação
  produtividade: number | null;
};

export type LinhaDeIndicador = { chave: string; rotulo: string } & Indicadores;

export type LinhaDeMotivo = {
  chave: string;
  rotulo: string;
  // minutos (paradas) ou peças (perdas)
  quantidade: number;
  // fração do total do conjunto (tempo planejado ou peças produzidas)
  participacao: number | null;
};

export type RelatorioDeProducao = {
  total: Indicadores;
  porMaquina: LinhaDeIndicador[];
  porOperador: LinhaDeIndicador[];
  porProduto: LinhaDeIndicador[];
  paradasPorMotivo: LinhaDeMotivo[];
  perdasPorMotivo: LinhaDeMotivo[];
};

function razao(numerador: number, denominador: number) {
  return denominador > 0 ? numerador / denominador : null;
}

function acumulador() {
  return {
    apontamentos: 0,
    minutosPlanejados: 0,
    minutosParados: 0,
    pecasBoas: 0,
    pecasPerdidas: 0,
    pecasTeoricas: 0,
  };
}

type Acumulador = ReturnType<typeof acumulador>;

function somar(acc: Acumulador, a: ApontamentoParaIndicador) {
  const parados = a.paradas.reduce((s, p) => s + p.minutos, 0);
  const perdidas = a.perdas.reduce((s, p) => s + p.quantidade, 0);
  const operando = Math.max(0, a.minutosPlanejados - parados);
  acc.apontamentos += 1;
  acc.minutosPlanejados += a.minutosPlanejados;
  acc.minutosParados += parados;
  acc.pecasBoas += a.quantidadeBoa;
  acc.pecasPerdidas += perdidas;
  acc.pecasTeoricas += (a.velocidadeNominal * operando) / 60;
}

function fechar(acc: Acumulador): Indicadores {
  const minutosOperando = Math.max(0, acc.minutosPlanejados - acc.minutosParados);
  const pecasProduzidas = acc.pecasBoas + acc.pecasPerdidas;
  const disponibilidade = razao(minutosOperando, acc.minutosPlanejados);

  // OEE = D x (produzidas/teóricas) x (boas/produzidas) = D x boas/teóricas.
  // Escrito assim não depende de haver peças produzidas (qualidade 0/0).
  let oee: number | null = null;
  if (disponibilidade !== null) {
    if (acc.pecasTeoricas > 0) oee = (disponibilidade * acc.pecasBoas) / acc.pecasTeoricas;
    else if (disponibilidade === 0) oee = 0;
  }

  return {
    apontamentos: acc.apontamentos,
    minutosPlanejados: acc.minutosPlanejados,
    minutosParados: acc.minutosParados,
    minutosOperando,
    pecasBoas: acc.pecasBoas,
    pecasPerdidas: acc.pecasPerdidas,
    pecasProduzidas,
    pecasTeoricas: acc.pecasTeoricas,
    disponibilidade,
    desempenho: razao(pecasProduzidas, acc.pecasTeoricas),
    qualidade: razao(acc.pecasBoas, pecasProduzidas),
    oee,
    indicePerdas: razao(acc.pecasPerdidas, pecasProduzidas),
    produtividade: razao(acc.pecasBoas, minutosOperando / 60),
  };
}

export function indicadoresDe(apontamentos: ApontamentoParaIndicador[]): Indicadores {
  const acc = acumulador();
  for (const a of apontamentos) somar(acc, a);
  return fechar(acc);
}

function agrupar(
  apontamentos: ApontamentoParaIndicador[],
  chaveDe: (a: ApontamentoParaIndicador) => string,
  rotuloDe: (a: ApontamentoParaIndicador) => string,
): LinhaDeIndicador[] {
  const grupos = new Map<string, { rotulo: string; acc: Acumulador }>();
  for (const a of apontamentos) {
    const chave = chaveDe(a);
    const grupo = grupos.get(chave) ?? { rotulo: rotuloDe(a), acc: acumulador() };
    somar(grupo.acc, a);
    grupos.set(chave, grupo);
  }
  return [...grupos.entries()].map(([chave, g]) => ({
    chave,
    rotulo: g.rotulo,
    ...fechar(g.acc),
  }));
}

function porMotivo(
  itens: { motivoId: string; motivoNome: string; quantidade: number }[],
  base: number,
): LinhaDeMotivo[] {
  const motivos = new Map<string, LinhaDeMotivo>();
  for (const i of itens) {
    const m = motivos.get(i.motivoId) ?? {
      chave: i.motivoId,
      rotulo: i.motivoNome,
      quantidade: 0,
      participacao: null,
    };
    m.quantidade += i.quantidade;
    motivos.set(i.motivoId, m);
  }
  return [...motivos.values()]
    .map((m) => ({ ...m, participacao: razao(m.quantidade, base) }))
    .sort((x, y) => y.quantidade - x.quantidade || x.rotulo.localeCompare(y.rotulo, "pt-BR"));
}

const porRotulo = (x: LinhaDeIndicador, y: LinhaDeIndicador) =>
  x.rotulo.localeCompare(y.rotulo, "pt-BR");

export function relatorioDeProducao(
  apontamentos: ApontamentoParaIndicador[],
): RelatorioDeProducao {
  const total = indicadoresDe(apontamentos);

  return {
    total,
    porMaquina: agrupar(apontamentos, (a) => a.maquinaId, (a) => a.maquinaNome).sort(porRotulo),
    // Quem produziu mais peças boas primeiro; empate pelo nome.
    porOperador: agrupar(apontamentos, (a) => a.operadorId, (a) => a.operadorNome).sort(
      (x, y) => y.pecasBoas - x.pecasBoas || porRotulo(x, y),
    ),
    porProduto: agrupar(apontamentos, (a) => a.produtoId, (a) => a.produtoNome).sort(
      (x, y) => y.pecasBoas - x.pecasBoas || porRotulo(x, y),
    ),
    paradasPorMotivo: porMotivo(
      apontamentos.flatMap((a) =>
        a.paradas.map((p) => ({
          motivoId: p.motivoId,
          motivoNome: p.motivoNome,
          quantidade: p.minutos,
        })),
      ),
      total.minutosPlanejados,
    ),
    perdasPorMotivo: porMotivo(
      apontamentos.flatMap((a) => a.perdas),
      total.pecasProduzidas,
    ),
  };
}
