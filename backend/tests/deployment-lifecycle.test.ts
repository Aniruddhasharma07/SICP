import { DeploymentService } from '../src/modules/deployment/deployment.service';
import {
  DeploymentStatus,
  ProjectStatus,
  ChallengeStatus,
  PrototypeStatus,
  TestStatus,
  PilotStatus,
  UserRole,
} from '@sicp/shared';
import { prisma } from '../src/database/prisma';
import { ValidationError } from '../src/utils/errors';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    project: { findUnique: jest.fn(), update: jest.fn() },
    projectDeployment: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    challenge: { update: jest.fn() },
    challengeTimeline: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe('DeploymentService - 8-Point Readiness Gate, Execution & Rollback Recovery', () => {
  it('blocks deployment when mandatory readiness conditions are unmet and provides structured actions', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      title: 'Water Filtration Unit',
      status: ProjectStatus.PILOT,
      prototypes: [{ status: PrototypeStatus.APPROVED, version: 2 }],
      testExecutions: [{ status: TestStatus.FAILED, iterationNumber: 1, testCasesList: [{ status: 'FAILED', severity: 'CRITICAL' }] }],
      pilots: [{ status: PilotStatus.PLANNING, metricsList: [] }],
      leadingOrgId: 'org-1',
      leadingOrg: { name: 'IIT BHU' },
      challenge: { district: 'Varanasi', state: 'Uttar Pradesh' },
    });

    const gate = await DeploymentService.evaluateReadinessGate('proj-1');

    expect(gate.canDeploy).toBe(false);
    expect(gate.blockingCount).toBeGreaterThan(0);

    const testCondition = gate.conditions.find(c => c.requirement === 'Solution Testing Execution Passed');
    expect(testCondition?.blocking).toBe(true);
    expect(testCondition?.suggestedAction).toContain('Execute test cases');

    const defectCondition = gate.conditions.find(c => c.requirement === 'Zero Critical Testing Defects');
    expect(defectCondition?.blocking).toBe(true);
    expect(defectCondition?.currentValue).toContain('1 critical defect(s)');
  });

  it('allows deployment execution when all 8 readiness conditions are satisfied', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      title: 'Water Filtration Unit',
      status: ProjectStatus.PILOT,
      prototypes: [{ status: PrototypeStatus.APPROVED, version: 2 }],
      testExecutions: [{ status: TestStatus.PASSED, iterationNumber: 2, testCasesList: [] }],
      pilots: [{ status: PilotStatus.COMPLETED, district: 'Varanasi', metricsList: [{ id: 'm-1' }] }],
      leadingOrgId: 'org-1',
      leadingOrg: { name: 'IIT BHU' },
      challenge: { district: 'Varanasi', state: 'Uttar Pradesh' },
    });

    const gate = await DeploymentService.evaluateReadinessGate('proj-1');

    expect(gate.canDeploy).toBe(true);
    expect(gate.blockingCount).toBe(0);
  });

  it('transitions deployment to DEPLOYED, syncing Project and Challenge states', async () => {
    // Gate passes
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      challengeId: 'chal-1',
      title: 'Water Filtration Unit',
      status: ProjectStatus.PILOT,
      prototypes: [{ status: PrototypeStatus.APPROVED, version: 2 }],
      testExecutions: [{ status: TestStatus.PASSED, iterationNumber: 2, testCasesList: [] }],
      pilots: [{ status: PilotStatus.COMPLETED, district: 'Varanasi', metricsList: [{ id: 'm-1' }] }],
      leadingOrgId: 'org-1',
      leadingOrg: { name: 'IIT BHU' },
      challenge: { id: 'chal-1', district: 'Varanasi', state: 'Uttar Pradesh' },
    });

    (prisma.projectDeployment.findUnique as jest.Mock).mockResolvedValue({
      id: 'deploy-1',
      projectId: 'proj-1',
      title: 'Varanasi Full Community Deployment',
      status: DeploymentStatus.PLANNED,
      project: { challengeId: 'chal-1' },
    });

    const mockTx = {
      projectDeployment: {
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'deploy-1',
            projectId: 'proj-1',
            title: 'Varanasi Full Community Deployment',
            location: 'Varanasi Ward 12',
            district: 'Varanasi',
            state: 'UP',
            deploymentOrg: 'Jal Nigam',
            deploymentDate: new Date(),
            scope: '10 Public Water Feeder Points',
            beneficiariesCount: 15000,
            infrastructure: 'Solar Water Treatment Stations',
            responsibleTeam: 'IIT BHU Team Alpha',
            status: data.status,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
      project: { update: jest.fn().mockResolvedValue({}) },
      challenge: { update: jest.fn().mockResolvedValue({}) },
      challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(mockTx));

    const deployed = await DeploymentService.updateDeploymentStatus({
      deploymentId: 'deploy-1',
      status: DeploymentStatus.DEPLOYED,
      operationalNotes: 'Commissioned 10 water filtration stations serving 15,000 residents',
      actorId: 'gov-1',
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-deploy-exec',
    });

    expect(deployed.status).toBe(DeploymentStatus.DEPLOYED);
    expect(mockTx.project.update).toHaveBeenCalledWith({
      where: { id: 'proj-1' },
      data: { status: ProjectStatus.DEPLOYMENT },
    });
    expect(mockTx.challenge.update).toHaveBeenCalledWith({
      where: { id: 'chal-1' },
      data: { status: ChallengeStatus.DEPLOYED },
    });
  });

  it('enforces mandatory root cause when deployment fails for zero-dead-end recovery', async () => {
    (prisma.projectDeployment.findUnique as jest.Mock).mockResolvedValue({
      id: 'deploy-1',
      projectId: 'proj-1',
      status: DeploymentStatus.IN_PROGRESS,
      project: { challengeId: 'chal-1' },
    });

    await expect(
      DeploymentService.updateDeploymentStatus({
        deploymentId: 'deploy-1',
        status: DeploymentStatus.FAILED,
        failureRootCause: '', // Empty root cause should fail
        actorId: 'gov-1',
        actorRole: UserRole.GOVERNMENT_OFFICER,
        requestId: 'req-fail-test',
      })
    ).rejects.toThrow(ValidationError);
  });
});
