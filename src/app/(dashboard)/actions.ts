"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ZodType } from "zod";

import { auth } from "@/lib/auth";
import { cancelarAntecipacao, registrarAntecipacao } from "@/lib/antecipacoes/servico";
import { ErroNegocio } from "@/lib/antecipacoes/regras";
import { getDb } from "@/lib/db";
import { baixarTitulo } from "@/lib/titulos/servico";
import { antecipacaoSchema } from "@/lib/validations/antecipacao";
import { contaSchema, tituloSchema } from "@/lib/validations/cadastros";

export type EstadoForm = { erro?: string; sucesso?: string };

async function exigirSessao() {
  // Server Actions são alcançáveis por POST direto: o proxy não basta.
  const sessao = await auth();
  // Sessão expirada: manda para o login em vez de estourar uma exceção na tela.
  if (!sessao?.user) redirect("/login");
}

// Campos de dinheiro aceitam vírgula decimal ("1234,50") e viram "1234.50".
const CAMPOS_DINHEIRO = ["valor", "valorBruto", "jurosCobrados", "tarifasCobradas"];

function lerForm(formData: FormData) {
  const dados: Record<string, string> = {};
  for (const [chave, valor] of formData.entries()) {
    if (chave.startsWith("$ACTION") || typeof valor !== "string") continue;
    dados[chave] = CAMPOS_DINHEIRO.includes(chave)
      ? valor.trim().replace(",", ".")
      : valor.trim();
  }
  return dados;
}

function validar<T>(schema: ZodType<T>, formData: FormData) {
  const r = schema.safeParse(lerForm(formData));
  if (r.success) return { dados: r.data };
  return { erro: r.error.issues.map((i) => i.message).join(" ") };
}

async function executar(fn: () => Promise<string>): Promise<EstadoForm> {
  try {
    return { sucesso: await fn() };
  } catch (e) {
    if (e instanceof ErroNegocio) return { erro: e.message };
    console.error(e);
    return { erro: "Erro inesperado. Tente novamente." };
  }
}

export async function criarConta(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirSessao();
  const v = validar(contaSchema, formData);
  if (v.erro) return { erro: v.erro };
  return executar(async () => {
    await getDb().contaBancaria.create({ data: v.dados! });
    revalidatePath("/contas");
    revalidatePath("/antecipacoes");
    return "Conta cadastrada.";
  });
}

export async function criarTitulo(_: EstadoForm, formData: FormData): Promise<EstadoForm> {
  await exigirSessao();
  const v = validar(tituloSchema, formData);
  if (v.erro) return { erro: v.erro };
  return executar(async () => {
    await getDb().titulo.create({
      data: {
        numero: v.dados!.numero,
        cliente: v.dados!.cliente,
        valor: v.dados!.valor,
        vencimento: new Date(`${v.dados!.vencimento}T00:00:00.000Z`),
        origem: "MANUAL",
      },
    });
    revalidatePath("/titulos");
    revalidatePath("/antecipacoes");
    return "Título cadastrado.";
  });
}

export async function registrarAntecipacaoAction(
  _: EstadoForm,
  formData: FormData,
): Promise<EstadoForm> {
  await exigirSessao();
  const v = validar(antecipacaoSchema, formData);
  if (v.erro) return { erro: v.erro };
  return executar(async () => {
    await registrarAntecipacao(v.dados!);
    revalidatePath("/titulos");
    revalidatePath("/antecipacoes");
    return "Antecipação registrada.";
  });
}

export async function baixarTituloAction(formData: FormData) {
  await exigirSessao();
  const id = String(formData.get("id") ?? "");
  try {
    await baixarTitulo(id);
  } catch (e) {
    if (!(e instanceof ErroNegocio)) throw e;
    // Já baixado/inexistente: a lista recarregada mostra a situação real.
  }
  revalidatePath("/titulos");
  revalidatePath("/antecipacoes");
}

export async function cancelarAntecipacaoAction(formData: FormData) {
  await exigirSessao();
  const id = String(formData.get("id") ?? "");
  try {
    await cancelarAntecipacao(id);
  } catch (e) {
    if (!(e instanceof ErroNegocio)) throw e;
    // Estado inválido (já cancelada/baixada): a lista recarregada mostra a situação real.
  }
  revalidatePath("/titulos");
  revalidatePath("/antecipacoes");
}
