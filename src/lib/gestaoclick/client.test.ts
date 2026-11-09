import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { gestaoClickFetch } from "./client";

describe("gestaoClickFetch (somente leitura)", () => {
  beforeEach(() => {
    vi.stubEnv("GESTAOCLICK_API_URL", "https://api.exemplo.test");
    vi.stubEnv("GESTAOCLICK_ACCESS_TOKEN", "acesso-teste");
    vi.stubEnv("GESTAOCLICK_SECRET_ACCESS_TOKEN", "segredo-teste");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("envia sempre GET, sem corpo, com as chaves do ERP", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await gestaoClickFetch("/recebimentos?pagina=1");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.exemplo.test/recebimentos?pagina=1");
    expect(init.method).toBe("GET");
    expect(init.body).toBeUndefined();
    expect(init.headers).toEqual({
      "Content-Type": "application/json",
      "access-token": "acesso-teste",
      "secret-access-token": "segredo-teste",
    });
  });

  it("não aceita método, corpo ou cabeçalhos extras (checado pelo tipo)", () => {
    // @ts-expect-error - a função só recebe o caminho; escrita não é possível
    void gestaoClickFetch("/recebimentos", { method: "POST" });
  });
});
