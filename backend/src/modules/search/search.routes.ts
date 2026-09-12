import { Router } from 'express';
import { SearchController } from './search.controller';
import { optionalAuthMiddleware } from '../../core/middlewares/auth.middleware';
import { searchRateLimiter } from '../../core/middlewares/rate-limiter';

export const searchRouter = Router();

// Public / RBAC-aware Global Search endpoint with search rate limiting
searchRouter.get('/', optionalAuthMiddleware, searchRateLimiter, SearchController.search);

