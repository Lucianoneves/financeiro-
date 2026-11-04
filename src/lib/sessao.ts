import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";

// O proxy é só uma checagem otimista. Quem lê ou grava dados confere a sessão
// aqui, perto do dado: Server Actions e componentes que consultam o banco.
export async function exigirSessao() {
  const sessao = await auth();
  // Sessão expirada: manda para o login em vez de estourar uma exceção na tela.
  if (!sessao?.user) redirect("/login");
  return sessao;
}
