# Plano: primeira entrega de antecipação de recebíveis

Base: `docs/superpowers/specs/2026-11-03-antecipacao-recebiveis-design.md` (aprovado).
Regra geral: antes de escrever código Next.js, ler o guia relevante em `node_modules/next/dist/docs/`. Cada etapa termina com `npm run typecheck`, `npm run lint` e `npm test` passando.

## Etapa 1: Banco de dados

1. Em `prisma/schema.prisma`, criar `Usuario`, `ContaBancaria`, `Titulo`, `Antecipacao` e os enums `OrigemTitulo` (MANUAL, GESTAOCLICK) e `StatusAntecipacao` (ATIVA, CANCELADA).
   - Valores monetários: `Decimal @db.Decimal(14, 2)`.
   - `Titulo`: `numero`, `cliente`, `valor`, `vencimento`, `origem`, `idExterno?`, `baixadoEm?`, `@@unique([origem, idExterno])`.
   - `Antecipacao`: `tituloId`, `contaId`, `valorBruto`, `juros`, `tarifas`, `valorLiquido`, `dataAntecipacao`, `status`.
2. Garantir uma antecipação ATIVA por título: índice único parcial em SQL na migration (`CREATE UNIQUE INDEX ... ON "Antecipacao"("tituloId") WHERE status = 'ATIVA'`), pois o Prisma não declara índice parcial.
3. `npm run db:migrate -- --name init` e `npm run db:generate`.

**Pronto quando:** a migration aplica no Neon e inserir duas antecipações ATIVAS do mesmo título falha.

## Etapa 2: Regras de negócio puras (com testes)

1. Em `src/lib/validations/antecipacao.ts`, trocar `number` por valores decimais seguros (string validada ou `Prisma.Decimal`) e manter `valorLiquido` = bruto − juros − tarifas, sem erro de centavos.
2. Novo `src/lib/titulos/estado.ts`: função `estadoDoTitulo(titulo, antecipacaoAtiva)` que devolve `BAIXADO`, `ANTECIPADO_PENDENTE` ou `EM_ABERTO`.
3. Validar que juros + tarifas não excedem o valor bruto e que o líquido não é negativo.
4. Testes Vitest para todos os casos acima, incluindo arredondamento (ex.: 0.1 + 0.2).

**Pronto quando:** `npm test` cobre os três estados e os erros de valor.

## Etapa 3: Login e proteção de rotas

1. Em `src/lib/auth.ts`, adicionar provider de credenciais (e-mail e senha) consultando `Usuario`, com hash de senha (bcrypt ou argon2).
2. Página `/login` e ação de logout.
3. `src/proxy.ts` bloqueando `/antecipacoes` e demais rotas do dashboard sem sessão (confirmar a convenção em `node_modules/next/dist/docs/`).
4. Script ou seed para criar o primeiro usuário.

**Pronto quando:** acessar `/antecipacoes` deslogado redireciona para `/login`.

## Etapa 4: Cadastros e registro de antecipação

1. Server Actions com validação Zod: criar conta bancária, criar título manual, registrar antecipação (calcula o líquido no servidor), cancelar antecipação.
2. Registrar antecipação numa transação que falha com mensagem clara se o título já tiver antecipação ATIVA ou estiver baixado.
3. Formulários com componentes shadcn/ui (instalar apenas os necessários).

**Pronto quando:** é possível cadastrar conta, título e antecipação pela interface, e a segunda antecipação do mesmo título é recusada.

## Etapa 5: Lista de títulos e baixa

1. Substituir o placeholder de `src/app/(dashboard)/antecipacoes/page.tsx` por uma lista de títulos com filtro por estado.
2. Para cada título antecipado: valor recebido (líquido), juros, tarifas e conta de entrada, destacando "pendente de baixa".
3. Ação "cliente pagou": grava `baixadoEm`. Não cria entrada de caixa e não altera o total recebido.
4. Totais no topo (recebido em antecipações ativas, juros e tarifas) calculados sem contar baixas.

**Pronto quando:** baixar um título antecipado muda o estado para BAIXADO e o total recebido não muda.

## Etapa 6: Fechamento

1. Atualizar `README.md` (estrutura e pendências) e `CLAUDE.md`.
2. Rodar `npm run build`.
3. Commitar por etapa, quando o usuário pedir.

## Fora desta entrega

Sincronização com o GestãoClick (depende das chaves da API), relatório de custos por período e banco, escrita no ERP, borderô em lote.
