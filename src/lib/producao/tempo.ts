import { ErroProducao } from "./erros";

// Horários digitados (input datetime-local, "2026-11-04T08:00") são de Brasília,
// que está em UTC−03:00 o ano todo (sem horário de verão). No banco ficam em UTC.
const DESLOCAMENTO_MS = 3 * 60 * 60 * 1000;

export const FORMATO_HORARIO_LOCAL = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

// O V8 aceita dias que não existem ("2026-02-31" vira 3 de março) e "24:00", então
// além do formato confere se o horário converte de volta para o mesmo texto.
export function horarioLocalValido(valor: string) {
  if (!FORMATO_HORARIO_LOCAL.test(valor)) return false;
  const instante = deHorarioLocal(valor);
  if (Number.isNaN(instante.getTime())) return false;
  return new Date(instante.getTime() - DESLOCAMENTO_MS).toISOString().slice(0, 16) === valor;
}

// "2026-11-04T08:00" (Brasília) -> instante UTC. Data impossível dá Invalid Date.
export function deHorarioLocal(valor: string): Date {
  return new Date(`${valor}:00.000-03:00`);
}

// Dia de produção ("2026-11-04") de um horário local digitado.
export function diaDoHorarioLocal(valor: string) {
  return valor.slice(0, 10);
}

// Minutos inteiros entre dois instantes (fim - início).
export function minutosEntre(inicio: Date, fim: Date) {
  return Math.round((fim.getTime() - inicio.getTime()) / 60000);
}

// Dia de hoje em Brasília ("2026-11-04"), para padrões de filtro.
export function hojeEmBrasilia(agora: Date = new Date()) {
  return new Date(agora.getTime() - DESLOCAMENTO_MS).toISOString().slice(0, 10);
}

// Instante UTC -> "04/11/2026 08:00" em Brasília, para exibir.
export function formatarHorario(instante: Date) {
  const iso = new Date(instante.getTime() - DESLOCAMENTO_MS).toISOString();
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano} ${iso.slice(11, 16)}`;
}

// Garante um intervalo válido; usado pelo serviço depois da validação do formulário.
export function intervaloDe(inicioLocal: string, fimLocal: string) {
  const inicio = deHorarioLocal(inicioLocal);
  const fim = deHorarioLocal(fimLocal);
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime())) {
    throw new ErroProducao("Data ou hora inválida.");
  }
  return { inicio, fim, minutos: minutosEntre(inicio, fim) };
}
