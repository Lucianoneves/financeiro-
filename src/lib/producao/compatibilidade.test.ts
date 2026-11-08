import { describe, expect, it } from "vitest";
import { chaveDoPar, temVelocidade } from "./compatibilidade";

describe("temVelocidade", () => {
  const pares = new Set([chaveDoPar("maq-1", "prod-1"), chaveDoPar("maq-1", "prod-2")]);

  it("encontra um par cadastrado", () => {
    expect(temVelocidade(pares, "maq-1", "prod-1")).toBe(true);
  });

  it("não encontra máquina sem velocidade para o produto", () => {
    expect(temVelocidade(pares, "maq-2", "prod-1")).toBe(false);
  });

  it("não encontra produto sem velocidade na máquina", () => {
    expect(temVelocidade(pares, "maq-1", "prod-3")).toBe(false);
  });

  it("não confunde a ordem dos ids", () => {
    expect(temVelocidade(pares, "prod-1", "maq-1")).toBe(false);
  });
});
