import { Router } from 'express';
import { GovernmentController } from './government.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { requirePermission } from '../../core/middlewares/rbac.middleware';
import { idempotencyMiddleware } from '../../core/middlewares/idempotency.middleware';

export const governmentRouter = Router();

// All government command center endpoints require authentication and review permissions
governmentRouter.use(authMiddleware);
governmentRouter.use(requirePermission('challenge:review'));

// High-level KPIs and metrics
governmentRouter.get('/overview', GovernmentController.getOverview);

// Filtered task queues (Critical/SLA, Pending, Routed, Systemic)
governmentRouter.get('/queue', GovernmentController.getQueue);

// Available officers for assignment
governmentRouter.get('/officers', GovernmentController.getOfficers);

// University recommendation & matching
governmentRouter.get('/challenges/:id/matches', GovernmentController.getUniversityMatches);
governmentRouter.post('/challenges/:id/assign-university', GovernmentController.assignUniversity);

// Industry recommendation, direct invitation & interest review
governmentRouter.get('/challenges/:id/eligible-industries', GovernmentController.getEligibleIndustries);
governmentRouter.post('/challenges/:id/assign-industry', GovernmentController.assignIndustry);
governmentRouter.get('/projects/:id/industry-interests', GovernmentController.getProjectIndustryInterests);
governmentRouter.get('/challenges/:id/industry-interests', GovernmentController.getProjectIndustryInterests);
governmentRouter.post('/industry-interests/:id/accept', GovernmentController.acceptIndustryInterest);
governmentRouter.post('/industry-interests/:id/decline', GovernmentController.declineIndustryInterest);

// Officer review assignment
governmentRouter.post('/challenges/:id/assign-officer', GovernmentController.assignOfficer);

// Government review endpoint for AI analysis & challenge governance
governmentRouter.post('/challenges/:id/review', idempotencyMiddleware, GovernmentController.reviewChallenge);

// SLA Escalation check trigger
governmentRouter.post('/sla/check-escalations', GovernmentController.checkEscalations);
