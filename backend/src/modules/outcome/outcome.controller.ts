import { Request, Response, NextFunction } from 'express';
import { OutcomeService } from './outcome.service';
import { sendSuccess } from '../../utils/response';

export class OutcomeController {
  public static async submitCitizenFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: projectId } = req.params;
      const user = req.user!;
      const result = await OutcomeService.submitCitizenFeedback({
        projectId,
        dto: req.body,
        citizenId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-citizen-feedback',
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async submitCitizenFeedbackForChallenge(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: challengeId } = req.params;
      const user = req.user!;
      const result = await OutcomeService.submitCitizenFeedback({
        challengeId,
        dto: req.body,
        citizenId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-challenge-citizen-feedback',
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async verifyOutcome(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: projectId } = req.params;
      const user = req.user!;
      const result = await OutcomeService.verifyOutcome({
        projectId,
        dto: req.body,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-outcome-verify',
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async recordInnovation(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: projectId } = req.params;
      const user = req.user!;
      const result = await OutcomeService.recordInnovationOutcome({
        projectId,
        dto: req.body,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-innovation-create',
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getCitizenFeedback(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: projectId } = req.params;
      const result = await OutcomeService.getCitizenFeedback(projectId);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getCitizenFeedbackForChallenge(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: challengeId } = req.params;
      const result = await OutcomeService.getCitizenFeedback(challengeId);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getOutcomeVerifications(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: projectId } = req.params;
      const result = await OutcomeService.getOutcomeVerifications(projectId);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getInnovationOutcomes(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: projectId } = req.params;
      const result = await OutcomeService.getInnovationOutcomes(projectId);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}
