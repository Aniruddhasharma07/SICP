import { Worker, Job } from 'bullmq';
import { prisma } from '../../database/prisma';
import { logger } from '../../utils/logger';
import { EmbeddingStatus } from '@sicp/shared';
import { AiServiceClient } from '../../domain/intelligence/ai-service.client';

export function startEmbeddingWorker(connection: unknown): Worker | null {
  if (!connection) return null;

  const worker = new Worker(
    'solution-embeddings',
    async (job: Job) => {
      const { memoryId, canonicalText, requestId } = job.data;
      logger.info(`Embedding Worker processing SolutionMemory ${memoryId} (Job: ${job.id})`, { requestId });

      // 1. Mark status PROCESSING
      await prisma.solutionMemory.update({
        where: { id: memoryId },
        data: {
          embeddingStatus: EmbeddingStatus.PROCESSING,
        },
      });

      try {
        // 2. Call AI embedding service
        const data = await AiServiceClient.generateEmbedding(canonicalText, 768, requestId);
        const vector: number[] = data.embedding;

        if (!Array.isArray(vector) || vector.length !== 768) {
          throw new Error(`Invalid vector dimensions received: expected 768, got ${vector?.length}`);
        }

        // 3. Store vector using raw SQL for pgvector support
        const vectorStr = `[${vector.join(',')}]`;
        await prisma.$executeRawUnsafe(
          `UPDATE "SolutionMemory" SET "embedding" = $1::vector, "embeddingStatus" = $2, "embeddingModel" = $3, "embeddingVersion" = $4, "embeddingGeneratedAt" = $5 WHERE "id" = $6`,
          vectorStr,
          EmbeddingStatus.COMPLETED,
          data.model || 'text-embedding-004',
          '1.0',
          new Date(),
          memoryId
        );

        logger.info(`Successfully generated and persisted pgvector embedding for SolutionMemory ${memoryId}`, { requestId });
      } catch (err: unknown) {
        logger.warn(`Embedding generation failed for SolutionMemory ${memoryId}: ${(err as Error).message}`, { requestId });
        await prisma.solutionMemory.update({
          where: { id: memoryId },
          data: {
            embeddingStatus: EmbeddingStatus.FAILED,
            embeddingFailureReason: (err as Error).message,
          },
        });
        throw err;
      }
    },
    { connection: connection as any }
  );

  worker.on('failed', (job, err) => {
    logger.warn(`BullMQ embedding job ${job?.id} failed: ${err.message}`);
  });

  return worker;
}
