-- Código automático do operador: número sequencial gerado pelo banco; a tela
-- mostra "OP-001". Os operadores que já existem são numerados pela ordem de
-- criação (o id cuid cresce com o tempo) e a sequência continua depois do maior.

-- CreateSequence
CREATE SEQUENCE "Operador_numero_seq";

-- AlterTable
ALTER TABLE "Operador" ADD COLUMN "numero" INTEGER;

-- Numeração dos registros existentes
UPDATE "Operador" o
SET "numero" = r.n
FROM (
  SELECT id, row_number() OVER (ORDER BY id) AS n
  FROM "Operador"
) r
WHERE o.id = r.id;

-- Próximo número = maior + 1
SELECT setval('"Operador_numero_seq"', COALESCE((SELECT MAX("numero") FROM "Operador"), 0) + 1, false);

-- Obrigatório, automático e único (equivale ao SERIAL do Prisma)
ALTER TABLE "Operador" ALTER COLUMN "numero" SET DEFAULT nextval('"Operador_numero_seq"');
ALTER TABLE "Operador" ALTER COLUMN "numero" SET NOT NULL;
ALTER SEQUENCE "Operador_numero_seq" OWNED BY "Operador"."numero";

-- CreateIndex
CREATE UNIQUE INDEX "Operador_numero_key" ON "Operador"("numero");
