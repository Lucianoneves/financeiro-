# Financeiro

Sistema de antecipação de recebíveis (boletos) integrado ao GestãoClick.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Frontend | Next.js 16 + React |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS + shadcn/ui |
| Backend | Route Handlers + Server Actions |
| Banco de dados | PostgreSQL / Neon |
| ORM | Prisma 7 |
| Autenticação | Auth.js |
| Integração ERP | API GestãoClick |
| Validação | Zod |
| Testes | Vitest + Postman |

## Estrutura

```
prisma/
  schema.prisma              modelo do banco
prisma.config.ts             configuração do Prisma (lê DATABASE_URL)
src/
  app/
    (dashboard)/antecipacoes/  telas de antecipação
    api/auth/[...nextauth]/    rotas do Auth.js
    api/health/                healthcheck
  components/ui/             componentes shadcn/ui
  lib/
    auth.ts                  configuração do Auth.js
    db.ts                    cliente Prisma (adapter Neon)
    env.ts                   validação das variáveis de ambiente
    gestaoclick/client.ts    cliente HTTP da API GestãoClick
    validations/             schemas Zod
```

## Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie o arquivo de exemplo e preencha as variáveis:

   ```bash
   cp .env.example .env.local
   ```

   Para o `AUTH_SECRET`, rode `openssl rand -base64 32`.

3. Gere o cliente Prisma:

   ```bash
   npm run db:generate
   ```

4. Rode o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

## Scripts

| Comando | Função |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | checagem de tipos |
| `npm test` | testes com Vitest |
| `npm run db:generate` | gera o cliente Prisma |
| `npm run db:migrate` | cria e aplica migrations |
| `npm run db:studio` | interface visual do banco |

## Pendências

- Modelar títulos, antecipações e movimentações no `prisma/schema.prisma`.
- Definir provedor de login em `src/lib/auth.ts`.
- Confirmar endpoints e formato de resposta da API GestãoClick em `src/lib/gestaoclick/client.ts`.
- Adicionar `src/proxy.ts` para proteger as rotas do dashboard.
- Instalar componentes shadcn adicionais quando forem necessários.
