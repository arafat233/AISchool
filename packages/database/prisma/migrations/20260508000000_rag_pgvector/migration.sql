-- RAG knowledge base tables + pgvector support
-- Run after the main init migration.

-- Enable pgvector extension (requires PostgreSQL 15+ with pgvector installed)
CREATE EXTENSION IF NOT EXISTS vector;

-- Add a native vector column to knowledge_chunks for efficient ANN search.
-- Dimension: 384 — matches BAAI/bge-small-en-v1.5 (local FastEmbed model).
-- The embedding_json TEXT column (created by Prisma) is kept for Prisma
-- compatibility; the vector column is used for similarity queries from Python.
ALTER TABLE knowledge_chunks
  ADD COLUMN IF NOT EXISTS embedding vector(384);

-- Backfill vector column from existing JSON rows (run once after migration)
UPDATE knowledge_chunks
SET embedding = embedding_json::vector
WHERE embedding IS NULL AND embedding_json IS NOT NULL;

-- IVFFlat index for approximate nearest-neighbour search (cosine distance).
-- lists = sqrt(expected row count) is a good starting heuristic.
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
  ON knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_school_ready
  ON knowledge_chunks (school_id, tenant_id);
