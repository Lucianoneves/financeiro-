"use client";

import { useActionState, useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import type { EstadoForm } from "@/app/(dashboard)/actions";

export function Campo({
  rotulo,
  ...props
}: { rotulo: string } & React.ComponentProps<"input">) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {rotulo}
      <input
        {...props}
        className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
      />
    </label>
  );
}

export function Selecao({
  rotulo,
  children,
  ...props
}: { rotulo: string } & React.ComponentProps<"select">) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {rotulo}
      <select
        {...props}
        className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
      >
        {children}
      </select>
    </label>
  );
}

// Formulário ligado a uma Server Action: mostra erro/sucesso e limpa ao salvar.
export function FormularioAcao({
  action,
  rotuloEnviar,
  children,
}: {
  action: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  rotuloEnviar: string;
  children: React.ReactNode;
}) {
  const [estado, formAction, pendente] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (estado.sucesso) ref.current?.reset();
  }, [estado]);

  return (
    <form
      ref={ref}
      action={formAction}
      className="flex max-w-lg flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      {children}
      {estado.erro && (
        <p role="alert" className="text-sm text-red-600">
          {estado.erro}
        </p>
      )}
      {estado.sucesso && (
        <p role="status" className="text-sm text-green-700">
          {estado.sucesso}
        </p>
      )}
      <Button type="submit" disabled={pendente}>
        {pendente ? "Salvando..." : rotuloEnviar}
      </Button>
    </form>
  );
}
