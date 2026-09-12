import { Router } from 'express';
import { DeploymentController } from './deployment.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { requirePermission } from '../../core/middlewares/rbac.middleware';

export const deploymentRouter = Router();

// Readiness gate evaluation
deploymentRouter.get(
  '/projects/:id/deployment-readiness',
  authMiddleware,
  DeploymentController.evaluateReadiness
);

// Project deployments
deploymentRouter.post(
  '/projects/:id/deployments',
  authMiddleware,
  requirePermission('deployment:create'),
  DeploymentController.create
);

deploymentRouter.get(
  '/projects/:id/deployments',
  authMiddleware,
  DeploymentController.listForProject
);

// Update deployment status / rollback / failure
deploymentRouter.patch(
  '/deployments/:id/status',
  authMiddleware,
  requirePermission('deployment:approve'),
  DeploymentController.updateStatus
);
