import { describe, expect, it } from "vitest";
import { bloqueado, inicioDaJanela, JANELA_MS, MAX_FALHAS } from "./login-limite";

describe("bloqueado", () => {
  it("libera abaixo do limite", () => {
    expect(bloqueado(0)).toBe(false);
    expect(bloqueado(MAX_FALHAS - 1)).toBe(false);
  });

  it("bloqueia ao atingir o limite e acima dele", () => {
    expect(bloqueado(MAX_FALHAS)).toBe(true);
    expect(bloqueado(MAX_FALHAS + 10)).toBe(true);
  });
});

describe("inicioDaJanela", () => {
  it("recua exatamente a janela a partir de agora", () => {
    const agora = Date.UTC(2026, 10, 8, 12, 0, 0);
    expect(inicioDaJanela(agora).getTime()).toBe(agora - JANELA_MS);
  });
});
