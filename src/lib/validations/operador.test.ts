import { describe, expect, it } from "vitest";
import { operadorEdicaoSchema } from "./producao";

describe("operadorEdicaoSchema", () => {
  it("aceita nome e matrícula, aparando espaços", () => {
    const r = operadorEdicaoSchema.safeParse({ id: "o1", nome: "  Ana Souza ", matricula: " 123 " });
    expect(r.success && r.data).toEqual({ id: "o1", nome: "Ana Souza", matricula: "123" });
  });

  it("matrícula vazia ou ausente vira indefinida (remove a matrícula)", () => {
    const vazia = operadorEdicaoSchema.safeParse({ id: "o1", nome: "Ana", matricula: "  " });
    const ausente = operadorEdicaoSchema.safeParse({ id: "o1", nome: "Ana" });
    expect(vazia.success && vazia.data.matricula).toBeUndefined();
    expect(ausente.success && ausente.data.matricula).toBeUndefined();
  });

  it("rejeita nome vazio, nome longo, matrícula longa e id vazio", () => {
    expect(operadorEdicaoSchema.safeParse({ id: "o1", nome: "  " }).success).toBe(false);
    expect(operadorEdicaoSchema.safeParse({ id: "o1", nome: "x".repeat(81) }).success).toBe(false);
    expect(operadorEdicaoSchema.safeParse({ id: "o1", nome: "Ana", matricula: "9".repeat(41) }).success).toBe(false);
    expect(operadorEdicaoSchema.safeParse({ id: "", nome: "Ana" }).success).toBe(false);
  });
});
