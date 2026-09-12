import { prisma } from '../../database/prisma';
import {
  PrototypeStatus,
  ProjectStatus,
  AuditAction,
  UserRole,
  CreatePrototypeDto,
  ReviewPrototypeDto,
  PrototypeDto,
} from '@sicp/shared';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { logger } from '../../utils/logger';

export class PrototypeService {
  /**
   * Creates a draft prototype for an activated project.
   */
  public static async createPrototype(params: {
    projectId: string;
    dto: CreatePrototypeDto;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }): Promise<PrototypeDto> {
    const { projectId, dto, actorId, actorRole, requestId, ipAddress } = params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { prototypes: { orderBy: { version: 'desc' } }, leadingOrg: true },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    // Must be in an execution-ready status
    const allowedStatuses: ProjectStatus[] = [
      ProjectStatus.APPROVED,
      ProjectStatus.PROTOTYPE,
      ProjectStatus.TESTING,
      ProjectStatus.PILOT,
      ProjectStatus.DEPLOYMENT,
    ];
    if (!allowedStatuses.includes(project.status as ProjectStatus)) {
      throw new ValidationError(
        `Cannot create prototype for project in ${project.status} status. Project must be activated first.`
      );
    }

    const nextVersion = (project.prototypes[0]?.version || 0) + 1;

    const prototype = await prisma.$transaction(async tx => {
      const created = await tx.projectPrototype.create({
        data: {
          projectId,
          version: nextVersion,
          title: dto.title,
          description: dto.description,
          prototypeType: dto.prototypeType || 'SOFTWARE',
          technicalApproach: dto.technicalApproach,
          objectives: dto.objectives,
          components: (dto.components as any) || {},
          repositoryUrl: dto.repositoryUrl,
          documentationUrl: dto.documentationUrl,
          createdById: actorId,
          status: PrototypeStatus.DRAFT,
        },
        include: { createdBy: true },
      });

      // Update project status to PROTOTYPE if it was APPROVED
      if (project.status === ProjectStatus.APPROVED) {
        await tx.project.update({
          where: { id: projectId },
          data: { status: ProjectStatus.PROTOTYPE },
        });
      }

      await AuditService.log({
        actorId,
        actorRole,
        action: AuditAction.PROTOTYPE_CREATED,
        resource: 'ProjectPrototype',
        resourceId: created.id,
        previousState: null,
        newState: created,
        reason: `Draft prototype V${nextVersion} created for project "${project.title}"`,
        requestId,
        ipAddress,
      });

      return created;
    });

    return this.mapToDto(prototype);
  }

  /**
   * Submits a prototype for formal government review.
   * Once submitted, the version becomes immutable.
   */
  public static async submitPrototype(params: {
    prototypeId: string;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }): Promise<PrototypeDto> {
    const { prototypeId, actorId, actorRole, requestId, ipAddress } = params;

    const prototype = await prisma.projectPrototype.findUnique({
      where: { id: prototypeId },
      include: { project: true, createdBy: true },
    });

    if (!prototype) {
      throw new NotFoundError('ProjectPrototype', prototypeId);
    }

    if (prototype.status !== PrototypeStatus.DRAFT && prototype.status !== PrototypeStatus.REVISION_REQUESTED) {
      throw new ValidationError(`Cannot submit prototype in ${prototype.status} status. Only DRAFT or REVISION_REQUESTED can be submitted.`);
    }

    const updated = await prisma.$transaction(async tx => {
      const res = await tx.projectPrototype.update({
        where: { id: prototypeId },
        data: {
          status: PrototypeStatus.SUBMITTED,
          submittedAt: new Date(),
        },
        include: { createdBy: true },
      });

      await AuditService.log({
        actorId,
        actorRole,
        action: AuditAction.PROTOTYPE_SUBMITTED,
        resource: 'ProjectPrototype',
        resourceId: prototypeId,
        previousState: { status: prototype.status },
        newState: { status: PrototypeStatus.SUBMITTED },
        reason: `Prototype V${prototype.version} submitted for official review.`,
        requestId,
        ipAddress,
      });

      return res;
    });

    // Notify government officers
    try {
      const govUsers = await prisma.user.findMany({
        where: { role: { in: [UserRole.GOVERNMENT_OFFICER, UserRole.GOVERNMENT_DEPARTMENT] } },
      });
      for (const gov of govUsers) {
        await NotificationService.create({
          recipientId: gov.id,
          title: 'Prototype Submitted for Review',
          message: `Prototype V${prototype.version} for project "${prototype.project.title}" has been submitted for review.`,
          type: 'PROTOTYPE_SUBMITTED',
          actionUrl: `/projects/${prototype.projectId}?tab=prototype`,
        });
      }
    } catch (e) {
      logger.warn(`Failed to send notifications for prototype submission: ${(e as Error).message}`);
    }

    return this.mapToDto(updated);
  }

