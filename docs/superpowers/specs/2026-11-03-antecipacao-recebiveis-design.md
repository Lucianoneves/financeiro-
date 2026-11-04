# Antecipação de recebíveis: desenho da primeira entrega

Data: 2026-11-03. Status: rascunho para aprovação.

## Intenção e por quê

A empresa antecipa boletos no banco. O banco adianta o dinheiro (valor do boleto menos juros e tarifas) antes de o cliente pagar. No GestãoClick o título só tem dois estados, em aberto ou baixado, e o saldo só muda com baixa. Dar baixa no título para registrar o dinheiro recebido o tiraria da lista de pendências, e deixá-lo em aberto esconde que o dinheiro já entrou.

Este sistema passa a ser o único lugar onde existe o estado **antecipado, pendente de baixa**, e onde se registra o custo financeiro (juros e tarifas) e por qual banco o dinheiro entrou.

## Problemas a resolver (nas palavras do usuário)

1. Ver quanto foi recebido de um título cujo cliente ainda não pagou, com o título ainda pendente de baixa.
2. Registrar juros e tarifas bancárias descontados e por onde o valor entrou.

## Objetivos

- Registrar uma antecipação: título, valor bruto, juros, tarifas, valor líquido recebido, banco/conta de entrada, data.
- Listar títulos com estado claro: **em aberto**, **antecipado e pendente de baixa**, **baixado**.
- Impedir antecipar duas vezes o mesmo título.
- Primeira entrega usável sem depender da API do GestãoClick.

## Não objetivos

- Escrever no GestãoClick (lançar entrada, despesa ou baixa). Decisão do usuário: tudo dentro do sistema por enquanto.
- Que o saldo bancário do ERP reflita o adiantamento.
- Relatório de custos por período/banco e sincronização com o ERP: entregas seguintes.

## Antiobjetivo

Contar o mesmo dinheiro duas vezes. Quando o cliente paga o boleto, o dinheiro vai ao banco que adiantou, não à empresa. A baixa de um título antecipado é **quitação sem entrada de caixa** e nunca soma ao total recebido.

## Restrições

- Next.js 16 (App Router), Prisma 7 com Neon, Auth.js v5, Zod 4, Vitest. Ler `node_modules/next/dist/docs/` antes de escrever código Next.
- Chaves da API do GestãoClick hoje retornam `NAO_AUTENTICADO`. Nada da primeira entrega pode depender delas.
- Valores monetários em `Decimal` no banco. O ERP devolve valores como texto com ponto decimal.
- Interface e dados em português.

## Abordagens consideradas

1. **Cópia local dos títulos, sincronizada.** Rápida e preserva histórico; exige sincronização e aceita dados defasados.
2. **Consulta ao vivo ao ERP.** Sem duplicação; depende de chaves e ERP no ar e perde contexto se o título mudar.
3. **Cadastro manual.** Funciona já; retrabalho e risco de digitação.

**Escolhida (pelo usuário): 1, começando pelo modo 3.** A tabela de títulos local tem origem `MANUAL` ou `GESTAOCLICK`. Hoje se digita; depois a sincronização preenche a mesma tabela. Descartada a 2 por perder histórico e depender das chaves.

## Desenho

### Modelo de dados (Prisma)

- `Usuario`: acesso ao sistema.
- `ContaBancaria`: banco onde o dinheiro entra (nome, identificação). *Decisão do desenho.*
- `Titulo`: número, cliente, valor, vencimento, `origem` (MANUAL | GESTAOCLICK), `idExterno` opcional e único por origem, `baixadoEm` opcional.
- `Antecipacao`: título, conta, valor bruto, juros, tarifas, valor líquido, data, `status` (ATIVA | CANCELADA).
- Regra: no máximo **uma antecipação ATIVA por título** (índice único parcial ou verificação transacional).
- Todos os valores em `Decimal`.

### Estado do título (derivado, não gravado)

- **Baixado**: `baixadoEm` preenchido.
- **Antecipado e pendente de baixa**: não baixado e com antecipação ATIVA.
- **Em aberto**: demais casos.

### Telas

- Lista de títulos com filtro por estado; em cada antecipado mostra recebido (líquido), juros, tarifas e banco.
- Cadastro de título (manual) e registro de antecipação a partir dele.
- Ação "cliente pagou": marca o título como baixado sem gerar entrada de caixa.

### Acesso

Login por e-mail e senha (Auth.js credentials) e `src/proxy.ts` protegendo o dashboard. *Decisão do desenho.* Um único perfil de usuário.

### Cálculo

O valor líquido é bruto menos juros menos tarifas (já existe em `valorLiquido`). Nesta entrega juros e tarifas são **digitados** como no extrato do banco; não há cálculo automático. O schema Zod atual passa a usar valores monetários seguros (string/Decimal em vez de `number`).

## Decisões do desenho (a conferir)

- Login por e-mail e senha, perfil único.
- `ContaBancaria` como cadastro próprio.
- Juros e tarifas digitados, não calculados.
- Estado do título derivado.
- Baixa manual por ação do usuário nesta entrega.

## Em aberto

Nada. Decidido pelo usuário: **um boleto por antecipação** (sem borderô). Relação 1:1 ativa entre `Titulo` e `Antecipacao`; juros e tarifas pertencem a cada antecipação. Borderô em lote fica fora do escopo.

## Fica para quem constrói

Nomes de campos, layout das telas, estratégia de índice único, hash de senha, organização das rotas e dos testes.
