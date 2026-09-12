import { Router } from 'express';
import { AnalyticsController } from './analytics.controller';

export const analyticsRouter = Router();

// Public platform analytics endpoint for dashboards and transparency
analyticsRouter.get('/', AnalyticsController.getPlatformAnalytics);
