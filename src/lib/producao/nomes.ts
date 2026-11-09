// Chave de comparação de nomes de cadastro (turno, operador, motivo). Dois nomes
// que dão a mesma chave são o mesmo cadastro: "João", "joao" e " JOÃO  " viram "joao".
// A migração `cadastros_na_hora` faz a mesma conta em SQL para os dados existentes;
// se esta regra mudar, a migração precisa mudar junto.
export function chaveDoNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}
