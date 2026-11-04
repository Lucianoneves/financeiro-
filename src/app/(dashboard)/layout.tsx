import Link from "next/link";

import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth";

async function sair() {
  "use server";
  await signOut({ redirectTo: "/login" });
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className="flex items-center justify-between border-b border-zinc-200 px-8 py-3 dark:border-zinc-800">
        <nav className="flex gap-4 text-sm">
          <span className="font-semibold">Financeiro</span>
          <Link href="/antecipacoes">Antecipações</Link>
          <Link href="/titulos">Títulos</Link>
          <Link href="/contas">Contas</Link>
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
