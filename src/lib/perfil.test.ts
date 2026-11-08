import { describe, expect, it } from "vitest";
import {
  caminhoPermitido,
  INTERVALO_REVALIDACAO_MS,
  paginaInicial,
  perfilDe,
  precisaRevalidarPerfil,
} from "./perfil";

describe("perfilDe", () => {
  it("ausência de perfil cai no perfil restrito, nunca no completo", () => {
    expect(perfilDe(undefined)).toBe("PRODUCAO");
    expect(perfilDe(null)).toBe("PRODUCAO");
  });

  it("reconhece os dois perfis", () => {
    expect(perfilDe("ADMIN")).toBe("ADMIN");
    expect(perfilDe("PRODUCAO")).toBe("PRODUCAO");
  });

  it("valor desconhecido cai no perfil restrito", () => {
    expect(perfilDe("GESTOR")).toBe("PRODUCAO");
    expect(perfilDe("")).toBe("PRODUCAO");
    expect(perfilDe("admin")).toBe("PRODUCAO");
  });
});

describe("precisaRevalidarPerfil", () => {
  const agora = 1_000_000_000_000;

  it("sem data de verificação, revalida", () => {
    expect(precisaRevalidarPerfil(undefined, agora)).toBe(true);
    expect(precisaRevalidarPerfil("abc", agora)).toBe(true);
  });

  it("dentro do intervalo, não revalida", () => {
    expect(precisaRevalidarPerfil(agora - 1000, agora)).toBe(false);
  });

  it("após o intervalo, revalida", () => {
    expect(precisaRevalidarPerfil(agora - INTERVALO_REVALIDACAO_MS, agora)).toBe(true);
  });
});

describe("caminhoPermitido", () => {
  it("administrador acessa financeiro e produção", () => {
    expect(caminhoPermitido("ADMIN", "/antecipacoes")).toBe(true);
    expect(caminhoPermitido("ADMIN", "/producao/ordens")).toBe(true);
  });

  it("gestor de produção acessa só /producao", () => {
    expect(caminhoPermitido("PRODUCAO", "/producao")).toBe(true);
    expect(caminhoPermitido("PRODUCAO", "/producao/apontamentos")).toBe(true);
    expect(caminhoPermitido("PRODUCAO", "/antecipacoes")).toBe(false);
    expect(caminhoPermitido("PRODUCAO", "/titulos")).toBe(false);
    expect(caminhoPermitido("PRODUCAO", "/contas")).toBe(false);
    expect(caminhoPermitido("PRODUCAO", "/custos")).toBe(false);
  });

  it("não confunde prefixo parecido", () => {
    expect(caminhoPermitido("PRODUCAO", "/producaoextra")).toBe(false);
    expect(caminhoPermitido("PRODUCAO", "/producao-x/y")).toBe(false);
  });
});

describe("paginaInicial", () => {
  it("cada perfil começa no seu módulo", () => {
    expect(paginaInicial("ADMIN")).toBe("/antecipacoes");
    expect(paginaInicial("PRODUCAO")).toBe("/producao");
  });
});
