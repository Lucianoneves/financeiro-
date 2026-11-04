import NextAuth from "next-auth";

// Provedores de login ainda não definidos. Adicione aqui (credenciais,
// Google, etc.) quando o modelo de usuário estiver pronto.
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
});
