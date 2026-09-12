import { Router } from 'express';
import { FundingController } from './funding.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { requirePermission } from '../../core/middlewares/rbac.middleware';
import { idempotencyMiddleware } from '../../core/middlewares/idempotency.middleware';
import { mutationRateLimiter } from '../../core/middlewares/rate-limiter';

export const fundingRouter = Router();

fundingRouter.use(authMiddleware);

fundingRouter.post('/', requirePermission('funding:manage'), mutationRateLimiter, idempotencyMiddleware, FundingController.requestFunding);
fundingRouter.patch('/:id/review', requirePermission('funding:manage'), mutationRateLimiter, idempotencyMiddleware, FundingController.reviewFunding);
fundingRouter.get('/project/:projectId', requirePermission('challenge:view'), FundingController.getProjectFunding);

