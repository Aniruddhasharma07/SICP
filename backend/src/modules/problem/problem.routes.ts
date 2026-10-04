import { Router } from 'express';
import { ProblemController } from './problem.controller';
import { optionalAuthMiddleware, authMiddleware } from '../../core/middlewares/auth.middleware';
import { idempotencyMiddleware } from '../../core/middlewares/idempotency.middleware';
import { mutationRateLimiter } from '../../core/middlewares/rate-limiter';

export const problemRouter = Router();

// Core Problem endpoints
problemRouter.post('/', optionalAuthMiddleware, mutationRateLimiter, idempotencyMiddleware, ProblemController.create);
problemRouter.get('/', optionalAuthMiddleware, ProblemController.list);
problemRouter.get('/:id', optionalAuthMiddleware, ProblemController.getById);

// Governed Swipe Semantics & Regrouping
problemRouter.post('/:id/remove-from-group', optionalAuthMiddleware, idempotencyMiddleware, ProblemController.removeFromGroup);
problemRouter.post('/groups/:id/detach-from-challenge', optionalAuthMiddleware, idempotencyMiddleware, ProblemController.detachGroupFromChallenge);

// Government Override
problemRouter.post('/:id/override', optionalAuthMiddleware, idempotencyMiddleware, ProblemController.override);

// Systemic Investigation & Validation
problemRouter.get('/challenges/:id/investigation', optionalAuthMiddleware, ProblemController.getInvestigation);
problemRouter.post('/challenges/:id/validate-investigation', optionalAuthMiddleware, idempotencyMiddleware, ProblemController.validateInvestigation);

// Two-Level Solution Memory
problemRouter.get('/challenges/:id/solution-memory', optionalAuthMiddleware, ProblemController.getSolutionMemory);
problemRouter.post('/groups/:id/solution-memory', optionalAuthMiddleware, idempotencyMiddleware, ProblemController.addGroupSolutionMemory);
