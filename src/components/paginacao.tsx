import Link from "next/link";

/**
 * Navegação entre páginas de uma lista. Mantém os outros parâmetros da URL
 * (por exemplo o filtro de estado) e só troca `pagina`.
 */
export function Paginacao({
  caminho,
  pagina,
  totalPaginas,
  parametros = {},
}: {
  caminho: string;
  pagina: number;
  totalPaginas: number;
  parametros?: Record<string, string>;
}) {
  if (totalPaginas <= 1) return null;

  function href(destino: number) {
    const q = new URLSearchParams(parametros);
    if (destino > 1) q.set("pagina", String(destino));
    const texto = q.toString();
    return texto ? `${caminho}?${texto}` : caminho;
  }

  const estilo = "rounded-md border border-zinc-200 px-3 py-1 dark:border-zinc-800";

  return (
    <nav className="flex items-center gap-3 text-sm" aria-label="Paginação">
      {pagina > 1 ? (
        <Link href={href(pagina - 1)} className={estilo}>
          Anterior
        </Link>
      ) : (
        <span className={`${estilo} text-zinc-400`}>Anterior</span>
      )}
      <span>
        Página {pagina} de {totalPaginas}
      </span>
      {pagina < totalPaginas ? (
        <Link href={href(pagina + 1)} className={estilo}>
          Próxima
        </Link>
      ) : (
        <span className={`${estilo} text-zinc-400`}>Próxima</span>
      )}
    </nav>
  );
}
