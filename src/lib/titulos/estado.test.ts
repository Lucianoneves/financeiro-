import { describe, expect, it } from "vitest";
import { estadoDoTitulo, lerFiltroEstado, totaisPorEstado } from "./estado";

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

describe("lerFiltroEstado", () => {
  it("aceita estados válidos e ignora o resto", () => {
    expect(lerFiltroEstado("BAIXADO")).toBe("BAIXADO");
    expect(lerFiltroEstado("qualquer")).toBeUndefined();
    expect(lerFiltroEstado(undefined)).toBeUndefined();
    expect(lerFiltroEstado(["BAIXADO"])).toBeUndefined();
  });
});

describe("totaisPorEstado", () => {
  it("soma quantidade e centavos por estado", () => {
    const t = totaisPorEstado([
      { estado: "EM_ABERTO", valorCentavos: 1000n },
      { estado: "EM_ABERTO", valorCentavos: 250n },
      { estado: "BAIXADO", valorCentavos: 500n },
    ]);
    expect(t.EM_ABERTO).toEqual({ quantidade: 2, centavos: 1250n });
    expect(t.BAIXADO).toEqual({ quantidade: 1, centavos: 500n });
    expect(t.ANTECIPADO_PENDENTE).toEqual({ quantidade: 0, centavos: 0n });
  });
});
