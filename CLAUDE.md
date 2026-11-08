# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Codebase Overview

Mapa completo dos arquivos, fluxos e gotchas em [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).

**Stack**: Next.js 16 App Router, React 19, Prisma 7 + Neon, Auth.js v5, Zod 4, Vitest.
**Structure**: `src/app/(dashboard)` (financeiro) e `src/app/(producao)` (produção) com Server Actions em `actions.ts`; regras puras em `src/lib/` (`antecipacoes`, `titulos`, `gestaoclick`, `producao`); schemas em `src/lib/validations/`.

## Project

Financeiro: a receivables-advance (boleto anticipation) system for a company that anticipates its own boletos at a bank. Next.js 16 (App Router) + React 19 + TypeScript, Tailwind 4 + shadcn/ui, Prisma 7 on Neon Postgres, Auth.js v5 (beta), Zod 4, Vitest.

The GestãoClick ERP has no concept of "money received but client hasn't paid yet": a título is either open or baixado. **This system is the only place that state exists.** Titles come from two origins: typed in manually (`origem = MANUAL`) or imported from GestãoClick (`origem = GESTAOCLICK`) by the "Sincronizar" button on `/titulos`. The sync is **read-only**: nothing is ever written to the ERP.

The same app also hosts an independent **Controle de Produção** module (`/producao`, see the "Produção" sections below). It shares only login, session and layout components with the financial module; it has its own tables, rules and screens, and no GestãoClick integration. Do not change financial code or rules for it, and vice-versa.

Design and plan live in `docs/superpowers/specs/` and `docs/superpowers/plans/`; business-rule rationale is in README.md.

## Next.js version warning

This Next.js version has breaking changes versus common training data. Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (e.g. `01-app/`). `middleware.ts` is now `src/proxy.ts`, which runs on Node by default and is only an optimistic check, never the sole authorization.

## Commands

- `npm run dev` / `npm run build` / `npm start`
- `npm run lint` (ESLint), `npm run typecheck` (`tsc --noEmit`)
- `npm test` (Vitest, single run); `npm run test:watch`
- Single test: `npx vitest run src/path/to/file.test.ts` or `npx vitest run -t "test name"`. Tests must match `src/**/*.test.ts` (node environment, `@` aliased to `src`).
- `npm run db:generate` (Prisma client), `npm run db:migrate`, `npm run db:studio`
- `npm run usuario:criar -- email "Nome" "senha" [admin|producao]` creates a user (there is no sign-up screen). `admin` (default) = financeiro, access to everything; `producao` = gestor de produção, only `/producao`. Without the 4th argument an existing user keeps their perfil.

Setup: copy `.env.example` to `.env`, fill it in, then run `npm run db:generate` before dev/typecheck. `prisma migrate reset` is blocked for AI agents by Prisma and needs the user's explicit consent.

## Domain rules (do not break)

- A título has a derived state, never stored: `BAIXADO` (has `baixadoEm`) > `ANTECIPADO_PENDENTE` (has an ATIVA antecipação) > `EM_ABERTO` (`src/lib/titulos/estado.ts`).
- One boleto per antecipação, and **at most one ATIVA antecipação per título**, enforced by a partial unique index written by hand in the init migration (Prisma cannot declare it) and by `src/lib/antecipacoes/regras.ts`.
- "Cliente pagou" (`baixarTitulo`) is a quitação **without cash entry**: it only sets `baixadoEm`. It must never change the received total, juros or tarifas (the money goes to the bank that advanced it). Totals in `src/lib/antecipacoes/totais.ts` count only ATIVA antecipações.
- Money is a string with a dot ("1234.50"), maximum 12 integer digits, and arithmetic is done in integer cents (`bigint`) via `src/lib/dinheiro.ts`. Never use `number` for money. The database has CHECK constraints (migration `checks_valores`) mirroring these rules, including `valorLiquido = valorBruto - juros - tarifas`.
- Juros and tarifas are typed from the bank's borderô (the "espelho da antecipação"), not calculated. Neither GestãoClick nor the bank statement (extrato) carries them.

## Produção: domain rules (do not break)

Independent of the financial rules above; the money rules do not apply (no money here, quantities are integer pieces).

- **Apontamento** = a period of one máquina on one ordem, with operador, turno, `quantidadeBoa`, paradas (motivo + minutos) and perdas (motivo + peças). The supervisor enters everything; operadores are not system users.
- Only an `ABERTA` ordem takes apontamentos, and the produto's `VelocidadeNominal` (pieces/hour) for that máquina must exist. The velocidade is **copied** into the apontamento (`velocidadeNominal`), so editing the cadastro never changes history.
- Sum of paradas minutes ≤ duration; duration is 1 minute to 24 h; **one máquina cannot have overlapping apontamentos** (GiST exclusion constraint `apontamento_maquina_sem_sobreposicao` in migration `producao`, plus a friendly pre-check in `servico.ts`). Hand-written CHECKs live in the same migration.
- **Operador has an automatic code**: `Operador.numero` (`autoincrement`, unique) shown as `OP-001` via `codigoDoOperador`/`rotuloDoOperador` in `src/lib/producao/formato.ts`. It is never typed or edited. `registrarApontamento` looks the operador up by name and only creates when missing — do not turn it back into `upsert` (it would burn a number on every apontamento). Máquina and produto codes are the opposite: always typed by the user (máquina `codigo` is optional for old rows).
- Cadastros are never deleted, only `ativo = false`. Motivos de parada/perda are cadastros, never free text.
- Indicators are derived, never stored (`src/lib/producao/indicadores.ts`). **OEE = disponibilidade × desempenho × qualidade; ALL paradas count against disponibilidade, including intervalo** (business decision). Sums are made before dividing. Desempenho > 100% is shown (with a warning), not clamped, but a new apontamento cannot exceed capacity: boas + perdidas ≤ velocidade × (duração − paradas) / 60 (`verificarApontamento`). So desempenho > 100% only appears in apontamentos registered before that rule.
- Typed times are Brasília (UTC−03:00, no DST) and stored in UTC; the production day (`data`) is the day of `inicio` in Brasília (`src/lib/producao/tempo.ts`). V8 accepts impossible dates like Feb 31, so validate with `horarioLocalValido`.

