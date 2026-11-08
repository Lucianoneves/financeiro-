-- Cadastros de turno, operador e motivos passam a ser criados pelo próprio
-- apontamento. A chave de comparação é o nome normalizado (minúsculas, sem
-- acentos, espaços reduzidos), a mesma regra de src/lib/producao/nomes.ts.
-- Se houver dois cadastros que colidem após a normalização, esta migração falha
-- nos índices únicos: resolva os duplicados antes de reaplicar.

-- AlterTable
ALTER TABLE "Turno" ADD COLUMN "nomeNormalizado" TEXT;
ALTER TABLE "Operador" ADD COLUMN "nomeNormalizado" TEXT;
ALTER TABLE "MotivoParada" ADD COLUMN "nomeNormalizado" TEXT;
ALTER TABLE "MotivoPerda" ADD COLUMN "nomeNormalizado" TEXT;

-- Preenchimento dos registros existentes
UPDATE "Turno" SET "nomeNormalizado" = lower(btrim(regexp_replace(translate("nome", 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'), '\s+', ' ', 'g')));
UPDATE "Operador" SET "nomeNormalizado" = lower(btrim(regexp_replace(translate("nome", 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'), '\s+', ' ', 'g')));
UPDATE "MotivoParada" SET "nomeNormalizado" = lower(btrim(regexp_replace(translate("nome", 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'), '\s+', ' ', 'g')));
UPDATE "MotivoPerda" SET "nomeNormalizado" = lower(btrim(regexp_replace(translate("nome", 'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ', 'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'), '\s+', ' ', 'g')));

-- Obrigatório e único
ALTER TABLE "Turno" ALTER COLUMN "nomeNormalizado" SET NOT NULL;
ALTER TABLE "Operador" ALTER COLUMN "nomeNormalizado" SET NOT NULL;
ALTER TABLE "MotivoParada" ALTER COLUMN "nomeNormalizado" SET NOT NULL;
ALTER TABLE "MotivoPerda" ALTER COLUMN "nomeNormalizado" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Turno_nomeNormalizado_key" ON "Turno"("nomeNormalizado");
CREATE UNIQUE INDEX "Operador_nomeNormalizado_key" ON "Operador"("nomeNormalizado");
CREATE UNIQUE INDEX "MotivoParada_nomeNormalizado_key" ON "MotivoParada"("nomeNormalizado");
CREATE UNIQUE INDEX "MotivoPerda_nomeNormalizado_key" ON "MotivoPerda"("nomeNormalizado");
