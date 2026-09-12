import { Request, Response, NextFunction } from 'express';
import { ChallengeService } from './challenge.service';
import {
  createChallengeSchema,
  transitionChallengeSchema,
  checkDuplicatesSchema,
  mergeSystemicSchema,
  analyzeChallengeSchema,
  validateIntentSchema,
} from './challenge.schemas';
import { sendSuccess } from '../../utils/response';
import { ChallengeStatus, ProblemType } from '@sicp/shared';
import { ImpactService } from '../../domain/impact/impact.service';
import { ImpactModelRegistry } from '../../domain/impact/impact-model.registry';
import { prisma } from '../../database/prisma';
import { NotFoundError } from '../../utils/errors';

export class ChallengeController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createChallengeSchema.parse(req.body);
      const requestId = (res.locals.requestId as string) || 'unknown';
      const result = await ChallengeService.create(validated, req.user!.id, req.user!.organizationId, {
        requestId,
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ChallengeService.getById(req.params.id);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const status = req.query.status as ChallengeStatus | undefined;
      const category = req.query.category as string | undefined;
      const district = req.query.district as string | undefined;
      const state = req.query.state as string | undefined;
      const submitterId = (req.query.my === 'true' && req.user?.id)
        ? req.user.id
        : (req.query.submitterId as string | undefined);
      const isSystemic = req.query.isSystemic === 'true' ? true : req.query.isSystemic === 'false' ? false : undefined;
      const limit = Number(req.query.limit) || 20;
      const offset = Number(req.query.offset) || 0;

      const result = await ChallengeService.list({
        status,
        category,
        district,
        state,
        submitterId,
        isSystemic,
        limit,
        offset,
      });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async transition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = transitionChallengeSchema.parse(req.body);
      const requestId = (res.locals.requestId as string) || 'unknown';
      const result = await ChallengeService.transition(
        req.params.id,
        validated,
        req.user!.id,
        req.user!.role,
        {
          requestId,
          ipAddress: req.ip,
        }
      );
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async checkDuplicatesPreSubmit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = checkDuplicatesSchema.parse(req.body);
      const result = await ChallengeService.checkDuplicatesPreSubmit(validated);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getChallengeDuplicates(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ChallengeService.getChallengeDuplicates(req.params.id);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async mergeSystemic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = mergeSystemicSchema.parse(req.body);
      const requestId = (res.locals.requestId as string) || 'unknown';
      const result = await ChallengeService.mergeSystemic(
        validated,
        req.user!.id,
        req.user!.role,
        {
          requestId,
          ipAddress: req.ip,
        }
      );
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async verifyImpact(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challengeId = req.params.id;
      const { action, verifiedValue, verificationNotes } = req.body;
      const requestId = (res.locals.requestId as string) || (req.headers['x-request-id'] as string) || 'req-impact-verify';

      const result = await ImpactService.verifyOrModifyImpact({
        challengeId,
        action: action || 'VERIFY',
        verifiedValue: verifiedValue !== undefined ? Number(verifiedValue) : undefined,
        verificationNotes,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        requestId,
        ipAddress: req.ip,
      });

      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getAdaptiveQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challengeId = req.params.id;
      const challenge = await prisma.challenge.findUnique({
        where: { id: challengeId },
        include: { impact: true },
      });

      if (!challenge) {
        throw new NotFoundError('Challenge', challengeId);
      }

      const problemType = (challenge.impact?.problemType as ProblemType) || ImpactModelRegistry.detectProblemType(challenge.category, challenge.title, challenge.description);
      const questions = ImpactModelRegistry.getAdaptiveQuestions(problemType);

      sendSuccess(res, { problemType, questions, currentInputs: challenge.impact?.inputs || {} }, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async answerAdaptiveQuestions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challengeId = req.params.id;
      const answers = req.body.answers || req.body;

      const result = await ImpactService.answerAdaptiveQuestions({
        challengeId,
        answers,
        actorId: req.user!.id,
      });

      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async validateIntent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = validateIntentSchema.parse(req.body);
      const requestId = (res.locals.requestId as string) || 'req-intent-val';
      const result = await ChallengeService.validateIntent(validated, { requestId });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async analyzePreSubmit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = analyzeChallengeSchema.parse(req.body);
      const requestId = (res.locals.requestId as string) || 'req-ai-analyze';
      const result = await ChallengeService.analyzeProblemStatement(validated, { requestId });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ChallengeService.getChallengeAnalysis(req.params.id);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async triggerAnalysis(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = (res.locals.requestId as string) || 'req-ai-trigger';
      const result = await ChallengeService.triggerChallengeAnalysis(req.params.id, { requestId });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async analyzeEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const requestId = (res.locals.requestId as string) || 'req-evidence-ai';
      const result = await ChallengeService.analyzeEvidence(req.params.id, req.body, { requestId });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}

