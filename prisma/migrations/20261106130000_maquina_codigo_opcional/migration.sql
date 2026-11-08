-- O código da máquina passa a ser digitado por quem cadastra, nunca gerado.
-- Torna a coluna opcional e remove os códigos M01, M02... que a migração
-- anterior (maquina_codigo) gerou automaticamente para as máquinas antigas.
-- Só apaga os que ainda têm exatamente esse formato; o usuário define os seus
-- em Produção > Cadastros > Editar. Vários NULL são permitidos pelo índice único.

-- AlterTable
ALTER TABLE "Maquina" ALTER COLUMN "codigo" DROP NOT NULL;

-- Remove os códigos gerados automaticamente
UPDATE "Maquina" SET "codigo" = NULL WHERE "codigo" ~ '^M[0-9]{2}$';
