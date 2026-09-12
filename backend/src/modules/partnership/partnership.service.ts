import { prisma } from '../../database/prisma';
import {
  PartnershipType,
  PartnershipStatus,
  UserRole,
  AuditAction,
} from '@sicp/shared';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { IndustryMatchingEngine } from '../../domain/matching/industry-matching.engine';
import { NotificationService } from '../notification/notification.service';

export interface ProposePartnershipParams {
  projectId: string;
  partnerOrgId: string;
  partnershipType: PartnershipType;
  fundingOffered?: number;
  equipmentOffered?: string;
  actorId: string;
  actorRole: UserRole;
  requestId: string;
  ipAddress?: string;
}

export interface RespondPartnershipParams {
  partnershipId: string;
  decision: 'CONFIRMED' | 'DECLINED';
  actorId: string;
  actorRole: UserRole;
  requestId: string;
  ipAddress?: string;
}

export interface UpsertPartnerProfileParams {
  organizationId: string;
  sector: string;
  capabilities: string[];
  technologies: string[];
  fundingCapacity?: number;
  csrFocusAreas?: string[];
  supportedStages?: string[];
  geographicCoverage?: string[];
}

export class PartnershipService {
  /**
   * Proposes a new industry/CSR/startup partnership for a project.
   */
  public static async proposePartnership(params: ProposePartnershipParams) {
    const { projectId, partnerOrgId, partnershipType, fundingOffered, equipmentOffered, actorId, actorRole, requestId, ipAddress } = params;

    return await prisma.$transaction(async tx => {
      const project = await tx.project.findUnique({
        where: { id: projectId },
      });

      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      const partnerOrg = await tx.organization.findUnique({
        where: { id: partnerOrgId },
      });

      if (!partnerOrg) {
        throw new NotFoundError('Organization', partnerOrgId);
      }

      const partnership = await tx.industryPartnership.create({
        data: {
          projectId,
          partnerOrgId,
          partnershipType,
          fundingOffered: fundingOffered ? (fundingOffered as any) : undefined,
          equipmentOffered,
          status: PartnershipStatus.PROPOSED,
        },
        include: { partnerOrg: true },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: AuditAction.PARTNERSHIP_PROPOSED,
          resource: 'IndustryPartnership',
          resourceId: partnership.id,
          newState: { projectId, partnerOrgId, partnershipType, status: partnership.status },
          requestId,
          ipAddress: ipAddress || null,
        },
      });

      logger.info(`Partnership proposed for project ${projectId} with partner ${partnerOrgId} (${partnershipType})`);

      return partnership;
    });
  }

  /**
   * Responds to partnership proposal (CONFIRMED or DECLINED).
   */
  public static async respondPartnership(params: RespondPartnershipParams) {
    const { partnershipId, decision, actorId, actorRole, requestId, ipAddress } = params;

    return await prisma.$transaction(async tx => {
      const partnership = await tx.industryPartnership.findUnique({
        where: { id: partnershipId },
        include: { project: true, partnerOrg: true },
      });

      if (!partnership) {
        throw new NotFoundError('IndustryPartnership', partnershipId);
      }

      const status = decision === 'CONFIRMED' ? PartnershipStatus.CONFIRMED : PartnershipStatus.DECLINED;

      const updated = await tx.industryPartnership.update({
        where: { id: partnershipId },
        data: { status },
        include: { partnerOrg: true },
      });

      // Specific Industry Workflow Audit logs
      const specificAction = decision === 'CONFIRMED'
        ? AuditAction.INDUSTRY_INTEREST_ACCEPTED
        : AuditAction.INDUSTRY_INTEREST_DECLINED;

      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: specificAction,
          resource: 'IndustryPartnership',
          resourceId: partnershipId,
          previousState: { status: partnership.status },
          newState: { status },
          reason: `Partnership proposal ${decision.toLowerCase()} by project governance`,
          requestId,
          ipAddress: ipAddress || null,
        },
      });

      if (decision === 'CONFIRMED') {
        await tx.auditLog.create({
          data: {
            actorId,
            actorRole,
            action: AuditAction.INDUSTRY_COLLABORATION_STARTED,
            resource: 'Project',
            resourceId: partnership.projectId,
            newState: { partnerOrgId: partnership.partnerOrgId, partnershipId },
            reason: `Active industry collaboration established with ${partnership.partnerOrg.name}`,
            requestId,
            ipAddress: ipAddress || null,
          },
        });
      }

      // Notify Industry Organization Users
      const industryUsers = await tx.user.findMany({
        where: { organizationId: partnership.partnerOrgId, isActive: true },
        take: 5,
      });

      for (const u of industryUsers) {
        if (decision === 'CONFIRMED') {
          await NotificationService.create({
            recipientId: u.id,
            title: 'Collaboration Accepted',
            message: `Your industry has been accepted for collaboration on Project '${partnership.project.title}'.`,
            type: 'PARTNERSHIP',
            actionUrl: `/industry?tab=COLLABORATION`,
            metadata: { projectId: partnership.projectId, partnershipId },
          });
        } else {
          await NotificationService.create({
            recipientId: u.id,
            title: 'Interest Declined',
            message: `Your interest in Project '${partnership.project.title}' was not accepted.`,
            type: 'PARTNERSHIP',
            actionUrl: `/industry?tab=MY_INTERESTS`,
            metadata: { projectId: partnership.projectId, partnershipId },
          });
        }
      }

      logger.info(`Partnership ${partnershipId} updated to ${status} by ${actorId}`);

      return updated;
    });
  }

  /**
   * Retrieves all partnerships for a project.
   */
  public static async getProjectPartnerships(projectId: string) {
    return await prisma.industryPartnership.findMany({
      where: { projectId },
      include: { partnerOrg: { include: { industryProfile: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Scores and matches potential industry partners for a project.
   */
  public static async getPartnerRecommendations(projectId: string) {
    return await IndustryMatchingEngine.matchPartnersForProject(projectId);
  }

  /**
   * Upserts partner profile for an organization.
   */
  public static async upsertPartnerProfile(params: UpsertPartnerProfileParams) {
    const {
      organizationId,
      sector,
      capabilities,
      technologies,
      fundingCapacity,
      csrFocusAreas = [],
      supportedStages = [],
      geographicCoverage = [],
    } = params;

    const org = await prisma.organization.findUnique({ where: { id: organizationId } });
    if (!org) {
      throw new NotFoundError('Organization', organizationId);
    }

    return await prisma.industryPartnerProfile.upsert({
      where: { organizationId },
      create: {
        organizationId,
        sector,
        capabilities,
        technologies,
        fundingCapacity: fundingCapacity ? (fundingCapacity as any) : undefined,
        csrFocusAreas,
        supportedStages,
        geographicCoverage,
      },
      update: {
        sector,
        capabilities,
        technologies,
        fundingCapacity: fundingCapacity ? (fundingCapacity as any) : undefined,
        csrFocusAreas,
        supportedStages,
        geographicCoverage,
      },
    });
  }
}
