-- Integridade financeira garantida pelo banco (o Prisma não declara CHECK).
-- Espelha as regras da aplicação em src/lib/validations/.

ALTER TABLE "Titulo"
  ADD CONSTRAINT "titulo_valor_ck" CHECK ("valor" > 0);

ALTER TABLE "Antecipacao"
  ADD CONSTRAINT "antecipacao_valores_ck"
    CHECK ("valorBruto" > 0 AND "juros" >= 0 AND "tarifas" >= 0 AND "valorLiquido" >= 0),
  ADD CONSTRAINT "antecipacao_liquido_ck"
    CHECK ("valorLiquido" = "valorBruto" - "juros" - "tarifas");
