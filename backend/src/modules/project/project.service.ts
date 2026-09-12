import { prisma } from '../../database/prisma';
import {
  ProjectStatus,
  ChallengeStatus,
  ProposalStatus,
  MilestoneStatus,
  DeliverableStatus,
  RiskSeverity,
  RiskProbability,
  RiskStatus,
  TeamRole,
  InvitationStatus,
  UserRole,
  AuditAction,
  ProjectActivationChecklistDto,
} from '@sicp/shared';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export interface ActivateProjectParams {
  projectId: string;
  actorId: string;
  actorRole: UserRole;
  requestId: string;
  ipAddress?: string;
}

export interface CreateMilestoneParams {
  projectId: string;
  title: string;
  description: string;
  orderNumber?: number;
  deadline: string;
  budgetAllocated?: number;
  dependencyId?: string;
  actorId: string;
  actorRole: UserRole;
  requestId: string;
  ipAddress?: string;
}

export interface UpdateMilestoneStatusParams {
  milestoneId: string;
  status: MilestoneStatus;
  progressPct?: number;
  blockedReason?: string;
  actorId: string;
  actorRole: UserRole;
  requestId: string;
  ipAddress?: string;
}

export interface CreateRiskParams {
  projectId: string;
  title: string;
  severity: RiskSeverity;
  probability: RiskProbability;
  impact: string;
  owner?: string;
  mitigation: string;
  actorId: string;
  actorRole: UserRole;
  requestId: string;
  ipAddress?: string;
}

export interface ProjectHealthCockpit {
  projectId: string;
  projectTitle: string;
  status: ProjectStatus;
  overallHealth: 'ON_TRACK' | 'AT_RISK' | 'BLOCKED';
  healthScore: number; // 0 to 100
  totalMilestones: number;
  completedMilestones: number;
  overdueMilestones: number;
  blockedMilestones: Array<{ id: string; title: string; blockedReason: string }>;
  criticalRisksCount: number;
  activationChecklist: ProjectActivationChecklistDto;
  remedialActions: Array<{ type: string; title: string; description: string; actionUrl: string }>;
}

