# Como o Financeiro trata a antecipação de recebíveis

Este documento explica **por que** o sistema funciona como funciona. Ele não ensina a usar as telas nem descreve o código: o objetivo é que você entenda as ideias por trás das regras, para saber o que esperar do sistema e por quê.

## 1. O problema que o sistema resolve

A empresa emite boletos para seus clientes e, às vezes, **antecipa** esses boletos no banco: o banco adianta o dinheiro agora e fica com o direito de receber o boleto no vencimento.

O GestãoClick, o ERP da empresa, enxerga cada título de forma simples: ele está **em aberto** ou **baixado**. Isso cria um dilema quando um boleto é antecipado:

- Se você **dá baixa** no título para registrar que o dinheiro entrou, ele some da lista de pendências, mesmo que o cliente ainda não tenha pagado nada.
- Se você **deixa em aberto**, o ERP continua dizendo que a empresa não recebeu, quando na verdade o dinheiro já está no banco.

Nenhuma das duas opções diz a verdade completa. O Financeiro existe para preencher essa lacuna: ele é o único lugar onde existe o estado **antecipado, pendente de baixa**, e onde se registra o **custo da antecipação** (juros e tarifas) e **por qual banco o dinheiro entrou**.

Duas perguntas do dia a dia motivaram o sistema:

1. Quanto já recebi de um título cujo cliente ainda não pagou, com o título ainda pendente de baixa?
2. Quanto paguei em juros e tarifas, e em qual conta o dinheiro entrou?

## 2. O que é uma antecipação

Uma antecipação é o registro de **um boleto** que foi adiantado pelo banco. Ela guarda quatro valores:

| Valor | O que é |
| --- | --- |
| **Bruto** | o valor do boleto que foi antecipado |
| **Juros** | o desconto cobrado pelo banco pelo adiantamento |
| **Tarifas** | as taxas bancárias da operação |
| **Líquido** | o que realmente entrou na conta: bruto − juros − tarifas |

Além disso, a antecipação guarda a **conta bancária** em que o dinheiro entrou e a **data** da operação.

O sistema **não calcula** os juros nem as tarifas. Você digita os valores como aparecem no borderô (o espelho da antecipação) do banco, porque o GestãoClick e o extrato não trazem esses valores e porque cada banco cobra de um jeito e o que importa é o que foi de fato descontado. O sistema calcula só o líquido, no servidor, para que o número não dependa do que a tela enviou.

Há um detalhe importante sobre quem fica com o dinheiro depois: quando o cliente paga o boleto, o dinheiro vai para o **banco**, que já adiantou o valor, e não para a empresa. É por isso que o pagamento do cliente tem um tratamento especial, explicado na seção 4.

## 3. Os três estados de um título

Um título pode estar em um de três estados:

- **Em aberto:** ninguém pagou e o boleto não foi antecipado.
- **Antecipado, pendente de baixa:** o banco já adiantou o dinheiro, mas o cliente ainda não pagou o boleto.
- **Baixado:** o cliente pagou. O título está quitado.

### O estado é calculado, não gravado

O sistema não guarda uma coluna "estado" no título. Em vez disso, ele **deduz** o estado a cada vez que precisa, olhando dois fatos:

- o título tem uma data de baixa?
- existe uma antecipação ativa para ele?

A vantagem é que o estado nunca fica desatualizado ou contraditório. Se o estado fosse gravado, seria possível, por exemplo, cancelar uma antecipação e esquecer de voltar o título para "em aberto". Com o estado deduzido dos fatos, isso não pode acontecer: cancelar a antecipação já muda o resultado.

### A baixa tem prioridade

Se um título foi antecipado e depois o cliente pagou, ele aparece como **baixado**, mesmo que a antecipação continue registrada. A lógica é que, depois do pagamento, a dívida do cliente acabou. A antecipação passa a ser apenas parte do histórico.

## 4. Por que a baixa não soma ao total recebido

Esta é a regra mais importante do sistema, e ela existe para evitar um erro específico: **contar o mesmo dinheiro duas vezes**.

Pense em um boleto de R$ 1.000,00 antecipado por um líquido de R$ 970,00:

1. No dia da antecipação, **R$ 970,00 entram na conta da empresa**. Esse é o dinheiro recebido.
2. No vencimento, o cliente paga R$ 1.000,00. Esse dinheiro vai **para o banco**, que já tinha adiantado o valor. Nada entra na conta da empresa.

Se o sistema tratasse o pagamento do cliente como uma nova entrada de caixa, o total recebido passaria a mostrar R$ 970,00 + R$ 1.000,00, quando a empresa recebeu apenas R$ 970,00 no total.

