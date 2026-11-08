-- Perfil de acesso do usuário. Os já existentes ficam como ADMIN (acesso total).
-- CreateEnum
CREATE TYPE "PerfilUsuario" AS ENUM ('ADMIN', 'PRODUCAO');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "perfil" "PerfilUsuario" NOT NULL DEFAULT 'ADMIN';