export class ProjectService {
  /**
   * Evaluates the authoritative activation prerequisites for a project.
   * Prerequisites:
   * 1. Officially Approved Challenge
   * 2. University Assignment ACCEPTED
   * 3. Valid Team
   * 4. Confirmed LEAD_FACULTY
   * 5. Approved Solution Proposal
   */
  public static async evaluateActivationPrerequisites(projectId: string): Promise<ProjectActivationChecklistDto> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        challenge: { include: { universityMatches: true } },
        team: { include: { members: true } },
        proposals: true,
      },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    const missingPrerequisites: string[] = [];

    // 1. Challenge status check: must not be DRAFT or REJECTED
    const isChallengeApproved =
      project.challenge.status !== ChallengeStatus.DRAFT &&
      project.challenge.status !== ChallengeStatus.REJECTED;
    if (!isChallengeApproved) {
      missingPrerequisites.push('Challenge is not in an approved or accepted state.');
    }

    // 2. University match check: must be ACCEPTED
    const acceptedMatch = project.challenge.universityMatches.find(
      m => m.universityOrgId === project.leadingOrgId && m.status === 'ACCEPTED'
    );
    const isUniversityAccepted = !!acceptedMatch;
    if (!isUniversityAccepted) {
      missingPrerequisites.push('University has not formally accepted the assignment for this challenge.');
    }

    // 3. Valid Team check: must exist and have members
    const hasValidTeam = !!project.team && project.team.members.length >= 2;
    if (!hasValidTeam) {
      missingPrerequisites.push('A valid multidisciplinary team with at least 2 members must be formed.');
    }

    // 4. Confirmed LEAD_FACULTY check
    const confirmedLead = project.team?.members.find(
      m => m.roleInTeam === TeamRole.LEAD_FACULTY && m.invitationStatus === InvitationStatus.ACCEPTED
    );
    const hasConfirmedLeadFaculty = !!confirmedLead;
    if (!hasConfirmedLeadFaculty) {
      missingPrerequisites.push('A confirmed Lead Faculty member (invitation ACCEPTED) is required.');
    }

    // 5. Approved Solution Proposal check
    const approvedProposal = project.proposals.find(p => p.status === ProposalStatus.APPROVED);
    const isProposalApproved = !!approvedProposal;
    if (!isProposalApproved) {
      missingPrerequisites.push('A Solution Proposal must be submitted and approved by government review.');
    }

    const canActivate =
      isChallengeApproved &&
      isUniversityAccepted &&
      hasValidTeam &&
      hasConfirmedLeadFaculty &&
      isProposalApproved;

    return {
      isChallengeApproved,
      isUniversityAccepted,
      hasValidTeam,
      hasConfirmedLeadFaculty,
      isProposalApproved,
      canActivate,
      missingPrerequisites,
    };
  }

  /**
   * Formally activates a project into prototype execution upon meeting all authoritative guardrails.
   */
  public static async activateProject(params: ActivateProjectParams) {
    const { projectId, actorId, actorRole, requestId, ipAddress } = params;

    const checklist = await this.evaluateActivationPrerequisites(projectId);
    if (!checklist.canActivate) {
      throw new ValidationError(
        `Cannot activate project. Missing prerequisites: ${checklist.missingPrerequisites.join('; ')}`
      );
    }

    return await prisma.$transaction(async tx => {
      const project = await tx.project.findUnique({
        where: { id: projectId },
        include: { proposals: { where: { status: ProposalStatus.APPROVED } } },
      });

      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      const approvedProposal = project.proposals[0];

      // Update project status to PROTOTYPE / APPROVED
      const updatedProject = await tx.project.update({
        where: { id: projectId },
        data: {
          status: ProjectStatus.APPROVED,
          activatedAt: new Date(),
          proposalId: approvedProposal?.id,
          version: { increment: 1 },
        },
      });

      // Advance challenge to IN_PILOT
      await tx.challenge.update({
        where: { id: project.challengeId },
        data: {
          status: ChallengeStatus.IN_PILOT,
          version: { increment: 1 },
        },
      });

      // Timeline entry
      await tx.challengeTimeline.create({
        data: {
          challengeId: project.challengeId,
          fromStatus: ChallengeStatus.SOLUTION_PROPOSED,
          toStatus: ChallengeStatus.IN_PILOT,
          actorId,
          reason: `Project "${project.title}" officially ACTIVATED into execution with approved proposal V${approvedProposal?.version || 1}.`,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: AuditAction.PROJECT_ACTIVATED,
          resource: 'Project',
          resourceId: projectId,
          previousState: { status: project.status },
          newState: { status: updatedProject.status, activatedAt: updatedProject.activatedAt },
          requestId,
          ipAddress: ipAddress || null,
        },
      });

      logger.info(`Project ${projectId} officially activated by ${actorId} (${actorRole})`);

      return {
        project: updatedProject,
        checklist,
      };
    });
  }

  /**
   * Adds a milestone to a project.
   */
  public static async createMilestone(params: CreateMilestoneParams) {
    const {
      projectId,
      title,
      description,
      orderNumber = 1,
      deadline,
      budgetAllocated,
      dependencyId,
      actorId,
      actorRole,
      requestId,
      ipAddress,
    } = params;

    if (!title || !deadline) {
      throw new ValidationError('title and deadline are required for milestones.');
    }

    const milestone = await prisma.projectMilestone.create({
      data: {
        projectId,
        title,
        description: description || '',
        orderNumber,
        deadline: new Date(deadline),
        budgetAllocated: budgetAllocated ? (budgetAllocated as any) : undefined,
        dependencyId,
        status: MilestoneStatus.PENDING,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId,
        actorRole,
        action: AuditAction.PROJECT_MILESTONE_UPDATED,
        resource: 'ProjectMilestone',
        resourceId: milestone.id,
        newState: { projectId, title, deadline },
        requestId,
        ipAddress: ipAddress || null,
      },
    });

    return milestone;
  }

  /**
   * Updates milestone status with Zero-Dead-End blocked reason enforcement.
   */
  public static async updateMilestoneStatus(params: UpdateMilestoneStatusParams) {
    const { milestoneId, status, progressPct, blockedReason, actorId, actorRole, requestId, ipAddress } = params;

    const existing = await prisma.projectMilestone.findUnique({ where: { id: milestoneId } });
    if (!existing) {
      throw new NotFoundError('ProjectMilestone', milestoneId);
    }

    if (status === MilestoneStatus.REJECTED && (!blockedReason || blockedReason.trim().length === 0)) {
      throw new ValidationError('A detailed reason is required when a milestone is rejected or blocked.');
    }

    const updated = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        status,
        progressPct: progressPct !== undefined ? progressPct : existing.progressPct,
        blockedReason: blockedReason ? blockedReason.trim() : null,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId,
        actorRole,
        action: AuditAction.PROJECT_MILESTONE_UPDATED,
        resource: 'ProjectMilestone',
        resourceId: milestoneId,
        previousState: { status: existing.status },
        newState: { status, progressPct, blockedReason },
        reason: blockedReason || null,
        requestId,
        ipAddress: ipAddress || null,
      },
    });

    return updated;
  }

  /**
   * Registers a project risk.
   */
  public static async createRisk(params: CreateRiskParams) {
    const { projectId, title, severity, probability, impact, owner, mitigation, actorId, actorRole, requestId, ipAddress } = params;

    if (!title || !impact || !mitigation) {
      throw new ValidationError('title, impact, and mitigation are required.');
    }

    const risk = await prisma.projectRisk.create({
      data: {
        projectId,
        title,
        severity,
        probability,
        impact,
        owner,
        mitigation,
        status: RiskStatus.IDENTIFIED,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId,
        actorRole,
        action: AuditAction.PROJECT_RISK_CREATED,
        resource: 'ProjectRisk',
        resourceId: risk.id,
        newState: { projectId, title, severity, probability },
        requestId,
        ipAddress: ipAddress || null,
      },
    });

    return risk;
  }

  /**
   * Retrieves comprehensive Project Cockpit including timelines, milestones, risks, and health.
   */
  public static async getProjectCockpit(projectId: string): Promise<ProjectHealthCockpit> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        milestones: { orderBy: { orderNumber: 'asc' } },
        risks: true,
        team: { include: { leadFaculty: true, members: { include: { user: true } } } },
        challenge: { include: { timelines: { orderBy: { createdAt: 'desc' } } } },
        fundingRequests: true,
        proposals: { orderBy: { version: 'desc' } },
      },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    const totalMilestones = project.milestones.length;
    const completedMilestones = project.milestones.filter(m => m.status === MilestoneStatus.APPROVED).length;

    const now = new Date();
    const overdueMilestones = project.milestones.filter(
      m => m.status !== MilestoneStatus.APPROVED && new Date(m.deadline) < now
    ).length;

    const blockedMilestones = project.milestones
      .filter(m => m.blockedReason && m.blockedReason.length > 0)
      .map(m => ({ id: m.id, title: m.title, blockedReason: m.blockedReason! }));

    const criticalRisksCount = project.risks.filter(
      r => r.severity === RiskSeverity.CRITICAL && r.status !== RiskStatus.RESOLVED
    ).length;

    // Determine overall health
    let overallHealth: 'ON_TRACK' | 'AT_RISK' | 'BLOCKED' = 'ON_TRACK';
    let healthScore = 95;

    if (blockedMilestones.length > 0) {
      overallHealth = 'BLOCKED';
      healthScore = 40;
    } else if (criticalRisksCount > 0 || overdueMilestones > 0) {
      overallHealth = 'AT_RISK';
      healthScore = 65;
    }

    const checklist = await this.evaluateActivationPrerequisites(projectId);

    const remedialActions: Array<{ type: string; title: string; description: string; actionUrl: string }> = [];

    if (blockedMilestones.length > 0) {
      for (const bm of blockedMilestones) {
        remedialActions.push({
          type: 'UNBLOCK_MILESTONE',
          title: `Resolve Blocked Milestone: "${bm.title}"`,
          description: `Blocked due to: "${bm.blockedReason}". Escalate to Lead Faculty or reassign resources.`,
          actionUrl: `/projects/${projectId}?tab=milestones`,
        });
      }
    }

    if (criticalRisksCount > 0) {
      remedialActions.push({
        type: 'MITIGATE_RISK',
        title: `${criticalRisksCount} Critical Risk(s) Detected`,
        description: 'Review active high-severity project risks and verify mitigation strategies.',
        actionUrl: `/projects/${projectId}?tab=risks`,
      });
    }

    if (!checklist.canActivate && project.status === ProjectStatus.ASSIGNED) {
      remedialActions.push({
        type: 'RESOLVE_ACTIVATION_PREREQUISITES',
        title: 'Complete Project Activation Prerequisites',
        description: `Missing: ${checklist.missingPrerequisites.join(', ')}`,
        actionUrl: `/projects/${projectId}?tab=activation`,
      });
    }

    return {
      projectId: project.id,
      projectTitle: project.title,
      status: project.status as unknown as ProjectStatus,
      overallHealth,
      healthScore,
      totalMilestones,
      completedMilestones,
      overdueMilestones,
      blockedMilestones,
      criticalRisksCount,
      activationChecklist: checklist,
      remedialActions,
    };
  }

  /**
   * Retrieves full project entity with all relations.
   */
  public static async getProjectById(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        challenge: {
          include: {
            impact: true,
            sla: true,
            timelines: { include: { actor: true }, orderBy: { createdAt: 'desc' } },
          },
        },
        leadingOrg: true,
        team: {
          include: {
            leadFaculty: { include: { facultyProfile: true } },
            members: { include: { user: { include: { facultyProfile: true } } } },
          },
        },
        proposals: { include: { author: true, reviews: { include: { reviewer: true } } }, orderBy: { version: 'desc' } },
        milestones: { include: { deliverables: true }, orderBy: { orderNumber: 'asc' } },
        risks: { orderBy: { createdAt: 'desc' } },
        fundingRequests: { orderBy: { createdAt: 'desc' } },
        partnerships: { include: { partnerOrg: true }, orderBy: { createdAt: 'desc' } },
        prototypes: { include: { createdBy: true, reviewedBy: true }, orderBy: { version: 'desc' } },
        testExecutions: { include: { conductedBy: true, testCasesList: { include: { tester: true } } }, orderBy: { iterationNumber: 'desc' } },
        pilots: { include: { metricsList: true }, orderBy: { createdAt: 'desc' } },
        deployments: { include: { deployedBy: true }, orderBy: { createdAt: 'desc' } },
        outcomeVerifications: { include: { reviewer: true }, orderBy: { createdAt: 'desc' } },
        citizenVerifications: { include: { citizen: true }, orderBy: { createdAt: 'desc' } },
        innovationOutcomes: { orderBy: { registeredAt: 'desc' } },
      },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    const cockpit = await this.getProjectCockpit(projectId);

    return {
      ...project,
      cockpit,
    };
  }

  /**
   * List projects with status and search filters
   */
  public static async listProjects(params: {
    status?: ProjectStatus;
    search?: string;
    orgId?: string;
    limit?: number;
    offset?: number;
  }) {
    const { status, search, orgId, limit = 20, offset = 0 } = params;
    const where: any = {};
    if (status) where.status = status;
    if (orgId) where.leadingOrgId = orgId;
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { updatedAt: 'desc' },
        include: {
          leadingOrg: { select: { id: true, name: true, type: true } },
          challenge: { select: { id: true, title: true, category: true, district: true, state: true } },
          _count: { select: { milestones: true, prototypes: true, pilots: true, deployments: true } },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return { items, total, limit, offset };
  }
}

