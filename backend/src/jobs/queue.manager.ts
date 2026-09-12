import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { DependencyUnavailableError } from '../utils/errors';
import { startEmbeddingWorker } from './workers/embedding.worker';
import { startAiAnalysisWorker } from './workers/ai-analysis.worker';

export class QueueManager {
  private static redisConnection: Redis | null = null;
  private static aiAnalysisQueue: Queue | null = null;
  private static notificationQueue: Queue | null = null;
  private static embeddingQueue: Queue | null = null;
  private static embeddingWorker: Worker | null = null;
  private static aiAnalysisWorker: Worker | null = null;
  private static isConnected: boolean = false;

  public static initialize(): void {
    try {
      this.redisConnection = new Redis({
        host: env.REDIS_HOST,
        port: env.REDIS_PORT,
        password: env.REDIS_PASSWORD || undefined,
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
        lazyConnect: true,
        retryStrategy(times) {
          if (times > 3) return null; // do not endlessly hammer in dev
          return Math.min(times * 500, 2000);
        },
      });

      this.redisConnection.on('ready', () => {
        this.isConnected = true;
        logger.info(`Redis connection established at ${env.REDIS_HOST}:${env.REDIS_PORT}`);
        this.embeddingWorker = startEmbeddingWorker(this.redisConnection);
        this.aiAnalysisWorker = startAiAnalysisWorker(this.redisConnection);
      });

      this.redisConnection.on('error', err => {
        this.isConnected = false;
        logger.warn(`Redis connection unavailable: ${err.message}. Queue-dependent endpoints will return DEPENDENCY_UNAVAILABLE.`);
      });

      this.redisConnection.on('close', () => {
        this.isConnected = false;
      });

      // Attempt initial connection without crashing process if Redis is down
      this.redisConnection.connect().catch(err => {
        logger.warn(`Initial Redis connect failed: ${err.message}. Server continues running in resilient mode.`);
      });

      // Initialize Queues
      this.aiAnalysisQueue = new Queue('challenge-ai-analysis', {
        connection: this.redisConnection,
      });

      this.notificationQueue = new Queue('system-notifications', {
        connection: this.redisConnection,
      });

      this.embeddingQueue = new Queue('solution-embeddings', {
        connection: this.redisConnection,
      });
    } catch (err: unknown) {
      logger.warn(`QueueManager initialization encountered error: ${(err as Error).message}`);
    }
  }

  public static isRedisReady(): boolean {
    return this.isConnected && this.redisConnection?.status === 'ready';
  }

  public static getRedisClient(): Redis | null {
    return this.redisConnection;
  }

  public static async enqueueAiAnalysis(challengeId: string, requestId: string): Promise<{ jobId: string }> {
    if (!this.isRedisReady() || !this.aiAnalysisQueue) {
      throw new DependencyUnavailableError(
        'Redis / BullMQ Queue',
        'Asynchronous AI Analysis Enqueue'
      );
    }

    const job = await this.aiAnalysisQueue.add(
      'analyze-challenge',
      { challengeId, requestId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      }
    );

    logger.info(`Enqueued AI analysis job ${job.id} for challenge ${challengeId}`, { requestId });
    return { jobId: job.id as string };
  }

  public static async enqueueEmbeddingGeneration(
    memoryId: string,
    canonicalText: string,
    requestId: string
  ): Promise<{ jobId: string } | null> {
    if (!this.isRedisReady() || !this.embeddingQueue) {
      logger.info(`Redis is unavailable. Embedding for SolutionMemory ${memoryId} marked PENDING for batch worker.`, { requestId });
      return null;
    }

    const job = await this.embeddingQueue.add(
      'generate-embedding',
      { memoryId, canonicalText, requestId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
      }
    );

    logger.info(`Enqueued embedding job ${job.id} for SolutionMemory ${memoryId}`, { requestId });
    return { jobId: job.id as string };
  }

  public static async enqueueNotification(data: { recipientId: string; title: string; message: string; type: string }): Promise<void> {
    if (!this.isRedisReady() || !this.notificationQueue) {
      logger.warn(`Cannot enqueue notification async: Redis is unavailable. Notification logged directly.`);
      return;
    }

    await this.notificationQueue.add('send-notification', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
      removeOnComplete: true,
    });
  }

  public static async close(): Promise<void> {
    if (this.embeddingWorker) await this.embeddingWorker.close();
    if (this.aiAnalysisWorker) await this.aiAnalysisWorker.close();
    if (this.aiAnalysisQueue) await this.aiAnalysisQueue.close();
    if (this.notificationQueue) await this.notificationQueue.close();
    if (this.embeddingQueue) await this.embeddingQueue.close();
    if (this.redisConnection) await this.redisConnection.quit();
  }
}
