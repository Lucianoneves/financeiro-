import { describe, expect, it } from "vitest";
import { totaisDeAntecipacoes, totaisPorConta } from "./totais";

const base = { status: "ATIVA" as const, tituloBaixado: false };

describe("totaisPorConta", () => {
  it("separa os totais por conta e ignora canceladas", () => {
    const t = totaisPorConta([
      { ...base, contaId: "a", valorLiquido: "970.00", juros: "25.00", tarifas: "5.00" },
      { ...base, contaId: "a", tituloBaixado: true, valorLiquido: "100.00", juros: "0.00", tarifas: "0.00" },
      { ...base, contaId: "b", valorLiquido: "50.00", juros: "1.00", tarifas: "1.00" },
      { ...base, status: "CANCELADA", contaId: "b", valorLiquido: "999.00", juros: "9.00", tarifas: "9.00" },
    ]);
    expect(t.get("a")).toEqual({
      quantidade: 2,
      recebidoCentavos: 107000n,
      recebidoPendenteCentavos: 97000n,
      jurosCentavos: 2500n,
      tarifasCentavos: 500n,
    });
    expect(t.get("b")?.quantidade).toBe(1);
    expect(t.get("b")?.recebidoCentavos).toBe(5000n);
    expect(t.has("c")).toBe(false);
  });
});

describe("totaisDeAntecipacoes", () => {
  it("soma líquido, juros e tarifas das antecipações ativas", () => {
    const t = totaisDeAntecipacoes([
      { ...base, valorLiquido: "970.00", juros: "25.50", tarifas: "4.50" },
      { ...base, valorLiquido: "0.10", juros: "0.10", tarifas: "0.10" },
    ]);
    expect(t.recebidoCentavos).toBe(97010n);
    expect(t.jurosCentavos).toBe(2560n);
    expect(t.tarifasCentavos).toBe(460n);
  });

  it("ignora antecipações canceladas", () => {
    const t = totaisDeAntecipacoes([
      { ...base, status: "CANCELADA", valorLiquido: "500.00", juros: "10.00", tarifas: "5.00" },
    ]);
    expect(t).toEqual({
      recebidoCentavos: 0n,
      recebidoPendenteCentavos: 0n,
      jurosCentavos: 0n,
      tarifasCentavos: 0n,
    });
  });

  it("a baixa do título não muda o total recebido, só o pendente", () => {
    const antes = totaisDeAntecipacoes([
      { ...base, valorLiquido: "970.00", juros: "25.00", tarifas: "5.00" },
    ]);
    const depois = totaisDeAntecipacoes([
      { ...base, tituloBaixado: true, valorLiquido: "970.00", juros: "25.00", tarifas: "5.00" },
    ]);
    expect(antes.recebidoCentavos).toBe(depois.recebidoCentavos);
    expect(antes.recebidoPendenteCentavos).toBe(97000n);
    expect(depois.recebidoPendenteCentavos).toBe(0n);
    expect(depois.jurosCentavos).toBe(antes.jurosCentavos);
  });

  it("lista vazia dá tudo zero", () => {
    expect(totaisDeAntecipacoes([]).recebidoCentavos).toBe(0n);
  });
});
