import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { requirePermission } from '../../core/middlewares/rbac.middleware';

export const reportsRouter = Router();

// Protected reports export endpoint
reportsRouter.get('/export', authMiddleware, requirePermission('reports:export'), ReportsController.exportCsv);
