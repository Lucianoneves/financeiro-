import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { paginaInicial, perfilDe } from "@/lib/perfil";

// O proxy é só uma checagem otimista. Quem lê ou grava dados confere a sessão
// aqui, perto do dado: Server Actions e componentes que consultam o banco.

// Módulo financeiro: só administrador. O gestor de produção vai para /producao.
export async function exigirSessao() {
  const sessao = await sessaoValida();
  if (perfilDe(sessao.user.perfil) !== "ADMIN") redirect(paginaInicial("PRODUCAO"));
  return sessao;
}

// Módulo de produção: administrador e gestor de produção.
export async function exigirSessaoProducao() {
  return sessaoValida();
}

async function sessaoValida() {
  const sessao = await auth();
  // Sessão expirada: manda para o login em vez de estourar uma exceção na tela.
  if (!sessao?.user) redirect("/login");
  return sessao;
}
