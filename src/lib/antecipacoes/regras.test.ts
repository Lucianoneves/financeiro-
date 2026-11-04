import { describe, expect, it } from "vitest";
import { ErroNegocio, verificarPodeAntecipar } from "./regras";

const aberto = { baixadoEm: null, valor: "1000.00" };

describe("verificarPodeAntecipar", () => {
  it("permite título em aberto sem antecipação ativa", () => {
    expect(() => verificarPodeAntecipar(aberto, 0, "1000.00")).not.toThrow();
  });

  it("recusa título baixado", () => {
    expect(() =>
      verificarPodeAntecipar({ ...aberto, baixadoEm: new Date() }, 0, "1000.00"),
    ).toThrow(ErroNegocio);
  });

  it("recusa segunda antecipação ativa", () => {
    expect(() => verificarPodeAntecipar(aberto, 1, "1000.00")).toThrow(/antecipação ativa/);
  });

  it("recusa valor bruto maior que o título", () => {
    expect(() => verificarPodeAntecipar(aberto, 0, "1000.01")).toThrow(/maior que o valor/);
  });

  it("aceita valor bruto menor que o título", () => {
    expect(() => verificarPodeAntecipar(aberto, 0, "500.00")).not.toThrow();
  });
});
