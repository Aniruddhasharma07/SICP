import { Worker, Job } from 'bullmq';
import { logger } from '../../utils/logger';
import { ChallengeIntelligenceOrchestrator } from '../../domain/intelligence/challenge-intelligence.orchestrator';

export function startAiAnalysisWorker(connection: unknown): Worker | null {
  if (!connection) return null;

  const worker = new Worker(
    'challenge-ai-analysis',
    async (job: Job) => {
      const { challengeId, requestId } = job.data;
      logger.info(`AI Worker processing challenge ${challengeId} (Job: ${job.id})`, { requestId });

      try {
        await ChallengeIntelligenceOrchestrator.processChallengeIntelligence(challengeId, requestId);
        logger.info(`AI analysis & intelligence orchestration successfully completed for challenge ${challengeId}`, { requestId });
      } catch (err: unknown) {
        logger.error(`AI Worker failure on challenge ${challengeId}: ${(err as Error).message}`, { requestId });
        throw err;
      }
    },
    { connection: connection as any }
  );

  worker.on('failed', (job, err) => {
    logger.error(`BullMQ job ${job?.id} failed with error: ${err.message}`);
  });

  return worker;
}
