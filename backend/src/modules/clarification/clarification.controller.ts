import { Request, Response, NextFunction } from 'express';
import { ClarificationService } from './clarification.service';
import { sendSuccess } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';

export class ClarificationController {
  public static async requestClarification(req: Request, res: Response, next: NextFunction) {
    try {
      const challengeId = req.params.id || req.body.challengeId;
      const { groupId, problemId, targetScope = 'PROBLEM', question } = req.body;

      if (!req.user) {
        throw new UnauthorizedError('Authentication required to request clarification.');
      }

      const result = await ClarificationService.requestClarification({
        challengeId,
        groupId,
        problemId,
        targetScope,
        requestedById: req.user.id,
        requestedByRole: req.user.role,
        question,
        requestId: res.locals.requestId,
        ipAddress: req.ip,
      });

      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async respondClarification(req: Request, res: Response, next: NextFunction) {
    try {
      const requestId = req.params.id;
      const { problemId, response, evidenceFileKey } = req.body;

      if (!req.user) {
        throw new UnauthorizedError('Authentication required to submit clarification response.');
      }

      const result = await ClarificationService.respondClarification({
        requestId,
        problemId,
        citizenId: req.user.id,
        response,
        evidenceFileKey,
      });

      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getForChallenge(req: Request, res: Response, next: NextFunction) {
    try {
      const challengeId = req.params.id;
      const results = await ClarificationService.getClarificationsForChallenge(challengeId);
      sendSuccess(res, results, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getForProblem(req: Request, res: Response, next: NextFunction) {
    try {
      const problemId = req.params.id;
      const results = await ClarificationService.getClarificationsForProblem(problemId);
      sendSuccess(res, results, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getForGroup(req: Request, res: Response, next: NextFunction) {
    try {
      const groupId = req.params.id;
      const results = await ClarificationService.getClarificationsForGroup(groupId);
      sendSuccess(res, results, 200);
    } catch (err) {
      next(err);
    }
  }
}
