import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { verificarSenha } from "@/lib/senha";
import { loginSchema } from "@/lib/validations/login";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, senha: {} },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Import dinâmico: o cliente do banco valida o ambiente ao carregar,
        // e o build do Next não deve exigir as variáveis.
        const { db } = await import("@/lib/db");
        const usuario = await db.usuario.findUnique({
          where: { email: parsed.data.email },
        });
        if (!usuario) return null;

        const ok = await verificarSenha(parsed.data.senha, usuario.senhaHash);
        if (!ok) return null;

        return { id: usuario.id, name: usuario.nome, email: usuario.email };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // Chamado pelo proxy: rotas do dashboard exigem sessão.
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      if (pathname.startsWith("/antecipacoes")) return !!auth;
      return true;
    },
  },
});
