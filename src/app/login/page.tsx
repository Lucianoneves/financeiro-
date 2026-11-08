import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { CampoSenha } from "@/components/campo-senha";
import { Button } from "@/components/ui/button";
import { auth, signIn } from "@/lib/auth";
import { paginaInicial, perfilDe } from "@/lib/perfil";

async function entrar(formData: FormData) {
  "use server";
  try {
    await signIn("credentials", {
      email: formData.get("email"),
      senha: formData.get("senha"),
      redirectTo: "/antecipacoes",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/login?erro=1");
    }
    // O redirecionamento de sucesso também é lançado como erro: repassa.
    throw error;
  }
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 p-8 dark:bg-black">
      <Suspense fallback={null}>
        <FormularioLogin searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

// Lê sessão e searchParams (dados de requisição), por isso fica no Suspense.
async function FormularioLogin({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const sessao = await auth();
  if (sessao) redirect(paginaInicial(perfilDe(sessao.user?.perfil)));
  const { erro } = await searchParams;

  return (
    <form
      action={entrar}
      className="flex w-full max-w-sm flex-col gap-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <h1 className="text-2xl font-semibold">Entrar</h1>
      {erro && (
        <p role="alert" className="text-sm text-red-600">
          E-mail ou senha incorretos.
        </p>
      )}
      <label className="flex flex-col gap-1 text-sm">
        E-mail
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-md border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700"
        />
      </label>
      <CampoSenha />
      <Button type="submit">Entrar</Button>
    </form>
  );
}
