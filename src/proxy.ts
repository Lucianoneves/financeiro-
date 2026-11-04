// Protege as rotas do dashboard: a regra está em callbacks.authorized (src/lib/auth.ts).
export { auth as proxy } from "@/lib/auth";

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
