import { paraCentavos } from "@/lib/dinheiro";

export class ErroNegocio extends Error {}

// Regras para antecipar um título. Lança ErroNegocio com mensagem para o usuário.
export function verificarPodeAntecipar(
  titulo: { baixadoEm: Date | null; valor: string },
  antecipacoesAtivas: number,
  valorBruto: string,
) {
  if (titulo.baixadoEm) {
    throw new ErroNegocio("Este título já foi baixado e não pode ser antecipado.");
  }
  if (antecipacoesAtivas > 0) {
    throw new ErroNegocio(
      "Este título já tem uma antecipação ativa. Cancele-a antes de antecipar de novo.",
    );
  }
  if (paraCentavos(valorBruto) > paraCentavos(titulo.valor)) {
    throw new ErroNegocio("O valor bruto não pode ser maior que o valor do título.");
  }
}
