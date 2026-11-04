import { describe, expect, it } from "vitest";
import { deCentavos, paraCentavos, valorMonetarioValido } from "./dinheiro";

describe("dinheiro", () => {
  it("converte texto em centavos sem erro de arredondamento", () => {
    expect(paraCentavos("0.10") + paraCentavos("0.20")).toBe(30n);
    expect(paraCentavos("1234.5")).toBe(123450n);
    expect(paraCentavos("7")).toBe(700n);
  });

  it("formata centavos com duas casas", () => {
    expect(deCentavos(30n)).toBe("0.30");
    expect(deCentavos(123450n)).toBe("1234.50");
    expect(deCentavos(-5n)).toBe("-0.05");
  });

  it("rejeita formatos inválidos", () => {
    for (const ruim of ["", "abc", "1,50", "-1.00", "1.234", ".5"]) {
      expect(valorMonetarioValido(ruim)).toBe(false);
    }
    expect(() => paraCentavos("1,50")).toThrow();
  });
});
