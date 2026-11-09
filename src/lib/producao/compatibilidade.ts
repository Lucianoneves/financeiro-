// Ordem e máquina são compatíveis quando a máquina tem velocidade nominal cadastrada
// para o produto da ordem. Os pares chegam como texto "maquinaId|produtoId", que é
// seguro para enviar do servidor para o formulário.

export function chaveDoPar(maquinaId: string, produtoId: string) {
  return `${maquinaId}|${produtoId}`;
}

export function temVelocidade(pares: ReadonlySet<string>, maquinaId: string, produtoId: string) {
  return pares.has(chaveDoPar(maquinaId, produtoId));
}
