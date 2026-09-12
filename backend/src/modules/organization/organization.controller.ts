import { Request, Response, NextFunction } from 'express';
import { OrganizationService } from './organization.service';
import {
  createOrgSchema,
  submitVerificationSchema,
  reviewVerificationSchema,
  rateOrganizationSchema,
  resubmitVerificationSchema,
} from './organization.schemas';
import { sendSuccess } from '../../utils/response';

export class OrganizationController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = createOrgSchema.parse(req.body);
      const requestId = (res.locals.requestId as string) || 'unknown';
      const result = await OrganizationService.create(validated, req.user!.id, {
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
      const result = await OrganizationService.getById(req.params.id);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = Number(req.query.limit) || 50;
      const offset = Number(req.query.offset) || 0;
      const type = req.query.type as string | undefined;
      const verificationStatus = req.query.verificationStatus as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await OrganizationService.list({
        type,
        verificationStatus,
        search,
        limit,
        offset,
      });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getQueueStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await OrganizationService.getVerificationQueueStats();
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async submitVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = submitVerificationSchema.parse(req.body);
      const requestId = (res.locals.requestId as string) || 'unknown';
      const result = await OrganizationService.submitVerification(req.params.id, validated, req.user!.id, {
        requestId,
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async reviewVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = reviewVerificationSchema.parse(req.body);
      const requestId = (res.locals.requestId as string) || 'unknown';
      const result = await OrganizationService.reviewVerification(req.params.id, validated, req.user!.id, {
        requestId,
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async resubmit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = resubmitVerificationSchema.parse(req.body);
      const requestId = (res.locals.requestId as string) || 'unknown';
      const result = await OrganizationService.resubmitVerification(req.params.id, validated, req.user!.id, {
        requestId,
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async rate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = rateOrganizationSchema.parse(req.body);
      const requestId = (res.locals.requestId as string) || 'unknown';
      const result = await OrganizationService.rateOrganization(req.params.id, validated, req.user!.id, {
        requestId,
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}
