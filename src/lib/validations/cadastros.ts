import { z } from "zod";
import { valorMonetarioValido, paraCentavos } from "@/lib/dinheiro";

export const contaSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome do banco/conta").max(80),
});

export const tituloSchema = z.object({
  numero: z.string().trim().min(1, "Informe o número do título").max(40),
  cliente: z.string().trim().min(2, "Informe o cliente").max(120),
  valor: z
    .string()
    .refine(valorMonetarioValido, "Use o formato 1234.50")
    .refine(
      (v) => !valorMonetarioValido(v) || paraCentavos(v) > 0n,
      "Deve ser maior que zero",
    ),
  vencimento: z.iso.date("Data inválida"),
});
