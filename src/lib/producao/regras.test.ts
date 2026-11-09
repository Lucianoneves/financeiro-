import { describe, expect, it } from "vitest";
import { ErroProducao } from "./erros";
import { verificarApontamento } from "./regras";

// Capacidade de ok: 100 peças/h × 420 min operando / 60 = 700 peças.
const ok = {
  ordemAberta: true,
  velocidadeNominal: 100,
  duracaoMinutos: 480,
  paradasMinutos: 60,
  quantidadeBoa: 600,
  perdasQuantidade: 0,
};

describe("verificarApontamento", () => {
  it("aceita um apontamento válido", () => {
    expect(() => verificarApontamento(ok)).not.toThrow();
  });

  it("aceita paradas iguais à duração", () => {
    expect(() => verificarApontamento({ ...ok, paradasMinutos: 480, quantidadeBoa: 0 })).not.toThrow();
  });

  it("barra ordem encerrada", () => {
    expect(() => verificarApontamento({ ...ok, ordemAberta: false })).toThrow(ErroProducao);
  });

  it("barra produto sem velocidade nominal na máquina", () => {
    expect(() => verificarApontamento({ ...ok, velocidadeNominal: null })).toThrow(/velocidade nominal/);
  });

  it("barra fim antes ou igual ao início", () => {
    expect(() => verificarApontamento({ ...ok, duracaoMinutos: 0 })).toThrow(/depois do início/);
    expect(() => verificarApontamento({ ...ok, duracaoMinutos: -10 })).toThrow(/depois do início/);
  });

  it("barra mais de 24 horas", () => {
    expect(() => verificarApontamento({ ...ok, duracaoMinutos: 1441 })).toThrow(/24 horas/);
  });

  it("barra paradas maiores que a duração", () => {
    expect(() => verificarApontamento({ ...ok, paradasMinutos: 481 })).toThrow(/paradas somam 481/);
  });

  describe("capacidade da máquina", () => {
    it("aceita produção igual à capacidade", () => {
      expect(() => verificarApontamento({ ...ok, quantidadeBoa: 700 })).not.toThrow();
    });

    it("barra produção acima da capacidade", () => {
      expect(() => verificarApontamento({ ...ok, quantidadeBoa: 701 })).toThrow(/passa da capacidade/);
    });

    it("conta peças perdidas na produção", () => {
      expect(() => verificarApontamento({ ...ok, quantidadeBoa: 600, perdasQuantidade: 101 })).toThrow(
        /701 peças/,
      );
      expect(() => verificarApontamento({ ...ok, quantidadeBoa: 600, perdasQuantidade: 100 })).not.toThrow();
    });

    it("mostra a capacidade arredondada para baixo na mensagem", () => {
      // 100 × 421 / 60 = 701,67 -> 701 peças
      expect(() =>
        verificarApontamento({ ...ok, paradasMinutos: 59, quantidadeBoa: 702 }),
      ).toThrow(/capacidade da máquina \(701 peças em 421 min operando a 100 peças\/h\)/);
    });

    it("sem minutos operando, qualquer produção é recusada", () => {
      expect(() =>
        verificarApontamento({ ...ok, paradasMinutos: 480, quantidadeBoa: 1 }),
      ).toThrow(/capacidade da máquina \(0 peças/);
    });

    it("sem minutos operando e sem produção, aceita", () => {
      expect(() =>
        verificarApontamento({ ...ok, paradasMinutos: 480, quantidadeBoa: 0 }),
      ).not.toThrow();
    });
  });
});
