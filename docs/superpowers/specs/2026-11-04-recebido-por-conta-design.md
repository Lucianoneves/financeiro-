# Recebido por conta bancária — desenho curto

**Data:** 2026-11-04

## Intenção
Ver, em `/contas`, quanto entrou em cada banco com as antecipações, separando o que já foi pago pelo cliente do que ainda aguarda a baixa.

## Metas
- Por conta: quantidade de antecipações ativas, recebido líquido, recebido pendente de baixa, juros e tarifas.
- Usar só antecipações ATIVAS (canceladas não contam), como o resto do sistema.

## Não-metas
- Não é saldo bancário: não há saldo inicial, nem saídas, nem conciliação com extrato.
- Não grava nada novo no banco e não escreve no GestãoClick.

## Abordagens
- **A (escolhida):** função pura `totaisPorConta` em `src/lib/antecipacoes/totais.ts`, reutilizando `totaisDeAntecipacoes`, e tabela em `/contas`. Sem migration.
- **B:** campo de saldo na `ContaBancaria`, atualizado a cada operação. Descartada: exige saldo inicial e risco de divergência, e o pedido é só ver o que entrou.

## Decisões minhas (para conferir)
- O nome da coluna é "Recebido", não "Saldo", pelo motivo acima.
- Contas sem antecipação ativa aparecem com zeros.
- Consulta feita em uma única leitura de antecipações ativas, agrupadas em memória.

## Para quem for construir
Dados vêm de `Antecipacao` (status ATIVA, com `titulo.baixadoEm`). Valores em centavos (`bigint`) via `src/lib/dinheiro.ts`.
