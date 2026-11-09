import { describe, expect, it } from "vitest";
import {
  indicadoresDe,
  relatorioDeProducao,
  type ApontamentoParaIndicador,
} from "./indicadores";

const apont = (extra: Partial<ApontamentoParaIndicador> = {}): ApontamentoParaIndicador => ({
  maquinaId: "m1",
  maquinaNome: "Injetora 1",
  operadorId: "o1",
  operadorNome: "Ana",
  produtoId: "p1",
  produtoNome: "Tampa",
  minutosPlanejados: 480,
  quantidadeBoa: 600,
  velocidadeNominal: 100,
  paradas: [{ motivoId: "mp1", motivoNome: "Intervalo", minutos: 60 }],
  perdas: [{ motivoId: "pe1", motivoNome: "Defeito", quantidade: 30 }],
  ...extra,
});

describe("indicadoresDe", () => {
  it("calcula o exemplo do plano: OEE de 75%", () => {
    // 480 min, 60 parados: disponibilidade 87,5%. Teórico 100 x 420/60 = 700.
    // Produzidas 630: desempenho 90%. Boas 600: qualidade 95,2%.
    const i = indicadoresDe([apont()]);
    expect(i.minutosOperando).toBe(420);
    expect(i.pecasTeoricas).toBeCloseTo(700);
    expect(i.disponibilidade).toBeCloseTo(0.875);
    expect(i.desempenho).toBeCloseTo(0.9);
    expect(i.qualidade).toBeCloseTo(600 / 630);
    expect(i.oee).toBeCloseTo(0.75);
    expect(i.indicePerdas).toBeCloseTo(30 / 630);
    expect(i.produtividade).toBeCloseTo(600 / 7);
  });

  it("OEE é o produto dos três fatores", () => {
    const i = indicadoresDe([apont()]);
    expect(i.oee).toBeCloseTo(i.disponibilidade! * i.desempenho! * i.qualidade!);
  });

  it("todas as paradas contam, inclusive intervalo", () => {
    const comIntervalo = indicadoresDe([apont()]);
    const semParadas = indicadoresDe([apont({ paradas: [] })]);
    expect(comIntervalo.disponibilidade!).toBeLessThan(semParadas.disponibilidade!);
    expect(semParadas.disponibilidade).toBe(1);
  });

  it("soma antes de dividir: apontamentos longos pesam mais", () => {
    const longo = apont({ minutosPlanejados: 600, paradas: [], quantidadeBoa: 1000, perdas: [] });
    const curto = apont({ minutosPlanejados: 60, paradas: [{ motivoId: "x", motivoNome: "Quebra", minutos: 60 }], quantidadeBoa: 0, perdas: [] });
    const i = indicadoresDe([longo, curto]);
    expect(i.disponibilidade).toBeCloseTo(600 / 660);
  });

  it("máquina parada o tempo todo tem OEE zero", () => {
    const i = indicadoresDe([
      apont({ paradas: [{ motivoId: "x", motivoNome: "Quebra", minutos: 480 }], quantidadeBoa: 0, perdas: [] }),
    ]);
    expect(i.disponibilidade).toBe(0);
    expect(i.oee).toBe(0);
    expect(i.desempenho).toBeNull();
    expect(i.produtividade).toBeNull();
  });

  it("operando sem produzir nada tem OEE zero e qualidade indefinida", () => {
    const i = indicadoresDe([apont({ paradas: [], quantidadeBoa: 0, perdas: [] })]);
    expect(i.oee).toBe(0);
    expect(i.qualidade).toBeNull();
    expect(i.indicePerdas).toBeNull();
  });

  it("sem apontamentos tudo é indefinido", () => {
    const i = indicadoresDe([]);
    expect(i.apontamentos).toBe(0);
    expect(i.oee).toBeNull();
    expect(i.disponibilidade).toBeNull();
  });

  it("desempenho pode passar de 100% se a velocidade cadastrada estiver baixa", () => {
    const i = indicadoresDe([apont({ velocidadeNominal: 50, paradas: [], perdas: [] })]);
    expect(i.desempenho!).toBeGreaterThan(1);
  });
});

describe("relatorioDeProducao", () => {
  const dados = [
    apont(),
    apont({ maquinaId: "m2", maquinaNome: "Extrusora", operadorId: "o2", operadorNome: "Bruno", quantidadeBoa: 900, perdas: [], paradas: [{ motivoId: "mp2", motivoNome: "Manutenção", minutos: 120 }] }),
    apont({ minutosPlanejados: 240, paradas: [{ motivoId: "mp1", motivoNome: "Intervalo", minutos: 30 }], quantidadeBoa: 300, perdas: [{ motivoId: "pe1", motivoNome: "Defeito", quantidade: 10 }] }),
  ];

  it("agrupa por máquina em ordem alfabética", () => {
    const r = relatorioDeProducao(dados);
    expect(r.porMaquina.map((l) => l.rotulo)).toEqual(["Extrusora", "Injetora 1"]);
    expect(r.porMaquina[1].apontamentos).toBe(2);
    expect(r.porMaquina[1].pecasBoas).toBe(900);
  });

  it("ordena operadores por peças boas, maior primeiro", () => {
    const r = relatorioDeProducao(dados);
    expect(r.porOperador.map((l) => l.rotulo)).toEqual(["Ana", "Bruno"]);
    expect(r.porOperador[0].pecasBoas).toBe(900);
  });

  it("totaliza paradas por motivo, maior primeiro, com participação no tempo planejado", () => {
    const r = relatorioDeProducao(dados);
    expect(r.paradasPorMotivo.map((m) => [m.rotulo, m.quantidade])).toEqual([
      ["Manutenção", 120],
      ["Intervalo", 90],
    ]);
    // planejado total: 480 + 480 + 240 = 1200
    expect(r.paradasPorMotivo[0].participacao).toBeCloseTo(120 / 1200);
  });

  it("totaliza perdas por motivo com participação nas peças produzidas", () => {
    const r = relatorioDeProducao(dados);
    expect(r.perdasPorMotivo).toHaveLength(1);
    expect(r.perdasPorMotivo[0].quantidade).toBe(40);
    // produzidas: (600+30) + 900 + (300+10) = 1840
    expect(r.perdasPorMotivo[0].participacao).toBeCloseTo(40 / 1840);
  });

  it("o total confere com a soma das máquinas", () => {
    const r = relatorioDeProducao(dados);
    expect(r.total.pecasBoas).toBe(r.porMaquina.reduce((s, l) => s + l.pecasBoas, 0));
    expect(r.total.minutosParados).toBe(r.porMaquina.reduce((s, l) => s + l.minutosParados, 0));
  });
});
