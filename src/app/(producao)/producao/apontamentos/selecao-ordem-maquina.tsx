"use client";

import { useEffect, useRef, useState } from "react";

import { Selecao } from "@/components/formulario-acao";
import { temVelocidade } from "@/lib/producao/compatibilidade";

type OrdemOpcao = { id: string; rotulo: string; produtoId: string };
type MaquinaOpcao = { id: string; nome: string };

// Ordem e máquina lado a lado. Opções sem velocidade cadastrada para a combinação
// escolhida ficam desabilitadas, com o motivo escrito ao lado.
export function SelecaoOrdemMaquina({
  ordens,
  maquinas,
  pares,
}: {
  ordens: OrdemOpcao[];
  maquinas: MaquinaOpcao[];
  pares: string[];
}) {
  const [ordemId, setOrdemId] = useState("");
  const [maquinaId, setMaquinaId] = useState("");
  const ancora = useRef<HTMLDivElement>(null);

  // Ao registrar com sucesso, o formulário é resetado. Acompanha o reset para o
  // estado controlado voltar ao inicial junto com os campos.
  useEffect(() => {
    const form = ancora.current?.closest("form");
    if (!form) return;
    const limpar = () => {
      setOrdemId("");
      setMaquinaId("");
    };
    form.addEventListener("reset", limpar);
    return () => form.removeEventListener("reset", limpar);
  }, []);

  const paresSet = new Set(pares);
  const ordemEscolhida = ordens.find((o) => o.id === ordemId);
  const maquinaEscolhida = maquinas.find((m) => m.id === maquinaId);

  function escolherOrdem(id: string) {
    setOrdemId(id);
    const o = ordens.find((x) => x.id === id);
    // Se a máquina escolhida não tem velocidade para o novo produto, limpa a máquina.
    if (o && maquinaId && !temVelocidade(paresSet, maquinaId, o.produtoId)) {
      setMaquinaId("");
    }
  }

  const ordemSemMaquina =
    ordemEscolhida && !maquinas.some((m) => temVelocidade(paresSet, m.id, ordemEscolhida.produtoId));
  const maquinaSemOrdem =
    maquinaEscolhida && !ordens.some((o) => temVelocidade(paresSet, maquinaEscolhida.id, o.produtoId));

  return (
    <div ref={ancora} className="flex flex-col gap-3">
      <Selecao
        rotulo="Ordem de produção"
        name="ordemId"
        required
        value={ordemId}
        onChange={(e) => escolherOrdem(e.target.value)}
      >
        <option value="" disabled>Escolha...</option>
        {ordens.map((o) => {
          const semVelocidade = maquinaId !== "" && !temVelocidade(paresSet, maquinaId, o.produtoId);
          return (
            <option key={o.id} value={o.id} disabled={semVelocidade}>
              {o.rotulo}{semVelocidade ? " (sem velocidade nesta máquina)" : ""}
            </option>
          );
        })}
      </Selecao>
      <Selecao
        rotulo="Máquina"
        name="maquinaId"
        required
        value={maquinaId}
        onChange={(e) => setMaquinaId(e.target.value)}
      >
        <option value="" disabled>Escolha...</option>
        {maquinas.map((m) => {
          const semVelocidade =
            ordemEscolhida !== undefined && !temVelocidade(paresSet, m.id, ordemEscolhida.produtoId);
          return (
            <option key={m.id} value={m.id} disabled={semVelocidade}>
              {m.nome}{semVelocidade ? " (sem velocidade para este produto)" : ""}
            </option>
          );
        })}
      </Selecao>
      {ordemSemMaquina && (
        <p role="status" className="text-sm text-amber-700">
          Esta ordem não tem máquina com velocidade cadastrada. Cadastre em Cadastros &gt; Velocidade nominal.
        </p>
      )}
      {maquinaSemOrdem && (
        <p role="status" className="text-sm text-amber-700">
          Esta máquina não tem ordem com velocidade cadastrada. Cadastre em Cadastros &gt; Velocidade nominal.
        </p>
      )}
    </div>
  );
}
