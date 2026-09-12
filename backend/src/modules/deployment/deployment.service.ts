import { prisma } from '../../database/prisma';
import {
  DeploymentStatus,
  ProjectStatus,
  ChallengeStatus,
  PrototypeStatus,
  TestStatus,
  TestCaseStatus,
  PilotStatus,
  AuditAction,
  UserRole,
  DeploymentDto,
  DeploymentReadinessChecklistDto,
  DeploymentReadinessConditionDto,
  CreateDeploymentDto,
} from '@sicp/shared';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { logger } from '../../utils/logger';

export class DeploymentService {
  /**
   * Evaluates the authoritative 8-point deployment readiness checklist.
   * Returns structured failure information for any unmet REQUIRED conditions.
   */
  public static async evaluateReadinessGate(projectId: string): Promise<DeploymentReadinessChecklistDto> {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        prototypes: true,
        testExecutions: { include: { testCasesList: true } },
        pilots: { include: { metricsList: true } },
        leadingOrg: true,
        challenge: true,
      },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    const conditions: DeploymentReadinessConditionDto[] = [];

    // 1. Prototype approved (REQUIRED)
    const approvedPrototype = project.prototypes.find(p => p.status === PrototypeStatus.APPROVED);
    conditions.push({
      requirement: 'Approved Solution Prototype',
      requirementType: 'REQUIRED',
      isMet: !!approvedPrototype,
      currentValue: approvedPrototype ? `V${approvedPrototype.version} Approved` : 'No approved prototype',
      expectedValue: 'At least one prototype version officially APPROVED',
      blocking: !approvedPrototype,
      responsibleActor: 'University Lead Faculty / Reviewing Officer',
      suggestedAction: approvedPrototype ? 'Proceed' : 'Submit prototype for government review and obtain approval.',
    });

    // 2. Required tests passed (REQUIRED)
    const passedTestExecution = project.testExecutions.find(t => t.status === TestStatus.PASSED);
    conditions.push({
      requirement: 'Solution Testing Execution Passed',
      requirementType: 'REQUIRED',
      isMet: !!passedTestExecution,
      currentValue: passedTestExecution ? `Iteration #${passedTestExecution.iterationNumber} Passed` : 'No passed test execution',
      expectedValue: 'At least one test execution cycle with PASSED status',
      blocking: !passedTestExecution,
      responsibleActor: 'Multidisciplinary Research Team',
      suggestedAction: passedTestExecution ? 'Proceed' : 'Execute test cases and achieve passing threshold.',
    });

    // 3. Critical defects resolved (REQUIRED)
    const openCriticalDefects = project.testExecutions
      .flatMap(t => t.testCasesList || [])
      .filter(c => c.status === TestCaseStatus.FAILED && c.severity === 'CRITICAL');
    const noCriticalDefects = openCriticalDefects.length === 0;
    conditions.push({
      requirement: 'Zero Critical Testing Defects',
      requirementType: 'REQUIRED',
      isMet: noCriticalDefects,
      currentValue: noCriticalDefects ? '0 critical defects' : `${openCriticalDefects.length} critical defect(s) unresolved`,
      expectedValue: 'All critical severity defects must be retested and resolved',
      blocking: !noCriticalDefects,
      responsibleActor: 'University Research Team / Lead Faculty',
      suggestedAction: noCriticalDefects ? 'Proceed' : 'Resolve open critical defects and trigger retest cycle.',
    });

    // 4. Pilot completed or active (REQUIRED)
    const validPilot = project.pilots.find(p =>
      p.status === PilotStatus.COMPLETED ||
      p.status === PilotStatus.COMPLETED_WITH_ISSUES ||
      p.status === PilotStatus.ACTIVE
    );
    conditions.push({
      requirement: 'Field Pilot Execution',
      requirementType: 'REQUIRED',
      isMet: !!validPilot,
      currentValue: validPilot ? `Pilot in ${validPilot.district} (${validPilot.status})` : 'No active or completed pilot',
      expectedValue: 'At least one field pilot completed or actively verified',
      blocking: !validPilot,
      responsibleActor: 'Field Implementation Team',
      suggestedAction: validPilot ? 'Proceed' : 'Initiate and execute field pilot in designated community location.',
    });

    // 5. Required pilot success criteria met (REQUIRED)
    const hasRecordedMetrics = project.pilots.some(p => p.metricsList && p.metricsList.length > 0);
    conditions.push({
      requirement: 'Pilot Outcome Metrics Recorded',
      requirementType: 'REQUIRED',
      isMet: hasRecordedMetrics,
      currentValue: hasRecordedMetrics ? 'Pilot metrics recorded with baseline/observed data' : 'No metrics recorded',
      expectedValue: 'Measurable before/after indicators recorded with data provenance',
      blocking: !hasRecordedMetrics,
      responsibleActor: 'Project Lead Faculty / M&E Specialist',
      suggestedAction: hasRecordedMetrics ? 'Proceed' : 'Record observed pilot metrics comparing against baseline targets.',
    });

