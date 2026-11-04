import { z } from "zod";

const DIA_MS = 24 * 60 * 60 * 1000;

export const sincronizacaoSchema = z
  .object({
    dataInicio: z.iso.date("Data inicial inválida"),
    dataFim: z.iso.date("Data final inválida"),
  })
  .refine((j) => j.dataFim >= j.dataInicio, {
    message: "A data final não pode ser anterior à inicial",
    path: ["dataFim"],
  })
  .refine(
    (j) =>
      (Date.parse(j.dataFim) - Date.parse(j.dataInicio)) / DIA_MS <= 3 * 366,
    { message: "Use um período de no máximo 3 anos", path: ["dataFim"] },
  );
