import { describe, expect, it } from "vitest";
import { formatarMinutos, formatarNumero, formatarPercentual } from "./formato";

describe("formatação de indicadores", () => {
  it("percentual com vírgula e uma casa", () => {
    expect(formatarPercentual(0.875)).toBe("87,5%");
    expect(formatarPercentual(1)).toBe("100,0%");
  });

  it("indefinido vira travessão", () => {
    expect(formatarPercentual(null)).toBe("—");
    expect(formatarNumero(null)).toBe("—");
  });

  it("minutos em horas", () => {
    expect(formatarMinutos(45)).toBe("45 min");
    expect(formatarMinutos(120)).toBe("2 h");
    expect(formatarMinutos(450)).toBe("7 h 30 min");
  });

  it("número com casas fixas", () => {
    expect(formatarNumero(85.714, 1)).toBe("85,7");
  });
});

describe("rotuloDaMaquina", () => {
  it('mostra "código — nome"', async () => {
    const { rotuloDaMaquina } = await import("./formato");
    expect(rotuloDaMaquina({ codigo: "M01", nome: "Injetora 1" })).toBe("M01 — Injetora 1");
  });
});

describe("rotuloDaMaquina sem código", () => {
  it("mostra só o nome quando a máquina ainda não tem código", async () => {
    const { rotuloDaMaquina } = await import("./formato");
    expect(rotuloDaMaquina({ codigo: null, nome: "Injetora 1" })).toBe("Injetora 1");
    expect(rotuloDaMaquina({ codigo: "", nome: "Injetora 1" })).toBe("Injetora 1");
  });
});

describe("código do operador", () => {
  it("é gerado a partir do número, com zeros à esquerda", async () => {
    const { codigoDoOperador, rotuloDoOperador } = await import("./formato");
    expect(codigoDoOperador(1)).toBe("OP-001");
    expect(codigoDoOperador(42)).toBe("OP-042");
    expect(rotuloDoOperador({ numero: 7, nome: "Ana" })).toBe("OP-007 — Ana");
  });

  it("não corta quando passa de 999", async () => {
    const { codigoDoOperador } = await import("./formato");
    expect(codigoDoOperador(999)).toBe("OP-999");
    expect(codigoDoOperador(1000)).toBe("OP-1000");
  });
});
