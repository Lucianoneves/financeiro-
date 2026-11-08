# Capacidade do apontamento: produção não passa da disponibilidade

Data: 2026-11-05. Tamanho: mudança pequena (desenho curto).

## Intenção

Um apontamento (um período de uma máquina numa ordem, feito por um turno) não pode registrar mais peças do que a máquina conseguia fazer naquele período, dadas a velocidade nominal e as paradas. Hoje o sistema aceita qualquer quantidade, e o desempenho pode passar de 100% por erro de lançamento.

## Regra

Para cada apontamento, no lançamento:

- **Minutos operando** = duração − soma das paradas (intervalo incluso, como em todos os indicadores).
- **Capacidade** = velocidade nominal × minutos operando ÷ 60 (peças).
- **Produção** = peças boas + peças perdidas.
- Se produção > capacidade, o lançamento é recusado.

A comparação é feita em inteiros (produção × 60 > velocidade × minutos operando), sem arredondamento. A velocidade é a copiada no apontamento, a mesma usada pelo OEE.

Mensagem ao usuário, por exemplo:
"A produção deste período (120 peças) passa da capacidade da máquina (100 peças em 30 min operando a 200 peças/h)."

Os números da mensagem usam a capacidade arredondada para baixo.

## Objetivos

- Impedir lançamentos com produção acima da capacidade.
- Usar exatamente as mesmas contas dos indicadores, para não haver dois critérios.

## Não-objetivos

- Não recalcular apontamentos já lançados. Os existentes continuam como estão, e o desempenho acima de 100% deles ainda aparece nos indicadores.
- Não criar tela de edição de apontamento (hoje só existe excluir).
- Não mudar o cálculo do OEE.

## Anti-objetivos

- Não esconder a regra por arredondamento ou tolerância escondida.

## Restrições

- Regra no módulo de produção só. Nada no financeiro.
- A regra fica em função pura (`src/lib/producao/regras.ts`), testada sem banco.

## Abordagem escolhida

Bloquear o lançamento (escolhida por você, entre bloquear e só avisar). A checagem entra em `verificarApontamento`, que já recebe a velocidade e as paradas.

Alternativa descartada: aceitar e só avisar. Não atende "não pode ultrapassar".

## Desenho

- `src/lib/producao/regras.ts`: `verificarApontamento` recebe também `quantidadeBoa` e `perdasQuantidade` (soma das perdas) e aplica a regra depois das validações atuais.
- `src/lib/producao/servico.ts`: passa esses valores a partir do lançamento. Sem mudança no banco.
- `src/lib/producao/regras.test.ts`: testes da regra (dentro, no limite, acima, sem minutos operando, velocidade alta).
- `CLAUDE.md` e `README.md`: atualizar o trecho "Desempenho acima de 100% é mostrado com aviso" para dizer que a regra vale para lançamentos novos, e que o aviso continua valendo para dados antigos.

## Decisões minhas (podem ser ajustadas)

- Peças perdidas contam na produção, como nos indicadores.
- Sem minutos operando (paradas iguais à duração), qualquer produção é recusada.
- Só no lançamento. Não há edição de apontamento para revalidar.

## O que fica para quem constrói

- Ordem das validações: a regra nova vem depois das atuais, para não mudar as mensagens existentes.
- Rodar typecheck, lint e testes.
