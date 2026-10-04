import { Router } from 'express';
import { ChallengeController } from './challenge.controller';
import { VoteController } from '../vote/vote.controller';
import { authMiddleware, optionalAuthMiddleware } from '../../core/middlewares/auth.middleware';
import { requirePermission } from '../../core/middlewares/rbac.middleware';
import { idempotencyMiddleware } from '../../core/middlewares/idempotency.middleware';
import { aiRateLimiter, mutationRateLimiter } from '../../core/middlewares/rate-limiter';

export const challengeRouter = Router();

challengeRouter.get('/', optionalAuthMiddleware, ChallengeController.list);
challengeRouter.post('/validate-intent', optionalAuthMiddleware, aiRateLimiter, ChallengeController.validateIntent);
challengeRouter.post('/analyze', optionalAuthMiddleware, aiRateLimiter, ChallengeController.analyzePreSubmit);
challengeRouter.post('/check-duplicates', aiRateLimiter, ChallengeController.checkDuplicatesPreSubmit);
challengeRouter.post(
  '/merge-systemic',
  authMiddleware,
  requirePermission('challenge:review'),
  idempotencyMiddleware,
  ChallengeController.mergeSystemic
);
challengeRouter.get('/:id', ChallengeController.getById);
challengeRouter.get('/:id/analysis', optionalAuthMiddleware, ChallengeController.getAnalysis);
challengeRouter.post('/:id/analyze', authMiddleware, aiRateLimiter, ChallengeController.triggerAnalysis);
challengeRouter.post('/:id/evidence/analyze', authMiddleware, aiRateLimiter, ChallengeController.analyzeEvidence);
challengeRouter.get('/:id/duplicates', ChallengeController.getChallengeDuplicates);
challengeRouter.post('/', optionalAuthMiddleware, mutationRateLimiter, idempotencyMiddleware, ChallengeController.create);
challengeRouter.post('/:id/transition', authMiddleware, idempotencyMiddleware, ChallengeController.transition);
challengeRouter.post('/:challengeId/vote', authMiddleware, idempotencyMiddleware, VoteController.toggle);
challengeRouter.get('/:challengeId/vote', optionalAuthMiddleware, VoteController.getStatus);

// Problem-Type-Aware Impact Intelligence endpoints
challengeRouter.patch('/:id/impact/verify', authMiddleware, requirePermission('challenge:review'), ChallengeController.verifyImpact);
challengeRouter.get('/:id/adaptive-questions', ChallengeController.getAdaptiveQuestions);
challengeRouter.post('/:id/adaptive-answers', authMiddleware, idempotencyMiddleware, ChallengeController.answerAdaptiveQuestions);

// Unified 5-Level Progressive Disclosure Intelligence Endpoints
challengeRouter.get('/:id/intelligence', optionalAuthMiddleware, ChallengeController.getIntelligence);
challengeRouter.get('/:id/relationships', optionalAuthMiddleware, ChallengeController.getRelationships);
challengeRouter.get('/:id/evidence', optionalAuthMiddleware, ChallengeController.getEvidence);
challengeRouter.get('/:id/memory', optionalAuthMiddleware, ChallengeController.getMemory);
challengeRouter.post(
  '/:id/validate',
  authMiddleware,
  requirePermission('challenge:review'),
  idempotencyMiddleware,
  ChallengeController.validateInvestigation
);
challengeRouter.post('/:id/override', optionalAuthMiddleware, idempotencyMiddleware, ChallengeController.override);


