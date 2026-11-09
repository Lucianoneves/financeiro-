"use client";

import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import type { ResultadoApontamento } from "@/lib/producao/erros";

type Acao = (estado: ResultadoApontamento, formData: FormData) => Promise<ResultadoApontamento>;

// Formulário de apontamento. Diferente do FormularioAcao compartilhado, ele NÃO
// limpa os campos quando há erro (o React 19 reseta formulários com action depois de
// cada envio). Mostra todas as mensagens e leva o usuário ao primeiro campo com erro.
export function FormularioApontamento({
  action,
  rotuloEnviar,
  children,
}: {
  action: Acao;
  rotuloEnviar: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLFormElement>(null);
  const [estado, setEstado] = useState<ResultadoApontamento>({});
  const [pendente, iniciar] = useTransition();
  const [envio, setEnvio] = useState(0);

  function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const dados = new FormData(form);
    iniciar(async () => {
      const r = await action(estado, dados);
      // Sucesso: limpa tudo. Erro: nada é mexido, só a mensagem muda.
      if (r.sucesso) form.reset();
      setEstado(r);
      setEnvio((n) => n + 1);
    });
  }

  // A cada envio com erro: marca os campos com erro e leva o foco ao primeiro.
  useEffect(() => {
    const form = ref.current;
    if (!form) return;
    form.querySelectorAll<HTMLElement>("[data-erro-campo]").forEach((el) => {
      el.removeAttribute("aria-invalid");
      el.style.borderColor = "";
      delete el.dataset.erroCampo;
    });
    const comCampo = (estado.erros ?? []).filter((e) => e.campo);
    for (const e of comCampo) {
      const el = form.querySelector<HTMLElement>(`[name="${e.campo}"]`);
      if (!el) continue;
      el.setAttribute("aria-invalid", "true");
      el.style.borderColor = "#dc2626";
      el.dataset.erroCampo = "true";
    }
    if (comCampo.length > 0) irParaCampo(form, comCampo[0].campo!);
  }, [envio, estado]);

  return (
    <form
      ref={ref}
      onSubmit={enviar}
      className="flex max-w-lg flex-col gap-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
    >
      {children}
      {estado.erros && estado.erros.length > 0 && (
        <div role="alert" className="flex flex-col gap-1 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
          <p className="font-medium">
            {estado.erros.length === 1 ? "Corrija este ponto:" : `Corrija estes ${estado.erros.length} pontos:`}
          </p>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {estado.erros.map((e, i) => (
              <li key={i}>
                {e.campo ? (
                  <button
                    type="button"
                    className="text-left underline"
                    onClick={() => irParaCampo(ref.current, e.campo!)}
                  >
                    {e.mensagem}
                  </button>
                ) : (
                  e.mensagem
                )}
              </li>
            ))}
          </ul>
        </div>
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

function irParaCampo(form: HTMLFormElement | null, campo: string) {
  const el = form?.querySelector<HTMLElement>(`[name="${campo}"]`);
  if (!el) return;
  el.scrollIntoView({ block: "center", behavior: "smooth" });
  el.focus();
}
