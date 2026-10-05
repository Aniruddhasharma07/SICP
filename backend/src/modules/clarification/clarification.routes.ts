import { Router } from 'express';
import { ClarificationController } from './clarification.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { idempotencyMiddleware } from '../../core/middlewares/idempotency.middleware';
import { mutationRateLimiter } from '../../core/middlewares/rate-limiter';

export const clarificationRouter = Router();

clarificationRouter.use(authMiddleware);

// Government officer requests clarification
clarificationRouter.post('/', mutationRateLimiter, idempotencyMiddleware, ClarificationController.requestClarification);

// Citizen responds to clarification request
clarificationRouter.post('/:id/respond', mutationRateLimiter, idempotencyMiddleware, ClarificationController.respondClarification);

// Fetch clarification records by scope
clarificationRouter.get('/challenge/:id', ClarificationController.getForChallenge);
clarificationRouter.get('/problem/:id', ClarificationController.getForProblem);
clarificationRouter.get('/group/:id', ClarificationController.getForGroup);
