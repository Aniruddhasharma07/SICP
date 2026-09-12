import { PrototypeService } from '../src/modules/prototype/prototype.service';
import { TestingService } from '../src/modules/testing/testing.service';
import { PilotService } from '../src/modules/pilot/pilot.service';
import { DeploymentService } from '../src/modules/deployment/deployment.service';
import { OutcomeService } from '../src/modules/outcome/outcome.service';
import { RecurrenceDetectionEngine } from '../src/domain/intelligence/recurrence-detection.engine';
import {
  PrototypeStatus,
  TestStatus,
  TestCaseStatus,
  PilotStatus,
  DeploymentStatus,
  OutcomeVerificationStatus,
  OutcomeType,
  CitizenProblemStatus,
  MetricProvenance,
  ProjectStatus,
  ChallengeStatus,
  UserRole,
} from '@sicp/shared';
import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    project: { findUnique: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    projectPrototype: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    projectTestExecution: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    projectTestCase: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    projectPilot: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    pilotMetric: {
      create: jest.fn(),
    },
    projectDeployment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    citizenVerification: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    projectOutcomeVerification: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    innovationOutcome: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    solutionMemory: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    challenge: { update: jest.fn() },
    challengeTimeline: { create: jest.fn() },
    user: { findMany: jest.fn() },
    auditLog: { create: jest.fn() },
    notification: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe('Phase 5 Complete End-to-End Innovation Lifecycle', () => {
  it('executes full pipeline: Prototype V1 -> Revision -> V2 Approved -> Testing -> Pilot -> Deployment -> Citizen Verification -> Official Outcome -> Patent', async () => {
    // -------------------------------------------------------------
    // STAGE 1: PROTOTYPE CREATION & IMMUTABLE REVISION CYCLE
    // -------------------------------------------------------------
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-e2e-1',
      title: 'Solar Water Treatment Reactor',
      status: ProjectStatus.APPROVED,
      prototypes: [],
      testExecutions: [],
      pilots: [],
      leadingOrgId: 'univ-org-1',
      leadingOrg: { name: 'IIT BHU' },
      challengeId: 'chal-e2e-1',
      challenge: { id: 'chal-e2e-1', district: 'Varanasi', state: 'Uttar Pradesh', category: 'WATER_SUPPLY' },
    });

    let protoV1Data = {
      id: 'proto-1',
      projectId: 'proj-e2e-1',
      version: 1,
      title: 'Solar Water Reactor V1',
      description: 'Initial prototype',
      prototypeType: 'HARDWARE',
      technicalApproach: 'Electrochemical coagulation',
      objectives: ['Treat 2000L/day'],
      status: PrototypeStatus.DRAFT,
      createdBy: { fullName: 'Dr. Ramesh Kumar' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const protoTx1 = {
      projectPrototype: {
        create: jest.fn().mockImplementation(({ data }) => {
          protoV1Data = { ...protoV1Data, ...data };
          return Promise.resolve(protoV1Data);
        }),
      },
      project: { update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(protoTx1));

    const v1 = await PrototypeService.createPrototype({
      projectId: 'proj-e2e-1',
      dto: {
        title: 'Solar Water Reactor V1',
        description: 'Initial prototype',
        prototypeType: 'HARDWARE',
        technicalApproach: 'Electrochemical coagulation',
        objectives: ['Treat 2000L/day'],
      },
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-e2e-1',
    });
    expect(v1.version).toBe(1);
    expect(v1.status).toBe(PrototypeStatus.DRAFT);

    // Submit V1
    (prisma.projectPrototype.findUnique as jest.Mock).mockResolvedValue({
      ...protoV1Data,
      project: { title: 'Solar Water Treatment Reactor' },
    });
    const protoSubmitTx = {
      projectPrototype: {
        update: jest.fn().mockResolvedValue({
          ...protoV1Data,
          status: PrototypeStatus.SUBMITTED,
          submittedAt: new Date(),
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(protoSubmitTx));
    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'gov-1' }]);

    const submittedV1 = await PrototypeService.submitPrototype({
      prototypeId: 'proto-1',
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-e2e-2',
    });
    expect(submittedV1.status).toBe(PrototypeStatus.SUBMITTED);

    // Review V1 with REQUEST_REVISION
    (prisma.projectPrototype.findUnique as jest.Mock).mockResolvedValue({
      ...protoV1Data,
      status: PrototypeStatus.SUBMITTED,
      project: { title: 'Solar Water Treatment Reactor', status: ProjectStatus.PROTOTYPE },
    });
    const protoRevReqTx = {
      projectPrototype: {
        update: jest.fn().mockResolvedValue({
          ...protoV1Data,
          status: PrototypeStatus.REVISION_REQUESTED,
          requiredChanges: ['Improve flow rate to 3000L/day', 'Add automated sensor'],
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(protoRevReqTx));

    const reviewedV1 = await PrototypeService.reviewPrototype({
      prototypeId: 'proto-1',
      dto: {
        decision: 'REQUEST_REVISION',
        comments: 'Flow rate needs to meet 3000L peak morning requirement.',
        requiredChanges: ['Improve flow rate to 3000L/day', 'Add automated sensor'],
      },
      actorId: 'gov-1',
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-e2e-3',
    });
    expect(reviewedV1.status).toBe(PrototypeStatus.REVISION_REQUESTED);

    // Revise to V2
    (prisma.projectPrototype.findUnique as jest.Mock).mockResolvedValue({
      ...protoV1Data,
      status: PrototypeStatus.REVISION_REQUESTED,
      project: { title: 'Solar Water Treatment Reactor' },
    });
    (prisma.projectPrototype.findFirst as jest.Mock).mockResolvedValue({ version: 1 });

    const protoV2Data = {
      id: 'proto-2',
      projectId: 'proj-e2e-1',
      version: 2,
      title: 'Solar Water Reactor V2 (High Flow)',
      description: 'Upgraded cell geometry',
      prototypeType: 'HARDWARE',
      technicalApproach: 'Parallel electrochemical cells',
      objectives: ['Treat 3500L/day'],
      status: PrototypeStatus.DRAFT,
      createdBy: { fullName: 'Dr. Ramesh Kumar' },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const protoReviseTx = {
      projectPrototype: {
        create: jest.fn().mockResolvedValue(protoV2Data),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(protoReviseTx));

    const v2 = await PrototypeService.revisePrototype({
      prototypeId: 'proto-1',
      dto: {
        title: 'Solar Water Reactor V2 (High Flow)',
        technicalApproach: 'Parallel electrochemical cells',
      },
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-e2e-4',
    });
    expect(v2.version).toBe(2);

    // Approve V2
    (prisma.projectPrototype.findUnique as jest.Mock).mockResolvedValue({
      ...protoV2Data,
      status: PrototypeStatus.SUBMITTED,
      project: { id: 'proj-e2e-1', title: 'Solar Water Reactor', status: ProjectStatus.PROTOTYPE },
    });
    const protoApproveTx = {
      projectPrototype: {
        update: jest.fn().mockResolvedValue({
          ...protoV2Data,
          status: PrototypeStatus.APPROVED,
          reviewedAt: new Date(),
          reviewDecision: 'APPROVE',
        }),
      },
      project: { update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(protoApproveTx));

    const approvedV2 = await PrototypeService.reviewPrototype({
      prototypeId: 'proto-2',
      dto: {
        decision: 'APPROVE',
        comments: 'Technical approach and high-flow design validated.',
      },
      actorId: 'gov-1',
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-e2e-5',
    });
    expect(approvedV2.status).toBe(PrototypeStatus.APPROVED);

    // -------------------------------------------------------------
    // STAGE 2: TESTING, DEFECT RESOLUTION & PASS
    // -------------------------------------------------------------
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-e2e-1',
      status: ProjectStatus.PROTOTYPE,
      testExecutions: [],
    });

    const testTx = {
      projectTestExecution: {
        create: jest.fn().mockResolvedValue({
          id: 'test-exec-e2e',
          projectId: 'proj-e2e-1',
          testPlan: 'Full Water Quality Certification',
          testCases: [],
          resultsSummary: 'Plan created',
          status: TestStatus.PLANNED,
          iterationNumber: 1,
          conductedById: 'fac-1',
          conductedBy: { fullName: 'Dr. Ramesh Kumar' },
          testCasesList: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      project: { update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(testTx));

    const execution = await TestingService.createTestExecution({
      projectId: 'proj-e2e-1',
      testPlan: 'Full Water Quality Certification',
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-test-e2e',
    });
    expect(execution.status).toBe(TestStatus.PLANNED);

    // Add and pass test case
    (prisma.projectTestExecution.findUnique as jest.Mock).mockResolvedValue({
      id: 'test-exec-e2e',
      testCasesList: [
        {
          id: 'tc-passed-1',
          title: 'Flow & Purity Verification',
          status: TestCaseStatus.PASSED,
          severity: 'CRITICAL',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      project: { id: 'proj-e2e-1', status: ProjectStatus.TESTING },
    });

    const testSubmitTx = {
      projectTestExecution: {
        update: jest.fn().mockResolvedValue({
          id: 'test-exec-e2e',
          projectId: 'proj-e2e-1',
          testPlan: 'Full Water Quality Certification',
          testCases: [],
          resultsSummary: 'Executed 1 cases: 1 passed. Pass rate: 100%.',
          status: TestStatus.PASSED,
          iterationNumber: 1,
          conductedById: 'fac-1',
          conductedBy: { fullName: 'Dr. Ramesh Kumar' },
          testCasesList: [
            {
              id: 'tc-passed-1',
              status: TestCaseStatus.PASSED,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      project: { update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(testSubmitTx));

    const passedTest = await TestingService.submitTestExecution({
      testExecutionId: 'test-exec-e2e',
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-submit-test',
    });
    expect(passedTest.status).toBe(TestStatus.PASSED);

    // -------------------------------------------------------------
    // STAGE 3: FIELD PILOT & MEASURED METRICS
    // -------------------------------------------------------------
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-e2e-1',
      status: ProjectStatus.TESTING,
    });

    const pilotTx = {
      projectPilot: {
        create: jest.fn().mockResolvedValue({
          id: 'pilot-e2e',
          projectId: 'proj-e2e-1',
          location: 'Kashi Gram',
          district: 'Varanasi',
          state: 'Uttar Pradesh',
          targetBeneficiaries: 4000,
          startDate: new Date(),
          baselineMetrics: { baselineTurbidity: 65 },
          status: PilotStatus.PLANNING,
          metricsList: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      project: { update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(pilotTx));

    const pilot = await PilotService.createPilot({
      projectId: 'proj-e2e-1',
      dto: {
        location: 'Kashi Gram',
        district: 'Varanasi',
        state: 'Uttar Pradesh',
        targetBeneficiaries: 4000,
        startDate: '2026-03-01T00:00:00.000Z',
        baselineMetrics: { baselineTurbidity: 65 },
      },
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-pilot-e2e',
    });
    expect(pilot.status).toBe(PilotStatus.PLANNING);

    // Record verified metric
    (prisma.projectPilot.findUnique as jest.Mock).mockResolvedValue({ id: 'pilot-e2e' });
    const metricTx = {
      pilotMetric: {
        create: jest.fn().mockResolvedValue({
          id: 'metric-e2e',
          pilotId: 'pilot-e2e',
          name: 'Daily Clean Water Yield',
          category: 'WATER_SUPPLY',
          unit: 'Liters/Day',
          baselineValue: 500,
          targetValue: 3000,
          observedValue: 3200,
          absoluteChange: 2700,
          percentageChange: 540,
          targetAchievement: 108,
          method: 'Telemetry Water Meter',
          source: 'Field Unit Sensor',
          provenance: MetricProvenance.VERIFIED,
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(metricTx));

    const recordedMetric = await PilotService.recordMetric({
      pilotId: 'pilot-e2e',
      dto: {
        name: 'Daily Clean Water Yield',
        category: 'WATER_SUPPLY',
        unit: 'Liters/Day',
        baselineValue: 500,
        targetValue: 3000,
        observedValue: 3200,
        method: 'Telemetry Water Meter',
        source: 'Field Unit Sensor',
        provenance: MetricProvenance.VERIFIED,
      },
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-metric-e2e',
    });
    expect(recordedMetric.observedValue).toBe(3200);
    expect(recordedMetric.isVerified).toBe(true);

    // -------------------------------------------------------------
    // STAGE 4: DEPLOYMENT READINESS GATE & EXECUTION
    // -------------------------------------------------------------
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-e2e-1',
      title: 'Solar Water Treatment Reactor',
      status: ProjectStatus.PILOT,
      prototypes: [{ status: PrototypeStatus.APPROVED, version: 2 }],
      testExecutions: [{ status: TestStatus.PASSED, iterationNumber: 1, testCasesList: [] }],
      pilots: [{ status: PilotStatus.COMPLETED, district: 'Varanasi', metricsList: [{ id: 'metric-e2e' }] }],
      leadingOrgId: 'univ-org-1',
      leadingOrg: { name: 'IIT BHU' },
      challengeId: 'chal-e2e-1',
      challenge: { district: 'Varanasi', state: 'Uttar Pradesh' },
    });

    const gate = await DeploymentService.evaluateReadinessGate('proj-e2e-1');
    expect(gate.canDeploy).toBe(true);
    expect(gate.blockingCount).toBe(0);

    // Deploy
    (prisma.projectDeployment.findUnique as jest.Mock).mockResolvedValue({
      id: 'deploy-e2e',
      projectId: 'proj-e2e-1',
      title: 'Full Rural Water Grid Deployment',
      status: DeploymentStatus.PLANNED,
      project: { challengeId: 'chal-e2e-1' },
    });

    const deployTx = {
      projectDeployment: {
        update: jest.fn().mockResolvedValue({
          id: 'deploy-e2e',
          projectId: 'proj-e2e-1',
          title: 'Full Rural Water Grid Deployment',
          location: 'Varanasi',
          district: 'Varanasi',
          state: 'UP',
          deploymentOrg: 'IIT BHU & Jal Nigam',
          deploymentDate: new Date(),
          scope: 'Community-wide',
          beneficiariesCount: 15000,
          infrastructure: '5 Solar Filtration Hubs',
          responsibleTeam: 'IIT BHU Lead Team',
          status: DeploymentStatus.DEPLOYED,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      project: { update: jest.fn().mockResolvedValue({}) },
      challenge: { update: jest.fn().mockResolvedValue({}) },
      challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(deployTx));

    const deployed = await DeploymentService.updateDeploymentStatus({
      deploymentId: 'deploy-e2e',
      status: DeploymentStatus.DEPLOYED,
      actorId: 'gov-1',
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-deploy-exec-e2e',
    });
    expect(deployed.status).toBe(DeploymentStatus.DEPLOYED);

    // -------------------------------------------------------------
    // STAGE 5: CITIZEN FEEDBACK & OFFICIAL OUTCOME VERIFICATION
    // -------------------------------------------------------------
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-e2e-1',
      challengeId: 'chal-e2e-1',
      title: 'Solar Water Treatment Reactor',
      status: ProjectStatus.DEPLOYMENT,
      challenge: { id: 'chal-e2e-1', title: 'Water Crisis' },
    });
    (prisma.citizenVerification.findFirst as jest.Mock).mockResolvedValue(null);

    const feedbackTx = {
      citizenVerification: {
        create: jest.fn().mockResolvedValue({
          id: 'cit-fb-e2e',
          projectId: 'proj-e2e-1',
          challengeId: 'chal-e2e-1',
          citizenId: 'cit-1',
          rating: 5,
          comments: 'Clean drinking water now available to every household.',
          verifiedImprovement: true,
          problemStatus: CitizenProblemStatus.YES,
          createdAt: new Date(),
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(feedbackTx));

    const citizenFeedback = await OutcomeService.submitCitizenFeedback({
      projectId: 'proj-e2e-1',
      dto: {
        rating: 5,
        comments: 'Clean drinking water now available to every household.',
        verifiedImprovement: true,
        problemStatus: CitizenProblemStatus.YES,
      },
      citizenId: 'cit-1',
      actorRole: UserRole.CITIZEN,
      requestId: 'req-cit-fb',
    });
    expect(citizenFeedback.verifiedImprovement).toBe(true);

    // Official Outcome Verification
    const outcomeTx = {
      projectOutcomeVerification: {
        create: jest.fn().mockResolvedValue({
          id: 'out-ver-e2e',
          projectId: 'proj-e2e-1',
          challengeId: 'chal-e2e-1',
          reviewerId: 'gov-1',
          status: OutcomeVerificationStatus.VERIFIED,
          baselineSummary: '500 L/day dirty water',
          targetSummary: '3000 L/day pure water',
          observedSummary: '3200 L/day pure water confirmed by telemetry and field audits',
          verifiedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      },
      project: { update: jest.fn().mockResolvedValue({}) },
      challenge: { update: jest.fn().mockResolvedValue({}) },
      challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(outcomeTx));

    const verifiedOutcome = await OutcomeService.verifyOutcome({
      projectId: 'proj-e2e-1',
      dto: {
        status: OutcomeVerificationStatus.VERIFIED,
        baselineSummary: '500 L/day dirty water',
        targetSummary: '3000 L/day pure water',
        observedSummary: '3200 L/day pure water confirmed by telemetry and field audits',
      },
      actorId: 'gov-1',
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-ver-out',
    });
    expect(verifiedOutcome.status).toBe(OutcomeVerificationStatus.VERIFIED);
    expect(outcomeTx.project.update).toHaveBeenCalledWith({
      where: { id: 'proj-e2e-1' },
      data: { status: ProjectStatus.COMPLETED },
    });
    expect(outcomeTx.challenge.update).toHaveBeenCalledWith({
      where: { id: 'chal-e2e-1' },
      data: { status: ChallengeStatus.RESOLVED },
    });

    // -------------------------------------------------------------
    // STAGE 6: INNOVATION OUTCOME (PATENT FILED)
    // -------------------------------------------------------------
    const innTx = {
      innovationOutcome: {
        create: jest.fn().mockResolvedValue({
          id: 'patent-e2e',
          projectId: 'proj-e2e-1',
          challengeId: 'chal-e2e-1',
          outcomeType: OutcomeType.PATENT_FILED,
          title: 'High-Throughput Solar Electrochemical Water Purification Reactor',
          referenceIdentifier: 'IN-PAT-2026-004491',
          verifiedBeneficiaries: 15000,
          measurableImpactSummary: '3,200 L/day clean water produced, 98% turbidity reduction',
          isVerified: true,
          registeredAt: new Date(),
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(innTx));

    const patent = await OutcomeService.recordInnovationOutcome({
      projectId: 'proj-e2e-1',
      dto: {
        outcomeType: OutcomeType.PATENT_FILED,
        title: 'High-Throughput Solar Electrochemical Water Purification Reactor',
        referenceIdentifier: 'IN-PAT-2026-004491',
        verifiedBeneficiaries: 15000,
        measurableImpactSummary: '3,200 L/day clean water produced, 98% turbidity reduction',
        responsibleOrg: 'IIT BHU Innovation Foundation',
      },
      actorId: 'gov-1',
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-patent-e2e',
    });
    expect(patent.outcomeType).toBe(OutcomeType.PATENT_FILED);
    expect(patent.referenceIdentifier).toBe('IN-PAT-2026-004491');
  });
});
