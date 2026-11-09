import { describe, expect, it } from "vitest";
import { chaveDoNome } from "./nomes";

describe("chaveDoNome", () => {
  it("ignora maiúsculas e minúsculas", () => {
    expect(chaveDoNome("Manhã")).toBe(chaveDoNome("MANHÃ"));
  });

  it("ignora acentos", () => {
    expect(chaveDoNome("João")).toBe("joao");
    expect(chaveDoNome("Joao")).toBe("joao");
    expect(chaveDoNome("Defeito de matéria-prima")).toBe("defeito de materia-prima");
  });

  it("remove espaços das pontas e reduz espaços internos", () => {
    expect(chaveDoNome("  Troca   de  ferramenta ")).toBe("troca de ferramenta");
  });

  it("nomes diferentes continuam diferentes", () => {
    expect(chaveDoNome("Manhã")).not.toBe(chaveDoNome("Tarde"));
  });

  it("string vazia vira vazia", () => {
    expect(chaveDoNome("   ")).toBe("");
  });
});
