import { Router } from 'express';
import { PartnershipController } from './partnership.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { requirePermission } from '../../core/middlewares/rbac.middleware';

export const partnershipRouter = Router();

partnershipRouter.use(authMiddleware);

// Partnerships
partnershipRouter.post('/', requirePermission('partnership:manage'), PartnershipController.proposePartnership);
partnershipRouter.patch('/:id/respond', requirePermission('partnership:manage'), PartnershipController.respondPartnership);
partnershipRouter.get('/project/:projectId', requirePermission('challenge:view'), PartnershipController.getProjectPartnerships);
partnershipRouter.get('/project/:projectId/recommendations', requirePermission('challenge:view'), PartnershipController.getPartnerRecommendations);

// Partner profile
partnershipRouter.post('/profile', requirePermission('org:update'), PartnershipController.upsertPartnerProfile);
partnershipRouter.put('/profile/:orgId', requirePermission('org:update'), PartnershipController.upsertPartnerProfile);
