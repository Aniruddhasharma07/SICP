import { Router } from 'express';
import { OrganizationController } from './organization.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { requirePermission } from '../../core/middlewares/rbac.middleware';

export const organizationRouter = Router();

organizationRouter.get('/queue-stats', authMiddleware, requirePermission('org:verify_review'), OrganizationController.getQueueStats);
organizationRouter.get('/', OrganizationController.list);
organizationRouter.get('/:id', OrganizationController.getById);
organizationRouter.post('/', authMiddleware, requirePermission('org:create'), OrganizationController.create);
organizationRouter.post('/:id/verify/submit', authMiddleware, requirePermission('org:verify_submit'), OrganizationController.submitVerification);
organizationRouter.post('/:id/verify/review', authMiddleware, requirePermission('org:verify_review'), OrganizationController.reviewVerification);
organizationRouter.post('/:id/resubmit', authMiddleware, requirePermission('org:verify_submit'), OrganizationController.resubmit);
organizationRouter.post('/:id/rate', authMiddleware, requirePermission('challenge:review'), OrganizationController.rate);
