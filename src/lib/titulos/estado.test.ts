import { describe, expect, it } from "vitest";
import { estadoDoTitulo } from "./estado";

describe("estadoDoTitulo", () => {
  it("sem antecipação e sem baixa é EM_ABERTO", () => {
    expect(estadoDoTitulo({ baixadoEm: null }, [])).toBe("EM_ABERTO");
  });

  it("com antecipação ativa e sem baixa é ANTECIPADO_PENDENTE", () => {
    expect(estadoDoTitulo({ baixadoEm: null }, [{ status: "ATIVA" }])).toBe("ANTECIPADO_PENDENTE");
  });

  it("antecipação cancelada volta para EM_ABERTO", () => {
    expect(estadoDoTitulo({ baixadoEm: null }, [{ status: "CANCELADA" }])).toBe("EM_ABERTO");
  });

  it("baixado tem prioridade, mesmo antecipado", () => {
    expect(estadoDoTitulo({ baixadoEm: new Date() }, [{ status: "ATIVA" }])).toBe("BAIXADO");
    expect(estadoDoTitulo({ baixadoEm: new Date() }, [])).toBe("BAIXADO");
  });
});
