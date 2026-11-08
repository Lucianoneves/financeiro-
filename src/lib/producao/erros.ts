import { Prisma } from "@/generated/prisma/client";

// Erro de regra do módulo de produção, com mensagem pronta para o usuário.
// Separado do ErroNegocio do financeiro para os módulos não se misturarem.
// `campo` (opcional) é o nome do campo do formulário que causou o erro, para a
// tela levar o usuário até ele.
export class ErroProducao extends Error {
  readonly campo?: string;

  constructor(mensagem: string, campo?: string) {
    super(mensagem);
    this.campo = campo;
  }
}

// Resultado do lançamento de apontamento. Erros de campo trazem o nome do campo;
// erros gerais (sem campo) aparecem só na lista.
export type ResultadoApontamento = {
  sucesso?: string;
  erros?: { campo?: string; mensagem: string }[];
};

// Violação de unicidade (nome, código, número de ordem já existentes).
export function eConflitoUnico(e: unknown) {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

// Violação da restrição de exclusão que impede apontamentos sobrepostos na
// mesma máquina (SQLSTATE 23P01). Como o erro chega de formas diferentes
// conforme o adaptador, procura o nome da restrição no texto e nos metadados.
export function eSobreposicao(e: unknown) {
  let texto = String(e);
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    try {
      texto += JSON.stringify(e.meta ?? {});
    } catch {
      // metadados não serializáveis: o texto da mensagem basta
    }
  }
  return (
    texto.includes("apontamento_maquina_sem_sobreposicao") || texto.includes("23P01")
  );
}
