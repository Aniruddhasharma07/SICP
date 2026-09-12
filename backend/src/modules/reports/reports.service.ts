import { prisma } from '../../database/prisma';
import { AuthenticatedUser } from '../../core/middlewares/auth.middleware';
import { UserRole, ChallengeStatus, SolutionMemoryStatus, AuditAction } from '@sicp/shared';
import { AuditService } from '../audit/audit.service';
import { ValidationError } from '../../utils/errors';

export interface ExportReportParams {
  type: 'challenges' | 'projects' | 'solutions' | 'outcomes';
  category?: string;
  status?: string;
  district?: string;
  state?: string;
  requestId: string;
  ipAddress?: string;
}

export class ReportsService {
  public static escapeCsv(value: unknown): string {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  public static async exportCsv(params: ExportReportParams, user: AuthenticatedUser): Promise<{ filename: string; csv: string; rowCount: number }> {
    const isGovOrAdmin = [
      UserRole.GOVERNMENT_OFFICER,
      UserRole.GOVERNMENT_DEPARTMENT,
      UserRole.SYSTEM_ADMIN,
    ].includes(user.role);

    let filename = `sicp-${params.type}-report-${Date.now()}.csv`;
    let headers: string[] = [];
    let rows: string[][] = [];

    switch (params.type) {
      case 'challenges': {
        const where: any = { deletedAt: null };
        if (!isGovOrAdmin) {
          where.status = { notIn: [ChallengeStatus.DRAFT] };
        }
        if (params.category) where.category = { contains: params.category, mode: 'insensitive' };
        if (params.status) where.status = params.status;
        if (params.district) where.district = { contains: params.district, mode: 'insensitive' };
        if (params.state) where.state = { contains: params.state, mode: 'insensitive' };

        const challenges = await prisma.challenge.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 1000,
        });

        headers = [
          'ID',
          'Title',
          'Category',
          'Severity',
          'Priority',
          'Status',
          'District',
          'State',
          'Affected Population',
          'Is Systemic',
          'Created At',
        ];

        rows = challenges.map((c) => [
          c.id,
          c.title,
          c.category,
          c.severity,
          c.priority,
          c.status,
          c.district || '',
          c.state || '',
          c.affectedPopulation ? String(c.affectedPopulation) : '0',
          c.isSystemic ? 'YES' : 'NO',
          c.createdAt.toISOString(),
        ]);
        break;
      }

      case 'projects': {
        const where: any = {};
        if (params.status) where.status = params.status;

        const projects = await prisma.project.findMany({
          where,
          include: { leadingOrg: true },
          orderBy: { createdAt: 'desc' },
          take: 1000,
        });

        headers = [
          'ID',
          'Title',
          'Status',
          'Leading Organization',
          'Organization Type',
          'Budget',
          'Created At',
        ];

        rows = projects.map((p) => [
          p.id,
          p.title,
          p.status,
          p.leadingOrg?.name || 'Unassigned',
          p.leadingOrg?.type || 'N/A',
          p.budget ? p.budget.toString() : '0.00',
          p.createdAt.toISOString(),
        ]);
        break;
      }

      case 'solutions': {
        const where: any = {};
        if (!isGovOrAdmin) {
          where.status = SolutionMemoryStatus.PUBLISHED;
        } else if (params.status) {
          where.status = params.status;
        }
        if (params.category) {
          where.challengeCategory = { contains: params.category, mode: 'insensitive' };
        }

        const solutions = await prisma.solutionMemory.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: 1000,
        });

        headers = [
          'ID',
          'Title',
          'Category',
          'Reusability Class',
          'Evidence Level',
          'Outcome Status',
          'Status',
          'Reuse Count',
          'Created At',
        ];

        rows = solutions.map((s) => [
          s.id,
          s.title,
          s.challengeCategory,
          s.reusabilityClass,
          s.evidenceLevel,
          s.outcomeStatus,
          s.status,
          String(s.reuseCount),
          s.createdAt.toISOString(),
        ]);
        break;
      }

      case 'outcomes': {
        const outcomes = await prisma.innovationOutcome.findMany({
          include: {
            project: { select: { title: true } },
          },
          orderBy: { registeredAt: 'desc' },
          take: 1000,
        });

        headers = [
          'ID',
          'Project Title',
          'Outcome Type',
          'Verified',
          'Registered At',
        ];

        rows = outcomes.map((o) => [
          o.id,
          o.project?.title || o.projectId,
          o.outcomeType,
          o.isVerified ? 'VERIFIED' : 'UNVERIFIED',
          o.registeredAt.toISOString(),
        ]);
        break;
      }

      default:
        throw new ValidationError(`Unsupported export type: ${params.type}. Valid types are: challenges, projects, solutions, outcomes`);
    }

    const csvLines = [
      headers.map(this.escapeCsv).join(','),
      ...rows.map((row) => row.map(this.escapeCsv).join(',')),
    ];
    const csv = csvLines.join('\r\n');

    // Record audit trail
    await AuditService.record({
      actorId: user.id,
      actorRole: user.role,
      action: AuditAction.REPORT_EXPORTED,
      resource: 'REPORT',
      resourceId: params.type,
      newState: {
        type: params.type,
        rowCount: rows.length,
        category: params.category,
        status: params.status,
        district: params.district,
        state: params.state,
      },
      requestId: params.requestId,
      ipAddress: params.ipAddress,
    });

    return {
      filename,
      csv,
      rowCount: rows.length,
    };
  }
}
