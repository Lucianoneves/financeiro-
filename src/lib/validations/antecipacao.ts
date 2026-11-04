import { z } from "zod";
import { deCentavos, paraCentavos, valorMonetarioValido } from "@/lib/dinheiro";

// Valores monetários são texto com ponto decimal e até 2 casas ("1234.50").
const dinheiro = z
  .string()
  .refine(valorMonetarioValido, "Use o formato 1234.50");

export const antecipacaoSchema = z
  .object({
    tituloId: z.string().min(1),
    contaId: z.string().min(1),
    valorBruto: dinheiro.refine(
      (v) => !valorMonetarioValido(v) || paraCentavos(v) > 0n,
      "Deve ser maior que zero",
    ),
    jurosCobrados: dinheiro,
    tarifasCobradas: dinheiro,
    dataAntecipacao: z.iso.date(),
  })
  .refine(
    (a) =>
      // Formato inválido já foi reportado pelo campo; não calcular em cima dele.
      ![a.valorBruto, a.jurosCobrados, a.tarifasCobradas].every(
        valorMonetarioValido,
      ) ||
      paraCentavos(a.jurosCobrados) + paraCentavos(a.tarifasCobradas) <=
        paraCentavos(a.valorBruto),
    {
      message: "Juros e tarifas não podem exceder o valor bruto",
      path: ["jurosCobrados"],
    },
  );

export type AntecipacaoInput = z.infer<typeof antecipacaoSchema>;

// Valor líquido que entra na conta bancária, já descontados juros e tarifas.
export function valorLiquido({
  valorBruto,
  jurosCobrados,
  tarifasCobradas,
}: Pick<AntecipacaoInput, "valorBruto" | "jurosCobrados" | "tarifasCobradas">) {
  return deCentavos(
    paraCentavos(valorBruto) -
      paraCentavos(jurosCobrados) -
      paraCentavos(tarifasCobradas),
  );
}
