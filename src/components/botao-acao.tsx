"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import type { EstadoForm } from "@/app/(dashboard)/actions";

// Botão de uma linha da tabela ligado a uma Server Action sobre um registro.
// Mostra a mensagem de erro ao lado quando a ação não puder ser feita.
export function BotaoAcao({
  action,
  id,
  rotulo,
  rotuloAcessivel,
}: {
  action: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  id: string;
  rotulo: string;
  rotuloAcessivel: string;
}) {
  const [estado, formAction, pendente] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col items-start gap-1">
      <input type="hidden" name="id" value={id} />
      <Button
        type="submit"
        variant="outline"
        size="sm"
        disabled={pendente}
        aria-label={rotuloAcessivel}
      >
        {pendente ? "Aguarde..." : rotulo}
      </Button>
      {estado.erro && (
        <p role="alert" className="max-w-48 text-xs text-red-600">
          {estado.erro}
        </p>
      )}
    </form>
  );
}
