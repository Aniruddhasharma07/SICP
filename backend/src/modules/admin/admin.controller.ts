import { Request, Response, NextFunction } from 'express';
import { AdminService } from './admin.service';
import { sendSuccess } from '../../utils/response';
import { UserRole, OrganizationType, VerificationStatus } from '@sicp/shared';
import { z } from 'zod';

const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.nativeEnum(UserRole).optional(),
});

const updateOrgStatusSchema = z.object({
  status: z.enum(['ACTIVE', 'SUSPENDED']),
  notes: z.string().optional(),
});

export class AdminController {
  public static async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const overview = await AdminService.getOverview();
      sendSuccess(res, overview, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const role = req.query.role as UserRole | undefined;
      const search = req.query.search as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const offset = req.query.offset ? Number(req.query.offset) : undefined;

      const result = await AdminService.getUsers({ role, search, limit, offset });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async updateUserStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateUserSchema.parse(req.body);
      const requestId = (res.locals.requestId as string) || 'unknown';
      const result = await AdminService.updateUserStatus(req.params.id, validated, req.user!.id, {
        requestId,
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getOrganizations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const type = req.query.type as OrganizationType | undefined;
      const verificationStatus = req.query.verificationStatus as VerificationStatus | undefined;
      const search = req.query.search as string | undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const offset = req.query.offset ? Number(req.query.offset) : undefined;

      const result = await AdminService.getOrganizations({ type, verificationStatus, search, limit, offset });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async updateOrganizationStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = updateOrgStatusSchema.parse(req.body);
      const requestId = (res.locals.requestId as string) || 'unknown';
      const result = await AdminService.updateOrganizationStatus(req.params.id, validated, req.user!.id, {
        requestId,
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}
