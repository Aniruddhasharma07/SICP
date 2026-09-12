import { Router } from 'express';
import { IndustryController } from './industry.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';

export const industryRouter = Router();

// 1. Discovery of verified industry partners for institutional switcher
industryRouter.get('/registered', IndustryController.getRegisteredIndustries);

// 2. Protected Industry workflow routes
industryRouter.use(authMiddleware);

industryRouter.get('/opportunities', IndustryController.getOpportunities);
industryRouter.post('/opportunities/:id/interest', IndustryController.expressInterest);
industryRouter.post('/interest', IndustryController.expressInterest);
industryRouter.get('/my-interests', IndustryController.getMyInterests);
industryRouter.get('/collaborations', IndustryController.getActiveCollaborations);
industryRouter.post('/collaborations/:id/support', IndustryController.provideSupport);
