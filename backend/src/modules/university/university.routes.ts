import { Router } from 'express';
import { UniversityController } from './university.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { requirePermission } from '../../core/middlewares/rbac.middleware';

export const universityRouter = Router();

// Public: list verified registered universities for institutional switching / discovery
universityRouter.get('/registered', UniversityController.getRegisteredUniversities);
// Public: self-registration for student or faculty under an existing university (status: PENDING)
universityRouter.post('/register', UniversityController.registerMember);

universityRouter.use(authMiddleware);

// University assignments and routing workflow
universityRouter.get('/challenges', requirePermission('challenge:view'), UniversityController.getAssignedChallenges);
universityRouter.post('/challenges/:id/accept', requirePermission('university:manage'), UniversityController.acceptAssignment);
universityRouter.post('/challenges/:id/decline', requirePermission('university:manage'), UniversityController.declineAssignment);
universityRouter.post('/challenges/:id/interest', requirePermission('challenge:view'), UniversityController.expressInterest);

// Faculty matching intelligence
universityRouter.get('/challenges/:id/faculty-matches', requirePermission('challenge:view'), UniversityController.getFacultyMatches);

// Member Registration Review Queue (University Admin)
universityRouter.get('/registrations', requirePermission('university:manage'), UniversityController.getPendingRegistrations);
universityRouter.post('/registrations/:userId/review', requirePermission('university:manage'), UniversityController.reviewRegistration);

// Direct Member Addition (University Admin)
universityRouter.post('/users', requirePermission('university:manage'), UniversityController.addUserDirectly);

// Active Student & Faculty Directories
universityRouter.get('/students', UniversityController.getStudents);
universityRouter.get('/faculty', UniversityController.getFaculty);

// Authenticated User Profile & Workspace
universityRouter.get('/my-profile', UniversityController.getMyProfile);

// Faculty profile management
universityRouter.post('/faculty/profile', requirePermission('org:view'), UniversityController.upsertFacultyProfile);
universityRouter.put('/faculty/profile/:userId', requirePermission('org:view'), UniversityController.upsertFacultyProfile);

// Student profile management
universityRouter.post('/student/profile', UniversityController.upsertStudentProfile);
universityRouter.put('/student/profile/:userId', UniversityController.upsertStudentProfile);
