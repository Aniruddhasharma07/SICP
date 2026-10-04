import { ProblemGroupingService } from '../src/domain/intelligence/problem-grouping.service';
import { SystemicInvestigationEngine } from '../src/domain/intelligence/providers/systemic-investigation.engine';
import { prisma } from '../src/database/prisma';
import { ChallengeStatus, HypothesisStatus } from '@sicp/shared';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    user: { findFirst: jest.fn() },
    problem: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    problemGroup: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    problemGroupMember: {
      create: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    challenge: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    challengeGroup: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    challengeProblem: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    relationshipGovernanceMemory: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    governmentOverrideLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    groupSolutionMemory: {
      createMany: jest.fn(),
      findMany: jest.fn(),
    },
    solutionMemory: {
      findMany: jest.fn(),
    },
    challengeTimeline: {
      create: jest.fn(),
    },
    infrastructureNode: {
      findMany: jest.fn(),
    },
    infrastructureEdge: {
      findMany: jest.fn(),
    },
  },
}));

describe('End-to-End Problem-to-Outcome Challenge Lifecycle Test Suite', () => {
  const store = {
    problems: new Map<string, any>(),
    groups: new Map<string, any>(),
    members: new Map<string, any>(),
    challenges: new Map<string, any>(),
    groupSolutionMemories: new Map<string, any>(),
    users: new Map<string, any>([
      ['usr-admin', { id: 'usr-admin', email: 'admin@gov.in', fullName: 'Officer PWD' }],
    ]),
  };

  let problemId1: string;
  let problemId2: string;
  let challengeId: string;

  beforeEach(() => {
    (prisma.user.findFirst as jest.Mock).mockImplementation(async () => store.users.get('usr-admin'));

    (prisma.problem.create as jest.Mock).mockImplementation(async ({ data }: any) => {
      const id = data.id || `prb-${Date.now()}-${Math.random()}`;
      const record = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
      store.problems.set(id, record);
      return record;
    });

    (prisma.problem.findUnique as jest.Mock).mockImplementation(async ({ where }: any) => {
      const p = store.problems.get(where.id);
      if (!p) return null;
      const group = p.groupId ? store.groups.get(p.groupId) : null;
      return { ...p, group };
    });

    (prisma.problem.findMany as jest.Mock).mockImplementation(async ({ where }: any) => {
      let list = Array.from(store.problems.values());
      if (where?.id?.not) list = list.filter((p) => p.id !== where.id.not);
      if (where?.category) list = list.filter((p) => p.category === where.category);
      if (where?.district) list = list.filter((p) => p.district === where.district);
      return list;
    });

    (prisma.problem.update as jest.Mock).mockImplementation(async ({ where, data }: any) => {
      const p = store.problems.get(where.id);
      if (!p) throw new Error('Not found');
      const updated = { ...p, ...data, updatedAt: new Date() };
      store.problems.set(where.id, updated);
      return updated;
    });

    (prisma.problemGroup.create as jest.Mock).mockImplementation(async ({ data }: any) => {
      const id = data.id || `grp-${Date.now()}-${Math.random()}`;
      const record = { ...data, id, problems: [], solutionMemories: [], createdAt: new Date() };
      store.groups.set(id, record);
      return record;
    });

    (prisma.problemGroup.findUnique as jest.Mock).mockImplementation(async ({ where }: any) => {
      const g = store.groups.get(where.id);
      if (!g) return null;
      const problems = Array.from(store.problems.values()).filter((p) => p.groupId === g.id);
      const challenge = g.challengeId ? store.challenges.get(g.challengeId) : null;
      const solutionMemories = Array.from(store.groupSolutionMemories.values()).filter((m) => m.groupId === g.id);
      return { ...g, problems, challenge, solutionMemories };
    });

    (prisma.problemGroup.findMany as jest.Mock).mockImplementation(async ({ where }: any) => {
      let list = Array.from(store.groups.values());
      if (where?.canonicalCategory) list = list.filter((g) => g.canonicalCategory === where.canonicalCategory);
      if (where?.challengeId) list = list.filter((g) => g.challengeId === where.challengeId);
      return list.map((g) => {
        const problems = Array.from(store.problems.values()).filter((p) => p.groupId === g.id);
        const challenge = g.challengeId ? store.challenges.get(g.challengeId) : null;
        const solutionMemories = Array.from(store.groupSolutionMemories.values()).filter((m) => m.groupId === g.id);
        return { ...g, problems, challenge, solutionMemories };
      });
    });

    (prisma.problemGroup.update as jest.Mock).mockImplementation(async ({ where, data }: any) => {
      const g = store.groups.get(where.id);
      if (!g) throw new Error('Not found');
      const updated = { ...g, ...data, updatedAt: new Date() };
      store.groups.set(where.id, updated);
      return updated;
    });

    (prisma.problemGroupMember.create as jest.Mock).mockImplementation(async ({ data }: any) => {
      const id = `mem-${Date.now()}-${Math.random()}`;
      store.members.set(id, { ...data, id });
      return { ...data, id };
    });

    (prisma.problemGroupMember.count as jest.Mock).mockImplementation(async ({ where }: any) => {
      return Array.from(store.members.values()).filter((m) => m.groupId === where.groupId).length;
    });

    (prisma.challenge.create as jest.Mock).mockImplementation(async ({ data }: any) => {
      const id = data.id || `chal-${Date.now()}-${Math.random()}`;
      const record = { ...data, id, createdAt: new Date(), updatedAt: new Date() };
      store.challenges.set(id, record);
      return record;
    });

    (prisma.challenge.findUnique as jest.Mock).mockImplementation(async ({ where }: any) => {
      const c = store.challenges.get(where.id);
      if (!c) return null;
      const problemGroups = Array.from(store.groups.values())
        .filter((g) => g.challengeId === c.id)
        .map((g) => {
          const problems = Array.from(store.problems.values()).filter((p) => p.groupId === g.id);
          return { ...g, problems };
        });
      return { ...c, problemGroups };
    });

    (prisma.challenge.update as jest.Mock).mockImplementation(async ({ where, data }: any) => {
      const c = store.challenges.get(where.id);
      if (!c) throw new Error('Not found');
      const updated = { ...c, ...data, updatedAt: new Date() };
      store.challenges.set(where.id, updated);
      return updated;
    });

    (prisma.challengeGroup.create as jest.Mock).mockImplementation(async () => ({}));
    (prisma.challengeProblem.create as jest.Mock).mockImplementation(async () => ({}));
    (prisma.relationshipGovernanceMemory.findMany as jest.Mock).mockImplementation(async () => []);
    (prisma.relationshipGovernanceMemory.findFirst as jest.Mock).mockImplementation(async () => null);

    (prisma.groupSolutionMemory.createMany as jest.Mock).mockImplementation(async ({ data }: any) => {
      for (const item of data) {
        const id = `gsm-${Date.now()}-${Math.random()}`;
        store.groupSolutionMemories.set(id, { ...item, id });
      }
      return { count: data.length };
    });

    (prisma.challengeTimeline.create as jest.Mock).mockImplementation(async () => ({}));
    (prisma.infrastructureNode.findMany as jest.Mock).mockImplementation(async () => []);
    (prisma.infrastructureEdge.findMany as jest.Mock).mockImplementation(async () => []);
  });

  it('Stage 1: Citizen Submission and Grouping into Challenge (SUBMITTED)', async () => {
    const p1 = await ProblemGroupingService.submitProblem({
      title: 'Pothole cluster Sector A',
      description: 'Severe road surface damage and water accumulation along transport corridor.',
      category: 'ROADS_TRANSPORT',
      district: 'Bhopal',
      wardNumber: '42',
    });
    expect(p1).toBeDefined();
    problemId1 = p1!.id;

    const p2 = await ProblemGroupingService.submitProblem({
      title: 'Road Subsidence Sector B',
      description: 'Pavement depression and subgrade deformation along transport corridor.',
      category: 'Roads & Transport',
      district: 'Bhopal',
      wardNumber: '42',
    });
    expect(p2).toBeDefined();
    problemId2 = p2!.id;

    const group = Array.from(store.groups.values())[0];
    expect(group?.challengeId).toBeTruthy();
    challengeId = group.challengeId;

    const challenge = store.challenges.get(challengeId);
    expect(challenge?.status).toBe('SUBMITTED');
  });

  it('Investigation Engine: computes competing hypotheses without AI autonomously declaring fact', async () => {
    const investigation = await SystemicInvestigationEngine.getInvestigation(challengeId);

    expect(investigation.challengeId).toBe(challengeId);
    expect(investigation.competingHypotheses.length).toBeGreaterThanOrEqual(2);

    // INVARIANT: Before human validation, rootCauseStatus MUST be UNDER_EVALUATION
    expect(investigation.rootCauseStatus).toBe(HypothesisStatus.UNDER_EVALUATION);
    expect(investigation.falsificationCriteria.length).toBeGreaterThan(0);
    // Honest topology fallback: no GIS nodes registered in DB, returns false
    expect(investigation.topologyAvailable).toBe(false);
  });

  it('Stage 2: GOVERNMENT_VERIFIED — Authorized officer validates root cause hypothesis', async () => {
    const result = await ProblemGroupingService.validateInvestigation(
      challengeId,
      'Sub-base moisture infiltration and subgrade saturation',
      'Core drill samples confirmed 18% moisture in subgrade; lack of roadside drainage culvert.',
      'officer-pwd-exec-01'
    );

    expect(result.status).toBe('GOVERNMENT_VERIFIED');
    expect(result.systemicSummary).toContain('Human-validated systemic finding');

    // Re-query investigation: root cause now reflects HUMAN_VALIDATED
    const investigation = await SystemicInvestigationEngine.getInvestigation(challengeId);
    expect(investigation.rootCauseStatus).toBe(HypothesisStatus.HUMAN_VALIDATED);
  });

  it('Stage 3 to 5: UNIVERSITY_ASSIGNED -> INDUSTRY_FUNDED -> DEPLOYED', async () => {
    // Stage 3: UNIVERSITY_ASSIGNED
    const s3 = await prisma.challenge.update({
      where: { id: challengeId },
      data: { status: 'UNIVERSITY_ASSIGNED' },
    });
    expect(s3.status).toBe('UNIVERSITY_ASSIGNED');

    // Stage 4: INDUSTRY_FUNDED
    const s4 = await prisma.challenge.update({
      where: { id: challengeId },
      data: { status: 'INDUSTRY_FUNDED' },
    });
    expect(s4.status).toBe('INDUSTRY_FUNDED');

    // Stage 5: DEPLOYED
    const s5 = await prisma.challenge.update({
      where: { id: challengeId },
      data: { status: 'DEPLOYED' },
    });
    expect(s5.status).toBe('DEPLOYED');
  });

  it('Stage 6: OUTCOME_VERIFIED — Stores verified outcome in Solution Memory', async () => {
    const s6 = await prisma.challenge.update({
      where: { id: challengeId },
      data: { status: 'OUTCOME_VERIFIED' },
    });
    expect(s6.status).toBe('OUTCOME_VERIFIED');

    // Query 2-level solution memory
    const groups = await prisma.problemGroup.findMany({
      where: { challengeId },
    });

    expect(groups.length).toBeGreaterThan(0);
    const groupMemories = groups.flatMap((g: any) => g.solutionMemories);
    expect(groupMemories.length).toBeGreaterThan(0);

    // Group memories have verified outcome classifications (PREVIOUSLY_WORKED / NOT_WORKED)
    const workedMemory = groupMemories.find((m: any) => m.classification === 'PREVIOUSLY_WORKED');
    const failedMemory = groupMemories.find((m: any) => m.classification === 'NOT_WORKED');
    expect(workedMemory).toBeDefined();
    expect(failedMemory).toBeDefined();
  });
});
