// Perfis de acesso. ADMIN (financeiro) vê tudo; PRODUCAO (gestor de produção)
// vê só o módulo /producao. Funções puras: usadas pelo proxy, pelo servidor e nos testes.

export type Perfil = "ADMIN" | "PRODUCAO";

// Fail-closed: só o valor exato "ADMIN" dá acesso completo. Ausência de valor
// (sessão antiga, token sem perfil) e valor desconhecido caem no perfil restrito.
// Sessões antigas são resolvidas pelo banco (ver precisaRevalidarPerfil), não aqui.
export function perfilDe(valor: unknown): Perfil {
  return valor === "ADMIN" ? "ADMIN" : "PRODUCAO";
}

// O perfil é relido do banco no login e depois a cada intervalo, para que uma
// troca de perfil ou a remoção do usuário valha em no máximo esse prazo.
export const INTERVALO_REVALIDACAO_MS = 5 * 60 * 1000;

export function precisaRevalidarPerfil(verificadoEm: unknown, agora: number) {
  return typeof verificadoEm !== "number" || agora - verificadoEm >= INTERVALO_REVALIDACAO_MS;
}

export function caminhoPermitido(perfil: Perfil, pathname: string) {
  if (perfil === "ADMIN") return true;
  return pathname === "/producao" || pathname.startsWith("/producao/");
}

export function paginaInicial(perfil: Perfil) {
  return perfil === "ADMIN" ? "/antecipacoes" : "/producao";
}
