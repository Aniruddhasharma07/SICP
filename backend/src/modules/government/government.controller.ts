import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../database/prisma';
import { sendSuccess } from '../../utils/response';
import { SlaService } from '../../domain/sla/sla.service';
import { UniversityMatchingEngine } from '../../domain/matching/university-matching.engine';
import { IndustryMatchingEngine } from '../../domain/matching/industry-matching.engine';
import { PartnershipService } from '../partnership/partnership.service';
import { NotificationService } from '../notification/notification.service';
import { UserRole, ChallengeStatus, SeverityLevel, PriorityLevel, AuditAction, PartnershipType, PartnershipStatus, ProjectStatus } from '@sicp/shared';
import {
  ValidationError,
  NotFoundError,
  InvalidStateTransitionError,
  ForbiddenError,
} from '../../utils/errors';
import { findValidTransitionRule } from '../../domain/state-machine/challenge.transitions';
import { PriorityEngine } from '../../domain/intelligence/priority.engine';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

const assignUniversitySchema = z.object({
  universityOrgId: z.string().uuid({ message: 'Valid university organization UUID is required' }),
  reason: z.string().max(500).optional(),
});

const assignOfficerSchema = z.object({
  officerId: z.string().uuid({ message: 'Valid officer user UUID is required' }),
});

const reviewChallengeSchema = z.object({
  decision: z.enum(['APPROVE', 'REJECT', 'NEEDS_MORE_INFO', 'MODIFY']),
  severity: z.nativeEnum(SeverityLevel).optional(),
  priority: z.nativeEnum(PriorityLevel).optional(),
  rootCauseValidations: z.array(z.object({
    cause: z.string(),
    validationStatus: z.enum(['GOVERNMENT_VALIDATED', 'SUPPORTED', 'REJECTED', 'INSUFFICIENT_EVIDENCE']).optional(),
    status: z.enum(['GOVERNMENT_VALIDATED', 'SUPPORTED', 'REJECTED', 'INSUFFICIENT_EVIDENCE']).optional(),
    notes: z.string().optional(),
  }).refine(d => Boolean(d.validationStatus || d.status), {
    message: 'validationStatus or status is required',
  })).optional(),
  reason: z.string().min(5, { message: 'A detailed review reason of at least 5 characters is required' }),
});

export class GovernmentController {
  /**
   * Aggregates government command center counts and high-level KPIs
   */
  public static async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [
        totalCount,
        urgentCount,
        slaBreachedCount,
        slaWarningCount,
        pendingValidationCount,
        routedToUniversityCount,
        systemicClustersCount,
      ] = await Promise.all([
        prisma.challenge.count({ where: { deletedAt: null } }),
        prisma.challenge.count({
          where: {
            deletedAt: null,
            status: { in: [ChallengeStatus.SUBMITTED, ChallengeStatus.UNDER_GOV_REVIEW] },
            OR: [
              { priority: PriorityLevel.CRITICAL },
              { severity: { in: [SeverityLevel.SEVERE, SeverityLevel.CATASTROPHIC] } },
            ],
          },
        }),
        prisma.challengeSLA.count({
          where: {
            escalationStatus: 'ESCALATED',
            challenge: {
              status: { in: [ChallengeStatus.SUBMITTED, ChallengeStatus.UNDER_GOV_REVIEW] },
              deletedAt: null,
            },
          },
        }),
        prisma.challengeSLA.count({
          where: {
            escalationStatus: 'WARNING',
            challenge: {
              status: { in: [ChallengeStatus.SUBMITTED, ChallengeStatus.UNDER_GOV_REVIEW] },
              deletedAt: null,
            },
          },
        }),
        prisma.challenge.count({
          where: {
            deletedAt: null,
            status: { in: [ChallengeStatus.SUBMITTED, ChallengeStatus.UNDER_GOV_REVIEW] },
          },
        }),
        prisma.challenge.count({
          where: {
            deletedAt: null,
            status: ChallengeStatus.ASSIGNED_TO_UNIVERSITY,
          },
        }),
        prisma.challenge.count({
          where: {
            deletedAt: null,
            isSystemic: true,
          },
        }),
      ]);

