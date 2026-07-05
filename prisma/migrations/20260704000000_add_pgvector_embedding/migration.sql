-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- AlterTable: add embedding column for RAG search
ALTER TABLE "Entry" ADD COLUMN "embedding" vector(1536);

-- CreateIndex: HNSW for cosine similarity search
CREATE INDEX "Entry_embedding_idx" ON "Entry" USING hnsw ("embedding" vector_cosine_ops);
