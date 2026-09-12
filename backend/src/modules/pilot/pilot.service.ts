import { prisma } from '../../database/prisma';
import {
  PilotStatus,
  ProjectStatus,
  MetricProvenance,
  AuditAction,
  UserRole,
  PilotDto,
  PilotMetricDto,
  CreatePilotDto,
  RecordPilotMetricDto,
} from '@sicp/shared';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { AuditService } from '../audit/audit.service';
import { logger } from '../../utils/logger';

export class PilotService {
  /**
   * Creates a pilot deployment for a project.
   */
  public static async createPilot(params: {
    projectId: string;
    dto: CreatePilotDto;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }): Promise<PilotDto> {
    const { projectId, dto, actorId, actorRole, requestId, ipAddress } = params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    const pilot = await prisma.$transaction(async tx => {
      const created = await tx.projectPilot.create({
        data: {
          projectId,
          location: dto.location,
          district: dto.district,
          state: dto.state,
          targetBeneficiaries: dto.targetBeneficiaries,
          startDate: new Date(dto.startDate),
          endDate: dto.endDate ? new Date(dto.endDate) : null,
          baselineMetrics: (dto.baselineMetrics as any) || {},
          findings: dto.findings,
          status: PilotStatus.PLANNING,
        },
        include: { metricsList: true },
      });

      // Advance project status to PILOT if in TESTING or APPROVED
      if (project.status === ProjectStatus.TESTING || project.status === ProjectStatus.APPROVED) {
        await tx.project.update({
          where: { id: projectId },
          data: { status: ProjectStatus.PILOT },
        });
      }

      await AuditService.log({
        actorId,
        actorRole,
        action: AuditAction.PILOT_CREATED,
        resource: 'ProjectPilot',
        resourceId: created.id,
        previousState: null,
        newState: created,
        reason: `Created pilot for project "${project.title}" in ${dto.district}, ${dto.state}`,
        requestId,
        ipAddress,
      });

      return created;
    });

    return this.mapPilotToDto(pilot);
  }

  /**
   * Records or updates a measurable pilot metric with before/after comparisons and provenance.
   */
  public static async recordMetric(params: {
    pilotId: string;
    dto: RecordPilotMetricDto;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }): Promise<PilotMetricDto> {
    const { pilotId, dto, actorId, actorRole, requestId, ipAddress } = params;

    const pilot = await prisma.projectPilot.findUnique({
      where: { id: pilotId },
    });

    if (!pilot) {
      throw new NotFoundError('ProjectPilot', pilotId);
    }

    // Explicit before/after change calculations
    const absoluteChange = Math.round((dto.observedValue - dto.baselineValue) * 100) / 100;
    
    // Percentage change calculation with safe zero-baseline handling
    let percentageChange: number | null = null;
    if (dto.baselineValue !== 0) {
      percentageChange = Math.round(((dto.observedValue - dto.baselineValue) / Math.abs(dto.baselineValue)) * 10000) / 100;
    }

    // Target achievement %
    const targetDelta = dto.targetValue - dto.baselineValue;
    let targetAchievement: number | null = null;
    if (targetDelta !== 0) {
      targetAchievement = Math.min(200, Math.max(0, Math.round(((dto.observedValue - dto.baselineValue) / targetDelta) * 10000) / 100));
    }

    const metric = await prisma.$transaction(async tx => {
      const created = await tx.pilotMetric.create({
        data: {
          pilotId,
          name: dto.name,
          category: dto.category,
          unit: dto.unit,
          baselineValue: dto.baselineValue,
          targetValue: dto.targetValue,
          observedValue: dto.observedValue,
          absoluteChange,
          percentageChange,
          targetAchievement,
          method: dto.method,
          source: dto.source,
          provenance: dto.provenance || MetricProvenance.VERIFIED,
          isVerified: dto.provenance === MetricProvenance.VERIFIED,
          collectionDate: new Date(),
          notes: dto.notes,
        },
      });

      await AuditService.log({
        actorId,
        actorRole,
        action: AuditAction.PILOT_METRIC_RECORDED,
        resource: 'PilotMetric',
        resourceId: created.id,
        previousState: null,
        newState: created,
        reason: `Recorded metric "${dto.name}" (Baseline: ${dto.baselineValue} ${dto.unit} -> Observed: ${dto.observedValue} ${dto.unit})`,
        requestId,
        ipAddress,
      });

      return created;
    });

    return this.mapMetricToDto(metric);
  }

  /**
   * Updates the status of a pilot with zero-dead-end transitions (e.g. PAUSED -> ACTIVE, COMPLETED_WITH_ISSUES -> REVISED_PILOT).
   */
  public static async updateStatus(params: {
    pilotId: string;
    status: PilotStatus;
    findings?: string;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }): Promise<PilotDto> {
    const { pilotId, status, findings, actorId, actorRole, requestId, ipAddress } = params;

    const pilot = await prisma.projectPilot.findUnique({
      where: { id: pilotId },
      include: { metricsList: true },
    });

    if (!pilot) {
      throw new NotFoundError('ProjectPilot', pilotId);
    }

    const updated = await prisma.$transaction(async tx => {
      const res = await tx.projectPilot.update({
        where: { id: pilotId },
        data: {
          status,
          findings: findings !== undefined ? findings : pilot.findings,
          endDate: (status === PilotStatus.COMPLETED || status === PilotStatus.COMPLETED_WITH_ISSUES) ? new Date() : pilot.endDate,
        },
        include: { metricsList: true },
      });

      await AuditService.log({
        actorId,
        actorRole,
        action: AuditAction.PILOT_STATUS_UPDATED,
        resource: 'ProjectPilot',
        resourceId: pilotId,
        previousState: { status: pilot.status },
        newState: { status, findings },
        reason: `Pilot status updated to ${status}. Findings: ${findings || 'N/A'}`,
        requestId,
        ipAddress,
      });

      return res;
    });

    return this.mapPilotToDto(updated);
  }

  /**
   * Retrieves all pilots for a project.
   */
  public static async getProjectPilots(projectId: string): Promise<PilotDto[]> {
    const pilots = await prisma.projectPilot.findMany({
      where: { projectId },
      include: { metricsList: true },
      orderBy: { createdAt: 'desc' },
    });

    return pilots.map(p => this.mapPilotToDto(p));
  }

  private static mapPilotToDto(p: any): PilotDto {
    return {
      id: p.id,
      projectId: p.projectId,
      location: p.location,
      district: p.district,
      state: p.state,
      targetBeneficiaries: p.targetBeneficiaries,
      startDate: p.startDate.toISOString(),
      endDate: p.endDate ? p.endDate.toISOString() : null,
      baselineMetrics: p.baselineMetrics as Record<string, unknown>,
      observedOutcome: p.observedOutcome as Record<string, unknown> | null,
      findings: p.findings,
      status: p.status as PilotStatus,
      metricsList: (p.metricsList || []).map((m: any) => this.mapMetricToDto(m)),
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    };
  }

  private static mapMetricToDto(m: any): PilotMetricDto {
    return {
      id: m.id,
      pilotId: m.pilotId,
      name: m.name,
      category: m.category,
      unit: m.unit,
      baselineValue: m.baselineValue,
      targetValue: m.targetValue,
      observedValue: m.observedValue,
      absoluteChange: m.absoluteChange,
      percentageChange: m.percentageChange,
      targetAchievement: m.targetAchievement,
      method: m.method,
      source: m.source,
      provenance: m.provenance,
      isVerified: m.isVerified,
      collectionDate: m.collectionDate ? m.collectionDate.toISOString() : null,
      notes: m.notes,
    };
  }
}
