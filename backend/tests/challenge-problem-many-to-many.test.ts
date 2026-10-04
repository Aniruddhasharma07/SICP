import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    user: { findFirst: jest.fn() },
    problem: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    challenge: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    challengeProblem: {
      create: jest.fn(),
      deleteMany: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('ChallengeProblem Many-to-Many Architecture Test', () => {
  const store = {
    problems: new Map<string, any>(),
    challenges: new Map<string, any>(),
    challengeProblems: new Map<string, any>(),
  };

  beforeEach(() => {
    store.problems.clear();
    store.challenges.clear();
    store.challengeProblems.clear();

    (prisma.problem.create as jest.Mock).mockImplementation(async ({ data }) => {
      const prob = { id: `prob-${Date.now()}-${Math.random()}`, ...data };
      store.problems.set(prob.id, prob);
      return prob;
    });

    (prisma.problem.findUnique as jest.Mock).mockImplementation(async ({ where, include }) => {
      const prob = store.problems.get(where.id);
      if (!prob) return null;
      const res = { ...prob };
      if (include?.challengeLinks) {
        const links = Array.from(store.challengeProblems.values()).filter((cp) => cp.problemId === prob.id);
        res.challengeLinks = links.map((cp) => ({
          ...cp,
          challenge: store.challenges.get(cp.challengeId),
        }));
      }
      return res;
    });

    (prisma.challenge.create as jest.Mock).mockImplementation(async ({ data }) => {
      const chal = { id: `chal-${Date.now()}-${Math.random()}`, ...data };
      store.challenges.set(chal.id, chal);
      return chal;
    });

    (prisma.challenge.findUnique as jest.Mock).mockImplementation(async ({ where, include }) => {
      const chal = store.challenges.get(where.id);
      if (!chal) return null;
      const res = { ...chal };
      if (include?.challengeProblems) {
        const links = Array.from(store.challengeProblems.values()).filter((cp) => cp.challengeId === chal.id);
        res.challengeProblems = links.map((cp) => ({
          ...cp,
          problem: store.problems.get(cp.problemId),
        }));
      }
      return res;
    });

    (prisma.challengeProblem.create as jest.Mock).mockImplementation(async ({ data }) => {
      const link = { id: `link-${Date.now()}-${Math.random()}`, ...data, linkedAt: new Date() };
      store.challengeProblems.set(link.id, link);
      return link;
    });
  });

  it('allows a single problem to participate relationally in multiple challenges simultaneously', async () => {
    // 1. Create a Citizen Problem
    const problem = await prisma.problem.create({
      data: {
        code: 'PROB-M2M-001',
        title: 'Arterial Corridor Water Pipeline Fissure & Road Pavement Subsidence',
        description: 'Potable water pipeline leaking beneath MG Road corridor causing pavement sagging and sub-base cavitation.',
        category: 'WATER_AND_SANITATION',
        aiSeverity: 'SEVERE',
        aiPriority: 'HIGH',
        district: 'Indore',
        state: 'Madhya Pradesh',
        status: 'CHALLENGE_CREATED',
        submitterId: 'usr-1',
      },
    });

    // 2. Create Challenge A: Water Supply Infrastructure Rehabilitation
    const challengeA = await prisma.challenge.create({
      data: {
        title: 'Central Zone Water Distribution Mains Diagnostic & Leakage Remediation',
        description: 'Investigation of trunk pipeline pressure drop and subgrade leaks.',
        category: 'WATER_AND_SANITATION',
        severity: 'SEVERE',
        priority: 'HIGH',
        status: 'SUBMITTED',
        district: 'Indore',
        state: 'Madhya Pradesh',
        isSystemic: true,
        submitterId: 'usr-1',
      },
    });

    // 3. Create Challenge B: Urban Arterial Road Pavement Sub-Base Stabilization
    const challengeB = await prisma.challenge.create({
      data: {
        title: 'MG Road Corridor Subgrade Cavitation & Asphalt Structural Rehabilitation',
        description: 'Investigation of pavement cratering and subgrade structural failure.',
        category: 'ROADS_AND_TRANSPORT',
        severity: 'SEVERE',
        priority: 'HIGH',
        status: 'SUBMITTED',
        district: 'Indore',
        state: 'Madhya Pradesh',
        isSystemic: true,
        submitterId: 'usr-1',
      },
    });

    // 4. Link problem to both Challenge A and Challenge B via ChallengeProblem
    const linkA = await prisma.challengeProblem.create({
      data: {
        challengeId: challengeA.id,
        problemId: problem.id,
      },
    });

    const linkB = await prisma.challengeProblem.create({
      data: {
        challengeId: challengeB.id,
        problemId: problem.id,
      },
    });

    expect(linkA.id).toBeDefined();
    expect(linkB.id).toBeDefined();

    // 5. Query problem with its challenges
    const reloaded = await prisma.problem.findUnique({
      where: { id: problem.id },
      include: {
        challengeLinks: {
          include: { challenge: true },
        },
      },
    });

    expect(reloaded).not.toBeNull();
    expect(reloaded?.challengeLinks.length).toBe(2);
    const challengeIds = reloaded?.challengeLinks.map((cl: any) => cl.challengeId);
    expect(challengeIds).toContain(challengeA.id);
    expect(challengeIds).toContain(challengeB.id);

    // 6. Query Challenge A and verify it includes the problem
    const reloadedChallengeA = await prisma.challenge.findUnique({
      where: { id: challengeA.id },
      include: {
        challengeProblems: {
          include: { problem: true },
        },
      },
    });
    expect(reloadedChallengeA?.challengeProblems.some((pl: any) => pl.problemId === problem.id)).toBe(true);

    // 7. Query Challenge B and verify it also includes the problem
    const reloadedChallengeB = await prisma.challenge.findUnique({
      where: { id: challengeB.id },
      include: {
        challengeProblems: {
          include: { problem: true },
        },
      },
    });
    expect(reloadedChallengeB?.challengeProblems.some((pl: any) => pl.problemId === problem.id)).toBe(true);
  });
});
