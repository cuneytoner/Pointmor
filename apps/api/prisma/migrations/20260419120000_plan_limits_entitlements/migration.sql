-- Plan başına loyalty limitleri (JSON); faturalama bu fazda yok.
ALTER TABLE "Plan" ADD COLUMN "limits" JSONB NOT NULL DEFAULT '{}';
