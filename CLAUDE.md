# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Financeiro: a receivables-advance (boleto anticipation) system integrated with the GestãoClick ERP. Next.js 16 (App Router) + React 19 + TypeScript, Tailwind 4 + shadcn/ui, Prisma 7 on Neon Postgres, Auth.js v5 (beta), Zod 4, Vitest. The project is early-stage: the Prisma schema has no domain models yet, `src/lib/auth.ts` has no providers, and the GestãoClick endpoints are unconfirmed (see "Pendências" in README.md).

## Next.js version warning

`AGENTS.md` states this Next.js version has breaking changes versus common training data. Before writing Next.js code, read the relevant guide in `node_modules/next/dist/docs/` (e.g. `01-app/`). Route protection is expected to use `src/proxy.ts` (not the older `middleware.ts` convention).

## Commands

- `npm run dev` / `npm run build` / `npm start`
- `npm run lint` (ESLint), `npm run typecheck` (`tsc --noEmit`)
- `npm test` (Vitest, single run); `npm run test:watch`
- Single test: `npx vitest run src/path/to/file.test.ts` or `npx vitest run -t "test name"`. Tests must match `src/**/*.test.ts` (node environment, `@` aliased to `src`).
- `npm run db:generate` (Prisma client), `npm run db:migrate` (`prisma migrate dev`), `npm run db:studio`

Setup: copy `.env.example` to `.env.local` and fill it in, then run `npm run db:generate` before dev/typecheck.

## Architecture

- **Prisma client is generated into `src/generated/prisma`** (custom `output` in `prisma/schema.prisma`), imported as `@/generated/prisma/client`. It must be regenerated (`db:generate`) after schema changes and on a fresh checkout. `prisma.config.ts` loads `DATABASE_URL` via dotenv.
- **`src/lib/db.ts`** exports the `db` singleton using the Neon serverless adapter (`PrismaNeon`), cached on `globalThis` in non-production to survive Next dev reloads.
- **`src/lib/env.ts`**: env vars are validated lazily via `getEnv()` (Zod), not at import time, so `next build` works without secrets. Use `getEnv()` rather than `process.env` for app config.
- **`src/lib/auth.ts`** exports `handlers, auth, signIn, signOut` (Auth.js, JWT sessions, sign-in page `/login`); handlers are mounted at `src/app/api/auth/[...nextauth]/`.
- **GestãoClick integration** lives in `src/lib/gestaoclick/client.ts` (HTTP client using the access token and secret access token env vars).
- Zod schemas go in `src/lib/validations/`. shadcn/ui components are in `src/components/ui/` (config in `components.json`); `cn` helper is in `src/lib/utils.ts`.
- Dashboard screens use the `src/app/(dashboard)/` route group (currently `antecipacoes/`); `api/health` is the healthcheck.
- The React Compiler is enabled (`babel-plugin-react-compiler`).

## Language

Docs, comments, and domain terms are in Brazilian Portuguese; follow that in comments and user-facing text.
