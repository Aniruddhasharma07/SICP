import { Router } from 'express';
import { TestingController } from './testing.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { requirePermission } from '../../core/middlewares/rbac.middleware';

export const testingRouter = Router();

// Project test execution plans
testingRouter.post(
  '/projects/:id/tests',
  authMiddleware,
  requirePermission('testing:create'),
  TestingController.createExecution
);

testingRouter.get(
  '/projects/:id/tests',
  authMiddleware,
  TestingController.listForProject
);

// Individual test cases & execution
testingRouter.post(
  '/tests/:id/cases',
  authMiddleware,
  requirePermission('testing:create'),
  TestingController.addCase
);

testingRouter.patch(
  '/test-cases/:id/execute',
  authMiddleware,
  requirePermission('testing:execute'),
  TestingController.executeCase
);

testingRouter.post(
  '/test-cases/:id/retest',
  authMiddleware,
  requirePermission('testing:execute'),
  TestingController.retestCase
);

testingRouter.post(
  '/tests/:id/submit',
  authMiddleware,
  requirePermission('testing:execute'),
  TestingController.submitExecution
);
