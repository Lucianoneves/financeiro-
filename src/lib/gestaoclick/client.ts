import { getEnv } from "@/lib/env";

export class GestaoClickError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`GestãoClick respondeu ${status}`);
    this.name = "GestaoClickError";
  }
}

// Cabeçalhos de autenticação do par de chaves da API GestãoClick.
// Os endpoints e o formato de resposta devem ser confirmados na documentação oficial.
export async function gestaoClickFetch<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const env = getEnv();

  const response = await fetch(`${env.GESTAOCLICK_API_URL}${path}`, {
    ...init,
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      "access-token": env.GESTAOCLICK_ACCESS_TOKEN,
      "secret-access-token": env.GESTAOCLICK_SECRET_ACCESS_TOKEN,
      ...init.headers,
    },
  });

  if (!response.ok) {
    throw new GestaoClickError(response.status, await response.text());
  }

  return (await response.json()) as T;
}
