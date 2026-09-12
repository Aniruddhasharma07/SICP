import { Router } from 'express';
import { SolutionController } from './solution.controller';
import { authMiddleware, optionalAuthMiddleware } from '../../core/middlewares/auth.middleware';
import { requirePermission } from '../../core/middlewares/rbac.middleware';

export const solutionRouter = Router();
export const knowledgeRouter = Router();

// ==========================================
// SOLUTION REPOSITORY ROUTES
// ==========================================

// Draft memory from completed project
solutionRouter.post(
  '/draft-from-project/:projectId',
  authMiddleware,
  requirePermission('solution:create'),
  SolutionController.generateDraftFromProject
);

// Create manual solution memory
solutionRouter.post(
  '/',
  authMiddleware,
  requirePermission('solution:create'),
  SolutionController.createSolutionMemory
);

// Update solution memory
solutionRouter.put(
  '/:id',
  authMiddleware,
  requirePermission('solution:edit'),
  SolutionController.updateSolutionMemory
);

// Review solution memory (publish, request review, etc.)
solutionRouter.post(
  '/:id/review',
  authMiddleware,
  requirePermission('solution:review'),
  SolutionController.reviewSolutionMemory
);

// Side-by-side comparison
solutionRouter.post(
  '/compare',
  optionalAuthMiddleware,
  SolutionController.compareSolutions
);

// Historical match recommendations for challenge
solutionRouter.get(
  '/historical/challenge/:challengeId',
  optionalAuthMiddleware,
  SolutionController.getChallengeHistoricalSolutions
);

// Search and list solutions
solutionRouter.get(
  '/',
  optionalAuthMiddleware,
  SolutionController.searchSolutions
);

// Get single solution memory
solutionRouter.get(
  '/:id',
  optionalAuthMiddleware,
  SolutionController.getSolutionMemory
);

// ==========================================
// KNOWLEDGE & INSTITUTIONAL LEARNING ROUTES
// ==========================================

// Platform-wide knowledge analytics
knowledgeRouter.get(
  '/analytics',
  optionalAuthMiddleware,
  SolutionController.getKnowledgeAnalytics
);

// University/Institution specific learning profile
knowledgeRouter.get(
  '/institutional/:organizationId',
  optionalAuthMiddleware,
  SolutionController.getInstitutionalLearning
);

// Natural Language Anti-Hallucinating Knowledge Assistant
knowledgeRouter.post(
  '/assistant',
  optionalAuthMiddleware,
  SolutionController.askKnowledgeAssistant
);
