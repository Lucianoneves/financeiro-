# Apontamento: ordem e máquina compatíveis

Data: 2026-11-05. Tamanho: mudança pequena (desenho curto).

## Intenção

No formulário de apontamento, mostrar só combinações de ordem e máquina que têm velocidade nominal cadastrada. Assim o erro "Cadastre a velocidade nominal deste produto nesta máquina" deixa de acontecer por escolha errada.

## Regra

- A velocidade é do par (máquina, produto). O produto vem da ordem.
- Ao escolher uma **ordem**, as máquinas sem velocidade para o produto dela ficam **desabilitadas**, com o texto "(sem velocidade para este produto)".
- Ao escolher uma **máquina**, as ordens cujo produto não tem velocidade nela ficam **desabilitadas**, com o texto "(sem velocidade nesta máquina)".
- Se a ordem escolhida não tiver nenhuma máquina com velocidade (ou a máquina não tiver nenhuma ordem), aparece um aviso: "Esta ordem não tem máquina com velocidade cadastrada. Cadastre em Cadastros > Velocidade nominal."
- Se uma troca de ordem deixar a máquina escolhida incompatível, a máquina é limpa para o usuário escolher de novo.
- Ao registrar com sucesso, o formulário limpa a ordem e a máquina, e a seleção volta ao estado inicial.

## Objetivos

- Evitar a escolha de combinações sem velocidade.
- Mostrar a máquina que existe mas não tem velocidade, com o que falta para usá-la.

## Não-objetivos

- Não mudar a regra do servidor. Ela continua validando tudo, porque o formulário pode ser enviado por outro caminho.
- Não mudar cadastros nem a tabela de velocidades.

## Anti-objetivos

- Não esconder máquinas ou ordens: elas aparecem desabilitadas, com o motivo.

## Abordagem escolhida

Componente de cliente que recebe os dados já carregados pelo servidor (ordens abertas com produto, máquinas ativas e os pares máquina-produto com velocidade). Confirmado por você: desabilitada, em vez de sumir.

Alternativa descartada: esconder as opções. Não mostra o que falta cadastrar.

## Desenho

- `src/app/(producao)/producao/apontamentos/selecao-ordem-maquina.tsx` (novo, cliente): duas listas controladas, com as regras acima.
- `src/app/(producao)/producao/apontamentos/page.tsx`: carrega os pares de velocidade e usa o componente no lugar das duas listas atuais. Mantém o nome dos campos (`ordemId`, `maquinaId`) para o envio não mudar.

## Decisões minhas

- O reset do formulário (depois de registrar) também limpa o estado do componente, escutando o evento de reset do formulário.
- Os pares são enviados como texto `maquinaId|produtoId`, para o componente cliente receber dados simples.

## O que fica para quem constrói

- Testes do filtro: a função que decide se um par tem velocidade fica em função pura, testada sem interface.
- Typecheck, lint e testes.
