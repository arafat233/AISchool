-- PostgreSQL init script — runs once on first container start
-- Creates extensions needed by the application

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- trigram search for LIKE optimisation
CREATE EXTENSION IF NOT EXISTS "btree_gin";  -- GIN indexes on composite types
