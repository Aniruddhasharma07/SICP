import { Request, Response, NextFunction } from 'express';
import { IndustryService } from './industry.service';
import { sendSuccess } from '../../utils/response';
import { ValidationError, ForbiddenError } from '../../utils/errors';
import { PartnershipType, UserRole } from '@sicp/shared';

const INDUSTRY_ALLOWED_ROLES: UserRole[] = [
  UserRole.INDUSTRY_PARTNER,
  UserRole.STARTUP,
  UserRole.MSME,
  UserRole.CSR_ORGANIZATION,
  UserRole.SYSTEM_ADMIN,
];

function ensureIndustryOrg(req: Request): string {
  if (!req.user) {
    throw new ForbiddenError('Authentication required');
  }

  if (!INDUSTRY_ALLOWED_ROLES.includes(req.user.role as unknown as UserRole)) {
    throw new ForbiddenError('Access restricted to Industry, MSME, Startup, and CSR partners');
  }

  if (!req.user.organizationId) {
    throw new ValidationError('Industry user must be associated with an active organization');
  }

  return req.user.organizationId;
}

export class IndustryController {
  /**
   * Public discovery of registered verified industries for institutional switcher
   */
  public static async getRegisteredIndustries(req: Request, res: Response, next: NextFunction) {
    try {
      const industries = await IndustryService.getRegisteredIndustries();
      sendSuccess(res, industries, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Opportunities open for the authenticated industry
   */
  public static async getOpportunities(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = ensureIndustryOrg(req);
      const opportunities = await IndustryService.getOpportunities(orgId);
      sendSuccess(res, opportunities, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Express interest in a challenge or project opportunity
   */
  public static async expressInterest(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = ensureIndustryOrg(req);
      const challengeIdOrProjectId = req.params.id || req.body.challengeId || req.body.projectId;

      if (!challengeIdOrProjectId) {
        throw new ValidationError('Opportunity ID (challengeId or projectId) is required');
      }

      const partnershipType = (req.body.partnershipType || req.body.type || PartnershipType.TECHNICAL_SUPPORT) as PartnershipType;
      const fundingOffered = req.body.fundingOffered !== undefined && req.body.fundingOffered !== null ? Number(req.body.fundingOffered) : undefined;
      const message = req.body.message || req.body.notes || req.body.equipmentOffered || undefined;

      const partnership = await IndustryService.expressInterest({
        challengeIdOrProjectId,
        industryOrgId: orgId,
        partnershipType,
        fundingOffered,
        message,
        actorId: req.user!.id,
        actorRole: req.user!.role as unknown as UserRole,
        requestId: res.locals.requestId || 'req-industry-interest',
        ipAddress: req.ip,
      });

      sendSuccess(res, partnership, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieve all expressed interests for the authenticated industry
   */
  public static async getMyInterests(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = ensureIndustryOrg(req);
      const interests = await IndustryService.getMyInterests(orgId);
      sendSuccess(res, interests, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieve active collaborations for the authenticated industry
   */
  public static async getActiveCollaborations(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = ensureIndustryOrg(req);
      const collaborations = await IndustryService.getActiveCollaborations(orgId);
      sendSuccess(res, collaborations, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Provide or update support on an active collaboration
   */
  public static async provideSupport(req: Request, res: Response, next: NextFunction) {
    try {
      const orgId = ensureIndustryOrg(req);
      const partnershipId = req.params.id;

      if (!partnershipId) {
        throw new ValidationError('Collaboration partnership ID is required');
      }

      const fundingOffered = req.body.fundingOffered !== undefined ? Number(req.body.fundingOffered) : undefined;
      const equipmentOffered = req.body.equipmentOffered || req.body.message || req.body.supportDetails || undefined;

      const updated = await IndustryService.provideSupport({
        partnershipId,
        industryOrgId: orgId,
        fundingOffered,
        equipmentOffered,
        actorId: req.user!.id,
        actorRole: req.user!.role as unknown as UserRole,
        requestId: res.locals.requestId || 'req-industry-support',
        ipAddress: req.ip,
      });

      sendSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }
}
