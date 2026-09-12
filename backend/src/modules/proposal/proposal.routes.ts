import { Router } from 'express';
import { ProposalController } from './proposal.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { requirePermission } from '../../core/middlewares/rbac.middleware';
import { idempotencyMiddleware } from '../../core/middlewares/idempotency.middleware';
import { mutationRateLimiter } from '../../core/middlewares/rate-limiter';

export const proposalRouter = Router();

proposalRouter.use(authMiddleware);

proposalRouter.post('/', requirePermission('proposal:create'), mutationRateLimiter, idempotencyMiddleware, ProposalController.createProposal);
proposalRouter.get('/:id', requirePermission('challenge:view'), ProposalController.getProposal);
proposalRouter.post('/:id/submit', requirePermission('proposal:submit'), mutationRateLimiter, idempotencyMiddleware, ProposalController.submitProposal);
proposalRouter.post('/:id/review', requirePermission('proposal:review'), mutationRateLimiter, idempotencyMiddleware, ProposalController.reviewProposal);

