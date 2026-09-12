import { Router } from 'express';
import { OutcomeController } from './outcome.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { requirePermission } from '../../core/middlewares/rbac.middleware';

export const outcomeRouter = Router();

// Citizen feedback endpoints (project & challenge)
outcomeRouter.post(
  '/projects/:id/citizen-feedback',
  authMiddleware,
  requirePermission('citizen:feedback'),
  OutcomeController.submitCitizenFeedback
);

outcomeRouter.get(
  '/projects/:id/citizen-feedback',
  authMiddleware,
  OutcomeController.getCitizenFeedback
);

outcomeRouter.post(
  '/challenges/:id/citizen-feedback',
  authMiddleware,
  requirePermission('citizen:feedback'),
  OutcomeController.submitCitizenFeedbackForChallenge
);

outcomeRouter.get(
  '/challenges/:id/citizen-feedback',
  authMiddleware,
  OutcomeController.getCitizenFeedbackForChallenge
);

// Official outcome verification endpoints
outcomeRouter.post(
  '/projects/:id/outcomes/verify',
  authMiddleware,
  requirePermission('outcome:verify'),
  OutcomeController.verifyOutcome
);

outcomeRouter.get(
  '/projects/:id/outcomes',
  authMiddleware,
  OutcomeController.getOutcomeVerifications
);

// Innovation outcome endpoints
outcomeRouter.post(
  '/projects/:id/innovation-outcomes',
  authMiddleware,
  requirePermission('innovation:create'),
  OutcomeController.recordInnovation
);

outcomeRouter.get(
  '/projects/:id/innovation-outcomes',
  authMiddleware,
  OutcomeController.getInnovationOutcomes
);
