-- CreateEnum
CREATE TYPE "OrigemTitulo" AS ENUM ('MANUAL', 'GESTAOCLICK');

-- CreateEnum
CREATE TYPE "StatusAntecipacao" AS ENUM ('ATIVA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContaBancaria" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContaBancaria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Titulo" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "valor" DECIMAL(14,2) NOT NULL,
    "vencimento" DATE NOT NULL,
    "origem" "OrigemTitulo" NOT NULL DEFAULT 'MANUAL',
    "idExterno" TEXT,
    "baixadoEm" TIMESTAMP(3),
    "criadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Titulo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Antecipacao" (
    "id" TEXT NOT NULL,
    "tituloId" TEXT NOT NULL,
    "contaId" TEXT NOT NULL,
    "valorBruto" DECIMAL(14,2) NOT NULL,
    "juros" DECIMAL(14,2) NOT NULL,
    "tarifas" DECIMAL(14,2) NOT NULL,
    "valorLiquido" DECIMAL(14,2) NOT NULL,
    "dataAntecipacao" DATE NOT NULL,
    "status" "StatusAntecipacao" NOT NULL DEFAULT 'ATIVA',
    "criadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Antecipacao_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Titulo_origem_idExterno_key" ON "Titulo"("origem", "idExterno");

-- CreateIndex
CREATE INDEX "Antecipacao_tituloId_idx" ON "Antecipacao"("tituloId");

-- CreateIndex
CREATE INDEX "Antecipacao_contaId_idx" ON "Antecipacao"("contaId");

-- AddForeignKey
ALTER TABLE "Antecipacao" ADD CONSTRAINT "Antecipacao_tituloId_fkey" FOREIGN KEY ("tituloId") REFERENCES "Titulo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Antecipacao" ADD CONSTRAINT "Antecipacao_contaId_fkey" FOREIGN KEY ("contaId") REFERENCES "ContaBancaria"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- No máximo uma antecipação ATIVA por título (o Prisma não declara índices parciais).
CREATE UNIQUE INDEX "Antecipacao_tituloId_ativa_key" ON "Antecipacao"("tituloId") WHERE "status" = 'ATIVA';
