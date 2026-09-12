-- ==============================================================================
-- SICP Phase 6: PostgreSQL pgvector Extension & Similarity Index Setup
-- Author: SICP Platform Architecture Team
-- ==============================================================================

-- 1. Enable pgvector extension (requires PostgreSQL 15+ and pgvector installed)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Validate vector column exists on SolutionMemory
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'SolutionMemory' AND column_name = 'embedding'
  ) THEN
    ALTER TABLE "SolutionMemory" ADD COLUMN "embedding" vector(768);
  END IF;
END $$;

-- 3. IVFFlat Cosine Similarity Index for production knowledge retrieval
-- Note: IVFFlat requires some existing rows for optimal centroid clustering.
CREATE INDEX IF NOT EXISTS idx_solution_memory_embedding_ivfflat
ON "SolutionMemory" USING ivfflat ("embedding" vector_cosine_ops) WITH (lists = 100);

-- 4. Alternative: HNSW index (best for dynamic real-time inserts without reindexing)
-- CREATE INDEX IF NOT EXISTS idx_solution_memory_embedding_hnsw
-- ON "SolutionMemory" USING hnsw ("embedding" vector_cosine_ops)
-- WITH (m = 16, ef_construction = 64);
