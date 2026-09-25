import { Router } from 'express';
import { SystemicController } from './systemic.controller';
import { authMiddleware, optionalAuthMiddleware } from '../../core/middlewares/auth.middleware';
import { requireRole } from '../../core/middlewares/rbac.middleware';
import { idempotencyMiddleware } from '../../core/middlewares/idempotency.middleware';
import { UserRole } from '@sicp/shared';

export const systemicRouter = Router();

// Public / Read queries (with optional auth for personal context)
systemicRouter.get('/demo/scenario', optionalAuthMiddleware, SystemicController.getDemoScenario);
systemicRouter.post('/demo/reset', optionalAuthMiddleware, SystemicController.resetDemoScenario);

systemicRouter.get('/', optionalAuthMiddleware, SystemicController.listIncidents);
systemicRouter.get('/:id', optionalAuthMiddleware, SystemicController.getIncident);
systemicRouter.get('/:id/graph', optionalAuthMiddleware, SystemicController.getGraph);

// Proactive Sentinel response submission (Citizens or automated probes)
systemicRouter.post('/:id/sentinel-response', optionalAuthMiddleware, SystemicController.submitSentinelResponse);

// Authoritative Government Governance actions (Protected by RBAC)
systemicRouter.post(
  '/:id/validate-hypothesis',
  authMiddleware,
  requireRole(UserRole.GOVERNMENT_OFFICER, UserRole.GOVERNMENT_DEPARTMENT, UserRole.SYSTEM_ADMIN),
  idempotencyMiddleware,
  SystemicController.validateHypothesis
);

systemicRouter.post(
  '/:id/dispatch-field-team',
  authMiddleware,
  requireRole(UserRole.GOVERNMENT_OFFICER, UserRole.GOVERNMENT_DEPARTMENT, UserRole.SYSTEM_ADMIN),
  idempotencyMiddleware,
  SystemicController.dispatchFieldTeam
);

systemicRouter.post(
  '/:id/create-project-intervention',
  authMiddleware,
  requireRole(UserRole.GOVERNMENT_OFFICER, UserRole.GOVERNMENT_DEPARTMENT, UserRole.SYSTEM_ADMIN),
  idempotencyMiddleware,
  SystemicController.createProjectIntervention
);
