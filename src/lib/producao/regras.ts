import { ErroProducao } from "./erros";

export const MINUTOS_MAXIMOS_APONTAMENTO = 24 * 60;

// Regras para lançar um apontamento. Lança ErroProducao com mensagem para o usuário.
export function verificarApontamento(entrada: {
  ordemAberta: boolean;
  velocidadeNominal: number | null;
  duracaoMinutos: number;
  paradasMinutos: number;
  quantidadeBoa: number;
  perdasQuantidade: number;
}) {
  if (!entrada.ordemAberta) {
    throw new ErroProducao("Esta ordem de produção está encerrada. Reabra-a para apontar.", "ordemId");
  }
  if (entrada.velocidadeNominal === null) {
    throw new ErroProducao(
      "Cadastre a velocidade nominal deste produto nesta máquina antes de apontar.",
      "maquinaId",
    );
  }
  if (entrada.duracaoMinutos <= 0) {
    throw new ErroProducao("O fim deve ser depois do início.", "fim");
  }
  if (entrada.duracaoMinutos > MINUTOS_MAXIMOS_APONTAMENTO) {
    throw new ErroProducao("Um apontamento não pode passar de 24 horas.", "fim");
  }
  if (entrada.paradasMinutos > entrada.duracaoMinutos) {
    throw new ErroProducao(
      `As paradas somam ${entrada.paradasMinutos} min, mais que a duração do apontamento (${entrada.duracaoMinutos} min).`,
    );
  }

  // Capacidade = velocidade × minutos operando (duração − paradas, inclusive intervalo).
  // Produção = boas + perdidas. Comparação em inteiros: produção × 60 > velocidade × minutos.
  const minutosOperando = entrada.duracaoMinutos - entrada.paradasMinutos;
  const velocidade = entrada.velocidadeNominal;
  const producao = entrada.quantidadeBoa + entrada.perdasQuantidade;
  if (producao * 60 > velocidade * minutosOperando) {
    const capacidade = Math.floor((velocidade * minutosOperando) / 60);
    throw new ErroProducao(
      `A produção deste período (${producao} peças) passa da capacidade da máquina (${capacidade} peças em ${minutosOperando} min operando a ${velocidade} peças/h).`,
      "quantidadeBoa",
    );
  }
}
