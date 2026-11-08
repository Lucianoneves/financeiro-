import { getGestaoClickEnv } from "@/lib/env";

export class GestaoClickError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`GestãoClick respondeu ${status}`);
    this.name = "GestaoClickError";
  }
}

// Cliente somente leitura: o sistema nunca escreve no GestãoClick.
// Só é possível fazer GET; não há parâmetro para método, corpo ou cabeçalhos extras.
// Cabeçalhos de autenticação do par de chaves da API GestãoClick.
// Os endpoints e o formato de resposta devem ser confirmados na documentação oficial.
export async function gestaoClickFetch<T>(path: string): Promise<T> {
  const env = getGestaoClickEnv();

  const response = await fetch(`${env.GESTAOCLICK_API_URL}${path}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "access-token": env.GESTAOCLICK_ACCESS_TOKEN,
      "secret-access-token": env.GESTAOCLICK_SECRET_ACCESS_TOKEN,
    },
  });

  if (!response.ok) {
    throw new GestaoClickError(response.status, await response.text());
  }

  return (await response.json()) as T;
}
