import { ProblemGroupingService } from '../src/domain/intelligence/problem-grouping.service';
import { prisma } from '../src/database/prisma';
import { SeverityLevel, PriorityLevel } from '@sicp/shared';

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
    },
    challengeTimeline: {
      create: jest.fn(),
    },
  },
}));

describe('Problem Grouping & Governance Memory Test Suite', () => {
  // In-memory store
  const store = {
    problems: new Map<string, any>(),
    groups: new Map<string, any>(),
    members: new Map<string, any>(),
    challenges: new Map<string, any>(),
    challengeGroups: new Map<string, any>(),
    challengeProblems: new Map<string, any>(),
    governanceMemory: new Map<string, any>(),
    overrideLogs: new Map<string, any>(),
    users: new Map<string, any>([
      ['usr-admin', { id: 'usr-admin', email: 'admin@gov.in', fullName: 'Officer PWD' }],
    ]),
  };

  let createdProblemIds: string[] = [];
  let createdGroupId: string;
  let createdChallengeId: string;

  beforeEach(() => {
    // Reset mock implementations inside beforeEach due to resetMocks: true in jest.config.js
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
      const record = { ...data, id, problems: [], createdAt: new Date() };
      store.groups.set(id, record);
      return record;
    });

    (prisma.problemGroup.findUnique as jest.Mock).mockImplementation(async ({ where }: any) => {
      const g = store.groups.get(where.id);
      if (!g) return null;
      const problems = Array.from(store.problems.values()).filter((p) => p.groupId === g.id);
      const challenge = g.challengeId ? store.challenges.get(g.challengeId) : null;
      return { ...g, problems, challenge };
    });

    (prisma.problemGroup.findMany as jest.Mock).mockImplementation(async ({ where }: any) => {
      let list = Array.from(store.groups.values());
      if (where?.canonicalCategory) list = list.filter((g) => g.canonicalCategory === where.canonicalCategory);
      if (where?.id?.notIn) list = list.filter((g) => !where.id.notIn.includes(g.id));
      if (where?.challengeId) list = list.filter((g) => g.challengeId === where.challengeId);
      if (where?.id?.not) list = list.filter((g) => g.id !== where.id.not);
      return list.map((g) => {
        const problems = Array.from(store.problems.values()).filter((p) => p.groupId === g.id);
        const challenge = g.challengeId ? store.challenges.get(g.challengeId) : null;
        return { ...g, problems, challenge };
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
      const record = { ...data, id, addedAt: new Date() };
      store.members.set(id, record);
      return record;
    });

    (prisma.problemGroupMember.count as jest.Mock).mockImplementation(async ({ where }: any) => {
      return Array.from(store.members.values()).filter((m) => m.groupId === where.groupId).length;
    });

    (prisma.problemGroupMember.deleteMany as jest.Mock).mockImplementation(async ({ where }: any) => {
      for (const [id, m] of store.members.entries()) {
        if (m.groupId === where.groupId && m.problemId === where.problemId) {
          store.members.delete(id);
        }
      }
      return { count: 1 };
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
      const problemGroups = Array.from(store.groups.values()).filter((g) => g.challengeId === c.id);
      return { ...c, problemGroups };
    });

    (prisma.challenge.update as jest.Mock).mockImplementation(async ({ where, data }: any) => {
      const c = store.challenges.get(where.id);
      if (!c) throw new Error('Not found');
      const updated = { ...c, ...data, updatedAt: new Date() };
      store.challenges.set(where.id, updated);
      return updated;
    });

    (prisma.challengeGroup.create as jest.Mock).mockImplementation(async ({ data }: any) => {
      const id = `cg-${Date.now()}-${Math.random()}`;
      store.challengeGroups.set(id, { ...data, id });
      return { ...data, id };
    });

    (prisma.challengeGroup.deleteMany as jest.Mock).mockImplementation(async ({ where }: any) => {
      for (const [id, cg] of store.challengeGroups.entries()) {
        if (cg.challengeId === where.challengeId && cg.groupId === where.groupId) {
          store.challengeGroups.delete(id);
        }
      }
      return { count: 1 };
    });

    (prisma.challengeProblem.create as jest.Mock).mockImplementation(async ({ data }: any) => {
      const id = `cp-${Date.now()}-${Math.random()}`;
      store.challengeProblems.set(id, { ...data, id });
      return { ...data, id };
    });

    (prisma.challengeProblem.deleteMany as jest.Mock).mockImplementation(async ({ where }: any) => {
      for (const [id, cp] of store.challengeProblems.entries()) {
        if (cp.challengeId === where.challengeId && where.problemId?.in?.includes(cp.problemId)) {
          store.challengeProblems.delete(id);
        }
      }
      return { count: 1 };
    });

    (prisma.relationshipGovernanceMemory.create as jest.Mock).mockImplementation(async ({ data }: any) => {
      const id = `gov-${Date.now()}-${Math.random()}`;
      const record = { ...data, id, createdAt: new Date() };
      store.governanceMemory.set(id, record);
      return record;
    });

    (prisma.relationshipGovernanceMemory.findFirst as jest.Mock).mockImplementation(async ({ where }: any) => {
      for (const m of store.governanceMemory.values()) {
        if (where.sourceEntityId === m.sourceEntityId && where.targetEntityId === m.targetEntityId) {
          return m;
        }
      }
      return null;
    });

    (prisma.relationshipGovernanceMemory.findMany as jest.Mock).mockImplementation(async ({ where }: any) => {
      return Array.from(store.governanceMemory.values()).filter(
        (m) => m.sourceEntityId === where.sourceEntityId && m.active === where.active
      );
    });

    (prisma.governmentOverrideLog.create as jest.Mock).mockImplementation(async ({ data }: any) => {
      const id = `log-${Date.now()}-${Math.random()}`;
      const record = { ...data, id, createdAt: new Date() };
      store.overrideLogs.set(id, record);
      return record;
    });

    (prisma.governmentOverrideLog.findMany as jest.Mock).mockImplementation(async ({ where }: any) => {
      return Array.from(store.overrideLogs.values()).filter((l) => l.problemId === where.problemId);
    });

    (prisma.groupSolutionMemory.createMany as jest.Mock).mockImplementation(async () => ({ count: 2 }));
    (prisma.challengeTimeline.create as jest.Mock).mockImplementation(async ({ data }: any) => ({ ...data, id: 'timeline-1' }));
  });

  it('submits problems and groups correlated incidents along a corridor into a Challenge', async () => {
    // Problem 1
    const p1 = await ProblemGroupingService.submitProblem({
      title: 'Pothole on Kolar Road Sec C',
      description: 'Severe road surface crater damaged by rain water.',
      category: 'Roads & Transport',
      district: 'Bhopal',
      latitude: 23.181,
      longitude: 77.412,
      locationName: 'Kolar Road',
      wardNumber: '42',
    });

    expect(p1).toBeDefined();
    createdProblemIds.push(p1!.id);

    // Problem 2 nearby along same road corridor
    const p2 = await ProblemGroupingService.submitProblem({
      title: 'Road Subsidence on Kolar Road Sec D',
      description: 'Asphalt cracking and waterlogging damage near bus stop.',
      category: 'ROADS_INFRASTRUCTURE',
      district: 'Bhopal',
      latitude: 23.183,
      longitude: 77.414,
      locationName: 'Kolar Road',
      wardNumber: '42',
    });

    expect(p2).toBeDefined();
    createdProblemIds.push(p2!.id);

    // Verify p2 grouped with p1
    expect(p2?.groupId).toBeTruthy();
    createdGroupId = p2!.groupId!;

    // Verify Challenge was formed for the group
    const group = store.groups.get(createdGroupId);
    expect(group?.challengeId).toBeTruthy();
    createdChallengeId = group.challengeId;
  });

  it('Swipe-to-Regroup: removes problem from group, moves it to new group in same challenge, and logs memory', async () => {
    const p1Id = createdProblemIds[0];
    expect(createdGroupId).toBeDefined();

    const result = await ProblemGroupingService.removeProblemFromGroup(
      p1Id,
      createdGroupId,
      'Officer identified distinct drainage sub-catchment',
      'test-officer-01'
    );

    expect(result.success).toBe(true);
    expect(result.oldGroupId).toBe(createdGroupId);
    expect(result.newGroupId).not.toBe(createdGroupId);

    // Verify Governance Memory was recorded in mock store
    const memory = Array.from(store.governanceMemory.values()).find(
      (m: any) => m.sourceEntityId === p1Id && m.targetEntityId === createdGroupId
    );
    expect(memory).toBeDefined();
    expect(memory?.reason).toContain('distinct drainage sub-catchment');
  });

  it('Government Override: preserves AI baseline, records override log, and updates governed values', async () => {
    const p1Id = createdProblemIds[0];
    const originalProblem = store.problems.get(p1Id);
    const originalAiSeverity = originalProblem?.aiSeverity;

    const overridden = await ProblemGroupingService.applyGovernmentOverride(p1Id, {
      severity: SeverityLevel.SEVERE,
      priority: PriorityLevel.CRITICAL,
      affectedPopulation: 65000,
      reason: 'Arterial bus transit corridor with high accident probability',
      officerId: 'gov-officer-pwd-01',
    });

    // Governed values updated
    expect(overridden.govSeverity).toBe(SeverityLevel.SEVERE);
    expect(overridden.govPriority).toBe(PriorityLevel.CRITICAL);
    expect(overridden.govAffectedPopulation).toBe(65000);
    expect(overridden.overrideReason).toContain('Arterial bus transit corridor');

    // Original AI baseline strictly preserved!
    expect(overridden.aiSeverity).toBe(originalAiSeverity);

    // Override log persisted
    const logs = Array.from(store.overrideLogs.values()).filter((l: any) => l.problemId === p1Id);
    expect(logs.length).toBeGreaterThanOrEqual(3); // severity, priority, affectedPopulation
  });

  it('Swipe-to-New-Challenge: splits group into an independent Challenge with pending investigation', async () => {
    expect(createdGroupId).toBeDefined();
    expect(createdChallengeId).toBeDefined();

    const result = await ProblemGroupingService.removeGroupFromChallenge(
      createdGroupId,
      createdChallengeId,
      'Separate municipal jurisdiction requiring dedicated public works budget',
      'gov-officer-pwd-01'
    );

    expect(result.success).toBe(true);
    expect(result.oldChallengeId).toBe(createdChallengeId);
    expect(result.newChallengeId).not.toBe(createdChallengeId);

    // Verify new Challenge has Pending Root Cause and status SUBMITTED
    const newChallenge = store.challenges.get(result.newChallengeId);
    expect(newChallenge?.status).toBe('SUBMITTED');
    expect(newChallenge?.systemicSummary).toContain('Possible Root Cause: Pending investigation');

    // Verify Governance Memory was recorded for GROUP_CHALLENGE
    const memory = Array.from(store.governanceMemory.values()).find(
      (m: any) => m.sourceEntityId === createdGroupId && m.targetEntityId === createdChallengeId
    );
    expect(memory).toBeDefined();
    expect(memory?.reason).toContain('Separate municipal jurisdiction');
  });
});
