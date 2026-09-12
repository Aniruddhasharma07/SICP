import { Router } from 'express';
import { VoiceController } from './voice.controller';
import { optionalAuthMiddleware } from '../../core/middlewares/auth.middleware';
import { voiceRateLimiter } from '../../core/middlewares/rate-limiter';

export const voiceRouter = Router();

voiceRouter.post('/transcribe', optionalAuthMiddleware, voiceRateLimiter, VoiceController.transcribe);


