# Financeiro

Sistema web de **antecipação de recebíveis (boletos)** integrado ao ERP **GestãoClick**.

A empresa registra títulos a receber (digitados manualmente ou sincronizados do GestãoClick) e antecipa esses boletos junto a um banco: o dinheiro entra antes do vencimento, já descontados juros e tarifas. O sistema controla cada antecipação, a conta bancária que recebeu o valor e o estado de cada título.

> Projeto em estágio inicial. Veja as [Pendências](#pendências).

## Conceitos do domínio

- **Título**: valor a receber de um cliente, com número, vencimento e origem (`MANUAL` ou `GESTAOCLICK`). É marcado como baixado (`baixadoEm`) quando o cliente paga o boleto.
- **Antecipação**: um boleto antecipado. Guarda valor bruto, juros, tarifas, valor líquido, data e status (`ATIVA` ou `CANCELADA`). Cada título pode ter no máximo uma antecipação ativa (índice único parcial na migration).
- **Conta bancária**: banco/conta onde o valor líquido da antecipação entra.
- **Estado do título** (derivado, nunca gravado): `EM_ABERTO`, `ANTECIPADO_PENDENTE` ou `BAIXADO` (a baixa tem prioridade, mesmo para títulos antecipados).
- **Dinheiro**: representado como texto com ponto decimal (`"1234.50"`) e calculado em centavos inteiros (`bigint`), sem erro de ponto flutuante.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 (React Compiler habilitado) |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS 4 + shadcn/ui (Radix UI, lucide-react) |
| Backend | Route Handlers + Server Actions |
| Banco de dados | PostgreSQL no Neon (driver serverless) |
| ORM | Prisma 7 (adapter `PrismaNeon`) |
| Autenticação | Auth.js v5 (beta), sessões JWT |
| Integração ERP | API GestãoClick |
| Validação | Zod 4 |
| Testes | Vitest |

## Estrutura

```
prisma/
  schema.prisma              modelo do banco (Usuario, ContaBancaria, Titulo, Antecipacao)
  migrations/                migrations versionadas
scripts/criar-usuario.ts    cria o primeiro usuário
prisma.config.ts             configuração do Prisma (lê DATABASE_URL)
docs/superpowers/            especificação de design e plano de implementação
src/
  app/
    (dashboard)/antecipacoes/  telas de antecipação
    api/auth/[...nextauth]/    rotas do Auth.js
    api/health/                healthcheck
    login/                     página de login
    (dashboard)/contas|titulos cadastros; antecipacoes registro e cancelamento
    (dashboard)/actions.ts     Server Actions (exigem sessão, validam com Zod)
  proxy.ts                   protege as rotas do dashboard (exige sessão)
  components/ui/             componentes shadcn/ui
  generated/prisma/          cliente Prisma gerado (não versionado)
  lib/
    auth.ts                  configuração do Auth.js
    db.ts                    cliente Prisma (adapter Neon)
    antecipacoes/            regras e serviço de antecipação (transação)
    senha.ts                 hash e verificação de senha (bcryptjs)
    dinheiro.ts              aritmética monetária em centavos
    env.ts                   validação das variáveis de ambiente (Zod, lazy)
    gestaoclick/client.ts    cliente HTTP da API GestãoClick
    titulos/estado.ts        estado derivado do título
    validations/             schemas Zod
```

Para entender o porquê das regras (estados do título, baixa sem entrada de caixa, uma antecipação ativa por título), leia [docs/explicacao-antecipacao-recebiveis.md](docs/explicacao-antecipacao-recebiveis.md).

## Pré-requisitos

- Node.js 20+ e npm
- Um banco PostgreSQL no [Neon](https://neon.tech)
- Credenciais da API do GestãoClick (access token e secret access token)

## Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie o arquivo de exemplo e preencha as variáveis:

   ```bash
   cp .env.example .env.local
   ```

   | Variável | Descrição |
   | --- | --- |
   | `DATABASE_URL` | string de conexão do Neon (com pooler) |
   | `AUTH_SECRET` | segredo do Auth.js; gere com `openssl rand -base64 32` |
   | `GESTAOCLICK_API_URL` | URL base da API do GestãoClick |
   | `GESTAOCLICK_ACCESS_TOKEN` | token de acesso do GestãoClick |
   | `GESTAOCLICK_SECRET_ACCESS_TOKEN` | secret token do GestãoClick |

3. Gere o cliente Prisma e aplique as migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. Rode o servidor de desenvolvimento:

   ```bash
   npm run dev
   ```

   Acesse http://localhost:3000. O healthcheck fica em `/api/health`.

## Scripts

| Comando | Função |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm start` | servidor de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | checagem de tipos |
| `npm test` | testes com Vitest (execução única) |
| `npm run test:watch` | Vitest em modo watch |
| `npm run db:generate` | gera o cliente Prisma |
| `npm run db:migrate` | cria e aplica migrations |
| `npm run db:studio` | interface visual do banco |
| `npm run usuario:criar -- email "Nome" "senha"` | cria (ou redefine a senha de) um usuário para o login |

## Pendências

- Confirmar endpoints e formato de resposta da API GestãoClick em `src/lib/gestaoclick/client.ts`.
- Implementar a sincronização de títulos do GestãoClick (`origem = GESTAOCLICK`).
- Relatório de custo financeiro (juros e tarifas) por período e por banco. Hoje a lista de títulos só mostra os totais gerais.
- Testes automáticos das operações no banco (concorrência e índice parcial de uma antecipação ativa por título).
- Paginar a lista de títulos e antecipações (hoje sem `take`).
- Instalar componentes shadcn adicionais conforme necessário.