Por isso a ação "cliente pagou" é uma **quitação sem entrada de caixa**: ela marca o título como baixado e nada mais. O total recebido e os custos de juros e tarifas ficam exatamente como estavam. Baixar um título antecipado muda o estado dele, mas não muda o dinheiro.

## 5. Por que um título só pode ter uma antecipação ativa

Cada boleto é antecipado **uma vez de cada vez**. Um título não pode ter duas antecipações ativas ao mesmo tempo, porque isso significaria que o banco adiantou o mesmo valor duas vezes, e o total recebido ficaria inflado.

Se uma antecipação foi um engano ou foi desfeita, ela é **cancelada**. A antecipação cancelada continua no histórico, mas deixa de contar, e o título pode ser antecipado de novo.

### Duas camadas de proteção

A regra é verificada em dois lugares:

1. **No registro:** antes de salvar, o sistema confere se o título já foi baixado ou já tem antecipação ativa, e responde com uma mensagem clara.
2. **No banco de dados:** existe uma garantia de que não podem existir duas antecipações ativas para o mesmo título. Ela cobre o caso raro em que duas pessoas tentam antecipar o mesmo título no mesmo instante. A primeira passa; a segunda é recusada.

A segunda camada importa porque a verificação da primeira e o salvamento não acontecem no mesmo instante. Só o banco consegue garantir a regra sem exceções.

### Um boleto por antecipação, sem borderô

Na prática, bancos costumam antecipar vários boletos juntos, em um **borderô**. Nesta entrega o sistema trata **um boleto por antecipação**, e os juros e tarifas pertencem a cada antecipação individualmente. Isso mantém o modelo simples: a relação entre título e antecipação ativa é de um para um. O borderô em lote ficou de fora de propósito e pode ser uma entrega futura.

## 6. Por que o dinheiro é tratado em centavos

Computadores guardam números com casas decimais de forma aproximada. O exemplo clássico é que, em muitas linguagens, `0,1 + 0,2` não dá exatamente `0,3`, mas algo como `0,30000000000000004`. Em um sistema financeiro, esses erros minúsculos se acumulam e podem fazer um total não bater por alguns centavos.

Para evitar isso, o Financeiro segue duas decisões:

- **Valores são texto com ponto decimal** (`"1234.50"`), no mesmo formato que o ERP devolve e que o banco de dados aceita para valores monetários. O número nunca passa por uma conversão que perca precisão.
- **As contas são feitas em centavos inteiros.** Antes de somar ou subtrair, o valor `"1234.50"` vira `123450` centavos. Contas com números inteiros são exatas. Só no final o resultado volta a ser texto.

Para quem usa o sistema, a consequência é simples: o líquido sempre fecha ao centavo. Os campos de dinheiro aceitam vírgula (`1234,50`) por conveniência, mas o sistema aceita no máximo duas casas decimais e recusa valores que não fazem sentido, como negativos.

## 7. Por que os títulos ficam numa cópia local

Os títulos poderiam vir direto do GestãoClick, consultados a cada vez. O sistema, porém, guarda **uma cópia local** deles. Foram consideradas três abordagens:

1. **Cópia local, sincronizada com o ERP.** É rápida, preserva o histórico e não depende do ERP estar no ar, mas exige uma sincronização e aceita que os dados fiquem um pouco defasados.
2. **Consulta ao vivo ao ERP.** Evita duplicar dados, mas depende de credenciais funcionando e do ERP disponível, e perde o contexto se o título mudar depois da antecipação.
3. **Cadastro manual.** Funciona imediatamente, mas dá retrabalho e risco de erro de digitação.

A escolha foi **a cópia local, começando pelo cadastro manual**. Cada título tem uma **origem**, que pode ser manual ou GestãoClick. Hoje os títulos são digitados. Quando a sincronização existir, ela vai preencher a mesma tabela, sem mudar nenhuma outra parte do sistema. A consulta ao vivo foi descartada justamente por perder o histórico e depender das credenciais da API.

### O que ficou de fora, de propósito

Para a primeira entrega ser útil sem depender do ERP, algumas coisas **não** fazem parte do sistema por enquanto:

- **Escrever no GestãoClick:** o sistema não lança entradas, despesas nem baixas no ERP. Tudo fica dentro do Financeiro.
- **Refletir o adiantamento no saldo do ERP:** o saldo bancário do GestãoClick continua não sabendo da antecipação.
- **Relatórios de custo por período e por banco:** os dados para eles já são guardados, mas o relatório fica para uma entrega seguinte.
- **Sincronização automática com o ERP:** depende de as credenciais da API funcionarem.

Esses limites são escolhas de escopo, não esquecimentos: cada um pode ser adicionado depois sem refazer o que já existe.
