# Controle de Produção — desenho

**Data:** 2026-11-04

## Intenção
Controlar a produção da fábrica no mesmo sistema do Financeiro, como módulo **independente**: o supervisor lança o que cada máquina produziu e parou, e o sistema mostra quantidade produzida, perdas, eficiência (OEE) por máquina e desempenho dos operadores. Não usa a API do GestãoClick.

## Metas
- Apontamento vinculado a máquina, produto (via ordem), turno, operador e ordem de produção.
- Paradas com motivo (cadastro) e perdas com motivo (cadastro).
- Indicadores: quantidade produzida, índice de perdas, disponibilidade, desempenho, qualidade, OEE e produtividade, por máquina, operador e produto, mais paradas e perdas por motivo.

## Não-metas
- Login de operador (o supervisor/gestor lança tudo por enquanto). Perfis simples (ADMIN e PRODUCAO) existem; ver "Decisões minhas".
- Integração com GestãoClick (produtos, ordens, estoque).
- Custos de produção ou dinheiro de qualquer tipo.
- Apontamento em tempo real (início e fim de parada ao vivo).

## Anti-metas
- Alterar código ou regras do financeiro. Os dois módulos não compartilham tabelas.

## Decisões do usuário
- Apontamento pelo supervisor.
- Parada com motivo; **todas as paradas contam** contra a eficiência, inclusive intervalo.
- Eficiência por **OEE completo**, com velocidade nominal (peças/hora) por produto em cada máquina.
- Produção em **peças inteiras**.
- Perdas **com motivo**.

## Abordagens
- **A (escolhida):** módulo novo no mesmo app, com tabelas próprias, route group `(producao)` e `src/lib/producao/`. Reaproveita só login, sessão e componentes de formulário, sem alterá-los. Os indicadores são calculados na leitura a partir dos apontamentos.
- **B:** sistema separado. Descartada: o usuário quer o mesmo sistema, e duplicaria login e infraestrutura.
- **C:** gravar indicadores prontos a cada apontamento. Descartada: ficariam desatualizados quando um apontamento fosse excluído ou o critério mudasse.

## Modelo de dados
`Maquina`, `Produto`, `Turno`, `Operador`, `VelocidadeNominal` (única por máquina e produto), `OrdemProducao` (`ABERTA`/`ENCERRADA`), `MotivoParada`, `MotivoPerda`, `ApontamentoProducao`, `ParadaApontamento`, `PerdaApontamento`. Detalhes em `prisma/schema.prisma`.

Garantias do banco (migration `20261104150000_producao`, escritas à mão): CHECKs (fim > início, até 24 h, quantidades e minutos positivos, velocidade e quantidade planejada positivas) e uma restrição de exclusão GiST (`btree_gist`) que impede dois apontamentos sobrepostos na mesma máquina. Períodos que apenas se encostam são permitidos.

## Cálculo (todas as paradas contam)
- Disponibilidade = tempo operando ÷ tempo planejado
- Desempenho = peças produzidas ÷ peças teóricas (velocidade × tempo operando)
- Qualidade = peças boas ÷ peças produzidas
- OEE = disponibilidade × desempenho × qualidade (calculado como disponibilidade × boas ÷ teóricas)
- Índice de perdas = perdas ÷ produzidas; produtividade = peças boas por hora operando

Exemplo: 480 min com 60 de parada → 87,5%; teórico 100 pç/h × 420 min = 700; produzidas 630 → 90%; boas 600 → 95,2%; OEE 75,0%. Está nos testes.

## Decisões minhas (para conferir)
- O dia de produção é o dia do início do apontamento, em Brasília; apontamento que cruza a meia-noite fica no dia em que começou.
- A velocidade nominal é copiada para o apontamento (histórico não muda se o cadastro mudar).
- O apontamento guarda o e-mail de quem lançou, sem relação com `Usuario`, para o módulo não alterar o modelo do financeiro.
- Cadastros só se inativam, nunca se excluem. Apontamentos podem ser excluídos.
- Desempenho acima de 100% é mostrado com aviso, sem limitar: indica velocidade nominal baixa demais.
- Paradas e perdas são lançadas em até 5 linhas por apontamento (linhas vazias ignoradas).
- O link "Produção" foi adicionado ao cabeçalho do financeiro (3 linhas em `src/app/(dashboard)/layout.tsx`); é a única alteração em arquivo do financeiro.
- **Perfis (adicionado depois):** `Usuario.perfil` = `ADMIN` (financeiro, vê tudo) ou `PRODUCAO` (gestor de produção, só `/producao`). Migration `20261104160000_perfil_usuario`; usuários existentes viram `ADMIN`. A restrição vale no proxy e no servidor (`exigirSessao` exige ADMIN; a produção usa `exigirSessaoProducao`). Isto altera o financeiro de forma mínima: `auth.ts`, `sessao.ts`, o login e o script de criar usuário. As regras e telas do financeiro não mudam.

## Para quem for construir
Plano de execução em `docs/superpowers/plans/2026-11-04-controle-producao-plano.md`. Regras puras e testes em `src/lib/producao/`.
