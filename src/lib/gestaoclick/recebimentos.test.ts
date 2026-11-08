import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listarRecebimentos } from "./recebimentos";

// Item no formato da documentação oficial (/recebimentos, resposta 200).
function recebimento(id: number) {
  return {
    id: String(id),
    codigo: `R${id}`,
    descricao: "Mensalidade",
    valor: "100.00",
    juros: "0.00",
    desconto: "0.00",
    valor_total: "100.00",
    nome_cliente: "Cliente Teste",
    nome_fornecedor: null,
    liquidado: "ab",
    data_vencimento: "2026-11-10",
    data_liquidacao: null,
    loja_id: "1",
  };
}

function paginaComItens(quantidade: number, inicio = 1) {
  return {
    code: 200,
    status: "success",
    data: Array.from({ length: quantidade }, (_, i) => recebimento(inicio + i)),
  };
}

function respostaJson(corpo: unknown) {
  return new Response(JSON.stringify(corpo), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

describe("listarRecebimentos (formato da documentação)", () => {
  beforeEach(() => {
    vi.stubEnv("GESTAOCLICK_API_URL", "https://api.exemplo.test");
    vi.stubEnv("GESTAOCLICK_ACCESS_TOKEN", "acesso-teste");
    vi.stubEnv("GESTAOCLICK_SECRET_ACCESS_TOKEN", "segredo-teste");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("pede páginas com `limite` (não `limit`) e funciona sem `meta` na resposta", async () => {
    const fetchMock = vi.fn(async () => respostaJson(paginaComItens(2)));
    vi.stubGlobal("fetch", fetchMock);

    const itens = await listarRecebimentos({ dataInicio: "2026-11-01", dataFim: "2026-11-30", lojaId: "7" });

    expect(itens).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const url = new URL(String((fetchMock.mock.calls[0] as unknown as [string])[0]));
    expect(url.pathname).toBe("/recebimentos");
    expect(url.searchParams.get("limite")).toBe("100");
    expect(url.searchParams.get("limit")).toBeNull();
    expect(url.searchParams.get("pagina")).toBe("1");
    expect(url.searchParams.get("data_inicio")).toBe("2026-11-01");
    expect(url.searchParams.get("data_fim")).toBe("2026-11-30");
    expect(url.searchParams.get("loja_id")).toBe("7");
  });

  it("continua para a próxima página enquanto a página vier cheia", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respostaJson(paginaComItens(100, 1)))
      .mockResolvedValueOnce(respostaJson(paginaComItens(3, 101)));
    vi.stubGlobal("fetch", fetchMock);

    const itens = await listarRecebimentos({});

    expect(itens).toHaveLength(103);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new URL(String(fetchMock.mock.calls[1][0])).searchParams.get("pagina")).toBe("2");
  });

  it("para na primeira página vazia, sem `data`", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(respostaJson(paginaComItens(100, 1)))
      .mockResolvedValueOnce(respostaJson({ code: 200, status: "success" }));
    vi.stubGlobal("fetch", fetchMock);

    const itens = await listarRecebimentos({});

    expect(itens).toHaveLength(100);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("não faz requisição extra quando a primeira página já é a última", async () => {
    const fetchMock = vi.fn(async () => respostaJson(paginaComItens(0)));
    vi.stubGlobal("fetch", fetchMock);

    const itens = await listarRecebimentos({});

    expect(itens).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