      sendSuccess(res, {
        totalCount,
        urgentCount,
        slaBreachedCount,
        slaWarningCount,
        pendingValidationCount,
        routedToUniversityCount,
        systemicClustersCount,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves filtered task queue for government review
   */
  public static async getQueue(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filter = (req.query.filter as string) || 'ALL';
      const category = req.query.category as string | undefined;
      const district = req.query.district as string | undefined;
      const search = req.query.search as string | undefined;
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const skip = (page - 1) * limit;

      // Construct typed Prisma where filter
      const where: Prisma.ChallengeWhereInput = { deletedAt: null };

      if (category) {
        where.category = category;
      }

      if (district) {
        where.district = { contains: district, mode: 'insensitive' };
      }

      if (search && search.trim().length > 0) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { district: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (filter === 'CRITICAL_SLA') {
        where.status = { in: [ChallengeStatus.SUBMITTED, ChallengeStatus.UNDER_GOV_REVIEW] };
        where.AND = [
          {
            OR: [
              { priority: PriorityLevel.CRITICAL },
              { severity: { in: [SeverityLevel.SEVERE, SeverityLevel.CATASTROPHIC] } },
              { sla: { escalationStatus: { in: ['WARNING', 'ESCALATED'] } } },
            ],
          },
        ];
      } else if (filter === 'PENDING_REVIEW') {
        where.status = { in: [ChallengeStatus.SUBMITTED, ChallengeStatus.UNDER_GOV_REVIEW] };
      } else if (filter === 'ROUTED_UNIVERSITY') {
        where.status = ChallengeStatus.ASSIGNED_TO_UNIVERSITY;
      } else if (filter === 'SYSTEMIC') {
        where.isSystemic = true;
      }

      const items = await prisma.challenge.findMany({
        where,
        include: {
          submitter: {
            select: { id: true, fullName: true, email: true, role: true },
          },
          communityVotes: true,
          sla: true,
          impact: true,
          universityMatches: {
            include: {
              university: {
                select: { id: true, name: true },
              },
            },
          },
          sourceRelationships: {
            where: { relationType: 'SYSTEMIC_CHILD' },
          },
          targetRelationships: {
            where: { relationType: 'SYSTEMIC_CHILD' },
          },
        },
        orderBy: [{ priorityScore: 'desc' }, { createdAt: 'desc' }],
        skip,
        take: limit,
      });

      const total = await prisma.challenge.count({ where });

      // Collect officer IDs to fetch names in bulk
      const officerIds = Array.from(
        new Set(
          items
            .map(i => i.sla?.assignedOfficerId)
            .filter((id): id is string => Boolean(id))
        )
      );

      const officers = officerIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: officerIds } },
            select: { id: true, fullName: true, email: true },
          })
        : [];
      const officerMap = new Map(officers.map(o => [o.id, o]));

      const now = new Date();

