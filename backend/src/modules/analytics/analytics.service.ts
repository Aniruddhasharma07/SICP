import { prisma } from '../../database/prisma';

export interface PlatformAnalyticsResponse {
  dataAuthenticity: 'REAL_DATABASE_AGGREGATION';
  timestamp: string;
  isSampleEmpty: boolean;
  challenges: {
    total: number;
    systemicCount: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    byPriority: Record<string, number>;
    topCategories: Array<{ category: string; count: number }>;
  };
  projects: {
    total: number;
    byStatus: Record<string, number>;
    totalBudgetAllocated: number;
  };
  innovation: {
    prototypesCount: number;
    testExecutionsCount: number;
    pilotsCount: number;
    deploymentsCount: number;
    verifiedOutcomesCount: number;
    publishedSolutionMemories: number;
    outcomesByType: Record<string, number>;
  };
  institutions: {
    universitiesCount: number;
    industryPartnersCount: number;
    teamsCount: number;
    activePartnershipsCount: number;
  };
  impact: {
    totalAffectedPopulation: number;
    districtsCovered: number;
    statesCovered: number;
  };
}

export class AnalyticsService {
  public static async getPlatformAnalytics(): Promise<PlatformAnalyticsResponse> {
    // 1. Challenges
    const [
      totalChallenges,
      systemicCount,
      challengesByStatusRaw,
      challengesBySeverityRaw,
      challengesByPriorityRaw,
      challengesByCategoryRaw,
      affectedPopulationSum,
      districtsRaw,
      statesRaw,
    ] = await Promise.all([
      prisma.challenge.count({ where: { deletedAt: null } }),
      prisma.challenge.count({ where: { isSystemic: true, deletedAt: null } }),
      prisma.challenge.groupBy({
        by: ['status'],
        _count: { status: true },
        where: { deletedAt: null },
      }),
      prisma.challenge.groupBy({
        by: ['severity'],
        _count: { severity: true },
        where: { deletedAt: null },
      }),
      prisma.challenge.groupBy({
        by: ['priority'],
        _count: { priority: true },
        where: { deletedAt: null },
      }),
      prisma.challenge.groupBy({
        by: ['category'],
        _count: { category: true },
        where: { deletedAt: null },
        orderBy: { _count: { category: 'desc' } },
        take: 8,
      }),
      prisma.challenge.aggregate({
        _sum: { affectedPopulation: true },
        where: { deletedAt: null },
      }),
      prisma.challenge.findMany({
        where: { district: { not: null }, deletedAt: null },
        select: { district: true },
        distinct: ['district'],
      }),
      prisma.challenge.findMany({
        where: { state: { not: null }, deletedAt: null },
        select: { state: true },
        distinct: ['state'],
      }),
    ]);

    // 2. Projects
    const [totalProjects, projectsByStatusRaw, projectBudgetSum] = await Promise.all([
      prisma.project.count(),
      prisma.project.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
      prisma.project.aggregate({
        _sum: { budget: true },
      }),
    ]);

    // 3. Innovation & Outcomes
    const [
      prototypesCount,
      testExecutionsCount,
      pilotsCount,
      deploymentsCount,
      verifiedOutcomesCount,
      publishedSolutionMemories,
      outcomesByTypeRaw,
    ] = await Promise.all([
      prisma.projectPrototype.count(),
      prisma.projectTestExecution.count(),
      prisma.projectPilot.count(),
      prisma.projectDeployment.count(),
      prisma.projectOutcomeVerification.count({ where: { status: 'VERIFIED' } }),
      prisma.solutionMemory.count({ where: { status: 'PUBLISHED' } }),
      prisma.innovationOutcome.groupBy({
        by: ['outcomeType'],
        _count: { outcomeType: true },
      }),
    ]);

    // 4. Institutions & Collaboration
    const [
      universitiesCount,
      industryPartnersCount,
      teamsCount,
      activePartnershipsCount,
    ] = await Promise.all([
      prisma.organization.count({ where: { type: 'UNIVERSITY' } }),
      prisma.organization.count({
        where: {
          type: { in: ['INDUSTRY', 'STARTUP', 'MSME', 'CSR'] },
        },
      }),
      prisma.multidisciplinaryTeam.count(),
      prisma.industryPartnership.count({ where: { status: 'CONFIRMED' } }),
    ]);

    // Format Maps
    const byStatus: Record<string, number> = {};
    for (const item of challengesByStatusRaw) {
      byStatus[item.status] = item._count.status;
    }

    const bySeverity: Record<string, number> = {};
    for (const item of challengesBySeverityRaw) {
      bySeverity[item.severity] = item._count.severity;
    }

    const byPriority: Record<string, number> = {};
    for (const item of challengesByPriorityRaw) {
      byPriority[item.priority] = item._count.priority;
    }

    const topCategories = challengesByCategoryRaw.map((c) => ({
      category: c.category,
      count: c._count.category,
    }));

    const projectByStatus: Record<string, number> = {};
    for (const item of projectsByStatusRaw) {
      projectByStatus[item.status] = item._count.status;
    }

    const outcomesByType: Record<string, number> = {};
    for (const item of outcomesByTypeRaw) {
      outcomesByType[item.outcomeType] = item._count.outcomeType;
    }

    const isSampleEmpty = totalChallenges === 0 && totalProjects === 0;

    return {
      dataAuthenticity: 'REAL_DATABASE_AGGREGATION',
      timestamp: new Date().toISOString(),
      isSampleEmpty,
      challenges: {
        total: totalChallenges,
        systemicCount,
        byStatus,
        bySeverity,
        byPriority,
        topCategories,
      },
      projects: {
        total: totalProjects,
        byStatus: projectByStatus,
        totalBudgetAllocated: Number(projectBudgetSum._sum.budget || 0),
      },
      innovation: {
        prototypesCount,
        testExecutionsCount,
        pilotsCount,
        deploymentsCount,
        verifiedOutcomesCount,
        publishedSolutionMemories,
        outcomesByType,
      },
      institutions: {
        universitiesCount,
        industryPartnersCount,
        teamsCount,
        activePartnershipsCount,
      },
      impact: {
        totalAffectedPopulation: affectedPopulationSum._sum.affectedPopulation || 0,
        districtsCovered: districtsRaw.length,
        statesCovered: statesRaw.length,
      },
    };
  }
}
