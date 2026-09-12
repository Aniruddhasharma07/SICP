import { SolutionService } from '../src/modules/solution/solution.service';
import { SolutionRetrievalEngine } from '../src/domain/intelligence/solution-retrieval.engine';
import { AiServiceClient } from '../src/domain/intelligence/ai-service.client';
import {
  SolutionMemoryStatus,
  ReusabilityClass,
  EvidenceLevel,
  MemoryOutcomeStatus,
  UserRole,
  ProjectStatus,
  OutcomeVerificationStatus,
} from '@sicp/shared';
import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    project: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    challenge: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    solutionMemory: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    solutionMemoryApplication: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    $transaction: jest.fn(async (cb: any) => (typeof cb === 'function' ? cb(prisma) : Promise.all(cb))),
  },
}));

jest.mock('../src/jobs/queue.manager', () => ({
  QueueManager: {
    enqueueEmbeddingGeneration: jest.fn().mockResolvedValue({ jobId: 'job-1' }),
  },
}));

describe('AI Solution Memory Closed Loop - 12 Integration Scenarios', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: any) =>
      typeof cb === 'function' ? cb(prisma) : Promise.all(cb)
    );
  });

  // SCENARIO 1: Completed successful project creates a new SolutionMemory with EFFECTIVE status
  it('Scenario 1: Completed successful project creates a new SolutionMemory with EFFECTIVE status and initial application', async () => {
    const mockProject = {
      id: 'proj-water-success',
      title: 'Solar RO Desalination Pilot',
      description: 'Solar RO desalination plant in coastal fluoride village.',
      status: ProjectStatus.COMPLETED,
      challengeId: 'chal-coastal-1',
      challenge: {
        id: 'chal-coastal-1',
        title: 'High salinity in drinking water',
        description: 'Groundwater TDS exceeds 3500 ppm in coastal village.',
        category: 'WATER_SUPPLY',
        district: 'Nagapattinam',
        state: 'Tamil Nadu',
        latitude: 10.767,
        longitude: 79.842,
        impact: { problemType: 'WATER_SUPPLY', inputs: { rootCause: 'Saline aquifer ingress' } },
      },
      proposals: [{ technicalApproach: 'Containerized Solar Reverse Osmosis Membrane Plant' }],
      deployments: [{ createdAt: new Date() }],
      outcomeVerifications: [{ status: OutcomeVerificationStatus.VERIFIED }],
    };

    (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
    (prisma.solutionMemory.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.solutionMemory.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'mem-solar-ro-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
    (prisma.solutionMemoryApplication.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({ id: 'app-1', ...data, createdAt: new Date() })
    );

    const memory = await SolutionService.recordProjectOutcomeAndLearn({
      projectId: 'proj-water-success',
      dto: {
        outcomeStatus: MemoryOutcomeStatus.EFFECTIVE,
        measurableImpact: 'TDS reduced from 3500 ppm to 180 ppm across 1200 households',
        targetAchieved: true,
        successFactors: ['Community water committee', 'Pre-filter sand sedimentation'],
        contextConditions: { ruralUrban: 'RURAL', rainfall: 'HIGH', maintenanceCapacity: 'MODERATE' },
      },
      actorId: 'gov-officer-1',
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-test-1',
    });

    expect(memory).toBeDefined();
    expect(memory.outcomeStatus).toBe(MemoryOutcomeStatus.EFFECTIVE);
    expect(memory.guidanceVerdict).toBe('RECOMMEND');
    expect(memory.implementationCount).toBe(1);
    expect(memory.successCount).toBe(1);
    expect(memory.failureCount).toBe(0);
    expect(prisma.solutionMemory.create).toHaveBeenCalled();
    expect(prisma.solutionMemoryApplication.create).toHaveBeenCalled();
  });

  // SCENARIO 2: Completed failed project creates a failure SolutionMemory with INEFFECTIVE status and WARN verdict
  it('Scenario 2: Completed failed project creates a failure SolutionMemory with INEFFECTIVE status and documented failure reason', async () => {
    const mockProject = {
      id: 'proj-road-fail',
      title: 'Polymer Modified Asphalt Surface Coating',
      description: 'Polymer additive asphalt surface on waterlogged black cotton soil.',
      status: ProjectStatus.COMPLETED,
      challengeId: 'chal-road-1',
      challenge: {
        id: 'chal-road-1',
        title: 'Recurrent arterial road collapse during monsoons',
        description: 'Road surface breaks up completely within 2 months of monsoon rains.',
        category: 'CIVIC_INFRASTRUCTURE',
        district: 'Akola',
        state: 'Maharashtra',
        latitude: 20.700,
        longitude: 77.000,
        impact: { problemType: 'CIVIC_INFRASTRUCTURE', inputs: { rootCause: 'Black cotton clay subgrade swelling' } },
      },
      proposals: [{ technicalApproach: 'Top-layer polymer asphalt overlay' }],
      deployments: [{ createdAt: new Date() }],
      outcomeVerifications: [{ status: OutcomeVerificationStatus.NOT_VERIFIED }],
    };

    (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
    (prisma.solutionMemory.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.solutionMemory.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'mem-polymer-fail-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
    (prisma.solutionMemoryApplication.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({ id: 'app-fail-1', ...data, createdAt: new Date() })
    );

    const memory = await SolutionService.recordProjectOutcomeAndLearn({
      projectId: 'proj-road-fail',
      dto: {
        outcomeStatus: MemoryOutcomeStatus.INEFFECTIVE,
        measurableImpact: 'Pavement collapsed after 6 weeks of rainfall',
        targetAchieved: false,
        failureFactors: ['Lack of deep sub-base lime stabilization', 'Underlying expansive clay failure'],
        failureReason: 'Top-layer coating cannot compensate for lack of subgrade drainage and soil stabilization',
        maintenanceIssues: 'Requires frequent patching without fixing base',
      },
      actorId: 'gov-officer-1',
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-test-2',
    });

    expect(memory).toBeDefined();
    expect(memory.outcomeStatus).toBe(MemoryOutcomeStatus.INEFFECTIVE);
    expect(memory.guidanceVerdict).toBe('WARN');
    expect(memory.failureCount).toBe(1);
    expect(memory.whatFailed).toContain('Top-layer coating cannot compensate');
  });

  // SCENARIO 3: New similar problem returns successful historical solution as RECOMMEND
  it('Scenario 3: New similar problem returns successful historical solution as RECOMMEND', async () => {
    (prisma.solutionMemory.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'mem-solar-ro-1',
        title: 'Solar RO Desalination Pilot',
        summary: 'Solar powered RO unit for high salinity groundwater.',
        challengeCategory: 'WATER_SUPPLY',
        problemType: 'WATER_SUPPLY',
        problemSummary: 'Groundwater TDS exceeds 3500 ppm in coastal village.',
        rootCause: 'Saline aquifer ingress',
        technicalApproach: 'Containerized Solar Reverse Osmosis Membrane Plant',
        reusabilityScore: 85,
        reusabilityClass: ReusabilityClass.HIGHLY_REUSABLE,
        evidenceLevel: EvidenceLevel.VERIFIED,
        status: SolutionMemoryStatus.PUBLISHED,
        outcomeStatus: MemoryOutcomeStatus.EFFECTIVE,
        guidanceVerdict: 'RECOMMEND',
        implementationCount: 2,
        successCount: 2,
        failureCount: 0,
        partialCount: 0,
        whatWorked: 'Potable water verified under 200 ppm TDS',
        whatFailed: null,
        limitations: null,
        tags: ['WATER_SUPPLY'],
        locationContext: { district: 'Nagapattinam', state: 'Tamil Nadu', latitude: 10.76, longitude: 79.84 },
        applications: [
          { outcomeStatus: MemoryOutcomeStatus.EFFECTIVE },
          { outcomeStatus: MemoryOutcomeStatus.EFFECTIVE },
        ],
      },
    ]);

    const results = await SolutionRetrievalEngine.retrieveRelevantSolutions({
      title: 'Saline water contamination in coastal borewells',
      description: 'Saline ingress in village borewells after monsoon.',
      category: 'WATER_SUPPLY',
      district: 'Cuddalore',
      state: 'Tamil Nadu',
      latitude: 11.75,
      longitude: 79.76,
    });

    expect(results.length).toBeGreaterThan(0);
    const rec = results[0];
    expect(rec.guidanceVerdict).toBe('RECOMMEND');
    expect(rec.guidanceLabel).toContain('Worked Before');
    expect(rec.verifiedImpact).toBeDefined();
  });

  // SCENARIO 4: New similar problem returns failed historical solution as WARN with explicit risks
  it('Scenario 4: New similar problem returns failed historical solution as WARN with explicit risks', async () => {
    (prisma.solutionMemory.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'mem-polymer-fail-1',
        title: 'Polymer Modified Asphalt Surface Coating',
        summary: 'Surface coating on black cotton clay soil without subgrade drainage.',
        challengeCategory: 'CIVIC_INFRASTRUCTURE',
        problemType: 'CIVIC_INFRASTRUCTURE',
        problemSummary: 'Road breakdown on expansive clay soil.',
        rootCause: 'Black cotton clay subgrade swelling',
        technicalApproach: 'Top-layer polymer asphalt overlay',
        reusabilityScore: 20,
        reusabilityClass: ReusabilityClass.NOT_RECOMMENDED,
        evidenceLevel: EvidenceLevel.VERIFIED,
        status: SolutionMemoryStatus.PUBLISHED,
        outcomeStatus: MemoryOutcomeStatus.INEFFECTIVE,
        guidanceVerdict: 'WARN',
        implementationCount: 1,
        successCount: 0,
        failureCount: 1,
        partialCount: 0,
        whatWorked: null,
        whatFailed: 'Subgrade failure under monsoon inundation; top layer collapsed.',
        limitations: 'Cannot be used on expansive clay without deep subgrade stabilization',
        tags: ['CIVIC_INFRASTRUCTURE'],
        locationContext: { district: 'Akola', state: 'Maharashtra', latitude: 20.7, longitude: 77.0 },
        applications: [
          { outcomeStatus: MemoryOutcomeStatus.INEFFECTIVE, failureReason: 'Subgrade failure' },
        ],
      },
    ]);

    const results = await SolutionRetrievalEngine.retrieveRelevantSolutions({
      title: 'Potholes and structural pavement cracking on clay road',
      description: 'Road disintegrates every monsoon due to swelling black cotton soil.',
      category: 'CIVIC_INFRASTRUCTURE',
      district: 'Amravati',
      state: 'Maharashtra',
      latitude: 20.93,
      longitude: 77.75,
    });

    expect(results.length).toBeGreaterThan(0);
    const warnRec = results[0];
    expect(warnRec.guidanceVerdict).toBe('WARN');
    expect(warnRec.guidanceLabel).toContain('Failed Before');
    expect(warnRec.historicalWarning).toBeDefined();
  });

  // SCENARIO 5: Solution with mixed historical implementations returns CAUTION with failure pattern
  it('Scenario 5: Solution with mixed historical implementations returns CAUTION with failure pattern', () => {
    const guidance = SolutionRetrievalEngine.determineGuidance(
      MemoryOutcomeStatus.PARTIALLY_EFFECTIVE,
      ReusabilityClass.REQUIRES_ADAPTATION,
      { successCount: 2, failureCount: 1, partialCount: 0 },
      'Failed when municipal technician desilting was neglected for 6 months.'
    );

    expect(guidance.guidanceVerdict).toBe('CAUTION');
    expect(guidance.guidanceLabel).toContain('Mixed Results');

    const contextual = SolutionRetrievalEngine.extractContextualApplicability(
      { challengeCategory: 'WATER_SUPPLY', constraints: 'Quarterly maintenance required' },
      1,
      'Failed when municipal technician desilting was neglected for 6 months.'
    );

    expect(contextual.failurePattern).toContain('Documented precedent failure');
    expect(contextual.lessEffectiveForContext).toContain('Low-maintenance operating environments');
  });

  // SCENARIO 6: New project using an existing historical solution succeeds -> updates effectiveness profile without deleting history
  it('Scenario 6: New project using an existing historical solution succeeds -> updates profile and strengthens evidence', async () => {
    const existingMemory = {
      id: 'mem-fluoride-1',
      title: 'Activated Alumina Fluoride Filtration Unit',
      outcomeStatus: MemoryOutcomeStatus.EFFECTIVE,
      reusabilityScore: 80,
      reusabilityClass: ReusabilityClass.HIGHLY_REUSABLE,
      whatWorked: 'Phase 1 pilot reduced fluoride to 1.0 mg/L',
      whatFailed: null,
      futureWarnings: null,
      limitations: null,
      implementationCount: 1,
      successCount: 1,
      failureCount: 0,
      partialCount: 0,
      tags: ['WATER_SUPPLY'],
    };

    const newProject = {
      id: 'proj-fluoride-v2',
      title: 'Fluoride Filtration Expansion Ward 4',
      description: 'Second deployment of activated alumina unit in adjacent village.',
      status: ProjectStatus.COMPLETED,
      challengeId: 'chal-water-2',
      challenge: {
        id: 'chal-water-2',
        category: 'WATER_SUPPLY',
        title: 'Fluorosis in Ward 4',
        description: 'Excessive fluoride in school water supply.',
      },
      proposals: [{ technicalApproach: 'Activated Alumina Filtration' }],
      deployments: [{ createdAt: new Date() }],
      outcomeVerifications: [{ status: OutcomeVerificationStatus.VERIFIED }],
    };

    (prisma.project.findUnique as jest.Mock).mockResolvedValue(newProject);
    (prisma.solutionMemory.findUnique as jest.Mock).mockResolvedValue(existingMemory);
    (prisma.solutionMemoryApplication.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.solutionMemoryApplication.create as jest.Mock).mockResolvedValue({ id: 'app-2' });
    (prisma.solutionMemoryApplication.findMany as jest.Mock).mockResolvedValue([
      { outcomeStatus: MemoryOutcomeStatus.EFFECTIVE, successFactors: ['Caretaker training'] },
      { outcomeStatus: MemoryOutcomeStatus.EFFECTIVE, successFactors: ['Regular media regeneration'] },
    ]);
    (prisma.solutionMemory.update as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        ...existingMemory,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    const updated = await SolutionService.recordProjectOutcomeAndLearn({
      projectId: 'proj-fluoride-v2',
      dto: {
        existingSolutionMemoryId: 'mem-fluoride-1',
        outcomeStatus: MemoryOutcomeStatus.EFFECTIVE,
        measurableImpact: 'School water fluoride down to 0.8 mg/L',
        targetAchieved: true,
        successFactors: ['Regular media regeneration'],
      },
      actorId: 'gov-officer-1',
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-test-6',
    });

    expect(updated.implementationCount).toBe(2);
    expect(updated.successCount).toBe(2);
    expect(updated.failureCount).toBe(0);
    expect(updated.guidanceVerdict).toBe('RECOMMEND');
    expect(prisma.solutionMemory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'mem-fluoride-1' },
        data: expect.objectContaining({
          implementationCount: 2,
          successCount: 2,
        }),
      })
    );
  });

  // SCENARIO 7: New project using an existing historical solution fails -> adds failure application without deleting past success
  it('Scenario 7: New project using an existing historical solution fails -> adds failure application without deleting past success', async () => {
    const existingMemory = {
      id: 'mem-fluoride-1',
      title: 'Activated Alumina Fluoride Filtration Unit',
      outcomeStatus: MemoryOutcomeStatus.EFFECTIVE,
      reusabilityScore: 80,
      reusabilityClass: ReusabilityClass.HIGHLY_REUSABLE,
      whatWorked: 'Phase 1 pilot reduced fluoride to 1.0 mg/L in community center',
      whatFailed: null,
      futureWarnings: null,
      limitations: null,
      implementationCount: 2,
      successCount: 2,
      failureCount: 0,
      partialCount: 0,
      tags: ['WATER_SUPPLY'],
    };

    const thirdProject = {
      id: 'proj-fluoride-v3',
      title: 'Fluoride Filtration Remote Tribal Hamlet',
      description: 'Deployment in unmonitored hamlet.',
      status: ProjectStatus.COMPLETED,
      challengeId: 'chal-remote-1',
      challenge: {
        id: 'chal-remote-1',
        category: 'WATER_SUPPLY',
        title: 'Fluoride in tribal hamlet',
        description: 'No electricity and no municipal technicians.',
      },
      proposals: [{ technicalApproach: 'Activated Alumina Filtration' }],
      deployments: [{ createdAt: new Date() }],
      outcomeVerifications: [{ status: OutcomeVerificationStatus.NOT_VERIFIED }],
    };

    (prisma.project.findUnique as jest.Mock).mockResolvedValue(thirdProject);
    (prisma.solutionMemory.findUnique as jest.Mock).mockResolvedValue(existingMemory);
    (prisma.solutionMemoryApplication.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.solutionMemoryApplication.create as jest.Mock).mockResolvedValue({ id: 'app-3' });
    (prisma.solutionMemoryApplication.findMany as jest.Mock).mockResolvedValue([
      { outcomeStatus: MemoryOutcomeStatus.EFFECTIVE, successFactors: ['Caretaker training'] },
      { outcomeStatus: MemoryOutcomeStatus.EFFECTIVE, successFactors: ['Media regeneration'] },
      { outcomeStatus: MemoryOutcomeStatus.INEFFECTIVE, failureReason: 'Media saturated in 3 months; unregenerated without chemicals' },
    ]);
    (prisma.solutionMemory.update as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        ...existingMemory,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    const updated = await SolutionService.recordProjectOutcomeAndLearn({
      projectId: 'proj-fluoride-v3',
      dto: {
        existingSolutionMemoryId: 'mem-fluoride-1',
        outcomeStatus: MemoryOutcomeStatus.INEFFECTIVE,
        targetAchieved: false,
        failureReason: 'Media saturated in 3 months; unregenerated without chemicals',
        maintenanceIssues: 'Requires specialized caustic soda regeneration supply chain',
      },
      actorId: 'gov-officer-1',
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-test-7',
    });

    // History preserved: past success is NOT erased!
    expect(updated.whatWorked).toContain('Phase 1 pilot reduced fluoride');
    // Failure warning appended
    expect(updated.whatFailed).toContain('Media saturated in 3 months');
    // Overall evidence transitioned to CAUTION (Mixed evidence)
    expect(updated.implementationCount).toBe(3);
    expect(updated.successCount).toBe(2);
    expect(updated.failureCount).toBe(1);
    expect(updated.guidanceVerdict).toBe('CAUTION');
  });

  // SCENARIO 8: Problem solved with a different approach creates a distinct, separate SolutionMemory
  it('Scenario 8: Problem solved with a different approach creates a distinct, separate SolutionMemory', async () => {
    const novelProject = {
      id: 'proj-nanofiltration-1',
      title: 'Graphene Nanofiltration Membrane System',
      description: 'Novel passive graphene membrane for heavy metals and fluoride.',
      status: ProjectStatus.COMPLETED,
      challengeId: 'chal-water-novel',
      challenge: {
        id: 'chal-water-novel',
        category: 'WATER_SUPPLY',
        title: 'Heavy metal and fluoride co-contamination',
        description: 'Multi-pollutant groundwater contamination.',
      },
      proposals: [{ technicalApproach: 'Graphene Oxide Nanofiltration' }],
      deployments: [{ createdAt: new Date() }],
      outcomeVerifications: [{ status: OutcomeVerificationStatus.VERIFIED }],
    };

    (prisma.project.findUnique as jest.Mock).mockResolvedValue(novelProject);
    (prisma.solutionMemory.findFirst as jest.Mock).mockResolvedValue(null);
    (prisma.solutionMemory.create as jest.Mock).mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'mem-graphene-1',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );
    (prisma.solutionMemoryApplication.create as jest.Mock).mockResolvedValue({ id: 'app-graphene-1' });

    const newMemory = await SolutionService.recordProjectOutcomeAndLearn({
      projectId: 'proj-nanofiltration-1',
      dto: {
        outcomeStatus: MemoryOutcomeStatus.EFFECTIVE,
        actualSolutionUsed: 'Graphene Oxide Nanofiltration',
        measurableImpact: '100% removal of arsenic and 95% removal of fluoride',
        targetAchieved: true,
      },
      actorId: 'gov-officer-1',
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-test-8',
    });

    expect(newMemory.id).toBe('mem-graphene-1');
    expect(newMemory.technicalApproach).toContain('Graphene');
    expect(newMemory.guidanceVerdict).toBe('RECOMMEND');
  });

  // SCENARIO 9: Problem with no historical precedents returns NO_MEMORY (honest zero-fabrication)
  it('Scenario 9: Problem with no historical precedents returns NO_MEMORY (honest zero-fabrication)', async () => {
    (prisma.solutionMemory.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.challenge.findUnique as jest.Mock).mockResolvedValue({
      id: 'chal-quantum-crypto-civic',
      title: 'Quantum key distribution for municipal treasury ledger',
      description: 'Novel quantum communication link between district secretariats.',
      category: 'CYBERSECURITY_CIVIC',
      impact: { problemType: 'CYBERSECURITY' },
    });

    const evaluated = await SolutionService.evaluatePrecedents({
      challengeId: 'chal-quantum-crypto-civic',
      userRole: UserRole.CITIZEN,
      requestId: 'req-test-9',
    });

    expect(evaluated.guidanceVerdict).toBe('NO_MEMORY');
    expect(evaluated.precedents).toEqual([]);
    expect(evaluated.executiveSummary).toContain('novel problem configuration');
  });

  // SCENARIO 10: RBAC: Citizens cannot view non-published solution drafts
  it('Scenario 10: Non-published solution draft is hidden from Citizen view via RBAC', async () => {
    (prisma.solutionMemory.findUnique as jest.Mock).mockResolvedValue({
      id: 'mem-draft-unapproved',
      title: 'Unreviewed Prototype Memory',
      status: SolutionMemoryStatus.DRAFT,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await expect(
      SolutionService.getSolutionMemory('mem-draft-unapproved', UserRole.CITIZEN)
    ).rejects.toThrow('SolutionMemory');
  });

  // SCENARIO 11: Idempotency: Duplicate outcome verification calls update existing application rather than creating duplicates
  it('Scenario 11: Duplicate outcome verification calls update existing application rather than creating duplicate rows', async () => {
    const mockProject = {
      id: 'proj-repeat-verify',
      title: 'Solar Lighting Deployment',
      description: 'Streetlight installation across 10 villages.',
      status: ProjectStatus.COMPLETED,
      challengeId: 'chal-light-1',
      challenge: {
        id: 'chal-light-1',
        title: 'Dark village roads',
        description: 'Road safety issue due to darkness.',
        category: 'CIVIC_INFRASTRUCTURE',
      },
      proposals: [{ technicalApproach: 'Solar LED Fixtures' }],
      deployments: [{ createdAt: new Date() }],
      outcomeVerifications: [{ status: OutcomeVerificationStatus.VERIFIED }],
    };

    const existingMemory = {
      id: 'mem-light-1',
      title: 'Solution: Solar Lighting Deployment',
      projectId: 'proj-repeat-verify',
      implementationCount: 1,
      successCount: 1,
      failureCount: 0,
      partialCount: 0,
      outcomeStatus: MemoryOutcomeStatus.EFFECTIVE,
      status: SolutionMemoryStatus.PUBLISHED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingApp = {
      id: 'app-light-1',
      solutionMemoryId: 'mem-light-1',
      projectId: 'proj-repeat-verify',
      outcomeStatus: MemoryOutcomeStatus.EFFECTIVE,
    };

    (prisma.project.findUnique as jest.Mock).mockResolvedValue(mockProject);
    (prisma.solutionMemory.findFirst as jest.Mock).mockResolvedValue(existingMemory);
    (prisma.solutionMemory.findUnique as jest.Mock).mockResolvedValue(existingMemory);
    (prisma.solutionMemoryApplication.findUnique as jest.Mock).mockResolvedValue(existingApp);
    (prisma.solutionMemoryApplication.update as jest.Mock).mockResolvedValue({ ...existingApp });
    (prisma.solutionMemoryApplication.findMany as jest.Mock).mockResolvedValue([existingApp]);
    (prisma.solutionMemory.update as jest.Mock).mockResolvedValue(existingMemory);

    await SolutionService.recordProjectOutcomeAndLearn({
      projectId: 'proj-repeat-verify',
      dto: {
        outcomeStatus: MemoryOutcomeStatus.EFFECTIVE,
        measurableImpact: 'Updated re-inspection: 98% uptime maintained over 6 months',
        targetAchieved: true,
      },
      actorId: 'gov-officer-1',
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-test-11-duplicate',
    });

    // Verify update was called on the existing application row, NOT create
    expect(prisma.solutionMemoryApplication.update).toHaveBeenCalled();
    expect(prisma.solutionMemoryApplication.create).not.toHaveBeenCalled();
    expect(prisma.solutionMemory.create).not.toHaveBeenCalled();
  });

  // SCENARIO 12: Deterministic AI client fallback evaluates retrieved memories reliably
  it('Scenario 12: Deterministic AI precedent evaluation reliably assigns RECOMMEND and WARN verdicts', async () => {
    const requestPayload = {
      problemCategory: 'WATER_SUPPLY',
      problemDescription: 'High fluoride contamination in groundwater borewells.',
      retrievedMemories: [
        {
          id: 'mem-fluoride-succ',
          title: 'Activated Alumina Filtration',
          outcomeStatus: 'EFFECTIVE',
          reusabilityClass: 'HIGHLY_REUSABLE',
          whatWorked: 'Fluoride level reduced to 0.9 mg/L',
        },
        {
          id: 'mem-fluoride-fail',
          title: 'Electrolytic Defluoridation Without Maintenance',
          outcomeStatus: 'INEFFECTIVE',
          reusabilityClass: 'NOT_RECOMMENDED',
          whatFailed: 'Electrode fouling within 3 weeks in hard water',
        },
      ],
    };

    const evaluation = await AiServiceClient.evaluateSolutionMemoryPrecedents(requestPayload, 'req-test-12');

    expect(evaluation).toBeDefined();
    expect(evaluation.guidanceVerdict).toBe('CAUTION'); // Mixed because 1 success, 1 failure
    expect(evaluation.precedents.length).toBe(2);

    const succPrecedent = evaluation.precedents.find(p => p.memoryId === 'mem-fluoride-succ');
    const failPrecedent = evaluation.precedents.find(p => p.memoryId === 'mem-fluoride-fail');

    expect(succPrecedent?.verdict).toBe('RECOMMEND');
    expect(failPrecedent?.verdict).toBe('WARN');
    expect(failPrecedent?.knownRisks).toContain('Electrode fouling');
  });
});
