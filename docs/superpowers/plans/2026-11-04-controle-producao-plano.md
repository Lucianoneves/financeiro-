# Controle de Produção — plano de implementação

Desenho: `docs/superpowers/specs/2026-11-04-controle-producao-design.md`.

## Etapas

1. [x] **Banco:** models no `schema.prisma` (aditivos), migration `20261104150000_producao` com CHECKs e restrição de exclusão, `npm run db:generate`.
2. [x] **Regras puras e testes:** `tempo.ts`, `regras.ts`, `indicadores.ts`, `formato.ts`, `validations/producao.ts`.
3. [x] **Serviço:** `servico.ts` (transação, pré-checagem de sobreposição, tratamento do erro do banco).
4. [x] **Cadastros:** layout `(producao)`, Server Actions, tela de cadastros.
5. [x] **Ordens e apontamentos:** telas e ações.
6. [x] **Indicadores:** tela de indicadores e resumo do dia.
7. [x] **Link** "Produção" no cabeçalho do financeiro.
8. [x] **Documentação:** CLAUDE.md, README, skill `guia-financeiro`, este plano e o spec.
9. [x] **Perfis de acesso:** `Usuario.perfil` (ADMIN/PRODUCAO), migration `20261104160000_perfil_usuario`, perfil no JWT/sessão, restrição no proxy e em `exigirSessao`/`exigirSessaoProducao`, login por perfil, script `usuario:criar` com 4º argumento.
10. [x] **Aplicar as migrations** no banco (`npm run db:migrate`) e conferir manualmente no Neon: tentar um apontamento sobreposto, paradas maiores que a duração e apontar em ordem encerrada.

## Verificação feita
`npm run typecheck`, `npm run lint`, `npm test` (13 arquivos, 87 testes) e `npm run build` passam. O banco não estava acessível na hora da implementação, então a migration ainda não foi aplicada nem testada contra o Postgres.
