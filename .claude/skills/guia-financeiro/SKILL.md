---
name: guia-financeiro
description: Guia passo a passo do projeto Financeiro (antecipação de recebíveis com GestãoClick). Use sempre que for começar, retomar ou mudar algo no projeto, perguntar "por onde começo", "o que falta", "o que está pendente", ou quando a tarefa envolver títulos, antecipações, baixa, juros, tarifas, totais, sincronização ou login. Traz as regras de negócio que não podem ser quebradas, o mapa de arquivos e a lista de pendências.
---

# Guia do projeto Financeiro

Sistema de antecipação de boletos: a empresa antecipa boletos no banco, o banco adianta o dinheiro (bruto menos juros e tarifas) e o sistema é o **único lugar** onde existe o estado "antecipado, pendente de baixa". O GestãoClick (ERP) só tem "em aberto" ou "baixado".

Fontes de verdade, nesta ordem: `CLAUDE.md` > `README.md` > `docs/explicacao-antecipacao-recebiveis.md`. Os arquivos em `docs/superpowers/` são **histórico de decisões**: alguns detalhes já foram superados pelo código (ex.: o spec fala em `Decimal(14,2)` e a implementação usa texto + `bigint`; o hash de senha é scrypt, não bcrypt). Quando houver conflito, vale o código e o `CLAUDE.md`.

## Passo 1: situar-se antes de mexer

1. Confira a branch e o que já está alterado: `git status` e `git log --oneline -10`.
2. Leia a seção **Pendências** do `README.md` (lista abaixo também) e veja se a tarefa já é uma delas.
3. Se a tarefa mexe em Next.js (páginas, actions, proxy), leia o guia relevante em `node_modules/next/dist/docs/` antes de escrever código. O `proxy.ts` substitui o antigo `middleware.ts`.
4. Se a tarefa usa uma biblioteca, consulte a documentação atual (Context7) em vez de confiar na memória.

## Passo 2: localizar a área

| Se a tarefa é sobre... | Arquivos principais |
| --- | --- |
| Estado do título (em aberto / pendente / baixado) | `src/lib/titulos/estado.ts`, `src/lib/titulos/servico.ts` |
| Registrar, cancelar, baixar antecipação | `src/lib/antecipacoes/servico.ts`, `src/lib/antecipacoes/regras.ts` |
| Totais (recebido, juros, tarifas) | `src/lib/antecipacoes/totais.ts` |
| Relatório de juros e tarifas | `src/lib/antecipacoes/custos.ts`, `src/app/(dashboard)/custos/page.tsx` |
| Dinheiro (somar, validar, converter) | `src/lib/dinheiro.ts` |
| Validação de formulários | `src/lib/validations/*.ts` (Zod 4) |
| Server Actions | `src/app/(dashboard)/actions.ts` (usa `executar()` para mostrar `ErroNegocio`) |
| Telas | `src/app/(dashboard)/antecipacoes`, `titulos`, `contas`, `custos` |
| Sincronização com o GestãoClick | `src/lib/gestaoclick/` (`client.ts`, `recebimentos.ts`, `plano.ts`, `sincronizar.ts`) |
| Banco e constraints | `prisma/schema.prisma` e as migrations (`init`, `checks_valores`) |
| Login e sessão | `src/lib/auth.ts`, `src/lib/sessao.ts`, `src/proxy.ts`, `src/lib/senha.ts` |

**Módulo de Produção** (independente do financeiro, rotas `/producao`): não altere código nem regras do financeiro por causa dele. Mapa e regras próprias estão no `CLAUDE.md` (seções "Produção") e no spec `docs/superpowers/specs/2026-11-04-controle-producao-design.md`. Arquivos: `src/lib/producao/`, `src/lib/validations/producao.ts`, `src/app/(producao)/`, migration `20261104150000_producao`. As regras de dinheiro acima não se aplicam a ele.

Regra de organização: lógica de negócio fica em `src/lib/`, não nas páginas nem nas actions. A action só valida, chama o serviço e devolve a mensagem.

## Passo 3: conferir as regras de negócio antes de codar

Estas regras não podem ser quebradas. Se a tarefa exigir quebrar uma delas, pare e pergunte ao usuário.

