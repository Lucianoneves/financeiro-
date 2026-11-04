import { describe, expect, it } from "vitest";
import { gerarHashSenha, verificarSenha } from "@/lib/senha";

describe("senha", () => {
  it("aceita a senha correta e recusa a errada", async () => {
    const hash = await gerarHashSenha("segredo-123");
    expect(hash).not.toContain("segredo-123");
    expect(await verificarSenha("segredo-123", hash)).toBe(true);
    expect(await verificarSenha("outra-senha", hash)).toBe(false);
  });
});
