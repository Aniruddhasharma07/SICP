import { Request, Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { StandardErrorCode } from '@sicp/shared';
import { logger } from '../../utils/logger';
import { AiServiceClient } from '../../domain/intelligence/ai-service.client';
import { AiUnavailableError } from '../../utils/errors';

export class VoiceController {
  public static async transcribe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { audioData, languagePreference, mimeType } = req.body;
      const requestId = (res.locals.requestId as string) || 'unknown';

      if (!audioData || typeof audioData !== 'string') {
        sendError(res, 400, {
          code: StandardErrorCode.VALIDATION_ERROR,
          message: 'audioData base64 string is required for transcription.',
          requestId,
        });
        return;
      }

      try {
        const data = await AiServiceClient.transcribeVoice(
          audioData,
          languagePreference || 'en-IN',
          mimeType || 'audio/webm',
          requestId
        );
        sendSuccess(res, data, 200);
      } catch (err: unknown) {
        if (err instanceof AiUnavailableError) {
          sendError(res, 503, {
            code: StandardErrorCode.DEPENDENCY_UNAVAILABLE,
            message: err.message,
            requestId,
          });
          return;
        }
        logger.warn(`AI Service Voice endpoint failed: ${(err as Error).message}`, { requestId });
        sendError(res, 500, {
          code: StandardErrorCode.INTERNAL_ERROR,
          message: 'Failed to transcribe audio.',
          requestId,
        });
      }
    } catch (err) {
      next(err);
    }
  }
}