    // 6. Deployment organization confirmed (REQUIRED)
    const hasDeployOrg = !!project.leadingOrgId;
    conditions.push({
      requirement: 'Deployment Lead Organization Confirmed',
      requirementType: 'REQUIRED',
      isMet: hasDeployOrg,
      currentValue: project.leadingOrg?.name || 'Unassigned',
      expectedValue: 'Active institutional lead organization assigned',
      blocking: !hasDeployOrg,
      responsibleActor: 'System Admin / Government Officer',
      suggestedAction: hasDeployOrg ? 'Proceed' : 'Confirm leading institutional partner for deployment.',
    });

    // 7. Deployment location confirmed (REQUIRED)
    const hasLocation = !!(project.challenge.district && project.challenge.state);
    conditions.push({
      requirement: 'Deployment Geographic Target Confirmed',
      requirementType: 'REQUIRED',
      isMet: hasLocation,
      currentValue: hasLocation ? `${project.challenge.district}, ${project.challenge.state}` : 'Location unconfirmed',
      expectedValue: 'Explicit district and state geographic boundary designated',
      blocking: !hasLocation,
      responsibleActor: 'Government Department',
      suggestedAction: hasLocation ? 'Proceed' : 'Set explicit target district and state in challenge profile.',
    });

    // 8. Required approvals obtained (REQUIRED)
    const hasApprovals = project.status !== ProjectStatus.ON_HOLD && project.status !== ProjectStatus.CANCELLED;
    conditions.push({
      requirement: 'Administrative Project Standing',
      requirementType: 'REQUIRED',
      isMet: hasApprovals,
      currentValue: `Project status: ${project.status}`,
      expectedValue: 'Project in good standing, not ON_HOLD or CANCELLED',
      blocking: !hasApprovals,
      responsibleActor: 'Government Administrative Oversight',
      suggestedAction: hasApprovals ? 'Proceed' : 'Lift administrative hold before deploying.',
    });

    const blockingCount = conditions.filter(c => c.blocking).length;
    const canDeploy = blockingCount === 0;

