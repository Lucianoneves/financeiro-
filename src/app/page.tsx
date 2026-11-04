import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-zinc-50 p-8 font-sans dark:bg-black">
      <h1 className="text-3xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Financeiro
      </h1>
      <p className="max-w-md text-center text-zinc-600 dark:text-zinc-400">
        Controle de antecipação de recebíveis integrado ao GestãoClick.
      </p>
      <Button asChild>
        <Link href="/antecipacoes">Antecipações</Link>
      </Button>
    </main>
  );
}
