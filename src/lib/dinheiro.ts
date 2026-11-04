// Dinheiro como texto com ponto decimal ("1234.50"), igual ao que o ERP devolve
// e ao que o Prisma aceita para Decimal. A aritmética é feita em centavos
// inteiros (bigint) para nunca haver erro de ponto flutuante.

const FORMATO = /^\d+(\.\d{1,2})?$/;

export function valorMonetarioValido(texto: string): boolean {
  return FORMATO.test(texto);
}

export function paraCentavos(texto: string): bigint {
  if (!FORMATO.test(texto)) {
    throw new Error(`Valor monetário inválido: "${texto}"`);
  }
  const [inteiro, fracao = ""] = texto.split(".");
  return BigInt(inteiro) * 100n + BigInt(fracao.padEnd(2, "0"));
}

export function deCentavos(centavos: bigint): string {
  const negativo = centavos < 0n;
  const absoluto = negativo ? -centavos : centavos;
  const inteiro = absoluto / 100n;
  const fracao = (absoluto % 100n).toString().padStart(2, "0");
  return `${negativo ? "-" : ""}${inteiro}.${fracao}`;
}
