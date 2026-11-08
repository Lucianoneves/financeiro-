# Financeiro

Sistema web de gestão da operação de uma empresa, em dois módulos que dividem o mesmo login:

| Módulo | Para quê | Quem usa |
| --- | --- | --- |
| **Financeiro**: antecipação de recebíveis | Controla os boletos que a empresa antecipa junto a um banco, com os custos (juros e tarifas) e o estado de cada título. Integrado ao ERP **GestãoClick**, somente leitura. | Administrador |
| **Controle de Produção** | O supervisor lança o que cada máquina produziu em cada turno e o sistema calcula os indicadores de eficiência (**OEE**). Independente do financeiro e do ERP. | Administrador e gestor de produção |

Os módulos só compartilham login, sessão e layout. Cada um tem tabelas, regras e telas próprias, e uma mudança num não toca o outro.

## Módulo Financeiro

A empresa registra títulos a receber (digitados à mão ou sincronizados do GestãoClick) e antecipa esses boletos num banco: o dinheiro entra antes do vencimento, já descontados juros e tarifas. O sistema controla cada antecipação, a conta que recebeu o valor e o estado de cada título.

O GestãoClick não tem o conceito de "dinheiro recebido, mas o cliente ainda não pagou": o título ou está aberto ou está baixado. **Este sistema é o único lugar onde esse estado existe.**

### Conceitos

- **Título**: valor a receber de um cliente, com número, vencimento e origem (`MANUAL` ou `GESTAOCLICK`).
- **Antecipação**: um boleto antecipado, com valor bruto, juros, tarifas, valor líquido, data e status (`ATIVA` ou `CANCELADA`). Cada título tem no máximo uma antecipação ativa, garantido por índice único parcial no banco.
- **Conta bancária**: onde o valor líquido da antecipação entra.
- **Estado do título** (derivado, nunca gravado): `EM_ABERTO`, `ANTECIPADO_PENDENTE` ou `BAIXADO`. A baixa tem prioridade, mesmo em título antecipado.
- **Cliente pagou**: quitação sem entrada de caixa (o dinheiro vai para o banco que antecipou). Só marca o título como baixado e nunca altera totais, juros ou tarifas.
- **Juros e tarifas** são digitados a partir do borderô do banco, não calculados.
- **Dinheiro** é texto com ponto decimal (`"1234.50"`) e a conta é feita em centavos inteiros (`bigint`), sem erro de ponto flutuante. O banco tem CHECKs que repetem essas regras.

### Telas

`/antecipacoes` (registro, cancelamento e totais), `/titulos` (cadastro, baixa e botão **Sincronizar**), `/custos` (juros e tarifas por período, banco e mês) e `/contas` (contas bancárias e quanto cada uma recebeu).

### Sincronização com o GestãoClick

O botão **Sincronizar** em `/titulos` lê os recebimentos do ERP e cria ou atualiza títulos (valor e vencimento). A integração é **somente leitura**: o cliente HTTP só faz `GET` e nada é escrito no ERP.

A baixa do ERP **não é importada**: no GestãoClick ela acontece quando o banco paga a antecipação (cerca de 30 dias antes do vencimento), e o pagamento do cliente nunca é registrado lá. Só o botão "Cliente pagou" gera `BAIXADO`. O valor de um título com antecipação ativa nunca é alterado pela sincronização.

Para entender o porquê das regras, leia [docs/explicacao-antecipacao-recebiveis.md](docs/explicacao-antecipacao-recebiveis.md).

## Módulo Controle de Produção

O supervisor lança os apontamentos; os indicadores saem deles. Os operadores não são usuários do sistema. Telas em `/producao`:

- **Resumo do dia**: indicadores dos apontamentos de hoje, por máquina.
- **Cadastros**: máquinas, produtos, turnos, operadores, motivos de parada e de perda, e a **velocidade nominal** (peças por hora) de cada produto em cada máquina. Nada é excluído: inativa-se. Todo cadastro pode ser editado, recusando nomes e códigos repetidos.
- **Ordens**: ordem de produção = produto + quantidade planejada (peças). Só ordem aberta recebe apontamento.
- **Apontamentos**: um período de uma máquina numa ordem, com operador, turno, peças boas, paradas (motivo e minutos) e perdas (motivo e peças). Turno, operador e motivos podem ser criados na hora, direto no lançamento.
- **Indicadores**: OEE por período, máquina, operador e produto, mais paradas e perdas por motivo.
- **Fechamento de turno**: relatório de um dia e turno (ou todos), com produção por máquina, operador, produto e ordem, e botão de imprimir. É só leitura: não trava os apontamentos.

### Regras

- **OEE = disponibilidade × desempenho × qualidade.** Todas as paradas contam contra a disponibilidade, inclusive o intervalo. As somas são feitas antes de dividir.
- Um apontamento novo não pode passar da capacidade da máquina: peças boas + perdidas ≤ velocidade × (duração − paradas) ÷ 60. Ordem e máquina só combinam se houver velocidade nominal cadastrada.
- A soma das paradas não passa da duração, e a duração vai de 1 minuto a 24 h.
- **A mesma máquina não pode ter dois apontamentos sobrepostos**, garantido por uma restrição de exclusão no banco (além de uma checagem amigável no app).
- A velocidade nominal é **copiada** para cada apontamento, então editar o cadastro não muda o histórico. Os indicadores são derivados, nunca gravados.
- Cada operador recebe um código automático (`OP-001`), gerado pelo banco e não editável.
- Horários digitados são de Brasília (UTC−03:00) e gravados em UTC. O dia de produção é o dia do início do apontamento.
- Quantidades são inteiras (peças); o módulo não tem dinheiro.

Desenho completo em [docs/superpowers/specs/2026-11-04-controle-producao-design.md](docs/superpowers/specs/2026-11-04-controle-producao-design.md).

