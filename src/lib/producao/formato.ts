// Formatação de indicadores para a tela. Razões chegam como fração (0,875 = 87,5%).

// Máquina e produto aparecem como "código — nome". O código da máquina é digitado
// por quem cadastra e pode faltar (máquinas antigas): sem código, mostra só o nome.
export function rotuloDaMaquina(m: { codigo: string | null; nome: string }) {
  return m.codigo ? `${m.codigo} — ${m.nome}` : m.nome;
}

// Código do operador, gerado pelo sistema a partir de um número sequencial:
// 1 -> "OP-001". Passou de 999, continua sem cortar: 1000 -> "OP-1000".
export function codigoDoOperador(numero: number) {
  return `OP-${String(numero).padStart(3, "0")}`;
}

export function rotuloDoOperador(o: { numero: number; nome: string }) {
  return `${codigoDoOperador(o.numero)} — ${o.nome}`;
}

export function formatarPercentual(razao: number | null) {
  if (razao === null) return "—";
  return `${(razao * 100).toFixed(1).replace(".", ",")}%`;
}

export function formatarMinutos(minutos: number) {
  const m = Math.round(minutos);
  const h = Math.floor(m / 60);
  const resto = m % 60;
  if (h === 0) return `${resto} min`;
  return resto === 0 ? `${h} h` : `${h} h ${resto} min`;
}

export function formatarNumero(n: number | null, casas = 0) {
  if (n === null) return "—";
  return n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
