"use client";

import { useActionState, useState } from "react";

import type { EstadoForm } from "@/app/(dashboard)/actions";
import { Campo } from "@/components/formulario-acao";
import { Button } from "@/components/ui/button";

type Acao = (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;

export type CampoEdicao = {
  name: string;
  rotulo: string;
  valor: string;
  obrigatorio?: boolean;
  numerico?: boolean;
};

export type Edicao = {
  action: Acao;
  // Campos escondidos que identificam o registro (id, tipo...).
  ocultos: Record<string, string>;
  campos: CampoEdicao[];
  aviso?: string;
};

// Formulário de edição que abre no próprio lugar do item. Fecha ao salvar (e reabre
// já com os valores novos) ou ao cancelar/Esc. Como só existe enquanto está aberto,
// cada abertura começa limpa, sem erro ou texto da vez anterior.
function FormularioInline({
  edicao,
  aoFechar,
}: {
  edicao: Edicao;
  aoFechar: () => void;
}) {
  const [estado, formAction, pendente] = useActionState(
    async (anterior: EstadoForm, formData: FormData) => {
      const resultado = await edicao.action(anterior, formData);
      if (resultado.sucesso) aoFechar();
      return resultado;
    },
    {},
  );

  return (
    <form
      action={formAction}
      onKeyDown={(e) => {
        if (e.key === "Escape") aoFechar();
      }}
      className="flex w-full basis-full flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      {edicao.aviso && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{edicao.aviso}</p>
      )}
      {Object.entries(edicao.ocultos).map(([nome, valor]) => (
        <input key={nome} type="hidden" name={nome} value={valor} />
      ))}
      {edicao.campos.map((c, i) => (
        <Campo
          key={c.name}
          rotulo={c.rotulo}
          name={c.name}
          defaultValue={c.valor}
          required={c.obrigatorio}
          inputMode={c.numerico ? "numeric" : undefined}
          autoFocus={i === 0}
        />
      ))}
      {estado.erro && (
        <p role="alert" className="text-sm text-red-600">
          {estado.erro}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pendente}>
          {pendente ? "Salvando..." : "Salvar alteração"}
        </Button>
        <Button type="button" variant="outline" onClick={aoFechar}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}

const botaoEditar = "py-1 underline";

// Linha de lista (turno, operador, motivo) com "Editar" no próprio lugar.
// `children` são os botões já existentes da linha (Inativar/Ativar).
export function ItemEditavel({
  rotulo,
  ativo,
  edicao,
  children,
}: {
  rotulo: string;
  ativo: boolean;
  edicao: Edicao;
  children: React.ReactNode;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-t border-zinc-200 py-2 dark:border-zinc-800">
      <span className={ativo ? "" : "text-zinc-500 line-through"}>
        {rotulo}
        {!ativo && " (inativo)"}
      </span>
      <div className="flex items-start gap-4">
        {!aberto && (
          <button
            type="button"
            className={botaoEditar}
            aria-label={`Editar ${rotulo}`}
            onClick={() => setAberto(true)}
          >
            Editar
          </button>
        )}
        {children}
      </div>
      {aberto && <FormularioInline edicao={edicao} aoFechar={() => setAberto(false)} />}
    </li>
  );
}

// Linha da tabela de velocidades com "Editar" no próprio lugar.
export function LinhaVelocidade({
  maquina,
  produto,
  pecasPorHora,
  edicao,
}: {
  maquina: string;
  produto: string;
  pecasPorHora: number;
  edicao: Edicao;
}) {
  const [aberto, setAberto] = useState(false);

  return (
    <>
      <tr className="border-b border-zinc-100 dark:border-zinc-900">
        <td className="py-2">{maquina}</td>
        <td>{produto}</td>
        <td>{pecasPorHora}</td>
        <td className="text-right">
          {!aberto && (
            <button
              type="button"
              className={botaoEditar}
              aria-label={`Editar velocidade de ${maquina} para ${produto}`}
              onClick={() => setAberto(true)}
            >
              Editar
            </button>
          )}
        </td>
      </tr>
      {aberto && (
        <tr className="border-b border-zinc-100 dark:border-zinc-900">
          <td colSpan={4} className="py-3">
            <div className="flex max-w-lg">
              <FormularioInline edicao={edicao} aoFechar={() => setAberto(false)} />
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
