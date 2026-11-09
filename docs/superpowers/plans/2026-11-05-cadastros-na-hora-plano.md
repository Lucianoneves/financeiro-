# Plano: cadastros de turno, operador e motivos criados no apontamento

Spec: `docs/superpowers/specs/2026-11-05-cadastros-na-hora-design.md`.

## Tarefas

1. **Normalização de nomes** (`src/lib/producao/nomes.ts`): `chaveDoNome` (minúsculas, sem acentos, espaços reduzidos). Teste em `nomes.test.ts`.
2. **Schema e migração**: adicionar `nomeNormalizado String @unique` em `Turno`, `Operador`, `MotivoParada` e `MotivoPerda`. Migração `20261105100000_cadastros_na_hora`: cria a coluna, preenche com a mesma regra (SQL com `translate`) e cria os índices únicos. Não aplicar no banco sem conferir colisões antes.
3. **Regeneração**: `npm run db:generate`.
4. **Validações** (`src/lib/validations/producao.ts`): remover `turnoSchema`, `operadorSchema`, `motivoSchema`. Apontamento recebe nomes (`turno`, `operador`, `paradaMotivo{i}`, `perdaMotivo{i}`) em vez de ids. Testes atualizados.
5. **Serviço** (`src/lib/producao/servico.ts`): `resolverOuCriar` com `upsert` pela chave normalizada (evita erro de unicidade dentro da transação do Postgres). Remove as checagens de ativo de turno, operador e motivos.
6. **Ações** (`src/app/(producao)/producao/actions.ts`): remover `criarTurno`, `criarOperador`, `criarMotivoParada`, `criarMotivoPerda`, e os casos correspondentes em `alternarAtivoAction`.
7. **Tela de Cadastros** (`cadastros/page.tsx`): remover as seções Turnos, Operadores e Motivos.
8. **Formulário de apontamento** (`apontamentos/page.tsx`): campos de texto com `datalist` para turno, operador e motivos; mensagem de cadastro faltante só cita ordem e máquina.
9. **Verificação**: `npm run typecheck`, `npm test`, `npm run lint`.

## Decisões minhas

- `upsert` com `update: { ativo: true }`: um nome já existente e inativo é reativado quando alguém o usa de novo.
- Migração: se houver colisão de nomes normalizados em `Operador` ou nos outros, a migração para e o usuário decide.
