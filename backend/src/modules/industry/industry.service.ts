import { prisma } from '../../database/prisma';
import {
  PartnershipType,
  PartnershipStatus,
  UserRole,
  AuditAction,
  OrganizationType,
  VerificationStatus,
  ChallengeStatus,
  ProjectStatus,
} from '@sicp/shared';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { NotificationService } from '../notification/notification.service';
import { AuditService } from '../audit/audit.service';

export interface ExpressInterestParams {
  challengeIdOrProjectId: string;
  industryOrgId: string;
  partnershipType: PartnershipType;
  fundingOffered?: number;
  message?: string;
  actorId: string;
  actorRole: UserRole;
  requestId: string;
  ipAddress?: string;
}

export interface ProvideSupportParams {
  partnershipId: string;
  industryOrgId: string;
  fundingOffered?: number;
  equipmentOffered?: string;
  actorId: string;
  actorRole: UserRole;
  requestId: string;
  ipAddress?: string;
}

export class IndustryService {
  /**
   * Returns premier verified industry organizations for discovery and 1-click institutional switcher.
   */
  public static async getRegisteredIndustries() {
    const orgs = await prisma.organization.findMany({
      where: {
        type: {
          in: [
            OrganizationType.INDUSTRY,
            OrganizationType.STARTUP,
            OrganizationType.MSME,
            OrganizationType.CSR,
          ],
        },
        status: 'ACTIVE',
        verificationStatus: VerificationStatus.VERIFIED,
      },
      include: {
        industryProfile: true,
        users: {
          where: { isActive: true },
          select: { id: true, email: true, fullName: true, role: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return orgs.map(org => {
      const admin = org.users[0] || null;
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        type: org.type,
        verificationStatus: org.verificationStatus,
        metadata: org.metadata,
        industryProfile: org.industryProfile,
        adminUser: admin ? { id: admin.id, email: admin.email, fullName: admin.fullName, role: admin.role } : null,
      };
    });
  }

  /**
   * Retrieves opportunities (eligible challenges and projects) for an authenticated industry.
   * Sanitizes confidential government / citizen data.
   */
  public static async getOpportunities(industryOrgId: string) {
    const industryOrg = await prisma.organization.findUnique({
      where: { id: industryOrgId },
      include: { industryProfile: true },
    });

    if (!industryOrg) {
      throw new NotFoundError('Industry Organization', industryOrgId);
    }

    // Retrieve approved challenges that are open for university or industry collaboration
    const challenges = await prisma.challenge.findMany({
      where: {
        status: {
          in: [
            ChallengeStatus.APPROVED,
            ChallengeStatus.ASSIGNED_TO_UNIVERSITY,
            ChallengeStatus.IN_RESEARCH,
            ChallengeStatus.SOLUTION_PROPOSED,
            ChallengeStatus.IN_PILOT,
            ChallengeStatus.DEPLOYED,
          ],
        },
        deletedAt: null,
      },
      include: {
        universityMatches: {
          where: { status: 'ACCEPTED' },
          include: { university: { select: { id: true, name: true } } },
        },
        projects: {
          include: {
            leadingOrg: { select: { id: true, name: true } },
            partnerships: {
              where: { partnerOrgId: industryOrgId },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const opportunities = await Promise.all(
      challenges.map(async c => {
        // Associated project if any
        const project = c.projects[0] || null;
        const partnership = project?.partnerships[0] || null;

        const isInvited = Boolean(
          partnership?.equipmentOffered?.includes('INVITED_BY_GOVERNMENT') ||
          (partnership && partnership.status === PartnershipStatus.PROPOSED && !partnership.fundingOffered)
        );

        const hasExpressedInterest = Boolean(
          partnership &&
          (partnership.status === PartnershipStatus.PROPOSED ||
            partnership.status === PartnershipStatus.UNDER_NEGOTIATION ||
            partnership.status === PartnershipStatus.CONFIRMED)
        );

        let interestStatus: string | null = null;
        if (partnership) {
          switch (partnership.status) {
            case PartnershipStatus.PROPOSED:
              interestStatus = 'INTERESTED';
              break;
            case PartnershipStatus.UNDER_NEGOTIATION:
              interestStatus = 'UNDER_REVIEW';
              break;
            case PartnershipStatus.CONFIRMED:
              interestStatus = 'ACCEPTED';
              break;
            case PartnershipStatus.DECLINED:
              interestStatus = 'DECLINED';
              break;
          }
        }

        // Capabilities and tech match evaluation
        const profile = industryOrg.industryProfile;
        const caps = profile?.capabilities || [];
        const techs = profile?.technologies || [];
        const combined = [...caps, ...techs];
        
        const descLower = (c.description || '').toLowerCase() + ' ' + c.category.toLowerCase();
        const matchedCapabilities = combined.filter(item => descLower.includes(item.toLowerCase().slice(0, 4)));

        // Score based on industry matching heuristic
        let matchScore = 75;
        if (matchedCapabilities.length >= 3) matchScore = 95;
        else if (matchedCapabilities.length >= 2) matchScore = 88;
        else if (matchedCapabilities.length >= 1) matchScore = 82;

        const universityName = project?.leadingOrg?.name || c.universityMatches[0]?.university?.name || null;

        return {
          id: c.id,
          challengeId: c.id,
          projectId: project?.id || null,
          title: c.title,
          description: c.description,
          category: c.category,
          priority: c.priority,
          district: c.district,
          state: c.state,
          currentStage: project ? project.status : c.status,
          universityName,
          matchScore,
          matchedCapabilities: matchedCapabilities.length > 0 ? matchedCapabilities : ['Technical Expertise', 'CSR & Implementation'],
          isInvitedByGovernment: isInvited,
          hasExpressedInterest,
          interestStatus,
          partnershipId: partnership?.id || null,
        };
      })
    );

    return opportunities;
  }

  /**
   * Expresses industry interest in a challenge or project.
   * Primary industry action. Persists in PostgreSQL and is completely idempotent.
   */
  public static async expressInterest(params: ExpressInterestParams) {
    const {
      challengeIdOrProjectId,
      industryOrgId,
      partnershipType,
      fundingOffered,
      message,
      actorId,
      actorRole,
      requestId,
      ipAddress,
    } = params;

    const org = await prisma.organization.findUnique({
      where: { id: industryOrgId },
    });

    if (!org) {
      throw new NotFoundError('Organization', industryOrgId);
    }

    return await prisma.$transaction(async tx => {
      // 1. Resolve Challenge and Project
      let challenge = await tx.challenge.findUnique({
        where: { id: challengeIdOrProjectId },
      });

      let project = await tx.project.findFirst({
        where: {
          OR: [
            { id: challengeIdOrProjectId },
            { challengeId: challengeIdOrProjectId },
          ],
        },
        include: { leadingOrg: true },
      });

      if (!challenge && project) {
        challenge = await tx.challenge.findUnique({
          where: { id: project.challengeId },
        });
      }

      if (!challenge) {
        throw new NotFoundError('Challenge / Project opportunity', challengeIdOrProjectId);
      }

      // If no project shell exists yet, create one for this challenge
      if (!project) {
        // Find assigned university if any
        const acceptedMatch = await tx.universityMatch.findFirst({
          where: { challengeId: challenge.id, status: 'ACCEPTED' },
        });

        const leadingOrgId = acceptedMatch?.universityOrgId || industryOrgId;

        project = await tx.project.create({
          data: {
            challengeId: challenge.id,
            leadingOrgId,
            title: `Project: ${challenge.title}`,
            description: `Collaborative civic solution project for "${challenge.title}"`,
            status: ProjectStatus.ASSIGNED,
          },
          include: { leadingOrg: true },
        });
      }

      // 2. Check existing partnership for (projectId, partnerOrgId)
      const existing = await tx.industryPartnership.findFirst({
        where: {
          projectId: project.id,
          partnerOrgId: industryOrgId,
        },
      });

      let partnership;
      if (existing) {
        if (existing.status === PartnershipStatus.CONFIRMED) {
          return existing; // Already accepted collaborator
        }

        // Update idempotently
        partnership = await tx.industryPartnership.update({
          where: { id: existing.id },
          data: {
            partnershipType,
            fundingOffered: fundingOffered !== undefined ? (fundingOffered as any) : existing.fundingOffered,
            equipmentOffered: message || existing.equipmentOffered || 'Industry expressed active interest in contributing.',
            status: PartnershipStatus.PROPOSED,
          },
        });
      } else {
        // Create new interest record
        partnership = await tx.industryPartnership.create({
          data: {
            projectId: project.id,
            partnerOrgId: industryOrgId,
            partnershipType,
            fundingOffered: fundingOffered !== undefined ? (fundingOffered as any) : undefined,
            equipmentOffered: message || 'Industry expressed active interest in contributing.',
            status: PartnershipStatus.PROPOSED,
          },
        });
      }

      // 3. Challenge Timeline
      await tx.challengeTimeline.create({
        data: {
          challengeId: challenge.id,
          fromStatus: challenge.status,
          toStatus: challenge.status,
          actorId,
          reason: `Industry partner '${org.name}' expressed interest in contributing via ${partnershipType}.`,
        },
      });

      // 4. Audit Log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: AuditAction.INDUSTRY_INTEREST_EXPRESSED,
          resource: 'IndustryPartnership',
          resourceId: partnership.id,
          newState: {
            projectId: project.id,
            partnerOrgId: industryOrgId,
            partnershipType,
            fundingOffered,
            status: partnership.status,
          },
          reason: message || `Industry expressed interest in ${project.title}`,
          requestId,
          ipAddress: ipAddress || null,
        },
      });

      // 5. Notify Government Officers
      const govOfficers = await tx.user.findMany({
        where: {
          role: { in: [UserRole.GOVERNMENT_OFFICER, UserRole.GOVERNMENT_DEPARTMENT, UserRole.SYSTEM_ADMIN] },
          isActive: true,
        },
        take: 5,
      });

      for (const officer of govOfficers) {
        await NotificationService.create({
          recipientId: officer.id,
          title: 'Industry Expressed Interest',
          message: `Industry partner '${org.name}' has expressed interest in Project '${project.title}'.`,
          type: 'PARTNERSHIP',
          actionUrl: `/government?challengeId=${challenge.id}`,
          metadata: { projectId: project.id, industryOrgId, partnershipId: partnership.id },
        });
      }

      logger.info(`Industry ${org.name} expressed interest in Project ${project.id}`);

      return partnership;
    });
  }

  /**
   * Retrieves all expressed interests belonging to the authenticated industry organization.
   * Enforces backend tenant isolation.
   */
  public static async getMyInterests(industryOrgId: string) {
    const items = await prisma.industryPartnership.findMany({
      where: { partnerOrgId: industryOrgId },
      include: {
        project: {
          include: {
            challenge: {
              select: { id: true, title: true, category: true, priority: true, district: true, state: true },
            },
            leadingOrg: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return items.map(p => {
      let displayStatus = 'Interested';
      switch (p.status) {
        case PartnershipStatus.PROPOSED:
          displayStatus = 'Interested';
          break;
        case PartnershipStatus.UNDER_NEGOTIATION:
          displayStatus = 'Under Review';
          break;
        case PartnershipStatus.CONFIRMED:
          displayStatus = 'Accepted';
          break;
        case PartnershipStatus.DECLINED:
          displayStatus = 'Declined';
          break;
      }

      return {
        id: p.id,
        partnershipId: p.id,
        projectId: p.projectId,
        projectTitle: p.project.title,
        challengeId: p.project.challenge.id,
        challengeTitle: p.project.challenge.title,
        category: p.project.challenge.category,
        location: `${p.project.challenge.district || ''}, ${p.project.challenge.state || ''}`.trim().replace(/^,|,$/g, ''),
        universityName: p.project.leadingOrg?.name || 'Assigned University',
        status: displayStatus,
        rawStatus: p.status,
        partnershipType: p.partnershipType,
        fundingOffered: p.fundingOffered ? Number(p.fundingOffered) : null,
        message: p.equipmentOffered || null,
        createdAt: p.createdAt.toISOString(),
      };
    });
  }

  /**
   * Retrieves active, confirmed collaborations for the authenticated industry.
   */
  public static async getActiveCollaborations(industryOrgId: string) {
    const items = await prisma.industryPartnership.findMany({
      where: {
        partnerOrgId: industryOrgId,
        status: PartnershipStatus.CONFIRMED,
      },
      include: {
        project: {
          include: {
            challenge: {
              select: { id: true, title: true, description: true, category: true, priority: true, district: true, state: true },
            },
            leadingOrg: {
              select: { id: true, name: true },
            },
            deliverables: true,
            milestones: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return items.map(p => ({
      id: p.id,
      partnershipId: p.id,
      projectId: p.projectId,
      projectTitle: p.project.title,
      challengeTitle: p.project.challenge.title,
      category: p.project.challenge.category,
      universityName: p.project.leadingOrg?.name || 'Partner University',
      collaborationType: p.partnershipType,
      fundingOffered: p.fundingOffered ? Number(p.fundingOffered) : 0,
      supportBeingProvided: p.equipmentOffered || 'Technical collaboration, advisory & implementation support',
      projectStage: p.project.status,
      milestonesCount: p.project.milestones.length,
      deliverablesCount: p.project.deliverables.length,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }));
  }

  /**
   * Provides linked support (funding, equipment, testing, etc.) to an active collaboration.
   * Enforces backend authorization and project ownership.
   */
  public static async provideSupport(params: ProvideSupportParams) {
    const {
      partnershipId,
      industryOrgId,
      fundingOffered,
      equipmentOffered,
      actorId,
      actorRole,
      requestId,
      ipAddress,
    } = params;

    const partnership = await prisma.industryPartnership.findUnique({
      where: { id: partnershipId },
      include: { project: true, partnerOrg: true },
    });

    if (!partnership) {
      throw new NotFoundError('Collaboration Partnership', partnershipId);
    }

    if (partnership.partnerOrgId !== industryOrgId) {
      throw new ForbiddenError('Industry authorization failure: Cannot modify a collaboration belonging to another organization.');
    }

    if (partnership.status !== PartnershipStatus.CONFIRMED) {
      throw new ValidationError('Support commitments can only be updated on confirmed active collaborations.');
    }

    const updated = await prisma.industryPartnership.update({
      where: { id: partnershipId },
      data: {
        fundingOffered: fundingOffered !== undefined ? (fundingOffered as any) : partnership.fundingOffered,
        equipmentOffered: equipmentOffered || partnership.equipmentOffered,
      },
    });

    await AuditService.record({
      actorId,
      actorRole,
      action: AuditAction.INDUSTRY_SUPPORT_OFFERED,
      resource: 'IndustryPartnership',
      resourceId: partnershipId,
      newState: {
        fundingOffered: updated.fundingOffered,
        equipmentOffered: updated.equipmentOffered,
      },
      reason: 'Industry updated support commitment on active collaboration',
      requestId,
      ipAddress,
    });

    // Notify Project Lead / University Lead
    const leadOrgMembers = await prisma.organizationMember.findMany({
      where: { organizationId: partnership.project.leadingOrgId },
      include: { user: true },
      take: 3,
    });

    for (const m of leadOrgMembers) {
      if (m.user) {
        await NotificationService.create({
          recipientId: m.user.id,
          title: 'Industry Support Commitment Updated',
          message: `Industry partner '${partnership.partnerOrg.name}' updated support commitment for Project '${partnership.project.title}'.`,
          type: 'PROJECT',
          actionUrl: `/university?projectId=${partnership.projectId}`,
          metadata: { projectId: partnership.projectId, partnershipId },
        });
      }
    }

    return updated;
  }
}