      const formattedItems = items.map(c => {
        let slaInfo = null;
        if (c.sla) {
          const hoursRemaining = Math.round(
            (c.sla.reviewDeadline.getTime() - now.getTime()) / (1000 * 60 * 60)
          );
          slaInfo = {
            id: c.sla.id,
            reviewDeadline: c.sla.reviewDeadline.toISOString(),
            escalationStatus: c.sla.escalationStatus,
            assignedOfficerId: c.sla.assignedOfficerId,
            assignedOfficer: c.sla.assignedOfficerId
              ? officerMap.get(c.sla.assignedOfficerId) || null
              : null,
            hoursRemaining,
          };
        } else {
          // If SLA record not yet created, calculate virtual SLA
          const deadline = SlaService.calculateDeadline(
            c.severity as unknown as SeverityLevel,
            c.priority as unknown as PriorityLevel,
            c.createdAt
          );
          const hoursRemaining = Math.round((deadline.getTime() - now.getTime()) / (1000 * 60 * 60));
          const escalationStatus = SlaService.getEscalationStatus(deadline, now);
          slaInfo = {
            id: `virtual-${c.id}`,
            reviewDeadline: deadline.toISOString(),
            escalationStatus,
            assignedOfficerId: null,
            assignedOfficer: null,
            hoursRemaining,
          };
        }

        const clusterChildrenCount = c.sourceRelationships.length + c.targetRelationships.length;

        return {
          id: c.id,
          title: c.title,
          description: c.description,
          category: c.category,
          severity: c.severity,
          priority: c.priority,
          priorityScore: c.priorityScore,
          status: c.status,
          district: c.district,
          state: c.state,
          address: c.address,
          affectedPopulation: c.affectedPopulation,
          durationMonths: c.durationMonths,
          isSystemic: c.isSystemic,
          systemicSummary: c.systemicSummary,
          supportVotesCount: c.communityVotes.length,
          version: c.version,
          createdAt: c.createdAt.toISOString(),
          submitter: c.submitter,
          sla: slaInfo,
          impact: c.impact
            ? {
                id: c.impact.id,
                problemType: c.impact.problemType,
                metricType: c.impact.metricType,
                value: c.impact.estimatedValue,
                verifiedValue: c.impact.verifiedValue,
                unit: c.impact.unit,
                timeBasis: c.impact.timeBasis,
                calculationMethod: c.impact.calculationMethod,
                inputs: c.impact.inputs,
                confidence: c.impact.confidence,
                verificationStatus: c.impact.verificationStatus,
                normalizedMagnitude: c.impact.normalizedMagnitude,
                explanation: c.impact.explanation,
              }
            : null,
          universityMatches: c.universityMatches.map(m => ({
            id: m.id,
            universityOrgId: m.universityOrgId,
            universityName: m.university.name,
            matchScore: m.matchScore,
            status: m.status,
            rejectionReason: m.rejectionReason,
            matchReasons: m.matchReasons,
          })),
          clusterChildrenCount,
        };
      });

