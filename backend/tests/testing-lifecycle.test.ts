import { TestingService } from '../src/modules/testing/testing.service';
import { TestStatus, TestCaseStatus, ProjectStatus, UserRole, RiskSeverity } from '@sicp/shared';
import { prisma } from '../src/database/prisma';
import { ValidationError } from '../src/utils/errors';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    project: { findUnique: jest.fn(), update: jest.fn() },
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
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe('TestingService - Test Cases, Execution, Defects & Retests', () => {
  it('creates test execution and adds structured test cases', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      title: 'Water Filtration Unit',
      status: ProjectStatus.PROTOTYPE,
      testExecutions: [],
    });

    const mockTx = {
      projectTestExecution: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'test-exec-1',
            ...data,
            conductedBy: { fullName: 'Dr. Ramesh Kumar' },
            testCasesList: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
      project: { update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(mockTx));

    const execution = await TestingService.createTestExecution({
      projectId: 'proj-1',
      testPlan: 'Full Water Quality & Electrical Safety Testing Protocol',
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-test-1',
    });

    expect(execution.iterationNumber).toBe(1);
    expect(execution.status).toBe(TestStatus.PLANNED);
    expect(mockTx.project.update).toHaveBeenCalledWith({
      where: { id: 'proj-1' },
      data: { status: ProjectStatus.TESTING },
    });

    // Add test case
    (prisma.projectTestExecution.findUnique as jest.Mock).mockResolvedValue({
      id: 'test-exec-1',
      status: TestStatus.PLANNED,
    });

    const caseTx = {
      projectTestCase: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'tc-1',
            ...data,
            tester: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
      projectTestExecution: { update: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(caseTx));

    const testCase = await TestingService.addTestCase({
      testExecutionId: 'test-exec-1',
      dto: {
        title: 'Turbidity Reduction Test',
        description: 'Verify treated water turbidity drops below 1.0 NTU with 100 NTU influent',
        expectedResult: 'Turbidity < 1.0 NTU measured by nephelometer',
        severity: RiskSeverity.CRITICAL,
      },
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-case-1',
    });

    expect(testCase.title).toBe('Turbidity Reduction Test');
    expect(testCase.status).toBe(TestCaseStatus.NOT_RUN);
    expect(caseTx.projectTestExecution.update).toHaveBeenCalledWith({
      where: { id: 'test-exec-1' },
      data: { status: TestStatus.IN_PROGRESS },
    });
  });

  it('handles FAILED test case by logging defect reference and enables retesting without dead end', async () => {
    (prisma.projectTestCase.findUnique as jest.Mock).mockResolvedValue({
      id: 'tc-1',
      testExecutionId: 'test-exec-1',
      title: 'Turbidity Reduction Test',
      description: 'Check turbidity',
      expectedResult: '< 1.0 NTU',
      status: TestCaseStatus.NOT_RUN,
      severity: RiskSeverity.CRITICAL,
      testExecution: { id: 'test-exec-1' },
    });

    const mockTx = {
      projectTestCase: {
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'tc-1',
            testExecutionId: 'test-exec-1',
            title: 'Turbidity Reduction Test',
            description: 'Check turbidity',
            expectedResult: '< 1.0 NTU',
            actualResult: data.actualResult,
            status: data.status,
            severity: RiskSeverity.CRITICAL,
            defectReference: data.defectReference,
            tester: { fullName: 'Anita Student' },
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(mockTx));

    const executed = await TestingService.executeTestCase({
      testCaseId: 'tc-1',
      dto: {
        status: TestCaseStatus.FAILED,
        actualResult: 'Turbidity was 2.4 NTU; coagulation electrode voltage insufficient.',
        evidence: 'https://storage/evidence/turbidity-fail.png',
      },
      actorId: 'stud-1',
      actorRole: UserRole.STUDENT,
      requestId: 'req-exec-1',
    });

    expect(executed.status).toBe(TestCaseStatus.FAILED);
    expect(executed.defectReference).toMatch(/^DEFECT-/);

    // Retest workflow
    (prisma.projectTestCase.findUnique as jest.Mock).mockResolvedValue({
      id: 'tc-1',
      testExecutionId: 'test-exec-1',
      title: 'Turbidity Reduction Test',
      description: 'Check turbidity',
      expectedResult: '< 1.0 NTU',
      status: TestCaseStatus.FAILED,
      severity: RiskSeverity.CRITICAL,
      defectReference: executed.defectReference,
      testExecution: { id: 'test-exec-1' },
    });

    const retestTx = {
      projectTestCase: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'tc-retest-1',
            ...data,
            tester: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(retestTx));

    const retestCase = await TestingService.retestTestCase({
      failedTestCaseId: 'tc-1',
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-retest-1',
    });

    expect(retestCase.title).toContain('[RETEST]');
    expect(retestCase.retestOfId).toBe('tc-1');
    expect(retestCase.status).toBe(TestCaseStatus.NOT_RUN);
  });

  it('enforces mandatory blocker reason when test case is BLOCKED', async () => {
    (prisma.projectTestCase.findUnique as jest.Mock).mockResolvedValue({
      id: 'tc-2',
      status: TestCaseStatus.NOT_RUN,
      testExecution: { id: 'test-exec-1' },
    });

    await expect(
      TestingService.executeTestCase({
        testCaseId: 'tc-2',
        dto: {
          status: TestCaseStatus.BLOCKED,
          blockerReason: '', // Empty reason should fail
        },
        actorId: 'fac-1',
        actorRole: UserRole.FACULTY,
        requestId: 'req-blocked-fail',
      })
    ).rejects.toThrow(ValidationError);
  });
});
