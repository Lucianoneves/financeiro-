import { describe, expect, it } from "vitest";
import { planejarSincronizacao, type TituloLocal } from "./plano";
import { recebimentoParaTitulo, type Recebimento, type TituloDoErp } from "./recebimentos";

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

const remoto = (extra: Partial<TituloDoErp> = {}): TituloDoErp => ({
  idExterno: "10",
  numero: "100",
  cliente: "Ana",
  valor: "500.00",
  vencimento: d("2026-12-01"),
  ...extra,
});

const local = (extra: Partial<TituloLocal> = {}): TituloLocal => ({
  id: "t1",
  idExterno: "10",
  numero: "100",
  cliente: "Ana",
  valor: "500.00",
  vencimento: d("2026-12-01"),
  temAntecipacaoAtiva: false,
  ...extra,
});

describe("planejarSincronizacao", () => {
  it("cria título novo em aberto", () => {
    const p = planejarSincronizacao([remoto()], []);
    expect(p.criar).toHaveLength(1);
  });

  it("não faz nada quando nada mudou", () => {
    const p = planejarSincronizacao([remoto()], [local()]);
    expect(p).toEqual({ criar: [], atualizar: [], valorDivergente: 0 });
  });

  it("nunca importa a baixa do ERP: o plano não tem como baixar título", () => {
    // No ERP a baixa é o pagamento da antecipação pelo banco, não o do cliente.
    const p = planejarSincronizacao([remoto()], [local()]);
    expect(p).not.toHaveProperty("baixar");
    expect(p).not.toHaveProperty("ignoradosJaBaixados");
  });

  it("atualiza o valor se não houver antecipação ativa", () => {
    const p = planejarSincronizacao([remoto({ valor: "600.00" })], [local()]);
    expect(p.atualizar[0].dados.valor).toBe("600.00");
  });

  it("não mexe no valor de título com antecipação ativa e conta a divergência", () => {
    const p = planejarSincronizacao(
      [remoto({ valor: "400.00" })],
      [local({ temAntecipacaoAtiva: true })],
    );
    expect(p.atualizar).toHaveLength(0);
    expect(p.valorDivergente).toBe(1);
  });

  it("atualiza cliente e vencimento mesmo com antecipação ativa", () => {
    const p = planejarSincronizacao(
      [remoto({ cliente: "Ana Maria", vencimento: d("2026-12-15") })],
      [local({ temAntecipacaoAtiva: true })],
    );
    expect(p.atualizar[0].dados).toEqual({ cliente: "Ana Maria", vencimento: d("2026-12-15") });
  });
});

const base: Recebimento = {
  id: "10",
  codigo: "100",
  valor_total: "1600.99",
  nome_cliente: "Ana",
  data_vencimento: "2026-12-01",
};

describe("recebimentoParaTitulo", () => {
  it("converte um recebimento em aberto", () => {
    const r = recebimentoParaTitulo(base);
    expect(r).toEqual({
      titulo: {
        idExterno: "10",
        numero: "100",
        cliente: "Ana",
        valor: "1600.99",
        vencimento: d("2026-12-01"),
      },
    });
  });

  it("não traz baixa: liquidado e data de liquidação do ERP são ignorados", () => {
    const r = recebimentoParaTitulo({
      ...base,
      liquidado: "1",
      data_liquidacao: "2026-11-02",
    } as Recebimento);
    expect(r).toHaveProperty("titulo");
    expect("titulo" in r && r.titulo).not.toHaveProperty("baixadoEm");
  });

  it("cai para o fornecedor ou um texto padrão sem cliente", () => {
    const sem = recebimentoParaTitulo({ ...base, nome_cliente: null });
    expect("titulo" in sem && sem.titulo.cliente).toBe("(sem cliente)");
    const forn = recebimentoParaTitulo({ ...base, nome_cliente: null, nome_fornecedor: "Loja X" });
    expect("titulo" in forn && forn.titulo.cliente).toBe("Loja X");
  });

  it("ignora valor zerado, inválido e data inválida", () => {
    expect(recebimentoParaTitulo({ ...base, valor_total: "0.00" })).toHaveProperty("ignorado");
    expect(recebimentoParaTitulo({ ...base, valor_total: "abc" })).toHaveProperty("ignorado");
    expect(recebimentoParaTitulo({ ...base, data_vencimento: "01/12/2026" })).toHaveProperty("ignorado");
  });
});
