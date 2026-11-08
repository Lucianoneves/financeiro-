import { describe, expect, it } from "vitest";
import { nomeEdicaoSchema } from "./producao";

describe("nomeEdicaoSchema", () => {
  it("aceita os três tipos, aparando espaços do nome", () => {
    for (const tipo of ["turno", "motivoParada", "motivoPerda"]) {
      const r = nomeEdicaoSchema.safeParse({ tipo, id: "x1", nome: "  Manhã " });
      expect(r.success && r.data).toEqual({ tipo, id: "x1", nome: "Manhã" });
    }
  });

  it("rejeita tipo desconhecido, id vazio, nome vazio e nome longo", () => {
    expect(nomeEdicaoSchema.safeParse({ tipo: "operador", id: "x1", nome: "A" }).success).toBe(false);
    expect(nomeEdicaoSchema.safeParse({ tipo: "turno", id: "", nome: "A" }).success).toBe(false);
    expect(nomeEdicaoSchema.safeParse({ tipo: "turno", id: "x1", nome: "   " }).success).toBe(false);
    expect(nomeEdicaoSchema.safeParse({ tipo: "turno", id: "x1", nome: "x".repeat(81) }).success).toBe(false);
  });
});
