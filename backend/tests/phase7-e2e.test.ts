import { SearchService } from '../src/modules/search/search.service';
import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { GeospatialService } from '../src/modules/geospatial/geospatial.service';
import { ReportsService } from '../src/modules/reports/reports.service';
import {
  UserRole,
  ChallengeStatus,
  SeverityLevel,
  PriorityLevel,
  ProjectStatus,
  SolutionMemoryStatus,
  OrganizationType,
  AuditAction,
} from '@sicp/shared';
import { hasPermission } from '../src/domain/permissions/permissions.matrix';
import { prisma } from '../src/database/prisma';
import { AuditService } from '../src/modules/audit/audit.service';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    challenge: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    project: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
    solutionMemory: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    organization: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    facultyProfile: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    projectPrototype: {
      count: jest.fn(),
    },
    projectTestExecution: {
      count: jest.fn(),
    },
    projectPilot: {
      count: jest.fn(),
    },
    projectDeployment: {
      count: jest.fn(),
    },
    projectOutcomeVerification: {
      count: jest.fn(),
    },
    innovationOutcome: {
      count: jest.fn(),
      findMany: jest.fn(),
      groupBy: jest.fn(),
    },
    multidisciplinaryTeam: {
      count: jest.fn(),
    },
    industryPartnership: {
      count: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock('../src/modules/audit/audit.service', () => ({
  AuditService: {
    record: jest.fn().mockResolvedValue({ id: 'audit-phase7-e2e' }),
  },
}));

describe('SICP Phase 7 — Full Productization, Hardening & End-to-End Governance E2E', () => {
  const citizenUser = {
    id: 'user-cit-001',
    email: 'citizen.patel@gmail.com',
    role: UserRole.CITIZEN,
  };

  const officerUser = {
    id: 'user-gov-001',
    email: 'collector.nalgonda@telangana.gov.in',
    role: UserRole.GOVERNMENT_OFFICER,
  };

  const adminUser = {
    id: 'user-adm-001',
    email: 'admin@sicp.gov.in',
    role: UserRole.SYSTEM_ADMIN,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('verifies RBAC matrix grants and restricts Phase 7 permissions correctly across roles', () => {
    // Reports export permissions
    expect(hasPermission(UserRole.CITIZEN, 'reports:export')).toBe(true);
    expect(hasPermission(UserRole.GOVERNMENT_OFFICER, 'reports:export')).toBe(true);
    expect(hasPermission(UserRole.UNIVERSITY_ADMIN, 'reports:export')).toBe(true);
    expect(hasPermission(UserRole.SYSTEM_ADMIN, 'reports:export')).toBe(true);

    // Audit viewing is restricted to governance officers and admins
    expect(hasPermission(UserRole.CITIZEN, 'audit:view')).toBe(false);
    expect(hasPermission(UserRole.GOVERNMENT_OFFICER, 'audit:view')).toBe(true);
    expect(hasPermission(UserRole.SYSTEM_ADMIN, 'audit:view')).toBe(true);
  });

  it('executes complete Phase 7 loop: Search -> Geospatial Hotspots -> Analytics -> RFC 4180 CSV Export', async () => {
    // 1. Mock Global Search Data
    (prisma.challenge.count as jest.Mock).mockResolvedValue(1);
    (prisma.project.count as jest.Mock).mockResolvedValue(1);
    (prisma.solutionMemory.count as jest.Mock).mockResolvedValue(1);
    (prisma.organization.count as jest.Mock).mockResolvedValue(1);
    (prisma.facultyProfile.count as jest.Mock).mockResolvedValue(0);

    (prisma.challenge.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'chal-fluoride-101',
        title: 'Endemic Fluoride Contamination in Nalgonda Basin',
        description: 'Excessive fluoride levels causing severe fluorosis in 12 villages',
        category: 'Water Supply',
        severity: SeverityLevel.CATASTROPHIC,
        priority: PriorityLevel.CRITICAL,
        status: ChallengeStatus.DEPLOYED,
        district: 'Nalgonda',
        state: 'Telangana',
        latitude: 17.05,
        longitude: 79.26,
        affectedPopulation: 45000,
        isSystemic: true,
        createdAt: new Date('2026-01-15T00:00:00.000Z'),
      },
    ]);

    (prisma.project.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'proj-solar-fluoride-01',
        title: 'Solar Multi-Stage Electrodialysis Plant',
        description: 'Community drinking water treatment unit',
        status: ProjectStatus.DEPLOYMENT,
        createdAt: new Date('2026-02-10T00:00:00.000Z'),
        leadingOrg: { id: 'org-iit-hyd', name: 'IIT Hyderabad', type: OrganizationType.UNIVERSITY },
      },
    ]);

    (prisma.solutionMemory.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'sol-fluoride-blueprint',
        title: 'Solar Electrodialysis Reversal Blueprint',
        summary: 'Decentralized rural drinking water purification',
        problemSummary: 'High salinity and fluoride groundwater',
        challengeCategory: 'Water Supply',
        reusabilityClass: 'HIGHLY_REUSABLE',
        evidenceLevel: 'VERIFIED',
        outcomeStatus: 'SUCCESSFUL',
        status: SolutionMemoryStatus.PUBLISHED,
        reuseCount: 4,
        createdAt: new Date('2026-03-01T00:00:00.000Z'),
      },
    ]);

    (prisma.organization.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'org-iit-hyd',
        name: 'IIT Hyderabad',
        slug: 'iit-hyderabad',
        type: OrganizationType.UNIVERSITY,
        verificationStatus: 'VERIFIED',
        createdAt: new Date('2025-01-01T00:00:00.000Z'),
      },
    ]);

    (prisma.facultyProfile.findMany as jest.Mock).mockResolvedValue([]);

    // 2. Execute Global Search
    const searchRes = await SearchService.search({ q: 'Fluoride', type: 'all' }, citizenUser);
    expect(searchRes.total).toBe(4);
    expect(searchRes.counts.challenges).toBe(1);
    expect(searchRes.counts.projects).toBe(1);
    expect(searchRes.counts.solutions).toBe(1);
    expect(searchRes.results.length).toBe(4);
    expect(searchRes.results[0].title).toBe('Endemic Fluoride Contamination in Nalgonda Basin');

    // 3. Execute Geospatial Intelligence Aggregation
    const geoPoints = await GeospatialService.getPoints({ category: 'Water' });
    expect(geoPoints.total).toBe(1);
    expect(geoPoints.points[0].latitude).toBe(17.05);
    expect(geoPoints.points[0].isSystemic).toBe(true);

    const geoClusters = await GeospatialService.getClusters({});
    expect(geoClusters.totalDistricts).toBe(1);
    expect(geoClusters.clusters[0].district).toBe('Nalgonda');
    expect(geoClusters.clusters[0].systemicCount).toBe(1);
    expect(geoClusters.clusters[0].totalAffectedPopulation).toBe(45000);

    // 4. Execute Platform Analytics Aggregation
    (prisma.challenge.groupBy as jest.Mock)
      .mockResolvedValueOnce([{ status: 'DEPLOYED', _count: { status: 1 } }])
      .mockResolvedValueOnce([{ severity: 'CATASTROPHIC', _count: { severity: 1 } }])
      .mockResolvedValueOnce([{ priority: 'CRITICAL', _count: { priority: 1 } }])
      .mockResolvedValueOnce([{ category: 'Water Supply', _count: { category: 1 } }]);

    (prisma.challenge.aggregate as jest.Mock).mockResolvedValue({
      _sum: { affectedPopulation: 45000 },
    });

    (prisma.project.groupBy as jest.Mock).mockResolvedValue([{ status: 'DEPLOYMENT', _count: { status: 1 } }]);
    (prisma.project.aggregate as jest.Mock).mockResolvedValue({ _sum: { budget: 1500000 } });
    (prisma.projectPrototype.count as jest.Mock).mockResolvedValue(1);
    (prisma.projectTestExecution.count as jest.Mock).mockResolvedValue(3);
    (prisma.projectPilot.count as jest.Mock).mockResolvedValue(1);
    (prisma.projectDeployment.count as jest.Mock).mockResolvedValue(1);
    (prisma.projectOutcomeVerification.count as jest.Mock).mockResolvedValue(1);
    (prisma.solutionMemory.count as jest.Mock).mockResolvedValue(1);
    (prisma.innovationOutcome.groupBy as jest.Mock).mockResolvedValue([
      { outcomeType: 'SOCIAL_IMPACT', _count: { outcomeType: 1 } },
    ]);
    (prisma.organization.count as jest.Mock).mockResolvedValueOnce(1).mockResolvedValueOnce(1);
    (prisma.multidisciplinaryTeam.count as jest.Mock).mockResolvedValue(1);
    (prisma.industryPartnership.count as jest.Mock).mockResolvedValue(1);

    const analytics = await AnalyticsService.getPlatformAnalytics();
    expect(analytics.dataAuthenticity).toBe('REAL_DATABASE_AGGREGATION');
    expect(analytics.isSampleEmpty).toBe(false);
    expect(analytics.impact.totalAffectedPopulation).toBe(45000);
    expect(analytics.projects.totalBudgetAllocated).toBe(1500000);

    // 5. Execute RFC 4180 CSV Reports Export with Audit Trail
    const exportResult = await ReportsService.exportCsv(
      {
        type: 'challenges',
        category: 'Water Supply',
        requestId: 'req-e2e-exp',
        ipAddress: '10.0.0.1',
      },
      officerUser
    );

    expect(exportResult.rowCount).toBe(1);
    expect(exportResult.filename).toContain('sicp-challenges-report-');
    expect(exportResult.csv).toContain('chal-fluoride-101');
    expect(exportResult.csv).toContain('Nalgonda');
    expect(exportResult.csv).toContain('YES'); // Is Systemic

    expect(AuditService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: AuditAction.REPORT_EXPORTED,
        resource: 'REPORT',
        resourceId: 'challenges',
        actorId: officerUser.id,
      })
    );
  });
});
