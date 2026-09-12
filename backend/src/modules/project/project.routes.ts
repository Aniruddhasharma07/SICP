import { Router } from 'express';
import { ProjectController } from './project.controller';
import { authMiddleware, optionalAuthMiddleware } from '../../core/middlewares/auth.middleware';
import { requirePermission } from '../../core/middlewares/rbac.middleware';

export const projectRouter = Router();

// Explorer and Public List
projectRouter.get('/', optionalAuthMiddleware, ProjectController.list);
projectRouter.get('/:id', optionalAuthMiddleware, ProjectController.getProject);
projectRouter.get('/:id/cockpit', optionalAuthMiddleware, ProjectController.getCockpit);

// Management routes requiring authentication
projectRouter.use(authMiddleware);

// Activation Guardrails
projectRouter.get('/:id/activation-prerequisites', requirePermission('challenge:view'), ProjectController.checkActivationPrerequisites);
projectRouter.post('/:id/activate', requirePermission('project:manage'), ProjectController.activateProject);

// Milestones
projectRouter.post('/:id/milestones', requirePermission('project:manage'), ProjectController.createMilestone);
projectRouter.patch('/milestones/:milestoneId', requirePermission('project:manage'), ProjectController.updateMilestoneStatus);

// Risks
projectRouter.post('/:id/risks', requirePermission('project:manage'), ProjectController.createRisk);