## Architecture

- **Prisma client is generated into `src/generated/prisma`** (imported as `@/generated/prisma/client`); regenerate after schema changes and on a fresh checkout. `prisma.config.ts` loads `DATABASE_URL` via dotenv. Hand-written SQL (partial index, CHECKs) lives in the migrations.
- **`src/lib/db.ts`** exports `getDb()`, a lazy singleton on `globalThis` using the Neon adapter. Lazy so importing it never requires env vars (`next build` works without secrets).
- **`src/lib/env.ts`** has separate lazy validators: `getDatabaseUrl()` (DB only), `getGestaoClickEnv()` (ERP only) and `getEnv()` (everything). Use the narrowest one so login and pages don't fail for missing ERP keys.
- **Auth:** `src/lib/auth.ts` (Credentials provider, scrypt password hashing in `src/lib/senha.ts`, JWT sessions, sign-in at `/login`), `src/proxy.ts` (optimistic redirect via the `authorized` callback; only `/` and `/login` are public). Real checks: `exigirSessao()` in `src/lib/sessao.ts` is called in every Server Action and in every server component that reads the database. **Perfis** (`Usuario.perfil`, pure helpers in `src/lib/perfil.ts`): `ADMIN` sees financeiro and produção; `PRODUCAO` (gestor de produção) only `/producao`. The perfil goes into the JWT/session at login (a perfil change only applies on the user's next login). `exigirSessao()` now requires `ADMIN` (financeiro, redirects `PRODUCAO` to `/producao`); production code uses `exigirSessaoProducao()` (any logged user); `proxy.ts`/`authorized` redirects `PRODUCAO` away from other routes (optimistic only). A session without a perfil (issued before perfis existed) counts as `ADMIN`; unknown values count as `PRODUCAO`.
- **Server Actions** are in `src/app/(dashboard)/actions.ts`: validate with Zod, run through `executar()` which turns `ErroNegocio` into a message shown in the UI. Business logic is in `src/lib/antecipacoes/` and `src/lib/titulos/`; writes that can race use conditional `updateMany` or transactions.
- **UI:** screens under the `src/app/(dashboard)/` route group (`antecipacoes`, `titulos`, `contas`); data-reading components call `await connection()` so they never prerender. Reusable client pieces: `src/components/formulario-acao.tsx` and `botao-acao.tsx` (forms/buttons bound to Server Actions with `useActionState`). shadcn/ui lives in `src/components/ui/`.
- **GestãoClick sync** (`src/lib/gestaoclick/`): `client.ts` is the HTTP client (headers `access-token` / `secret-access-token`); `recebimentos.ts` reads `/recebimentos` (GET only, `pagina`/`limite` pagination that stops on a page shorter than the limit because the documented response has no `meta`, Zod-validated, only the fields we use) and converts rows to titles; `plano.ts` is a pure planner (create / update only), `sincronizar.ts` runs it against the database. ERP quirks: without dates the API returns only the current month; without `loja_id` only the key's default store; `valor_total` (valor + juros - desconto) is what the client pays. **The ERP's baixa (`liquidado`) is deliberately NOT imported**: in GestãoClick it is posted when the bank pays the antecipação (~30 days before vencimento); the client's payment is never recorded there. Only "Cliente pagou" sets `baixadoEm`. Titles already baixados in the ERP are still created (open). The value of a título with an ATIVA antecipação is never changed by the sync.
- **Produção module:** pure rules and indicators in `src/lib/producao/` (`regras.ts`, `indicadores.ts`, `tempo.ts`, `formato.ts`, `servico.ts` for the transaction, `erros.ts` with `ErroProducao`); Zod schemas in `src/lib/validations/producao.ts`; Server Actions in `src/app/(producao)/producao/actions.ts` (own `executar()`, same session/Zod pattern); screens in `src/app/(producao)/producao/` (`apontamentos`, `ordens`, `indicadores`, `fechamento` (per-day, per-turno report, read-only, does not lock apontamentos), `cadastros`, summary at `/producao`) under their own route group layout. It reuses `exigirSessao`, `getDb`, `formulario-acao.tsx` and `botao-acao.tsx` without changing them. Activate/deactivate buttons send `tipo:id:ativar|inativar` as the `id` to one shared action.
- The React Compiler is enabled (`babel-plugin-react-compiler`); `tsconfig` targets ES2020 for `bigint` literals.

## Language

Docs, comments, and domain terms are in Brazilian Portuguese; follow that in comments and user-facing text.
