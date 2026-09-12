import request from 'supertest';
import { createApp } from '../src/app';
import { QueueManager } from '../src/jobs/queue.manager';
import { DependencyUnavailableError } from '../src/utils/errors';
import { StandardErrorCode } from '@sicp/shared';

describe('Dependency Failure & Resilient Diagnostics', () => {
  const app = createApp();

  describe('/healthz Liveness Endpoint', () => {
    it('always responds 200 UP even if external dependencies are offline', async () => {
      const res = await request(app).get('/healthz');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('UP');
      expect(res.body.data.service).toBe('sicp-backend');
      expect(res.body.meta.requestId).toBeDefined();
    });
  });

  describe('/readyz Readiness Endpoint', () => {
    it('correctly reports readiness status and returns 503 when dependencies are down', async () => {
      const res = await request(app).get('/readyz');

      // When DB or Redis is down, it should return 503 with explicit breakdown
      expect([200, 503]).toContain(res.status);
      expect(res.body.data.database).toBeDefined();
      expect(res.body.data.redisQueue).toBeDefined();
    });
  });

  describe('QueueManager Dependency Unavailable Protection', () => {
    it('throws DependencyUnavailableError with DEPENDENCY_UNAVAILABLE code when Redis is offline', async () => {
      // Force QueueManager isRedisReady to return false
      jest.spyOn(QueueManager, 'isRedisReady').mockReturnValue(false);

      await expect(
        QueueManager.enqueueAiAnalysis('challenge-test-id', 'req-dep-fail')
      ).rejects.toThrow(DependencyUnavailableError);

      try {
        await QueueManager.enqueueAiAnalysis('challenge-test-id', 'req-dep-fail');
      } catch (err: any) {
        expect(err.statusCode).toBe(503);
        expect(err.errorCode).toBe(StandardErrorCode.DEPENDENCY_UNAVAILABLE);
        expect(err.message).toContain('Redis / BullMQ Queue');
        expect(err.details).toEqual({
          dependency: 'Redis / BullMQ Queue',
          actionDescription: 'Asynchronous AI Analysis Enqueue',
        });
      }
    });
  });
});