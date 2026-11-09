import { describe, expect, it } from "vitest";
import { resumoPorOrdem, type ApontamentoDeOrdem } from "./fechamento";

const item = (extra: Partial<ApontamentoDeOrdem> = {}): ApontamentoDeOrdem => ({
  ordemId: "o1",
  ordemNumero: "OP-1",
  produtoNome: "Tampa",
  quantidadeBoa: 100,
  pecasPerdidas: 5,
  ...extra,
});

describe("resumoPorOrdem", () => {
  it("soma boas, perdidas e apontamentos da mesma ordem", () => {
    const r = resumoPorOrdem([item(), item({ quantidadeBoa: 50, pecasPerdidas: 0 })]);
    expect(r).toEqual([
      { ordemId: "o1", ordemNumero: "OP-1", produtoNome: "Tampa", apontamentos: 2, pecasBoas: 150, pecasPerdidas: 5 },
    ]);
  });

  it("separa ordens diferentes e ordena pelo número, tratando dígitos como número", () => {
    const r = resumoPorOrdem([
      item({ ordemId: "o10", ordemNumero: "OP-10" }),
      item({ ordemId: "o2", ordemNumero: "OP-2" }),
    ]);
    expect(r.map((l) => l.ordemNumero)).toEqual(["OP-2", "OP-10"]);
  });

  it("sem apontamentos devolve lista vazia", () => {
    expect(resumoPorOrdem([])).toEqual([]);
  });
});
