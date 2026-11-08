import { describe, expect, it } from "vitest";
import {
  deHorarioLocal,
  diaDoHorarioLocal,
  formatarHorario,
  horarioLocalValido,
  hojeEmBrasilia,
  intervaloDe,
  minutosEntre,
} from "./tempo";

describe("horário de Brasília", () => {
  it("converte o horário digitado para UTC (+3h)", () => {
    expect(deHorarioLocal("2026-11-04T08:00").toISOString()).toBe("2026-11-04T11:00:00.000Z");
  });

  it("vira o dia quando passa da meia-noite em UTC", () => {
    expect(deHorarioLocal("2026-11-04T22:30").toISOString()).toBe("2026-11-05T01:30:00.000Z");
  });

  it("o dia de produção é o dia digitado, não o dia em UTC", () => {
    expect(diaDoHorarioLocal("2026-11-04T22:30")).toBe("2026-11-04");
  });

  it("formata de volta para Brasília", () => {
    expect(formatarHorario(new Date("2026-11-05T01:30:00.000Z"))).toBe("04/11/2026 22:30");
  });

  it("hoje em Brasília ainda é o dia anterior logo depois da meia-noite UTC", () => {
    expect(hojeEmBrasilia(new Date("2026-11-05T01:30:00.000Z"))).toBe("2026-11-04");
  });

  it("rejeita formato errado e data impossível", () => {
    expect(horarioLocalValido("2026-11-04T08:00")).toBe(true);
    expect(horarioLocalValido("2026-11-04 08:00")).toBe(false);
    expect(horarioLocalValido("2026-02-31T08:00")).toBe(false);
    expect(horarioLocalValido("")).toBe(false);
  });

  it("calcula os minutos entre início e fim", () => {
    expect(minutosEntre(new Date("2026-11-04T11:00:00Z"), new Date("2026-11-04T19:00:00Z"))).toBe(480);
    expect(intervaloDe("2026-11-04T08:00", "2026-11-04T16:30").minutos).toBe(510);
  });
});
