import type { TituloDoErp } from "./recebimentos";

export type TituloLocal = {
  id: string;
  idExterno: string;
  numero: string;
  cliente: string;
  valor: string;
  vencimento: Date;
  temAntecipacaoAtiva: boolean;
};

export type PlanoDeSincronizacao = {
  criar: TituloDoErp[];
  atualizar: {
    id: string;
    dados: Partial<Pick<TituloDoErp, "numero" | "cliente" | "valor" | "vencimento">>;
  }[];
  // Valor mudou no ERP mas o título tem antecipação ativa: não mexemos.
  valorDivergente: number;
};

const mesmoDia = (a: Date, b: Date) => a.getTime() === b.getTime();

// Decide o que fazer, sem tocar em banco nem rede. Regras:
// - título novo: cria, esteja ele baixado ou não no ERP;
// - existente: atualiza dados cadastrais; o valor só muda se NÃO houver
//   antecipação ativa (o bruto da antecipação não pode passar do valor);
// - a baixa do ERP NUNCA é importada: lá ela significa "o banco pagou a
//   antecipação" (uns 30 dias antes do vencimento), não "o cliente pagou". O ERP
//   não registra o pagamento do cliente; só o botão "Cliente pagou" baixa aqui.
export function planejarSincronizacao(
  remotos: TituloDoErp[],
  locais: TituloLocal[],
): PlanoDeSincronizacao {
  const porExterno = new Map(locais.map((l) => [l.idExterno, l]));
  const plano: PlanoDeSincronizacao = {
    criar: [],
    atualizar: [],
    valorDivergente: 0,
  };

  for (const r of remotos) {
    const local = porExterno.get(r.idExterno);

    if (!local) {
      plano.criar.push(r);
      continue;
    }

    const dados: PlanoDeSincronizacao["atualizar"][number]["dados"] = {};
    if (local.numero !== r.numero) dados.numero = r.numero;
    if (local.cliente !== r.cliente) dados.cliente = r.cliente;
    if (!mesmoDia(local.vencimento, r.vencimento)) dados.vencimento = r.vencimento;
    if (local.valor !== r.valor) {
      if (local.temAntecipacaoAtiva) plano.valorDivergente += 1;
      else dados.valor = r.valor;
    }
    if (Object.keys(dados).length > 0) plano.atualizar.push({ id: local.id, dados });
  }

  return plano;
}