  /**
   * Reviews a submitted prototype (APPROVE, REQUEST_REVISION, REJECT).
   */
  public static async reviewPrototype(params: {
    prototypeId: string;
    dto: ReviewPrototypeDto;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }): Promise<PrototypeDto> {
    const { prototypeId, dto, actorId, actorRole, requestId, ipAddress } = params;

    const prototype = await prisma.projectPrototype.findUnique({
      where: { id: prototypeId },
      include: { project: true, createdBy: true },
    });

    if (!prototype) {
      throw new NotFoundError('ProjectPrototype', prototypeId);
    }

    if (prototype.status !== PrototypeStatus.SUBMITTED && prototype.status !== PrototypeStatus.UNDER_REVIEW) {
      throw new ValidationError(`Cannot review prototype in ${prototype.status} status. It must be SUBMITTED.`);
    }

    let targetStatus: PrototypeStatus;
    if (dto.decision === 'APPROVE') {
      targetStatus = PrototypeStatus.APPROVED;
    } else if (dto.decision === 'REQUEST_REVISION') {
      if (!dto.requiredChanges || dto.requiredChanges.length === 0) {
        throw new ValidationError('Requested revisions require specific feedback and required changes list.');
      }
      targetStatus = PrototypeStatus.REVISION_REQUESTED;
    } else if (dto.decision === 'REJECT') {
      if (!dto.comments || dto.comments.trim().length === 0) {
        throw new ValidationError('Rejection requires a mandatory explicit justification reason.');
      }
      targetStatus = PrototypeStatus.REJECTED;
    } else {
      throw new ValidationError(`Invalid review decision: ${dto.decision}`);
    }

    const updated = await prisma.$transaction(async tx => {
      const res = await tx.projectPrototype.update({
        where: { id: prototypeId },
        data: {
          status: targetStatus,
          reviewedAt: new Date(),
          reviewedById: actorId,
          reviewDecision: dto.decision,
          reviewComments: dto.comments,
          requiredChanges: dto.requiredChanges || [],
        },
        include: { createdBy: true, reviewedBy: true },
      });

      // If approved, advance project status to TESTING if not already further
      if (targetStatus === PrototypeStatus.APPROVED && prototype.project.status === ProjectStatus.PROTOTYPE) {
        await tx.project.update({
          where: { id: prototype.projectId },
          data: { status: ProjectStatus.TESTING },
        });
      }

      await AuditService.log({
        actorId,
        actorRole,
        action: AuditAction.PROTOTYPE_REVIEWED,
        resource: 'ProjectPrototype',
        resourceId: prototypeId,
        previousState: { status: prototype.status },
        newState: { status: targetStatus, decision: dto.decision },
        reason: `Prototype review verdict: ${dto.decision}. Comments: ${dto.comments}`,
        requestId,
        ipAddress,
      });

      return res;
    });

    // Notify author & team
    try {
      await NotificationService.create({
        recipientId: prototype.createdById,
        title: `Prototype Review Verdict: ${dto.decision}`,
        message: `Your prototype V${prototype.version} received review verdict "${dto.decision}". ${dto.comments}`,
        type: 'PROTOTYPE_REVIEWED',
        actionUrl: `/projects/${prototype.projectId}?tab=prototype`,
      });
    } catch (e) {
      logger.warn(`Failed to notify prototype author: ${(e as Error).message}`);
    }

    return this.mapToDto(updated);
  }

