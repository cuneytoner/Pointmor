-- Tüm uygulama tablolarını ve migration geçmişini kaldırır (public şeması sıfırlanır).
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO PUBLIC;
