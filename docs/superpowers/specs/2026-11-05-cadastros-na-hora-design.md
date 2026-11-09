# Cadastros de turno, operador e motivos: criação no apontamento

Data: 2026-11-05. Escopo: módulo de produção (`/producao`). Não toca no financeiro.

## Intenção e por quê

A tela de Cadastros tem três seções (Turnos, Operadores, Motivos de parada e de perda) que só existem para alimentar o formulário de apontamento. O supervisor precisa, hoje, sair do fluxo, cadastrar e voltar. Essas informações, porém, são necessárias para o fechamento de cada turno, então continuam sendo gravadas em cada apontamento.

Objetivo: lançar um apontamento sem telas de cadastro para turno, operador e motivos, mantendo a identidade de cada um (para os indicadores por operador e por motivo continuarem corretos).

## Objetivos

- Remover da tela de Cadastros as seções Turnos, Operadores e Motivos de parada e de perda.
- No formulário de apontamento, turno, operador e cada motivo passam a ser campos de texto com sugestões. Quem lança escolhe um existente ou digita um novo, e o novo é criado na hora.
- Não duplicar cadastros por diferença de maiúsculas, acentos ou espaços.

## Não-objetivos

- Fechamento de turno (relatório). Aqui só garanto que turno, operador e motivos ficam gravados no apontamento.
- Tela ou ação para inativar turno, operador ou motivo. Fica para depois, se for preciso.
- Mudar máquinas, produtos, velocidade nominal e ordens.

## Anti-objetivos (o que seria falha mesmo funcionando)

- Dois operadores ou motivos com o mesmo nome normalizado viram um só. Isso é esperado; ver "Decisões minhas".
- Operador perder a matrícula. A matrícula existente continua gravada; só deixa de ser digitada no formulário.
- Um apontamento gravar um texto diferente do cadastro, por exemplo espaços sobrando.

## Restrições

- As regras do `CLAUDE.md` continuam valendo: motivos são cadastros, nunca texto livre; cadastros nunca são excluídos; apontamentos mantêm o histórico.
- As tabelas `Turno`, `Operador`, `MotivoParada` e `MotivoPerda` e as relações com o apontamento ficam como estão. Nenhum dado existente é apagado.
- O módulo de produção ainda não está commitado no git. A migração deve ser conferida no banco antes de aplicar.

## Abordagens consideradas

1. **Cadastro na tela, como hoje.** Descartada: é o que o usuário quer eliminar.
2. **Texto livre no apontamento, sem tabelas.** Descartada: perde o agrupamento por operador e motivo, e quebra a regra de motivos do `CLAUDE.md`.
3. **Campo de texto com sugestões, criando o cadastro na hora, com comparação normalizada (escolhida).** Mantém as tabelas e as relações, não exige tela de cadastro e evita duplicatas pela chave normalizada.

## Design

### Banco (migração)

- Em `Turno`, `Operador` (campo `nome`) e `MotivoParada` / `MotivoPerda`, adicionar a coluna `nomeNormalizado` (texto, não nulo).
- Preencher a coluna para os registros existentes, com a mesma regra usada pela aplicação: minúsculas, sem acentos, espaços das pontas removidos e espaços internos reduzidos a um. Os acentos são removidos com `translate()` sobre as letras acentuadas do português, sem depender da extensão `unaccent`.
- Criar índice único sobre `nomeNormalizado` em cada tabela. Em `Turno`, `MotivoParada` e `MotivoPerda` o índice substitui o `nome` único como chave de busca, mas o `nome` único continua.
- Em `Operador`, o `nome` não era único; passa a ser pela chave normalizada. A `matricula` continua única quando preenchida.
- Antes de aplicar, conferir no banco se existem nomes que colidem após a normalização. Se existirem, parar e decidir com o usuário.

### Regra de normalização (função única, em `src/lib/producao/`)

Entrada: texto. Saída: minúsculas, sem acentos, espaços das pontas removidos, espaços internos reduzidos a um. Usada na migração (equivalente em SQL) e na aplicação. Um teste unitário cobre os casos: maiúsculas, acentos, espaços extras, string vazia.

### Serviço (`src/lib/producao/servico.ts` e funções auxiliares)

- `resolverOuCriar(modelo, nome)`: normaliza o nome, procura pela chave normalizada e, se não achar, cria com o nome digitado (sem a normalização, para manter a grafia). Se o nome vier vazio, erro de validação.
- Usado para turno, operador e cada motivo de parada e de perda, dentro da mesma transação de `registrarApontamento`.
- Se duas requisições criarem o mesmo nome ao mesmo tempo, a segunda pega o erro de chave única e refaz a busca, uma vez.

### Formulário de apontamento

- Turno, operador e cada motivo passam a ser `input` com `datalist` alimentado pelos cadastros ativos. Permite digitar livremente.
- Operadores e motivos seguem sendo listados só os ativos nas sugestões. Como não há inativação na tela, todos aparecem.
- A validação de Zod troca o `id` por `nome` nesses campos (1 a 80 caracteres após trim).
- Máquina, ordem e produto seguem como seleção, sem mudança.

### Tela de Cadastros

- Removidas as seções Turnos, Operadores, Motivos de parada e Motivos de perda.
- Mantidas Máquinas, Produtos e Velocidade nominal, sem alteração.
- Removidas as ações `criarTurno`, `criarOperador`, `criarMotivoParada`, `criarMotivoPerda` e os ramos correspondentes em `alternarAtivoAction`.

### Listagem de apontamentos

- As colunas Operador e Turno continuam, lendo o nome gravado.

## Decisões minhas (o usuário pode mudar)

- Qualquer perfil com acesso à produção pode criar turno, operador ou motivo na hora. Restringir a criação ao ADMIN é um ajuste pequeno, se for preciso.
- Dois operadores com o mesmo nome (homônimos) viram um só. A matrícula não é digitada no formulário; se houver homônimos, a solução é cadastrar pela matrícula em outra etapa. Não implementado agora.
- O texto digitado é gravado com a grafia de quem criou o cadastro; buscas seguintes reaproveitam esse cadastro, independentemente da grafia.
- Limite de 80 caracteres para nome de turno, operador e motivo.

## O que fica para o construtor

- Escrever os testes das funções de normalização e de `resolverOuCriar`.
- Atualizar `src/lib/validations/producao.test.ts` (os testes de apontamento usam `turnoId` e `operadorId`).
- Atualizar a documentação `docs/superpowers/specs/2026-11-04-controle-producao-design.md` e a regra do `CLAUDE.md` sobre turno, se necessário.
- Verificar `npm run typecheck`, `npm test` e `npm run lint` ao final.
