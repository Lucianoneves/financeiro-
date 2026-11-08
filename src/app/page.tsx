import { redirect } from "next/navigation";

// A raiz não tem conteúdo próprio: manda para o login. Quem já está logado é
// levado pelo próprio login ao módulo do seu perfil (financeiro ou produção).
export default function Home() {
  redirect("/login");
}
