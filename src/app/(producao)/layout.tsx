import Link from "next/link";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { auth, signOut } from "@/lib/auth";
import { perfilDe } from "@/lib/perfil";

async function sair() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

// Só o administrador tem o financeiro; o gestor de produção não vê o link.
// Lê a sessão (dado de requisição), por isso fica no Suspense.
async function LinkFinanceiro() {
  const sessao = await auth();
  if (perfilDe(sessao?.user?.perfil) !== "ADMIN") return null;
  return (
    <Link href="/antecipacoes" className="text-zinc-500">
      Financeiro
    </Link>
  );
}

export default function ProducaoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="flex items-center justify-between border-b border-zinc-200 px-8 py-3 dark:border-zinc-800 print:hidden">
        <nav className="flex flex-wrap gap-4 text-sm">
          <span className="font-semibold">Produção</span>
          <Link href="/producao">Resumo</Link>
          <Link href="/producao/apontamentos">Apontamentos</Link>
          <Link href="/producao/ordens">Ordens</Link>
          <Link href="/producao/indicadores">Indicadores</Link>
          <Link href="/producao/fechamento">Fechamento</Link>
          <Link href="/producao/cadastros">Cadastros</Link>
          <Suspense fallback={null}>
            <LinkFinanceiro />
          </Suspense>
        </nav>
        <form action={sair}>
          <Button type="submit" variant="outline" size="sm">
            Sair
          </Button>
        </form>
      </header>
      {children}
    </>
  );
}
