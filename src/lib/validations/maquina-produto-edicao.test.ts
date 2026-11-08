import { describe, expect, it } from "vitest";
import { maquinaEdicaoSchema, maquinaSchema, produtoEdicaoSchema } from "./producao";

describe("maquinaSchema", () => {
  it("aceita código e nome, aparando espaços", () => {
    const r = maquinaSchema.safeParse({ codigo: " M01 ", nome: "  Injetora 1 " });
    expect(r.success && r.data).toEqual({ codigo: "M01", nome: "Injetora 1" });
  });

  it("rejeita código vazio ou longo e nome curto", () => {
    expect(maquinaSchema.safeParse({ codigo: " ", nome: "Injetora" }).success).toBe(false);
    expect(maquinaSchema.safeParse({ codigo: "x".repeat(41), nome: "Injetora" }).success).toBe(false);
    expect(maquinaSchema.safeParse({ codigo: "M01", nome: "A" }).success).toBe(false);
  });
});

describe("maquinaEdicaoSchema", () => {
  it("aceita id, código e nome, aparando espaços", () => {
    const r = maquinaEdicaoSchema.safeParse({ id: "m1", codigo: " M01 ", nome: "  Injetora 1 " });
    expect(r.success && r.data).toEqual({ id: "m1", codigo: "M01", nome: "Injetora 1" });
  });

  it("rejeita id vazio, código vazio, nome curto e nome longo", () => {
    expect(maquinaEdicaoSchema.safeParse({ id: "", codigo: "M01", nome: "Injetora" }).success).toBe(false);
    expect(maquinaEdicaoSchema.safeParse({ id: "m1", codigo: "", nome: "Injetora" }).success).toBe(false);
    expect(maquinaEdicaoSchema.safeParse({ id: "m1", codigo: "M01", nome: "A" }).success).toBe(false);
    expect(maquinaEdicaoSchema.safeParse({ id: "m1", codigo: "M01", nome: "x".repeat(81) }).success).toBe(false);
  });
});

describe("produtoEdicaoSchema", () => {
  it("aceita id, código e nome, aparando espaços", () => {
    const r = produtoEdicaoSchema.safeParse({ id: "p1", codigo: " TP-01 ", nome: " Tampa " });
    expect(r.success && r.data).toEqual({ id: "p1", codigo: "TP-01", nome: "Tampa" });
  });

  it("rejeita id vazio, código vazio e nome curto", () => {
    expect(produtoEdicaoSchema.safeParse({ id: "", codigo: "TP", nome: "Tampa" }).success).toBe(false);
    expect(produtoEdicaoSchema.safeParse({ id: "p1", codigo: " ", nome: "Tampa" }).success).toBe(false);
    expect(produtoEdicaoSchema.safeParse({ id: "p1", codigo: "TP", nome: "T" }).success).toBe(false);
  });
});
