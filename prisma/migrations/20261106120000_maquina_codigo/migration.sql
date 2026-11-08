-- Máquina passa a ter código (como o produto): "código — nome" nas telas.
-- As máquinas que já existem recebem M01, M02... pela ordem de cadastro; os
-- códigos podem ser corrigidos depois em Produção > Cadastros > Editar.

-- AlterTable
ALTER TABLE "Maquina" ADD COLUMN "codigo" TEXT;

-- Preenchimento dos registros existentes
UPDATE "Maquina" m
SET "codigo" = 'M' || lpad(r.n::text, 2, '0')
FROM (
  SELECT id, row_number() OVER (ORDER BY "criadaEm", id) AS n
  FROM "Maquina"
) r
WHERE m.id = r.id;

-- Obrigatório e único
ALTER TABLE "Maquina" ALTER COLUMN "codigo" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Maquina_codigo_key" ON "Maquina"("codigo");
