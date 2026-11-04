import type { TituloDoErp } from "./recebimentos";

export type TituloLocal = {
  id: string;
  idExterno: string;
  numero: string;
  cliente: string;
  valor: string;
  vencimento: Date;
  baixadoEm: Date | null;
  temAntecipacaoAtiva: boolean;
};

export type PlanoDeSincronizacao = {
  criar: TituloDoErp[];
  atualizar: {
    id: string;
    dados: Partial<Pick<TituloDoErp, "numero" | "cliente" | "valor" | "vencimento">>;
  }[];
  baixar: { id: string; baixadoEm: Date }[];
  // Valor mudou no ERP mas o título tem antecipação ativa: não mexemos.
  valorDivergente: number;
  // Já baixados no ERP e nunca importados: não vale importar.
  ignoradosJaBaixados: number;
};

const mesmoDia = (a: Date, b: Date) => a.getTime() === b.getTime();

// Decide o que fazer, sem tocar em banco nem rede. Regras:
// - novo e em aberto no ERP: cria; novo e já baixado: ignora;
// - existente: atualiza dados cadastrais; o valor só muda se NÃO houver
//   antecipação ativa (o bruto da antecipação não pode passar do valor);
// - a baixa vem do ERP e nunca é desfeita aqui (o botão "cliente pagou" manual
//   pode ter vindo antes da baixa no ERP).
export function planejarSincronizacao(
  remotos: TituloDoErp[],
  locais: TituloLocal[],
): PlanoDeSincronizacao {
  const porExterno = new Map(locais.map((l) => [l.idExterno, l]));
  const plano: PlanoDeSincronizacao = {
    criar: [],
    atualizar: [],
    baixar: [],
    valorDivergente: 0,
    ignoradosJaBaixados: 0,
  };

  for (const r of remotos) {
    const local = porExterno.get(r.idExterno);

    if (!local) {
      if (r.baixadoEm) plano.ignoradosJaBaixados += 1;
      else plano.criar.push(r);
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

    if (r.baixadoEm && !local.baixadoEm) {
      plano.baixar.push({ id: local.id, baixadoEm: r.baixadoEm });
    }
  }

  return plano;
}