- **Estado do título é derivado, nunca gravado.** Ordem: `BAIXADO` (tem `baixadoEm`) > `ANTECIPADO_PENDENTE` (tem antecipação ATIVA) > `EM_ABERTO`. Não crie coluna de estado.
- **No máximo uma antecipação ATIVA por título.** Garantida por índice único parcial escrito à mão na migration `init` e por `regras.ts`. O Prisma não declara índice parcial, então ele não aparece no `schema.prisma`.
- **"Cliente pagou" (`baixarTitulo`) é quitação sem entrada de caixa.** Só grava `baixadoEm`. Nunca altera o total recebido, juros ou tarifas, porque o dinheiro vai para o banco que adiantou.
- **Totais contam só antecipações ATIVAS** (`totais.ts`). Canceladas não entram.
- **Dinheiro é texto com ponto** (`"1234.50"`), no máximo 12 dígitos inteiros, e a conta é feita em centavos (`bigint`) via `dinheiro.ts`. **Nunca use `number` para dinheiro.**
- **`valorLiquido = valorBruto - juros - tarifas`.** Os CHECKs do banco espelham isso; não os remova nem os contorne.
- **Juros e tarifas são digitados** do extrato do banco. Não calcule automaticamente.
- **Um boleto por antecipação**, sem borderô.
- **Sincronização é somente leitura.** Nada é escrito no GestãoClick. A antecipação não é refletida no ERP.
- **Título com antecipação ATIVA não tem o valor alterado pela sincronização.** O ERP só pode trazer baixa, que é importada e nunca desfeita localmente.
- **Toda Server Action** chama `exigirSessao()` (em `src/lib/sessao.ts`) e valida com Zod. `proxy.ts` é só verificação otimista.
- **Textos de interface, comentários e termos de domínio em português.**

## Passo 4: implementar em pequenos passos

1. Escreva ou ajuste primeiro a regra pura em `src/lib/` e o teste Vitest correspondente (`src/**/*.test.ts`).
2. Depois ligue a regra na action, na tela ou na sincronização.
3. Se mexer no schema: `npm run db:migrate` (crie migration com nome), depois `npm run db:generate`. Constraints escritas à mão vão na migration SQL.
4. Não rode `prisma migrate reset`: o Prisma bloqueia para agentes e exige consentimento explícito do usuário.
5. Componentes de interface: use `src/components/formulario-acao.tsx` e `botao-acao.tsx`. Instale shadcn só o que for necessário (`components.json`).

## Passo 5: verificar antes de dar por encerrado

Rode, nesta ordem, e só declare pronto se passar:

```bash
npm run typecheck
npm run lint
npm test
```

Para mudanças de tela ou de dados, também `npm run build`. Não há testes de banco automatizados ainda (ver pendências), então mudanças em constraints e concorrência precisam ser conferidas manualmente no Neon.

Se algum comando falhar, mostre a saída. Não diga que passou sem ter rodado.

## Passo 6: fechar a tarefa

- Atualize `README.md` (estrutura e pendências) quando a estrutura ou o que falta mudar.
- Atualize `CLAUDE.md` só se uma regra de negócio ou a arquitetura mudar.
- Commit somente quando o usuário pedir. Mensagem em português, no formato `feat:`, `fix:`, `docs:`, `refactor:`.

## Pendências (estado verificado em 04/11/2026)

Testes: `npm run typecheck` sem erros e `npm test` com 8 arquivos e 47 testes passando.

Das etapas do plano em `docs/superpowers/plans/`, as 1 a 5 estão implementadas. A etapa 6 está parcial: README atualizado; `npm run build` não foi confirmado nesta verificação.

| # | Pendência | Situação no código | Cuidados e por onde começar |
| --- | --- | --- | --- |
| 1 | **Filtro por loja na sincronização** (hoje vem só a loja padrão da chave do GestãoClick) | `recebimentos.ts` já aceita `lojaId` nos filtros (linha ~87 e ~102), mas `sincronizar.ts` não passa esse valor | Decidir de onde vem o `loja_id` (variável de ambiente ou campo na tela). É uma decisão do usuário. Confirme o campo com a API antes de codar (use o MCP do ERP: `describe_recurso`). |
| 2 | **Separar só os recebimentos que são boleto** | Não implementado. Hoje a sincronização traz todos os recebimentos | Confirmar no ERP se existe campo que identifique boleto. Não invente o campo. |
| 3 | **Testes automáticos do banco** (concorrência e índice parcial de uma antecipação ATIVA por título) | Não existem. Só há testes puros em `src/lib/**` | Exigem uma base de teste. Peça ao usuário a `DATABASE_URL` de teste (ou um branch no Neon). Não rode `prisma migrate reset` sem consentimento. |
| 4 | **Paginar a lista de títulos e de antecipações** | Não implementado: `titulos/page.tsx` (linha ~74) e `antecipacoes/page.tsx` (linha ~30) fazem `findMany` sem `take` | Atenção: os **totais devem continuar calculados sobre o conjunto completo**, não sobre a página. Paginar só a lista visível. |
| 5 | **Componentes shadcn adicionais** | Só existe `src/components/ui/button.tsx` | Instalar apenas o que a tela nova precisar. |

Itens que **não** são pendência, porque estão fora do escopo por decisão do usuário: escrever no GestãoClick (lançar entrada, despesa ou baixa), refletir a antecipação no saldo do ERP e cobrar borderô em lote. Não os implemente sem pedido explícito.

## Ao terminar uma sessão de trabalho

Atualize a tabela de pendências acima (ou o README) com o que mudou, para que a próxima pessoa, ou a próxima sessão, não precise redescobrir o estado.
