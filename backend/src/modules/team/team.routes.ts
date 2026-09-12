import { Router } from 'express';
import { TeamController } from './team.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { requirePermission } from '../../core/middlewares/rbac.middleware';

export const teamRouter = Router();

teamRouter.use(authMiddleware);

teamRouter.post('/', requirePermission('team:create'), TeamController.createTeam);
teamRouter.get('/:id', requirePermission('challenge:view'), TeamController.getTeam);
teamRouter.get('/:id/health', requirePermission('challenge:view'), TeamController.getTeamHealth);
teamRouter.post('/:id/invite', requirePermission('team:manage'), TeamController.inviteMember);
teamRouter.post('/:id/respond', TeamController.respondInvitation);
