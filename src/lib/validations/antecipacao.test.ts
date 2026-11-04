import { describe, expect, it } from "vitest";
import { antecipacaoSchema, valorLiquido } from "./antecipacao";

const base = {
  tituloId: "123",
  contaId: "456",
  valorBruto: "1000.00",
  jurosCobrados: "25.00",
  tarifasCobradas: "5.00",
  dataAntecipacao: "2026-11-03",
};

describe("antecipacaoSchema", () => {
  it("aceita uma antecipação válida", () => {
    expect(antecipacaoSchema.safeParse(base).success).toBe(true);
  });

  it("rejeita valor bruto zerado", () => {
    const r = antecipacaoSchema.safeParse({ ...base, valorBruto: "0" });
    expect(r.success).toBe(false);
  });

  it("rejeita número em vez de texto e formato inválido", () => {
    expect(antecipacaoSchema.safeParse({ ...base, valorBruto: 1000 }).success).toBe(false);
    expect(antecipacaoSchema.safeParse({ ...base, jurosCobrados: "1,5" }).success).toBe(false);
    expect(antecipacaoSchema.safeParse({ ...base, tarifasCobradas: "-1" }).success).toBe(false);
  });

  it("rejeita juros e tarifas maiores que o valor bruto", () => {
    const r = antecipacaoSchema.safeParse({
      ...base,
      valorBruto: "100.00",
      jurosCobrados: "90.00",
      tarifasCobradas: "10.01",
    });
    expect(r.success).toBe(false);
  });

  it("aceita juros e tarifas iguais ao valor bruto (líquido zero)", () => {
    const r = antecipacaoSchema.safeParse({
      ...base,
      valorBruto: "100.00",
      jurosCobrados: "90.00",
      tarifasCobradas: "10.00",
    });
    expect(r.success).toBe(true);
  });
});

describe("valorLiquido", () => {
  it("desconta juros e tarifas do valor bruto", () => {
    expect(
      valorLiquido({ valorBruto: "1000.00", jurosCobrados: "25.50", tarifasCobradas: "4.50" }),
    ).toBe("970.00");
  });

  it("não tem erro de centavos", () => {
    expect(
      valorLiquido({ valorBruto: "0.30", jurosCobrados: "0.10", tarifasCobradas: "0.10" }),
    ).toBe("0.10");
  });
});
