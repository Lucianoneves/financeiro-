import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import {
  caminhoPermitido,
  paginaInicial,
  perfilDe,
  precisaRevalidarPerfil,
  type Perfil,
} from "@/lib/perfil";
import { loginBloqueado, registrarFalhaDeLogin, zerarFalhasDeLogin } from "@/lib/login-limite";
import { verificarSenha } from "@/lib/senha";
import { loginSchema } from "@/lib/validations/login";

declare module "next-auth" {
  interface User {
    perfil?: Perfil;
  }
  interface Session {
    user: { perfil: Perfil } & import("next-auth").DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    perfil?: Perfil;
    perfilVerificadoEm?: number;
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: { email: {}, senha: {} },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        // Import dinâmico: o cliente do banco valida o ambiente ao carregar,
        // e o build do Next não deve exigir as variáveis.
        const { getDb } = await import("@/lib/db");
        const email = parsed.data.email;

        // Bloqueado por falhas recentes: mesma resposta de senha errada, sem
        // conferir a senha (não dá para usar o bloqueio para testar palpites).
        if (await loginBloqueado(email)) return null;

        const usuario = await getDb().usuario.findUnique({ where: { email } });
        if (!usuario) {
          await registrarFalhaDeLogin(email);
          return null;
        }

        const ok = await verificarSenha(parsed.data.senha, usuario.senhaHash);
        if (!ok) {
          await registrarFalhaDeLogin(email);
          return null;
        }
        await zerarFalhasDeLogin(email);

        return {
          id: usuario.id,
          name: usuario.nome,
          email: usuario.email,
          perfil: perfilDe(usuario.perfil),
        };
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    // O perfil vem do banco no login e é relido a cada INTERVALO_REVALIDACAO_MS,
    // então troca de perfil ou remoção do usuário valem em até esse prazo. Se o
    // usuário sumiu, ou não há id no token, a sessão é encerrada: retornar null
    // faz o Auth.js apagar o cookie (não vale mais nem como perfil restrito).
    async jwt({ token, user }) {
      if (user) {
        token.perfil = perfilDe(user.perfil);
        token.perfilVerificadoEm = Date.now();
        return token;
      }
      if (!precisaRevalidarPerfil(token.perfilVerificadoEm, Date.now())) return token;

      if (!token.sub) return null;
      // Import dinâmico, pelo mesmo motivo do authorize acima.
      const { getDb } = await import("@/lib/db");
      const atual = await getDb().usuario.findUnique({
        where: { id: token.sub },
        select: { perfil: true },
      });
      if (!atual) return null;
      token.perfil = perfilDe(atual.perfil);
      token.perfilVerificadoEm = Date.now();
      return token;
    },
    session({ session, token }) {
      session.user.perfil = perfilDe(token.perfil);
      return session;
    },
    // Chamado pelo proxy: rotas do dashboard exigem sessão, e o gestor de
    // produção só entra em /producao. É checagem otimista; a de verdade fica
    // em exigirSessao / exigirSessaoProducao (src/lib/sessao.ts).
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      // Só a home e o login são públicos; o resto do app exige sessão.
      if (pathname === "/" || pathname === "/login") return true;
      if (!auth) return false;
      const perfil = perfilDe(auth.user?.perfil);
      if (caminhoPermitido(perfil, pathname)) return true;
      return Response.redirect(new URL(paginaInicial(perfil), request.nextUrl));
    },
  },
});
