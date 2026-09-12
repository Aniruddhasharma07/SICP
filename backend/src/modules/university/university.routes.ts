import { Router } from 'express';
import { UniversityController } from './university.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { requirePermission } from '../../core/middlewares/rbac.middleware';

export const universityRouter = Router();

// Public: list verified registered universities for institutional switching / discovery
universityRouter.get('/registered', UniversityController.getRegisteredUniversities);

universityRouter.use(authMiddleware);

// University assignments and routing workflow
universityRouter.get('/challenges', requirePermission('challenge:view'), UniversityController.getAssignedChallenges);
universityRouter.post('/challenges/:id/accept', requirePermission('university:manage'), UniversityController.acceptAssignment);
universityRouter.post('/challenges/:id/decline', requirePermission('university:manage'), UniversityController.declineAssignment);
universityRouter.post('/challenges/:id/interest', requirePermission('challenge:view'), UniversityController.expressInterest);

// Faculty matching intelligence
universityRouter.get('/challenges/:id/faculty-matches', requirePermission('challenge:view'), UniversityController.getFacultyMatches);

// Faculty profile management
universityRouter.post('/faculty/profile', requirePermission('org:view'), UniversityController.upsertFacultyProfile);
universityRouter.put('/faculty/profile/:userId', requirePermission('org:view'), UniversityController.upsertFacultyProfile);
