import { describe, expect, it } from "vitest";

import { janelaDaPagina, lerPagina, TAMANHO_PAGINA } from "./paginacao";

describe("lerPagina", () => {
  it("usa 1 quando não vem nada", () => {
    expect(lerPagina(undefined)).toBe(1);
  });

  it("lê um inteiro positivo", () => {
    expect(lerPagina("3")).toBe(3);
  });

  it("volta para 1 com valor inválido", () => {
    for (const ruim of ["0", "-2", "abc", "1.5", "", " 2", "1e3", "99999999999", ["2", "3"]]) {
      expect(lerPagina(ruim)).toBe(1);
    }
  });
});

describe("janelaDaPagina", () => {
  it("lista vazia tem uma página só", () => {
    expect(janelaDaPagina(0, 1)).toEqual({
      pagina: 1,
      totalPaginas: 1,
      pular: 0,
      tomar: TAMANHO_PAGINA,
    });
  });

  it("calcula o salto da página", () => {
    const j = janelaDaPagina(120, 2, 50);
    expect(j).toEqual({ pagina: 2, totalPaginas: 3, pular: 50, tomar: 50 });
  });

  it("total exato não cria página vazia", () => {
    expect(janelaDaPagina(100, 1, 50).totalPaginas).toBe(2);
  });

  it("página além da última mostra a última", () => {
    const j = janelaDaPagina(120, 99, 50);
    expect(j.pagina).toBe(3);
    expect(j.pular).toBe(100);
  });
});