## Acesso e segurança

- **Login** por e-mail e senha (Auth.js v5, sessão JWT, senhas com bcrypt). Não há tela de cadastro: os usuários são criados por script (veja [Scripts](#scripts)).
- **Perfis**: `admin` vê financeiro e produção; `producao` (gestor de produção) só acessa `/producao`. O perfil é relido do banco a cada 5 minutos, então trocar o perfil ou remover o usuário vale em pouco tempo, e usuário removido perde a sessão.
- **Em camadas**: o `proxy.ts` faz uma checagem otimista de redirecionamento, mas a verificação de verdade acontece em cada Server Action e em cada página que lê o banco (`exigirSessao`).
- **Limite de tentativas**: 5 falhas em 15 minutos bloqueiam o e-mail.
- Entradas validadas com Zod no servidor; segredos só em variáveis de ambiente.

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | Next.js 16 (App Router) + React 19 (React Compiler habilitado) |
| Linguagem | TypeScript |
| Estilização | Tailwind CSS 4 + shadcn/ui (Radix UI, lucide-react) |
| Backend | Server Actions e Route Handlers |
| Banco de dados | PostgreSQL no Neon (driver serverless) |
| ORM | Prisma 7 (adapter `PrismaNeon`) |
| Autenticação | Auth.js v5 (beta), sessões JWT |
| Integração ERP | API GestãoClick (somente leitura) |
| Validação | Zod 4 |
| Testes | Vitest |

## Estrutura

```
prisma/
  schema.prisma               modelo do banco (financeiro e produção)
  migrations/                 migrations versionadas, com SQL escrito à mão (índice parcial, CHECKs, exclusão de sobreposição)
scripts/criar-usuario.ts      cria usuários
docs/                         explicação do domínio, mapa do código, specs e planos de implementação
src/
  proxy.ts                    checagem otimista de sessão e perfil nas rotas
  app/
    login/                    página de login
    api/auth, api/health      Auth.js e healthcheck
    (dashboard)/              módulo financeiro: antecipacoes, titulos, custos, contas, actions.ts
    (producao)/producao/      módulo de produção: apontamentos, ordens, indicadores, fechamento, cadastros, actions.ts
  components/                 formulário e botão ligados a Server Actions, campo de senha, shadcn/ui
  lib/
    auth.ts, sessao.ts, perfil.ts, senha.ts, login-limite.ts   autenticação, perfis e limite de tentativas
    db.ts, env.ts             cliente Prisma (adapter Neon) e validação das variáveis de ambiente
    dinheiro.ts               aritmética monetária em centavos
    antecipacoes/, titulos/   regras e serviços do financeiro
    gestaoclick/              cliente HTTP, leitura de recebimentos e sincronização
    producao/                 regras, serviço, tempo (Brasília) e indicadores (OEE)
    validations/              schemas Zod
```

O mapa detalhado de arquivos, fluxos e armadilhas está em [docs/CODEBASE_MAP.md](docs/CODEBASE_MAP.md).

## Pré-requisitos

- Node.js 20+ e npm
- Um banco PostgreSQL no [Neon](https://neon.tech)
- Credenciais da API do GestãoClick (access token e secret access token), só para a sincronização do financeiro

## Configuração

1. Instale as dependências:

   ```bash
   npm install
   ```

2. Copie o arquivo de exemplo e preencha as variáveis:

   ```bash
   cp .env.example .env.local
   ```

   | Variável | Descrição |
   | --- | --- |
   | `DATABASE_URL` | string de conexão do Neon (com pooler) |
   | `AUTH_SECRET` | segredo do Auth.js; gere com `openssl rand -base64 32` |
   | `GESTAOCLICK_API_URL` | URL base da API do GestãoClick |
   | `GESTAOCLICK_ACCESS_TOKEN` | token de acesso do GestãoClick |
   | `GESTAOCLICK_SECRET_ACCESS_TOKEN` | secret token do GestãoClick |

3. Gere o cliente Prisma e aplique as migrations:

   ```bash
   npm run db:generate
   npm run db:migrate
   ```

4. Crie o primeiro usuário e rode o servidor:

   ```bash
   npm run usuario:criar -- voce@exemplo.com "Seu Nome" "senha-com-8-ou-mais"
   npm run dev
   ```

   Acesse http://localhost:3000. O healthcheck fica em `/api/health`.

## Scripts

| Comando | Função |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm start` | servidor de produção |
| `npm run lint` | ESLint |
| `npm run typecheck` | checagem de tipos |
| `npm test` | testes com Vitest (execução única) |
| `npm run test:watch` | Vitest em modo watch |
| `npm run db:generate` | gera o cliente Prisma |
| `npm run db:migrate` | cria e aplica migrations |
| `npm run db:studio` | interface visual do banco |
| `npm run usuario:criar -- email "Nome" "senha" [admin\|producao]` | cria (ou redefine a senha de) um usuário. `admin` (padrão) acessa financeiro e produção; `producao` acessa só `/producao` |

## Próximos passos

**Financeiro**

- Filtro por loja na sincronização com o GestãoClick (hoje vem só a loja padrão da chave).
- Sincronizar só os recebimentos que são boleto, se isso precisar ser separado dos demais.
- Testes automáticos das operações no banco (concorrência e índice parcial), o que exige um banco de teste.
- Paginar as listas de títulos e antecipações, mantendo os totais sobre o conjunto completo.

**Produção**

- Login de operador.
- Integração com produtos e ordens do GestãoClick.
- Separar paradas planejadas das não planejadas, se o critério de eficiência mudar.

**Geral**

- Trilha de auditoria das ações destrutivas e financeiras (quem excluiu, baixou ou cancelou).
