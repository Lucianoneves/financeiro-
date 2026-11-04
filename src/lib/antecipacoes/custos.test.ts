import { describe, expect, it } from "vitest";
import {
  custoEmCentesimosDePercentual,
  relatorioDeCustos,
  type AntecipacaoParaCusto,
} from "./custos";

const ant = (extra: Partial<AntecipacaoParaCusto> = {}): AntecipacaoParaCusto => ({
  status: "ATIVA",
  dataAntecipacao: new Date("2026-11-03T00:00:00.000Z"),
  contaId: "c1",
  contaNome: "Banco A",
  valorBruto: "1000.00",
  juros: "25.00",
  tarifas: "5.00",
  valorLiquido: "970.00",
  ...extra,
});

describe("relatorioDeCustos", () => {
  it("soma bruto, juros, tarifas, líquido e custo", () => {
    const r = relatorioDeCustos([ant(), ant({ valorBruto: "500.00", juros: "10.50", tarifas: "4.50", valorLiquido: "485.00" })]);
    expect(r.total.quantidade).toBe(2);
    expect(r.total.brutoCentavos).toBe(150000n);
    expect(r.total.jurosCentavos).toBe(3550n);
    expect(r.total.tarifasCentavos).toBe(950n);
    expect(r.total.liquidoCentavos).toBe(145500n);
    expect(r.total.custoCentavos).toBe(4500n);
  });

  it("ignora antecipações canceladas", () => {
    const r = relatorioDeCustos([ant({ status: "CANCELADA" })]);
    expect(r.total.quantidade).toBe(0);
    expect(r.porConta).toEqual([]);
    expect(r.porMes).toEqual([]);
  });

  it("agrupa por conta, com o maior custo primeiro", () => {
    const r = relatorioDeCustos([
      ant({ contaId: "c1", contaNome: "Banco A", juros: "10.00", tarifas: "0.00" }),
      ant({ contaId: "c2", contaNome: "Banco B", juros: "50.00", tarifas: "5.00" }),
      ant({ contaId: "c1", contaNome: "Banco A", juros: "10.00", tarifas: "0.00" }),
    ]);
    expect(r.porConta.map((l) => l.rotulo)).toEqual(["Banco B", "Banco A"]);
    expect(r.porConta[1].quantidade).toBe(2);
    expect(r.porConta[1].custoCentavos).toBe(2000n);
  });

  it("agrupa por mês da data da antecipação, do mais recente para o mais antigo", () => {
    const r = relatorioDeCustos([
      ant({ dataAntecipacao: new Date("2026-09-30T00:00:00.000Z") }),
      ant({ dataAntecipacao: new Date("2026-11-01T00:00:00.000Z") }),
      ant({ dataAntecipacao: new Date("2026-11-20T00:00:00.000Z") }),
    ]);
    expect(r.porMes.map((l) => [l.chave, l.quantidade])).toEqual([
      ["2026-11", 2],
      ["2026-09", 1],
    ]);
  });

  it("a soma das contas e a soma dos meses batem com o total", () => {
    const r = relatorioDeCustos([
      ant({ contaId: "c1" }),
      ant({ contaId: "c2", contaNome: "B", dataAntecipacao: new Date("2026-10-05T00:00:00.000Z") }),
    ]);
    const soma = (ls: { custoCentavos: bigint }[]) => ls.reduce((s, l) => s + l.custoCentavos, 0n);
    expect(soma(r.porConta)).toBe(r.total.custoCentavos);
    expect(soma(r.porMes)).toBe(r.total.custoCentavos);
  });
});

describe("custoEmCentesimosDePercentual", () => {
  it("calcula o custo sobre o bruto em centésimos de ponto percentual", () => {
    const r = relatorioDeCustos([ant({ valorBruto: "1000.00", juros: "20.00", tarifas: "3.50" })]);
    // 23,50 / 1000,00 = 2,35%
    expect(custoEmCentesimosDePercentual(r.total)).toBe(235n);
  });

  it("arredonda para o centésimo mais próximo", () => {
    const r = relatorioDeCustos([ant({ valorBruto: "3.00", juros: "0.01", tarifas: "0.00" })]);
    // 0,01 / 3,00 = 0,3333% -> 0,33%
    expect(custoEmCentesimosDePercentual(r.total)).toBe(33n);
  });

  it("devolve null sem valor bruto", () => {
    expect(custoEmCentesimosDePercentual(relatorioDeCustos([]).total)).toBeNull();
  });
});