  /**
   * Revises a prototype that was rejected or required revisions.
   * Creates a brand-new immutable version (V+1) without deleting prior versions.
   */
  public static async revisePrototype(params: {
    prototypeId: string;
    dto: Partial<CreatePrototypeDto>;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }): Promise<PrototypeDto> {
    const { prototypeId, dto, actorId, actorRole, requestId, ipAddress } = params;

    const basePrototype = await prisma.projectPrototype.findUnique({
      where: { id: prototypeId },
      include: { project: true },
    });

    if (!basePrototype) {
      throw new NotFoundError('ProjectPrototype', prototypeId);
    }

    if (
      basePrototype.status !== PrototypeStatus.REVISION_REQUESTED &&
      basePrototype.status !== PrototypeStatus.REJECTED
    ) {
      throw new ValidationError(
        `Cannot revise prototype in ${basePrototype.status} status. Only REVISION_REQUESTED or REJECTED prototypes can be revised.`
      );
    }

    const latest = await prisma.projectPrototype.findFirst({
      where: { projectId: basePrototype.projectId },
      orderBy: { version: 'desc' },
    });

    const nextVersion = (latest?.version || basePrototype.version) + 1;

    const revised = await prisma.$transaction(async tx => {
      const created = await tx.projectPrototype.create({
        data: {
          projectId: basePrototype.projectId,
          version: nextVersion,
          title: dto.title || basePrototype.title,
          description: dto.description || basePrototype.description,
          prototypeType: dto.prototypeType || basePrototype.prototypeType,
          technicalApproach: dto.technicalApproach || basePrototype.technicalApproach,
          objectives: dto.objectives || (basePrototype.objectives as any),
          components: dto.components || (basePrototype.components as any) || {},
          repositoryUrl: dto.repositoryUrl !== undefined ? dto.repositoryUrl : basePrototype.repositoryUrl,
          documentationUrl: dto.documentationUrl !== undefined ? dto.documentationUrl : basePrototype.documentationUrl,
          createdById: actorId,
          status: PrototypeStatus.DRAFT,
        },
        include: { createdBy: true },
      });

      await AuditService.log({
        actorId,
        actorRole,
        action: AuditAction.PROTOTYPE_CREATED,
        resource: 'ProjectPrototype',
        resourceId: created.id,
        previousState: { predecessorId: basePrototype.id, version: basePrototype.version },
        newState: created,
        reason: `Created revised prototype V${nextVersion} responding to review feedback on V${basePrototype.version}`,
        requestId,
        ipAddress,
      });

      return created;
    });

    return this.mapToDto(revised);
  }

  /**
   * Retrieves all prototypes for a given project.
   */
  public static async getProjectPrototypes(projectId: string): Promise<PrototypeDto[]> {
    const prototypes = await prisma.projectPrototype.findMany({
      where: { projectId },
      include: { createdBy: true, reviewedBy: true },
      orderBy: { version: 'desc' },
    });

    return prototypes.map(p => this.mapToDto(p));
  }

  /**
   * Retrieves a single prototype by ID.
   */
  public static async getPrototypeById(prototypeId: string): Promise<PrototypeDto> {
    const prototype = await prisma.projectPrototype.findUnique({
      where: { id: prototypeId },
      include: { createdBy: true, reviewedBy: true },
    });

    if (!prototype) {
      throw new NotFoundError('ProjectPrototype', prototypeId);
    }

    return this.mapToDto(prototype);
  }

  private static mapToDto(p: any): PrototypeDto {
    return {
      id: p.id,
      projectId: p.projectId,
      version: p.version,
      title: p.title,
      description: p.description,
      prototypeType: p.prototypeType,
      technicalApproach: p.technicalApproach,
      objectives: Array.isArray(p.objectives) ? p.objectives : [],
      components: p.components as Record<string, unknown> | null,
      repositoryUrl: p.repositoryUrl,
      documentationUrl: p.documentationUrl,
      createdById: p.createdById,
      createdByName: p.createdBy?.fullName,
      status: p.status as PrototypeStatus,
      submittedAt: p.submittedAt ? p.submittedAt.toISOString() : null,
      reviewedAt: p.reviewedAt ? p.reviewedAt.toISOString() : null,
      reviewedById: p.reviewedById,
      reviewDecision: p.reviewDecision,
      reviewComments: p.reviewComments,
      requiredChanges: Array.isArray(p.requiredChanges) ? p.requiredChanges : null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }
}
