import { describe, expect, it } from "vitest";
import {
  apontamentoSchema,
  montarApontamento,
  ordemSchema,
  velocidadeSchema,
} from "./producao";

const base = {
  ordemId: "o1",
  maquinaId: "m1",
  operador: "João Silva",
  turno: "Manhã",
  inicio: "2026-11-04T08:00",
  fim: "2026-11-04T16:00",
  quantidadeBoa: "600",
};

describe("montarApontamento + apontamentoSchema", () => {
  it("aceita apontamento sem paradas nem perdas", () => {
    const r = apontamentoSchema.safeParse(montarApontamento(base));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.quantidadeBoa).toBe(600);
      expect(r.data.paradas).toEqual([]);
    }
  });

  it("monta as linhas de parada e perda e ignora as vazias", () => {
    const r = apontamentoSchema.safeParse(
      montarApontamento({
        ...base,
        paradaMotivo0: "Intervalo",
        paradaMinutos0: "60",
        paradaMotivo1: "",
        paradaMinutos1: "",
        paradaMotivo2: "Troca de ferramenta",
        paradaMinutos2: "15",
        perdaMotivo0: "Defeito de matéria-prima",
        perdaQuantidade0: "30",
      }),
    );
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.paradas).toEqual([
        { motivo: "Intervalo", minutos: 60 },
        { motivo: "Troca de ferramenta", minutos: 15 },
      ]);
      expect(r.data.perdas).toEqual([{ motivo: "Defeito de matéria-prima", quantidade: 30 }]);
    }
  });

  it("operador e turno são obrigatórios e vêm como nome", () => {
    expect(apontamentoSchema.safeParse(montarApontamento({ ...base, operador: "  " })).success).toBe(false);
    expect(apontamentoSchema.safeParse(montarApontamento({ ...base, turno: "" })).success).toBe(false);
    const r = apontamentoSchema.safeParse(montarApontamento({ ...base, operador: "  Ana  " }));
    expect(r.success && r.data.operador).toBe("Ana");
  });

  it("nome de cadastro com mais de 80 caracteres é erro", () => {
    expect(apontamentoSchema.safeParse(montarApontamento({ ...base, turno: "x".repeat(81) })).success).toBe(false);
  });

  it("linha pela metade é erro", () => {
    expect(apontamentoSchema.safeParse(montarApontamento({ ...base, paradaMotivo0: "Intervalo" })).success).toBe(false);
    expect(apontamentoSchema.safeParse(montarApontamento({ ...base, perdaQuantidade0: "5" })).success).toBe(false);
  });

  it("rejeita quantidade negativa, decimal ou com texto", () => {
    for (const q of ["-1", "1.5", "10 peças", ""]) {
      expect(apontamentoSchema.safeParse(montarApontamento({ ...base, quantidadeBoa: q })).success).toBe(false);
    }
  });

  it("aceita zero peças boas", () => {
    expect(apontamentoSchema.safeParse(montarApontamento({ ...base, quantidadeBoa: "0" })).success).toBe(true);
  });

  it("rejeita minutos de parada zero", () => {
    const r = apontamentoSchema.safeParse(
      montarApontamento({ ...base, paradaMotivo0: "Intervalo", paradaMinutos0: "0" }),
    );
    expect(r.success).toBe(false);
  });

  it("rejeita horário inválido", () => {
    expect(apontamentoSchema.safeParse(montarApontamento({ ...base, inicio: "2026-02-31T08:00" })).success).toBe(false);
    expect(apontamentoSchema.safeParse(montarApontamento({ ...base, fim: "" })).success).toBe(false);
  });
});

describe("ordemSchema e velocidadeSchema", () => {
  it("exigem inteiros positivos", () => {
    expect(ordemSchema.safeParse({ numero: "OP-1", produtoId: "p1", quantidadePlanejada: "1000" }).success).toBe(true);
    expect(ordemSchema.safeParse({ numero: "OP-1", produtoId: "p1", quantidadePlanejada: "0" }).success).toBe(false);
    expect(velocidadeSchema.safeParse({ maquinaId: "m1", produtoId: "p1", pecasPorHora: "120" }).success).toBe(true);
    expect(velocidadeSchema.safeParse({ maquinaId: "m1", produtoId: "p1", pecasPorHora: "0" }).success).toBe(false);
    expect(velocidadeSchema.safeParse({ maquinaId: "m1", produtoId: "p1", pecasPorHora: "12,5" }).success).toBe(false);
  });
});
