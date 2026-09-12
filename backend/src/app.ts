import express, { Express, Request, Response } from 'express';
import cookieParser from 'cookie-parser';
import { requestIdMiddleware } from './core/middlewares/request-id';
import { helmetMiddleware, corsMiddleware } from './core/middlewares/security-headers';
import { standardRateLimiter } from './core/middlewares/rate-limiter';
import { errorHandlerMiddleware } from './core/middlewares/error-handler';
import { authRouter } from './modules/auth/auth.routes';
import { organizationRouter } from './modules/organization/organization.routes';
import { challengeRouter } from './modules/challenge/challenge.routes';
import { voiceRouter } from './modules/voice/voice.routes';
import { governmentRouter } from './modules/government/government.routes';
import { universityRouter } from './modules/university/university.routes';
import { industryRouter } from './modules/industry/industry.routes';
import { teamRouter } from './modules/team/team.routes';
import { proposalRouter } from './modules/proposal/proposal.routes';
import { partnershipRouter } from './modules/partnership/partnership.routes';
import { fundingRouter } from './modules/funding/funding.routes';
import { projectRouter } from './modules/project/project.routes';
import { prototypeRouter } from './modules/prototype/prototype.routes';
import { testingRouter } from './modules/testing/testing.routes';
import { pilotRouter } from './modules/pilot/pilot.routes';
import { deploymentRouter } from './modules/deployment/deployment.routes';
import { outcomeRouter } from './modules/outcome/outcome.routes';
import { solutionRouter, knowledgeRouter } from './modules/solution/solution.routes';
import { searchRouter } from './modules/search/search.routes';
import { analyticsRouter } from './modules/analytics/analytics.routes';
import { geospatialRouter } from './modules/geospatial/geospatial.routes';
import { reportsRouter } from './modules/reports/reports.routes';
import { relationshipRouter } from './modules/relationship/relationship.routes';
import { adminRouter } from './modules/admin/admin.routes';
import { authMiddleware } from './core/middlewares/auth.middleware';
import { requirePermission } from './core/middlewares/rbac.middleware';
import { AuditService } from './modules/audit/audit.service';
import { NotificationService } from './modules/notification/notification.service';
import { sendSuccess } from './utils/response';
import { prisma } from './database/prisma';
import { QueueManager } from './jobs/queue.manager';

export function createApp(): Express {
  const app = express();

  // Core Middlewares
  app.use(requestIdMiddleware);
  app.use(helmetMiddleware);
  app.use(corsMiddleware);
  app.use(cookieParser());
  app.use(express.json({ limit: '2mb' }));
  app.use(standardRateLimiter);

  // Liveness Check (Healthz)
  app.get('/healthz', (req: Request, res: Response) => {
    sendSuccess(res, {
      status: 'UP',
      uptimeSeconds: process.uptime(),
      timestamp: new Date().toISOString(),
      service: 'sicp-backend',
    });
  });

  // Readiness Check (Readyz)
  app.get('/readyz', async (req: Request, res: Response) => {
    let dbStatus = 'DOWN';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'UP';
    } catch {
      dbStatus = 'DOWN';
    }

    const redisReady = QueueManager.isRedisReady();

    const isReady = dbStatus === 'UP';
    const status = isReady ? 200 : 503;

    sendSuccess(
      res,
      {
        status: isReady ? 'READY' : 'DEGRADED',
        database: dbStatus,
        redisQueue: redisReady ? 'READY' : 'UNAVAILABLE',
        timestamp: new Date().toISOString(),
      },
      status
    );
  });

  // API v1 Routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/organizations', organizationRouter);
  app.use('/api/v1/challenges', challengeRouter);
  app.use('/api/v1/voice', voiceRouter);
  app.use('/api/v1/government', governmentRouter);
  app.use('/api/v1/university', universityRouter);
  app.use('/api/v1/industry', industryRouter);
  app.use('/api/v1/teams', teamRouter);
  app.use('/api/v1/proposals', proposalRouter);
  app.use('/api/v1/partnerships', partnershipRouter);
  app.use('/api/v1/funding', fundingRouter);
  app.use('/api/v1/projects', projectRouter);
  app.use('/api/v1', prototypeRouter);
  app.use('/api/v1', testingRouter);
  app.use('/api/v1', pilotRouter);
  app.use('/api/v1', deploymentRouter);
  app.use('/api/v1', outcomeRouter);
  app.use('/api/v1/solutions', solutionRouter);
  app.use('/api/v1/knowledge', knowledgeRouter);
  app.use('/api/v1/search', searchRouter);
  app.use('/api/v1/analytics', analyticsRouter);
  app.use('/api/v1/geospatial', geospatialRouter);
  app.use('/api/v1/reports', reportsRouter);
  app.use('/api/v1', relationshipRouter);
  app.use('/api/v1/admin', adminRouter);

  // Audit Logs Route (Protected by audit:view)
  app.get('/api/v1/audit', authMiddleware, requirePermission('audit:view'), async (req: Request, res: Response, next) => {
    try {
      const resource = req.query.resource as string | undefined;
      const resourceId = req.query.resourceId as string | undefined;
      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;

      const logs = await AuditService.queryLogs({ resource, resourceId, limit, offset });
      sendSuccess(res, logs, 200);
    } catch (err) {
      next(err);
    }
  });

  // Notifications Route (User specific)
  app.get('/api/v1/notifications', authMiddleware, async (req: Request, res: Response, next) => {
    try {
      const onlyUnread = req.query.unread === 'true';
      const notifs = await NotificationService.getUserNotifications(req.user!.id, onlyUnread);
      sendSuccess(res, notifs, 200);
    } catch (err) {
      next(err);
    }
  });

  app.patch('/api/v1/notifications/:id/read', authMiddleware, async (req: Request, res: Response, next) => {
    try {
      const success = await NotificationService.markAsRead(req.params.id, req.user!.id);
      sendSuccess(res, { markedAsRead: success }, 200);
    } catch (err) {
      next(err);
    }
  });

  // Centralized Error Handler
  app.use(errorHandlerMiddleware);

  return app;
}
