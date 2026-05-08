-- RAG knowledge base: enums, tables, and pgvector support
-- Creates knowledge_documents, knowledge_chunks, rag_chat_sessions
-- then adds the vector extension and embedding column.

-- Enums
DO $$ BEGIN
  CREATE TYPE "KnowledgeDocType" AS ENUM ('CIRCULAR', 'FEE_STRUCTURE', 'LESSON_PLAN', 'HR_POLICY', 'EXAM_GUIDELINE', 'GENERAL');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "KnowledgeDocStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- knowledge_documents table
CREATE TABLE IF NOT EXISTS "knowledge_documents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "docType" "KnowledgeDocType" NOT NULL DEFAULT 'GENERAL',
    "title" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "fileSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "status" "KnowledgeDocStatus" NOT NULL DEFAULT 'PENDING',
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedBy" TEXT NOT NULL,
    "contentHash" TEXT,
    "errorMsg" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_documents_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "knowledge_documents_schoolId_docType_idx"
  ON "knowledge_documents" ("schoolId", "docType");
CREATE INDEX IF NOT EXISTS "knowledge_documents_tenantId_status_idx"
  ON "knowledge_documents" ("tenantId", "status");
CREATE INDEX IF NOT EXISTS "knowledge_documents_schoolId_contentHash_idx"
  ON "knowledge_documents" ("schoolId", "contentHash");

-- knowledge_chunks table
CREATE TABLE IF NOT EXISTS "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "embeddingJson" TEXT,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "pageNumber" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "knowledge_chunks"
  DROP CONSTRAINT IF EXISTS "knowledge_chunks_documentId_fkey";

ALTER TABLE "knowledge_chunks"
  ADD CONSTRAINT "knowledge_chunks_documentId_fkey"
  FOREIGN KEY ("documentId") REFERENCES "knowledge_documents"("id") ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS "knowledge_chunks_schoolId_documentId_idx"
  ON "knowledge_chunks" ("schoolId", "documentId");
CREATE INDEX IF NOT EXISTS "knowledge_chunks_tenantId_idx"
  ON "knowledge_chunks" ("tenantId");

-- rag_chat_sessions table
CREATE TABLE IF NOT EXISTS "rag_chat_sessions" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "context" TEXT NOT NULL DEFAULT 'GENERAL',
    "messages" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rag_chat_sessions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "rag_chat_sessions_userId_idx"
  ON "rag_chat_sessions" ("userId");
CREATE INDEX IF NOT EXISTS "rag_chat_sessions_schoolId_idx"
  ON "rag_chat_sessions" ("schoolId");

-- pgvector extension (graceful degradation on Windows/systems without pgvector)
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS vector;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector not available — vector similarity search disabled.';
END $$;

-- Add vector embedding column (skipped if pgvector not installed)
DO $$ BEGIN
  ALTER TABLE "knowledge_chunks"
    ADD COLUMN IF NOT EXISTS embedding vector(384);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping vector column — pgvector not installed.';
END $$;

-- IVFFlat index (skipped if pgvector not installed)
DO $$ BEGIN
  CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding
    ON "knowledge_chunks"
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Skipping IVFFlat index — pgvector not installed.';
END $$;

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_school_ready
  ON "knowledge_chunks" ("schoolId", "tenantId");
