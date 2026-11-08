-- CreateEnum
CREATE TYPE "StatusOrdem" AS ENUM ('ABERTA', 'ENCERRADA');

-- CreateTable
CREATE TABLE "Maquina" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Maquina_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Produto" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Turno" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Turno_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Operador" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "matricula" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Operador_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VelocidadeNominal" (
    "id" TEXT NOT NULL,
    "maquinaId" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "pecasPorHora" INTEGER NOT NULL,

    CONSTRAINT "VelocidadeNominal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrdemProducao" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "produtoId" TEXT NOT NULL,
    "quantidadePlanejada" INTEGER NOT NULL,
    "status" "StatusOrdem" NOT NULL DEFAULT 'ABERTA',
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrdemProducao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotivoParada" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MotivoParada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MotivoPerda" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MotivoPerda_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApontamentoProducao" (
    "id" TEXT NOT NULL,
    "data" DATE NOT NULL,
    "turnoId" TEXT NOT NULL,
    "maquinaId" TEXT NOT NULL,
    "operadorId" TEXT NOT NULL,
    "ordemId" TEXT NOT NULL,
    "inicio" TIMESTAMP(3) NOT NULL,
    "fim" TIMESTAMP(3) NOT NULL,
    "quantidadeBoa" INTEGER NOT NULL,
    "velocidadeNominal" INTEGER NOT NULL,
    "registradoPor" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApontamentoProducao_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParadaApontamento" (
    "id" TEXT NOT NULL,
    "apontamentoId" TEXT NOT NULL,
    "motivoId" TEXT NOT NULL,
    "minutos" INTEGER NOT NULL,

    CONSTRAINT "ParadaApontamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PerdaApontamento" (
    "id" TEXT NOT NULL,
    "apontamentoId" TEXT NOT NULL,
    "motivoId" TEXT NOT NULL,
    "quantidade" INTEGER NOT NULL,

    CONSTRAINT "PerdaApontamento_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Maquina_nome_key" ON "Maquina"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Produto_codigo_key" ON "Produto"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Turno_nome_key" ON "Turno"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "Operador_matricula_key" ON "Operador"("matricula");

-- CreateIndex
CREATE INDEX "VelocidadeNominal_produtoId_idx" ON "VelocidadeNominal"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "VelocidadeNominal_maquinaId_produtoId_key" ON "VelocidadeNominal"("maquinaId", "produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "OrdemProducao_numero_key" ON "OrdemProducao"("numero");

-- CreateIndex
CREATE INDEX "OrdemProducao_produtoId_idx" ON "OrdemProducao"("produtoId");

-- CreateIndex
CREATE UNIQUE INDEX "MotivoParada_nome_key" ON "MotivoParada"("nome");

-- CreateIndex
CREATE UNIQUE INDEX "MotivoPerda_nome_key" ON "MotivoPerda"("nome");

-- CreateIndex
CREATE INDEX "ApontamentoProducao_data_idx" ON "ApontamentoProducao"("data");

-- CreateIndex
CREATE INDEX "ApontamentoProducao_maquinaId_idx" ON "ApontamentoProducao"("maquinaId");

-- CreateIndex
CREATE INDEX "ApontamentoProducao_operadorId_idx" ON "ApontamentoProducao"("operadorId");

-- CreateIndex
CREATE INDEX "ApontamentoProducao_ordemId_idx" ON "ApontamentoProducao"("ordemId");

-- CreateIndex
CREATE INDEX "ApontamentoProducao_turnoId_idx" ON "ApontamentoProducao"("turnoId");

-- CreateIndex
CREATE INDEX "ParadaApontamento_apontamentoId_idx" ON "ParadaApontamento"("apontamentoId");

-- CreateIndex
CREATE INDEX "ParadaApontamento_motivoId_idx" ON "ParadaApontamento"("motivoId");

-- CreateIndex
CREATE INDEX "PerdaApontamento_apontamentoId_idx" ON "PerdaApontamento"("apontamentoId");

-- CreateIndex
CREATE INDEX "PerdaApontamento_motivoId_idx" ON "PerdaApontamento"("motivoId");

-- AddForeignKey
ALTER TABLE "VelocidadeNominal" ADD CONSTRAINT "VelocidadeNominal_maquinaId_fkey" FOREIGN KEY ("maquinaId") REFERENCES "Maquina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VelocidadeNominal" ADD CONSTRAINT "VelocidadeNominal_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrdemProducao" ADD CONSTRAINT "OrdemProducao_produtoId_fkey" FOREIGN KEY ("produtoId") REFERENCES "Produto"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApontamentoProducao" ADD CONSTRAINT "ApontamentoProducao_turnoId_fkey" FOREIGN KEY ("turnoId") REFERENCES "Turno"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApontamentoProducao" ADD CONSTRAINT "ApontamentoProducao_maquinaId_fkey" FOREIGN KEY ("maquinaId") REFERENCES "Maquina"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApontamentoProducao" ADD CONSTRAINT "ApontamentoProducao_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "Operador"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApontamentoProducao" ADD CONSTRAINT "ApontamentoProducao_ordemId_fkey" FOREIGN KEY ("ordemId") REFERENCES "OrdemProducao"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParadaApontamento" ADD CONSTRAINT "ParadaApontamento_apontamentoId_fkey" FOREIGN KEY ("apontamentoId") REFERENCES "ApontamentoProducao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParadaApontamento" ADD CONSTRAINT "ParadaApontamento_motivoId_fkey" FOREIGN KEY ("motivoId") REFERENCES "MotivoParada"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerdaApontamento" ADD CONSTRAINT "PerdaApontamento_apontamentoId_fkey" FOREIGN KEY ("apontamentoId") REFERENCES "ApontamentoProducao"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PerdaApontamento" ADD CONSTRAINT "PerdaApontamento_motivoId_fkey" FOREIGN KEY ("motivoId") REFERENCES "MotivoPerda"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Integridade do módulo de produção garantida pelo banco (o Prisma não declara
-- CHECK nem restrição de exclusão). Espelha as regras de src/lib/producao/.
-- ---------------------------------------------------------------------------

ALTER TABLE "VelocidadeNominal"
  ADD CONSTRAINT "velocidade_pecas_ck" CHECK ("pecasPorHora" > 0);

ALTER TABLE "OrdemProducao"
  ADD CONSTRAINT "ordem_quantidade_ck" CHECK ("quantidadePlanejada" > 0);

ALTER TABLE "ApontamentoProducao"
  ADD CONSTRAINT "apontamento_periodo_ck"
    CHECK ("fim" > "inicio" AND "fim" - "inicio" <= INTERVAL '24 hours'),
  ADD CONSTRAINT "apontamento_quantidades_ck"
    CHECK ("quantidadeBoa" >= 0 AND "velocidadeNominal" > 0);

ALTER TABLE "ParadaApontamento"
  ADD CONSTRAINT "parada_minutos_ck" CHECK ("minutos" > 0);

ALTER TABLE "PerdaApontamento"
  ADD CONSTRAINT "perda_quantidade_ck" CHECK ("quantidade" > 0);

-- Uma máquina não pode ter dois apontamentos que se sobreponham no tempo
-- (o tempo dela seria contado duas vezes). Períodos que apenas se encostam
-- (fim de um = início do outro) são permitidos.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "ApontamentoProducao"
  ADD CONSTRAINT "apontamento_maquina_sem_sobreposicao"
    EXCLUDE USING gist ("maquinaId" WITH =, tsrange("inicio", "fim") WITH &&);
