-- Add content_hash column to knowledge_documents for dedup on re-upload.
-- SHA-256 hex string (64 chars).

ALTER TABLE knowledge_documents
  ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64);

-- Partial index: only index READY documents — the only ones useful for dedup
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_content_hash
  ON knowledge_documents (school_id, content_hash)
  WHERE status = 'READY' AND content_hash IS NOT NULL;
