import { Router } from 'express';
import { PilotController } from './pilot.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { requirePermission } from '../../core/middlewares/rbac.middleware';

export const pilotRouter = Router();

// Project pilots
pilotRouter.post(
  '/projects/:id/pilots',
  authMiddleware,
  requirePermission('pilot:create'),
  PilotController.create
);

pilotRouter.get(
  '/projects/:id/pilots',
  authMiddleware,
  PilotController.listForProject
);

// Pilot metric recording & status updates
pilotRouter.post(
  '/pilots/:id/metrics',
  authMiddleware,
  requirePermission('pilot:manage'),
  PilotController.recordMetric
);

pilotRouter.patch(
  '/pilots/:id/status',
  authMiddleware,
  requirePermission('pilot:manage'),
  PilotController.updateStatus
);
