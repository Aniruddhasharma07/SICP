import { AnalyticsService } from '../src/modules/analytics/analytics.service';
import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    challenge: {
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    project: {
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
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
    solutionMemory: {
      count: jest.fn(),
    },
    innovationOutcome: {
      groupBy: jest.fn(),
    },
    organization: {
      count: jest.fn(),
    },
    multidisciplinaryTeam: {
      count: jest.fn(),
    },
    industryPartnership: {
      count: jest.fn(),
    },
  },
}));

describe('AnalyticsService - Platform-Wide Metric Aggregations & Disclosures', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('computes honest database aggregations across challenges, projects, innovation, and impact', async () => {
    (prisma.challenge.count as jest.Mock)
      .mockResolvedValueOnce(25) // total
      .mockResolvedValueOnce(4); // systemic

    (prisma.challenge.groupBy as jest.Mock)
      .mockResolvedValueOnce([
        { status: 'APPROVED', _count: { status: 10 } },
        { status: 'DEPLOYED', _count: { status: 5 } },
      ])
      .mockResolvedValueOnce([
        { severity: 'SEVERE', _count: { severity: 12 } },
      ])
      .mockResolvedValueOnce([
        { priority: 'HIGH', _count: { priority: 15 } },
      ])
      .mockResolvedValueOnce([
        { category: 'Water Supply', _count: { category: 14 } },
        { category: 'Energy', _count: { category: 11 } },
      ]);

    (prisma.challenge.aggregate as jest.Mock).mockResolvedValue({
      _sum: { affectedPopulation: 125000 },
    });

    (prisma.challenge.findMany as jest.Mock)
      .mockResolvedValueOnce([{ district: 'Pune' }, { district: 'Nagpur' }]) // districts
      .mockResolvedValueOnce([{ state: 'Maharashtra' }]); // states

    (prisma.project.count as jest.Mock).mockResolvedValue(12);
    (prisma.project.groupBy as jest.Mock).mockResolvedValue([
      { status: 'ACTIVE', _count: { status: 8 } },
      { status: 'COMPLETED', _count: { status: 4 } },
    ]);
    (prisma.project.aggregate as jest.Mock).mockResolvedValue({
      _sum: { budget: 4500000 },
    });

    (prisma.projectPrototype.count as jest.Mock).mockResolvedValue(7);
    (prisma.projectTestExecution.count as jest.Mock).mockResolvedValue(14);
    (prisma.projectPilot.count as jest.Mock).mockResolvedValue(5);
    (prisma.projectDeployment.count as jest.Mock).mockResolvedValue(3);
    (prisma.projectOutcomeVerification.count as jest.Mock).mockResolvedValue(2);
    (prisma.solutionMemory.count as jest.Mock).mockResolvedValue(4);

    (prisma.innovationOutcome.groupBy as jest.Mock).mockResolvedValue([
      { outcomeType: 'PATENT_FILED', _count: { outcomeType: 2 } },
      { outcomeType: 'STARTUP_CREATED', _count: { outcomeType: 1 } },
    ]);

    (prisma.organization.count as jest.Mock)
      .mockResolvedValueOnce(6) // universities
      .mockResolvedValueOnce(9); // industry partners

    (prisma.multidisciplinaryTeam.count as jest.Mock).mockResolvedValue(8);
    (prisma.industryPartnership.count as jest.Mock).mockResolvedValue(5);

    const result = await AnalyticsService.getPlatformAnalytics();

    expect(result.dataAuthenticity).toBe('REAL_DATABASE_AGGREGATION');
    expect(result.isSampleEmpty).toBe(false);
    expect(result.challenges.total).toBe(25);
    expect(result.challenges.systemicCount).toBe(4);
    expect(result.challenges.byStatus.APPROVED).toBe(10);
    expect(result.challenges.topCategories[0].category).toBe('Water Supply');
    expect(result.projects.total).toBe(12);
    expect(result.projects.totalBudgetAllocated).toBe(4500000);
    expect(result.innovation.prototypesCount).toBe(7);
    expect(result.innovation.verifiedOutcomesCount).toBe(2);
    expect(result.institutions.universitiesCount).toBe(6);
    expect(result.institutions.industryPartnersCount).toBe(9);
    expect(result.impact.totalAffectedPopulation).toBe(125000);
    expect(result.impact.districtsCovered).toBe(2);
    expect(result.impact.statesCovered).toBe(1);
  });

  it('handles empty database truthfully without hallucinating fake stats', async () => {
    (prisma.challenge.count as jest.Mock).mockResolvedValue(0);
    (prisma.challenge.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.challenge.aggregate as jest.Mock).mockResolvedValue({ _sum: { affectedPopulation: null } });
    (prisma.challenge.findMany as jest.Mock).mockResolvedValue([]);

    (prisma.project.count as jest.Mock).mockResolvedValue(0);
    (prisma.project.groupBy as jest.Mock).mockResolvedValue([]);
    (prisma.project.aggregate as jest.Mock).mockResolvedValue({ _sum: { budget: null } });

    (prisma.projectPrototype.count as jest.Mock).mockResolvedValue(0);
    (prisma.projectTestExecution.count as jest.Mock).mockResolvedValue(0);
    (prisma.projectPilot.count as jest.Mock).mockResolvedValue(0);
    (prisma.projectDeployment.count as jest.Mock).mockResolvedValue(0);
    (prisma.projectOutcomeVerification.count as jest.Mock).mockResolvedValue(0);
    (prisma.solutionMemory.count as jest.Mock).mockResolvedValue(0);
    (prisma.innovationOutcome.groupBy as jest.Mock).mockResolvedValue([]);

    (prisma.organization.count as jest.Mock).mockResolvedValue(0);
    (prisma.multidisciplinaryTeam.count as jest.Mock).mockResolvedValue(0);
    (prisma.industryPartnership.count as jest.Mock).mockResolvedValue(0);

    const result = await AnalyticsService.getPlatformAnalytics();

    expect(result.dataAuthenticity).toBe('REAL_DATABASE_AGGREGATION');
    expect(result.isSampleEmpty).toBe(true);
    expect(result.challenges.total).toBe(0);
    expect(result.projects.total).toBe(0);
    expect(result.impact.totalAffectedPopulation).toBe(0);
  });
});
