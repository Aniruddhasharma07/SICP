import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { requireRole } from '../../core/middlewares/rbac.middleware';
import { UserRole } from '@sicp/shared';

export const adminRouter = Router();

// Server-level protection: Enforce SYSTEM_ADMIN role on ALL admin endpoints
adminRouter.use(authMiddleware, requireRole(UserRole.SYSTEM_ADMIN));

adminRouter.get('/overview', AdminController.getOverview);
adminRouter.get('/users', AdminController.getUsers);
adminRouter.patch('/users/:id/status', AdminController.updateUserStatus);
adminRouter.get('/organizations', AdminController.getOrganizations);
adminRouter.patch('/organizations/:id/status', AdminController.updateOrganizationStatus);
