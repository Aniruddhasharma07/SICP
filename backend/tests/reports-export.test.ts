import { ReportsService } from '../src/modules/reports/reports.service';
import { UserRole, ChallengeStatus, SeverityLevel, PriorityLevel, SolutionMemoryStatus, AuditAction } from '@sicp/shared';
import { prisma } from '../src/database/prisma';
import { AuditService } from '../src/modules/audit/audit.service';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    challenge: {
      findMany: jest.fn(),
    },
    project: {
      findMany: jest.fn(),
    },
    solutionMemory: {
      findMany: jest.fn(),
    },
    innovationOutcome: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock('../src/modules/audit/audit.service', () => ({
  AuditService: {
    record: jest.fn().mockResolvedValue({ id: 'audit-log-1' }),
  },
}));

describe('ReportsService - RFC 4180 CSV Export & Audit Logging', () => {
  const govUser = {
    id: 'officer-1',
    email: 'officer@gov.in',
    role: UserRole.GOVERNMENT_OFFICER,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('correctly escapes special CSV characters and commas', () => {
    expect(ReportsService.escapeCsv('Simple')).toBe('Simple');
    expect(ReportsService.escapeCsv('Has, comma')).toBe('"Has, comma"');
    expect(ReportsService.escapeCsv('Has "quotes" inside')).toBe('"Has ""quotes"" inside"');
    expect(ReportsService.escapeCsv('Has\nnewlines')).toBe('"Has\nnewlines"');
    expect(ReportsService.escapeCsv(null)).toBe('');
    expect(ReportsService.escapeCsv(undefined)).toBe('');
  });

  it('exports challenges report with audit trail', async () => {
    (prisma.challenge.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'c-exp-1',
        title: 'Road subsidence on NH-48, Sector 12',
        category: 'Roads & Infrastructure',
        severity: SeverityLevel.SEVERE,
        priority: PriorityLevel.HIGH,
        status: ChallengeStatus.APPROVED,
        district: 'Gurugram',
        state: 'Haryana',
        affectedPopulation: 25000,
        isSystemic: false,
        createdAt: new Date('2026-03-01T10:00:00.000Z'),
      },
    ]);

    const result = await ReportsService.exportCsv(
      {
        type: 'challenges',
        category: 'Roads',
        requestId: 'req-test-exp',
        ipAddress: '127.0.0.1',
      },
      govUser
    );

    expect(result.rowCount).toBe(1);
    expect(result.filename).toContain('sicp-challenges-report-');
    expect(result.csv).toContain('ID,Title,Category,Severity,Priority,Status,District,State,Affected Population,Is Systemic,Created At');
    expect(result.csv).toContain('"Road subsidence on NH-48, Sector 12"');
    expect(result.csv).toContain('Gurugram');

    expect(AuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.REPORT_EXPORTED,
        resource: 'REPORT',
        resourceId: 'challenges',
        actorId: govUser.id,
      })
    );
  });

  it('exports solutions report respecting publication visibility', async () => {
    (prisma.solutionMemory.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'sol-exp-1',
        title: 'Gravity Feed Filter',
        challengeCategory: 'Water Supply',
        reusabilityClass: 'HIGHLY_REUSABLE',
        evidenceLevel: 'VERIFIED',
        outcomeStatus: 'SUCCESSFUL',
        status: SolutionMemoryStatus.PUBLISHED,
        reuseCount: 7,
        createdAt: new Date('2026-02-15T08:00:00.000Z'),
      },
    ]);

    const result = await ReportsService.exportCsv(
      {
        type: 'solutions',
        requestId: 'req-test-sol',
      },
      govUser
    );

    expect(result.rowCount).toBe(1);
    expect(result.csv).toContain('ID,Title,Category,Reusability Class,Evidence Level,Outcome Status,Status,Reuse Count,Created At');
    expect(result.csv).toContain('Gravity Feed Filter');
    expect(result.csv).toContain('HIGHLY_REUSABLE');
  });
});