    return {
      canDeploy,
      conditions,
      blockingCount,
    };
  }

  /**
   * Creates a deployment record.
   */
  public static async createDeployment(params: {
    projectId: string;
    dto: CreateDeploymentDto;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }): Promise<DeploymentDto> {
    const { projectId, dto, actorId, actorRole, requestId, ipAddress } = params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    const deployment = await prisma.$transaction(async tx => {
      const created = await tx.projectDeployment.create({
        data: {
          projectId,
          title: dto.title,
          location: dto.location,
          district: dto.district,
          state: dto.state,
          latitude: dto.latitude,
          longitude: dto.longitude,
          deploymentOrg: dto.deploymentOrg,
          deploymentDate: new Date(dto.deploymentDate),
          scope: dto.scope,
          beneficiariesCount: dto.beneficiariesCount || 0,
          infrastructure: dto.infrastructure,
          responsibleTeam: dto.responsibleTeam,
          implementationPartners: dto.implementationPartners || [],
          operationalNotes: dto.operationalNotes,
          status: DeploymentStatus.PLANNED,
          deployedById: actorId,
        },
      });

      await AuditService.log({
        actorId,
        actorRole,
        action: AuditAction.DEPLOYMENT_CREATED,
        resource: 'ProjectDeployment',
        resourceId: created.id,
        previousState: null,
        newState: created,
        reason: `Created deployment plan "${dto.title}" for project "${project.title}"`,
        requestId,
        ipAddress,
      });

      return created;
    });

    return this.mapDeploymentToDto(deployment);
  }

  /**
   * Updates deployment status with readiness gate enforcement on activation.
   * Supports zero-dead-end failure and rollback handling.
   */
  public static async updateDeploymentStatus(params: {
    deploymentId: string;
    status: DeploymentStatus;
    blockerReason?: string;
    blockerActor?: string;
    failureRootCause?: string;
    rollbackReason?: string;
    operationalNotes?: string;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }): Promise<DeploymentDto> {
    const {
      deploymentId,
      status,
      blockerReason,
      blockerActor,
      failureRootCause,
      rollbackReason,
      operationalNotes,
      actorId,
      actorRole,
      requestId,
      ipAddress,
    } = params;

    const deployment = await prisma.projectDeployment.findUnique({
      where: { id: deploymentId },
      include: { project: true },
    });

    if (!deployment) {
      throw new NotFoundError('ProjectDeployment', deploymentId);
    }

    // If moving to READY_FOR_DEPLOYMENT, IN_PROGRESS, or DEPLOYED, enforce readiness gate!
    if (
      status === DeploymentStatus.READY_FOR_DEPLOYMENT ||
      status === DeploymentStatus.IN_PROGRESS ||
      status === DeploymentStatus.DEPLOYED
    ) {
      const gate = await this.evaluateReadinessGate(deployment.projectId);
      if (!gate.canDeploy) {
        const blockingIssues = gate.conditions
          .filter(c => c.blocking)
          .map(c => `${c.requirement}: ${c.currentValue}`)
          .join('; ');
        throw new ValidationError(`Cannot transition deployment to ${status}. Readiness gate blocked: ${blockingIssues}`);
      }
    }

    // Validation for failure and rollback states
    if (status === DeploymentStatus.FAILED && (!failureRootCause || failureRootCause.trim().length === 0)) {
      throw new ValidationError('Marking deployment as FAILED requires an explicit failureRootCause for zero-dead-end recovery.');
    }

    if (status === DeploymentStatus.ROLLED_BACK && (!rollbackReason || rollbackReason.trim().length === 0)) {
      throw new ValidationError('Rolling back deployment requires an explicit rollbackReason.');
    }

    if (status === DeploymentStatus.BLOCKED && (!blockerReason || blockerReason.trim().length === 0)) {
      throw new ValidationError('Blocking deployment requires an explicit blockerReason.');
    }

    const updated = await prisma.$transaction(async tx => {
      const res = await tx.projectDeployment.update({
        where: { id: deploymentId },
        data: {
          status,
          blockerReason: blockerReason !== undefined ? blockerReason : deployment.blockerReason,
          blockerActor: blockerActor !== undefined ? blockerActor : deployment.blockerActor,
          failureRootCause: failureRootCause !== undefined ? failureRootCause : deployment.failureRootCause,
          rollbackReason: rollbackReason !== undefined ? rollbackReason : deployment.rollbackReason,
          operationalNotes: operationalNotes !== undefined ? operationalNotes : deployment.operationalNotes,
        },
      });

      // Update Project and Challenge states
      if (status === DeploymentStatus.DEPLOYED || status === DeploymentStatus.OPERATIONAL) {
        await tx.project.update({
          where: { id: deployment.projectId },
          data: { status: ProjectStatus.DEPLOYMENT },
        });

        await tx.challenge.update({
          where: { id: deployment.project.challengeId },
          data: { status: ChallengeStatus.DEPLOYED },
        });

        await tx.challengeTimeline.create({
          data: {
            challengeId: deployment.project.challengeId,
            fromStatus: ChallengeStatus.IN_PILOT,
            toStatus: ChallengeStatus.DEPLOYED,
            actorId,
            reason: `Solution deployed to community via deployment "${deployment.title}".`,
          },
        });
      }

      await AuditService.log({
        actorId,
        actorRole,
        action: AuditAction.DEPLOYMENT_STATUS_UPDATED,
        resource: 'ProjectDeployment',
        resourceId: deploymentId,
        previousState: { status: deployment.status },
        newState: { status, failureRootCause, rollbackReason, blockerReason },
        reason: `Deployment status updated to ${status}. Notes: ${operationalNotes || 'N/A'}`,
        requestId,
        ipAddress,
      });

      return res;
    });

    return this.mapDeploymentToDto(updated);
  }

  /**
   * Retrieves all deployments for a project.
   */
  public static async getProjectDeployments(projectId: string): Promise<DeploymentDto[]> {
    const deployments = await prisma.projectDeployment.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return deployments.map(d => this.mapDeploymentToDto(d));
  }

  private static mapDeploymentToDto(d: any): DeploymentDto {
    return {
      id: d.id,
      projectId: d.projectId,
      title: d.title,
      location: d.location,
      district: d.district,
      state: d.state,
      latitude: d.latitude,
      longitude: d.longitude,
      deploymentOrg: d.deploymentOrg,
      deploymentDate: d.deploymentDate.toISOString(),
      scope: d.scope,
      beneficiariesCount: d.beneficiariesCount,
      infrastructure: d.infrastructure,
      responsibleTeam: d.responsibleTeam,
      implementationPartners: Array.isArray(d.implementationPartners) ? d.implementationPartners : [],
      status: d.status as DeploymentStatus,
      blockerReason: d.blockerReason,
      blockerActor: d.blockerActor,
      failureRootCause: d.failureRootCause,
      rollbackReason: d.rollbackReason,
      operationalNotes: d.operationalNotes,
      evidenceReferences: Array.isArray(d.evidenceReferences) ? d.evidenceReferences : [],
      deployedById: d.deployedById,
      createdAt: d.createdAt.toISOString(),
      updatedAt: d.updatedAt.toISOString(),
    };
  }
}
