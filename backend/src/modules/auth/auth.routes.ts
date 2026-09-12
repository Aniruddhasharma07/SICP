import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../core/middlewares/auth.middleware';
import { authRateLimiter } from '../../core/middlewares/rate-limiter';

export const authRouter = Router();

authRouter.post('/register', authRateLimiter, AuthController.register);
authRouter.post('/login', authRateLimiter, AuthController.login);
authRouter.post('/refresh', AuthController.refresh);
authRouter.post('/logout', AuthController.logout);
authRouter.post('/demo-switch', AuthController.demoSwitch);
authRouter.get('/me', authMiddleware, AuthController.me);