      sendSuccess(res, {
        items: formattedItems,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves recommended universities for a challenge
   */
  public static async getUniversityMatches(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challengeId = req.params.id;
      const recommendations = await UniversityMatchingEngine.recommendUniversities(challengeId, 10);
      sendSuccess(res, recommendations);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Assigns a challenge to a university organization
   */
  public static async assignUniversity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challengeId = req.params.id;
      const parsed = assignUniversitySchema.safeParse(req.body);

      if (!parsed.success) {
        throw new ValidationError('Invalid university assignment payload', parsed.error.format());
      }

      const requestId = (req as Request & { id?: string }).id || (req.headers['x-request-id'] as string) || 'req-assign';

      const result = await UniversityMatchingEngine.assignToUniversity({
        challengeId,
        universityOrgId: parsed.data.universityOrgId,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        reason: parsed.data.reason,
        requestId,
        ipAddress: req.ip,
      });

      sendSuccess(res, {
        message: `Challenge successfully assigned to ${result.universityName}`,
        data: result,
      }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Assigns a government officer to review a challenge
   */
  public static async assignOfficer(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challengeId = req.params.id;
      const parsed = assignOfficerSchema.safeParse(req.body);

      if (!parsed.success) {
        throw new ValidationError('Invalid officer assignment payload', parsed.error.format());
      }

      const sla = await SlaService.assignOfficer(challengeId, parsed.data.officerId, req.user!.id);

      sendSuccess(res, {
        message: 'Government officer assigned to challenge review',
        data: sla,
      }, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Lists available government officers for assignment dropdowns
   */
  public static async getOfficers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const officers = await prisma.user.findMany({
        where: {
          role: { in: [UserRole.GOVERNMENT_OFFICER, UserRole.GOVERNMENT_DEPARTMENT] },
          deletedAt: null,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
        },
        orderBy: { fullName: 'asc' },
      });

      sendSuccess(res, officers);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Triggers SLA check and escalates overdue challenges
   */
  public static async checkEscalations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const escalatedCount = await SlaService.checkAndTriggerEscalations();
      sendSuccess(res, {
        escalatedCount,
        message: `SLA escalation check completed. ${escalatedCount} challenge(s) escalated.`,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Government officer review of challenge and AI intelligence.
   * Authoritatively approves/modifies/rejects challenge severity, priority, and root causes.
   * Persists the human decision separately from the AI recommendation.
   */
  public static async reviewChallenge(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challengeId = req.params.id;
      const parsed = reviewChallengeSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new ValidationError('Invalid challenge review payload', parsed.error.format());
      }

      const { decision, severity, priority, rootCauseValidations, reason } = parsed.data;
      const actorId = req.user!.id;
      const actorRole = req.user!.role as UserRole;
      const requestId = (req as Request & { id?: string }).id || (req.headers?.['x-request-id'] as string) || 'req-gov-review';

      const result = await prisma.$transaction(async tx => {
        const challenge = await tx.challenge.findUnique({
          where: { id: challengeId },
          include: { aiAnalysis: true },
        });

        if (!challenge) {
          throw new NotFoundError('Challenge', challengeId);
        }

        let toStatus: ChallengeStatus = challenge.status as unknown as ChallengeStatus;
        if (decision === 'APPROVE') {
          toStatus = ChallengeStatus.APPROVED;
        } else if (decision === 'REJECT') {
          toStatus = ChallengeStatus.REJECTED;
        } else if (decision === 'NEEDS_MORE_INFO') {
          toStatus = ChallengeStatus.NEEDS_MORE_INFO;
        } else if (decision === 'MODIFY') {
          toStatus = challenge.status === ChallengeStatus.SUBMITTED ? ChallengeStatus.UNDER_GOV_REVIEW : (challenge.status as unknown as ChallengeStatus);
        }

        // Validate state transition if status is changing
        if (toStatus !== challenge.status) {
          const rule = findValidTransitionRule(challenge.status as unknown as ChallengeStatus, toStatus);
          if (!rule) {
            throw new InvalidStateTransitionError(
              challenge.status as unknown as ChallengeStatus,
              toStatus,
              `Government review cannot transition challenge from '${challenge.status}' to '${toStatus}'`
            );
          }
          if (!rule.allowedRoles.includes(actorRole)) {
            throw new ForbiddenError(`Role '${actorRole}' is not authorized to transition challenge to '${toStatus}'`);
          }
        }

        const newSeverity = (severity as unknown as import('@prisma/client').$Enums.SeverityLevel) || challenge.severity;
        const newPriority = (priority as unknown as import('@prisma/client').$Enums.PriorityLevel) || challenge.priority;

        // Recalculate priority score if severity or priority modified
        let newPriorityScore = challenge.priorityScore;
        if (severity || priority) {
          const priorityCalc = PriorityEngine.calculate({
            severity: newSeverity as unknown as SeverityLevel,
            urgency: newPriority as unknown as PriorityLevel,
            affectedPopulation: challenge.affectedPopulation,
            durationMonths: challenge.durationMonths,
            communityVotesCount: 0,
            evidenceCount: 1,
          });
          newPriorityScore = priorityCalc.score;
        }

        const updatedChallenge = await tx.challenge.update({
          where: { id: challengeId },
          data: {
            status: toStatus as unknown as import('@prisma/client').$Enums.ChallengeStatus,
            severity: newSeverity,
            priority: newPriority,
            priorityScore: newPriorityScore,
            version: { increment: 1 },
          },
        });

        // Store authoritative government review separately from original AI recommendations
        const rawResponse = (challenge.aiAnalysis?.rawResponse as Record<string, any>) || {};
        const governmentReview = {
          reviewedById: actorId,
          reviewedByRole: actorRole,
          reviewedAt: new Date().toISOString(),
          decision,
          authoritativeSeverity: newSeverity,
          authoritativePriority: newPriority,
          rootCauseValidations: rootCauseValidations || [],
          reviewReason: reason,
          aiSeverityRecommendation: rawResponse.estimatedSeverity || challenge.severity,
          aiPriorityRecommendation: rawResponse.preliminaryPriority || challenge.priority,
        };

        if (challenge.aiAnalysis) {
          await tx.aIAnalysis.update({
            where: { challengeId },
            data: {
              rawResponse: {
                ...rawResponse,
                governmentReview,
              },
            },
          });
        }

        // Timeline entry
        await tx.challengeTimeline.create({
          data: {
            challengeId,
            fromStatus: challenge.status,
            toStatus: toStatus as unknown as import('@prisma/client').$Enums.ChallengeStatus,
            actorId,
            reason,
            metadata: { governmentReview },
          },
        });

        // Immutable Audit Log
        await tx.auditLog.create({
          data: {
            actorId,
            actorRole,
            action: AuditAction.CHALLENGE_STATE_TRANSITION,
            resource: 'Challenge',
            resourceId: challengeId,
            previousState: {
              status: challenge.status,
              severity: challenge.severity,
              priority: challenge.priority,
              priorityScore: challenge.priorityScore,
            },
            newState: {
              status: updatedChallenge.status,
              severity: updatedChallenge.severity,
              priority: updatedChallenge.priority,
              priorityScore: updatedChallenge.priorityScore,
            },
            reason,
            requestId,
            ipAddress: req.ip || null,
          },
        });

        // Notify submitter of government decision
        if (challenge.submitterId !== actorId) {
          await tx.notification.create({
            data: {
              recipientId: challenge.submitterId,
              title: `Government Review Completed: ${decision}`,
              message: `Your challenge "${challenge.title}" has been reviewed by the government authority (${decision}). ${reason}`,
              type: 'CHALLENGE_STATUS_UPDATE',
              actionUrl: `/challenges/${challengeId}`,
            },
          });
        }

        return {
          challenge: updatedChallenge,
          governmentReview,
        };
      });

      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves recommended/eligible industries for a challenge
   */
  public static async getEligibleIndustries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challengeId = req.params.id;
      const recommendations = await IndustryMatchingEngine.matchPartnersForProject(challengeId, 10);

      // Enrich with current invitation or partnership status if any
      const existingPartnerships = await prisma.industryPartnership.findMany({
        where: {
          project: { challengeId },
        },
      });

      const enriched = recommendations.map(rec => {
        const partnerId = rec.partnerOrgId || (rec as any).organizationId;
        const existing = existingPartnerships.find(p => p.partnerOrgId === partnerId);
        return {
          ...rec,
          organizationId: partnerId,
          isInvited: Boolean(existing && existing.equipmentOffered?.includes('INVITED_BY_GOVERNMENT')),
          hasExpressedInterest: Boolean(existing && existing.status !== PartnershipStatus.DECLINED),
          status: existing ? existing.status : null,
          partnershipId: existing ? existing.id : null,
        };
      });

      sendSuccess(res, enriched, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Directly assigns or invites an eligible industry to an approved challenge or project
   */
  public static async assignIndustry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const challengeId = req.params.id;
      const { industryOrgId, partnershipType = PartnershipType.TECHNICAL_SUPPORT, reason } = req.body;

      if (!industryOrgId) {
        throw new ValidationError('industryOrgId is required');
      }

      const challenge = await prisma.challenge.findUnique({
        where: { id: challengeId },
      });

      if (!challenge) {
        throw new NotFoundError('Challenge', challengeId);
      }

      const industryOrg = await prisma.organization.findUnique({
        where: { id: industryOrgId },
      });

      if (!industryOrg) {
        throw new NotFoundError('Industry Organization', industryOrgId);
      }

      const result = await prisma.$transaction(async tx => {
        // Find or create project shell
        let project = await tx.project.findFirst({
          where: { challengeId },
        });

        if (!project) {
          project = await tx.project.create({
            data: {
              challengeId,
              leadingOrgId: industryOrgId,
              title: `Project: ${challenge.title}`,
              description: `Civic innovation project for "${challenge.title}"`,
              status: ProjectStatus.ASSIGNED,
            },
          });
        }

        // Upsert IndustryPartnership invitation
        const existing = await tx.industryPartnership.findFirst({
          where: {
            projectId: project.id,
            partnerOrgId: industryOrgId,
          },
        });

        let partnership;
        const inviteNotes = `INVITED_BY_GOVERNMENT: ${reason || 'Direct Government invitation for civic problem collaboration'}`;

        if (existing) {
          partnership = await tx.industryPartnership.update({
            where: { id: existing.id },
            data: {
              equipmentOffered: inviteNotes,
              status: PartnershipStatus.PROPOSED,
            },
          });
        } else {
          partnership = await tx.industryPartnership.create({
            data: {
              projectId: project.id,
              partnerOrgId: industryOrgId,
              partnershipType: partnershipType as PartnershipType,
              equipmentOffered: inviteNotes,
              status: PartnershipStatus.PROPOSED,
            },
          });
        }

        // Audit Log
        await tx.auditLog.create({
          data: {
            actorId: req.user!.id,
            actorRole: req.user!.role,
            action: AuditAction.INDUSTRY_INVITED,
            resource: 'IndustryPartnership',
            resourceId: partnership.id,
            newState: {
              challengeId,
              projectId: project.id,
              industryOrgId,
              partnershipType,
            },
            reason: reason || 'Government assigned/invited industry partner',
            requestId: res.locals.requestId || 'req-gov-invite',
            ipAddress: req.ip || null,
          },
        });

        // Notify Industry Partner Users
        const industryUsers = await tx.user.findMany({
          where: { organizationId: industryOrgId, isActive: true },
          take: 5,
        });

        for (const u of industryUsers) {
          await NotificationService.create({
            recipientId: u.id,
            title: 'New Project Invitation',
            message: 'A new project opportunity has been assigned to your industry.',
            type: 'PARTNERSHIP',
            actionUrl: `/industry?opportunityId=${challenge.id}`,
            metadata: { challengeId, projectId: project.id, partnershipId: partnership.id },
          });
        }

        return {
          partnership,
          project,
        };
      });

      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves all industry interests for a project or challenge
   */
  public static async getProjectIndustryInterests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = req.params.id;

      const partnerships = await prisma.industryPartnership.findMany({
        where: {
          OR: [
            { projectId: id },
            { project: { challengeId: id } },
          ],
        },
        include: {
          partnerOrg: {
            include: { industryProfile: true },
          },
          project: {
            include: { challenge: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = partnerships.map(p => ({
        id: p.id,
        partnershipId: p.id,
        projectId: p.projectId,
        industryName: p.partnerOrg.name,
        industryId: p.partnerOrgId,
        sector: p.partnerOrg.industryProfile?.sector || 'Industry & CSR',
        capabilities: p.partnerOrg.industryProfile?.capabilities || [],
        status: p.status,
        partnershipType: p.partnershipType,
        fundingOffered: p.fundingOffered ? Number(p.fundingOffered) : null,
        message: p.equipmentOffered || null,
        isGovernmentInvited: Boolean(p.equipmentOffered?.includes('INVITED_BY_GOVERNMENT')),
        createdAt: p.createdAt.toISOString(),
      }));

      sendSuccess(res, formatted, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Accepts an industry interest into active collaboration
   */
  public static async acceptIndustryInterest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const partnershipId = req.params.id;

      const updated = await PartnershipService.respondPartnership({
        partnershipId,
        decision: 'CONFIRMED',
        actorId: req.user!.id,
        actorRole: req.user!.role as unknown as UserRole,
        requestId: res.locals.requestId || 'req-gov-accept-interest',
        ipAddress: req.ip,
      });

      sendSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }

  /**
   * Declines an industry interest
   */
  public static async declineIndustryInterest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const partnershipId = req.params.id;

      const updated = await PartnershipService.respondPartnership({
        partnershipId,
        decision: 'DECLINED',
        actorId: req.user!.id,
        actorRole: req.user!.role as unknown as UserRole,
        requestId: res.locals.requestId || 'req-gov-decline-interest',
        ipAddress: req.ip,
      });

      sendSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }
}
