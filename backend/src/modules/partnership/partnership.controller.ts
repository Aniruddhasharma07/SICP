import { Request, Response, NextFunction } from 'express';
import { PartnershipService } from './partnership.service';
import { sendSuccess } from '../../utils/response';
import { ValidationError } from '../../utils/errors';
import { PartnershipType } from '@sicp/shared';

export class PartnershipController {
  public static async proposePartnership(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.body.projectId;
      const partnerOrgId = req.body.partnerOrgId || req.user?.organizationId;
      const partnershipType = req.body.partnershipType || req.body.type;
      const fundingOffered = req.body.fundingOffered !== undefined ? req.body.fundingOffered : req.body.committedFunding;
      const equipmentOffered = req.body.equipmentOffered || req.body.scopeOfWork;

      if (!projectId || !partnerOrgId || !partnershipType) {
        throw new ValidationError('projectId, partnerOrgId (or user organization), and partnershipType are required.');
      }

      const partnership = await PartnershipService.proposePartnership({
        projectId,
        partnerOrgId,
        partnershipType: partnershipType as PartnershipType,
        fundingOffered: fundingOffered ? Number(fundingOffered) : undefined,
        equipmentOffered,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        requestId: res.locals.requestId,
        ipAddress: req.ip,
      });

      sendSuccess(res, partnership, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async respondPartnership(req: Request, res: Response, next: NextFunction) {
    try {
      const partnershipId = req.params.id;
      const { decision } = req.body;

      if (!decision || !['CONFIRMED', 'DECLINED'].includes(decision)) {
        throw new ValidationError("decision must be 'CONFIRMED' or 'DECLINED'.");
      }

      const updated = await PartnershipService.respondPartnership({
        partnershipId,
        decision,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        requestId: res.locals.requestId,
        ipAddress: req.ip,
      });

      sendSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getProjectPartnerships(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId;
      const partnerships = await PartnershipService.getProjectPartnerships(projectId);
      sendSuccess(res, partnerships, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getPartnerRecommendations(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId;
      const recommendations = await PartnershipService.getPartnerRecommendations(projectId);
      sendSuccess(res, recommendations, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async upsertPartnerProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const organizationId = req.params.orgId || req.user?.organizationId;
      if (!organizationId) {
        throw new ValidationError('organizationId is required.');
      }

      const {
        sector,
        capabilities,
        technologies,
        fundingCapacity,
        csrFocusAreas,
        supportedStages,
        geographicCoverage,
      } = req.body;

      if (!sector || !Array.isArray(capabilities) || !Array.isArray(technologies)) {
        throw new ValidationError('sector, capabilities array, and technologies array are required.');
      }

      const profile = await PartnershipService.upsertPartnerProfile({
        organizationId,
        sector,
        capabilities,
        technologies,
        fundingCapacity: fundingCapacity ? Number(fundingCapacity) : undefined,
        csrFocusAreas,
        supportedStages,
        geographicCoverage,
      });

      sendSuccess(res, profile, 200);
    } catch (err) {
      next(err);
    }
  }
}
