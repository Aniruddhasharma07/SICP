import { Router } from 'express';
import { RelationshipController } from './relationship.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { requireRole } from '../../core/middlewares/rbac.middleware';
import { idempotencyMiddleware } from '../../core/middlewares/idempotency.middleware';
import { UserRole } from '@sicp/shared';

export const relationshipRouter = Router();

// Challenge-centric relationship lookups
relationshipRouter.get(
  '/challenges/:id/relationships',
  authMiddleware,
  RelationshipController.getChallengeRelationships
);

relationshipRouter.get(
  '/challenges/:id/duplicates',
  authMiddleware,
  RelationshipController.getDuplicates
);

relationshipRouter.get(
  '/challenges/:id/systemic-candidates',
  authMiddleware,
  RelationshipController.getSystemicCandidates
);

// Cluster analytics & retrieval
relationshipRouter.get(
  '/clusters/analytics',
  authMiddleware,
  RelationshipController.getAnalytics
);

relationshipRouter.get(
  '/clusters/:id',
  authMiddleware,
  RelationshipController.getCluster
);

// Authoritative human governance operations
relationshipRouter.post(
  '/relationships/review',
  authMiddleware,
  requireRole(UserRole.GOVERNMENT_OFFICER, UserRole.GOVERNMENT_DEPARTMENT, UserRole.SYSTEM_ADMIN),
  idempotencyMiddleware,
  RelationshipController.reviewRelationship
);

relationshipRouter.post(
  '/clusters/merge',
  authMiddleware,
  requireRole(UserRole.GOVERNMENT_OFFICER, UserRole.GOVERNMENT_DEPARTMENT, UserRole.SYSTEM_ADMIN),
  idempotencyMiddleware,
  RelationshipController.merge
);

relationshipRouter.post(
  '/clusters/:id/unmerge',
  authMiddleware,
  requireRole(UserRole.GOVERNMENT_OFFICER, UserRole.GOVERNMENT_DEPARTMENT, UserRole.SYSTEM_ADMIN),
  idempotencyMiddleware,
  RelationshipController.unmerge
);
