import { prisma } from '../../database/prisma';
import {
  TestStatus,
  TestCaseStatus,
  ProjectStatus,
  AuditAction,
  UserRole,
  RiskSeverity,
  TestExecutionDto,
  TestCaseDto,
  CreateTestCaseDto,
  ExecuteTestCaseDto,
} from '@sicp/shared';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { logger } from '../../utils/logger';

export class TestingService {
  /**
   * Creates a test execution plan for a project.
   */
  public static async createTestExecution(params: {
    projectId: string;
    testPlan: string;
    resultsSummary?: string;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }): Promise<TestExecutionDto> {
    const { projectId, testPlan, resultsSummary, actorId, actorRole, requestId, ipAddress } = params;

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { testExecutions: { orderBy: { iterationNumber: 'desc' } } },
    });

    if (!project) {
      throw new NotFoundError('Project', projectId);
    }

    const nextIteration = (project.testExecutions[0]?.iterationNumber || 0) + 1;

    const execution = await prisma.$transaction(async tx => {
      const created = await tx.projectTestExecution.create({
        data: {
          projectId,
          testPlan,
          testCases: [],
          resultsSummary: resultsSummary || `Test execution plan (Iteration ${nextIteration})`,
          status: TestStatus.PLANNED,
          iterationNumber: nextIteration,
          conductedById: actorId,
        },
        include: { conductedBy: true, testCasesList: true },
      });

      // Update project status to TESTING if it is PROTOTYPE or APPROVED
      if (project.status === ProjectStatus.PROTOTYPE || project.status === ProjectStatus.APPROVED) {
        await tx.project.update({
          where: { id: projectId },
          data: { status: ProjectStatus.TESTING },
        });
      }

      await AuditService.log({
        actorId,
        actorRole,
        action: AuditAction.TEST_EXECUTION_CREATED,
        resource: 'ProjectTestExecution',
        resourceId: created.id,
        previousState: null,
        newState: created,
        reason: `Created test execution plan iteration #${nextIteration} for project "${project.title}"`,
        requestId,
        ipAddress,
      });

      return created;
    });

    return this.mapExecutionToDto(execution);
  }

  /**
   * Adds an individual test case to a test execution plan.
   */
  public static async addTestCase(params: {
    testExecutionId: string;
    dto: CreateTestCaseDto;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }): Promise<TestCaseDto> {
    const { testExecutionId, dto, actorId, actorRole, requestId, ipAddress } = params;

    const execution = await prisma.projectTestExecution.findUnique({
      where: { id: testExecutionId },
    });

    if (!execution) {
      throw new NotFoundError('ProjectTestExecution', testExecutionId);
    }

    const testCase = await prisma.$transaction(async tx => {
      const created = await tx.projectTestCase.create({
        data: {
          testExecutionId,
          title: dto.title,
          description: dto.description,
          expectedResult: dto.expectedResult,
          status: TestCaseStatus.NOT_RUN,
          severity: dto.severity || RiskSeverity.MEDIUM,
        },
        include: { tester: true },
      });

      // If execution was PLANNED, move to IN_PROGRESS
      if (execution.status === TestStatus.PLANNED) {
        await tx.projectTestExecution.update({
          where: { id: testExecutionId },
          data: { status: TestStatus.IN_PROGRESS },
        });
      }

      return created;
    });

    return this.mapTestCaseToDto(testCase);
  }

  /**
   * Executes or updates the status of an individual test case.
   * Supports zero-dead-end statuses (PASSED, FAILED, BLOCKED, WAIVED).
   */
  public static async executeTestCase(params: {
    testCaseId: string;
    dto: ExecuteTestCaseDto;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }): Promise<TestCaseDto> {
    const { testCaseId, dto, actorId, actorRole, requestId, ipAddress } = params;

    const testCase = await prisma.projectTestCase.findUnique({
      where: { id: testCaseId },
      include: { testExecution: true },
    });

    if (!testCase) {
      throw new NotFoundError('ProjectTestCase', testCaseId);
    }

    // Validation for BLOCKED status
    if (dto.status === TestCaseStatus.BLOCKED) {
      if (!dto.blockerReason || dto.blockerReason.trim().length === 0) {
        throw new ValidationError('A test case cannot be marked BLOCKED without a mandatory blocker reason.');
      }
    }

    // Validation for WAIVED status
    if (dto.status === TestCaseStatus.WAIVED) {
      if (!dto.waiverJustification || dto.waiverJustification.trim().length === 0) {
        throw new ValidationError('A test case cannot be marked WAIVED without an authorized waiver justification.');
      }
    }

    const updated = await prisma.$transaction(async tx => {
      const res = await tx.projectTestCase.update({
        where: { id: testCaseId },
        data: {
          status: dto.status,
          actualResult: dto.actualResult !== undefined ? dto.actualResult : testCase.actualResult,
          evidence: dto.evidence !== undefined ? dto.evidence : testCase.evidence,
          testerId: actorId,
          executedAt: new Date(),
          defectReference: dto.status === TestCaseStatus.FAILED
            ? (dto.defectReference || `DEFECT-${Date.now().toString().slice(-6)}`)
            : testCase.defectReference,
          blockerReason: dto.blockerReason !== undefined ? dto.blockerReason : testCase.blockerReason,
          blockerActor: dto.blockerActor !== undefined ? dto.blockerActor : testCase.blockerActor,
          waiverJustification: dto.waiverJustification !== undefined ? dto.waiverJustification : testCase.waiverJustification,
          waivedById: dto.status === TestCaseStatus.WAIVED ? actorId : testCase.waivedById,
          comments: dto.comments !== undefined ? dto.comments : testCase.comments,
        },
        include: { tester: true },
      });

      await AuditService.log({
        actorId,
        actorRole,
        action: AuditAction.TEST_CASE_EXECUTED,
        resource: 'ProjectTestCase',
        resourceId: testCaseId,
        previousState: { status: testCase.status },
        newState: { status: dto.status, defectReference: res.defectReference },
        reason: `Executed test case "${testCase.title}" -> ${dto.status}`,
        requestId,
        ipAddress,
      });

      return res;
    });

    return this.mapTestCaseToDto(updated);
  }

  /**
   * Retest workflow: creates a retest case linked to a previously failed defect without dead ends.
   */
  public static async retestTestCase(params: {
    failedTestCaseId: string;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }): Promise<TestCaseDto> {
    const { failedTestCaseId, actorId, actorRole, requestId, ipAddress } = params;

    const original = await prisma.projectTestCase.findUnique({
      where: { id: failedTestCaseId },
      include: { testExecution: true },
    });

    if (!original) {
      throw new NotFoundError('ProjectTestCase', failedTestCaseId);
    }

    if (original.status !== TestCaseStatus.FAILED && original.status !== TestCaseStatus.BLOCKED) {
      throw new ValidationError(`Cannot retest a test case in ${original.status} status. Only FAILED or BLOCKED cases can be retested.`);
    }

    const retest = await prisma.$transaction(async tx => {
      const created = await tx.projectTestCase.create({
        data: {
          testExecutionId: original.testExecutionId,
          title: `[RETEST] ${original.title}`,
          description: `Retest of defect ${original.defectReference || original.id}: ${original.description}`,
          expectedResult: original.expectedResult,
          status: TestCaseStatus.NOT_RUN,
          severity: original.severity,
          defectReference: original.defectReference,
          retestOfId: original.id,
        },
        include: { tester: true },
      });

      await AuditService.log({
        actorId,
        actorRole,
        action: AuditAction.TEST_CASE_EXECUTED,
        resource: 'ProjectTestCase',
        resourceId: created.id,
        previousState: { retestOf: original.id },
        newState: created,
        reason: `Created retest for test case "${original.title}" (Defect: ${original.defectReference})`,
        requestId,
        ipAddress,
      });

      return created;
    });

    return this.mapTestCaseToDto(retest);
  }

  /**
   * Finalizes and submits a test execution plan.
   * Computes pass rate, defect counts, and determines overall PASSED or FAILED verdict.
   */
  public static async submitTestExecution(params: {
    testExecutionId: string;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }): Promise<TestExecutionDto> {
    const { testExecutionId, actorId, actorRole, requestId, ipAddress } = params;

    const execution = await prisma.projectTestExecution.findUnique({
      where: { id: testExecutionId },
      include: { testCasesList: true, project: true },
    });

    if (!execution) {
      throw new NotFoundError('ProjectTestExecution', testExecutionId);
    }

    const cases = execution.testCasesList;
    if (cases.length === 0) {
      throw new ValidationError('Cannot submit test execution without any test cases.');
    }

    const unrunCount = cases.filter(c => c.status === TestCaseStatus.NOT_RUN).length;
    if (unrunCount > 0) {
      throw new ValidationError(`Cannot submit test execution while ${unrunCount} test case(s) have not been run.`);
    }

    const passedCount = cases.filter(c => c.status === TestCaseStatus.PASSED || c.status === TestCaseStatus.WAIVED).length;
    const failedCount = cases.filter(c => c.status === TestCaseStatus.FAILED).length;
    const blockedCount = cases.filter(c => c.status === TestCaseStatus.BLOCKED).length;

    const passRate = Math.round((passedCount / cases.length) * 100);
    const overallVerdict: TestStatus = (failedCount === 0 && blockedCount === 0) ? TestStatus.PASSED : TestStatus.FAILED;

    const resultsSummary = `Executed ${cases.length} cases: ${passedCount} passed/waived, ${failedCount} failed, ${blockedCount} blocked. Pass rate: ${passRate}%.`;

    const updated = await prisma.$transaction(async tx => {
      const res = await tx.projectTestExecution.update({
        where: { id: testExecutionId },
        data: {
          status: overallVerdict,
          resultsSummary,
          metrics: {
            totalCases: cases.length,
            passedCount,
            failedCount,
            blockedCount,
            passRate,
          },
        },
        include: { conductedBy: true, testCasesList: { include: { tester: true } } },
      });

      // If passed, project can advance towards PILOT
      if (overallVerdict === TestStatus.PASSED && execution.project.status === ProjectStatus.TESTING) {
        await tx.project.update({
          where: { id: execution.projectId },
          data: { status: ProjectStatus.PILOT },
        });
      }

      await AuditService.log({
        actorId,
        actorRole,
        action: AuditAction.TEST_REVIEWED,
        resource: 'ProjectTestExecution',
        resourceId: testExecutionId,
        previousState: { status: execution.status },
        newState: { status: overallVerdict, passRate },
        reason: `Finalized test execution iteration #${execution.iterationNumber}: ${overallVerdict}. ${resultsSummary}`,
        requestId,
        ipAddress,
      });

      return res;
    });

    return this.mapExecutionToDto(updated);
  }

  /**
   * Retrieves all test executions for a project.
   */
  public static async getProjectTests(projectId: string): Promise<TestExecutionDto[]> {
    const executions = await prisma.projectTestExecution.findMany({
      where: { projectId },
      include: { conductedBy: true, testCasesList: { include: { tester: true } } },
      orderBy: { iterationNumber: 'desc' },
    });

    return executions.map(e => this.mapExecutionToDto(e));
  }

  private static mapExecutionToDto(e: any): TestExecutionDto {
    const cases = e.testCasesList || [];
    const passed = cases.filter((c: any) => c.status === TestCaseStatus.PASSED || c.status === TestCaseStatus.WAIVED).length;
    const passRate = cases.length > 0 ? Math.round((passed / cases.length) * 100) : 0;

    return {
      id: e.id,
      projectId: e.projectId,
      testPlan: e.testPlan,
      testCases: Array.isArray(e.testCases) ? e.testCases : [],
      resultsSummary: e.resultsSummary,
      metrics: e.metrics as Record<string, unknown> | null,
      status: e.status as TestStatus,
      iterationNumber: e.iterationNumber,
      conductedById: e.conductedById,
      conductedByName: e.conductedBy?.fullName,
      testCasesList: cases.map((c: any) => this.mapTestCaseToDto(c)),
      passRate,
      createdAt: e.createdAt.toISOString(),
      updatedAt: e.updatedAt.toISOString(),
    };
  }

  private static mapTestCaseToDto(c: any): TestCaseDto {
    return {
      id: c.id,
      testExecutionId: c.testExecutionId,
      title: c.title,
      description: c.description,
      expectedResult: c.expectedResult,
      actualResult: c.actualResult,
      status: c.status as TestCaseStatus,
      severity: c.severity as RiskSeverity,
      evidence: c.evidence,
      testerId: c.testerId,
      testerName: c.tester?.fullName,
      executedAt: c.executedAt ? c.executedAt.toISOString() : null,
      defectReference: c.defectReference,
      blockerReason: c.blockerReason,
      blockerActor: c.blockerActor,
      waiverJustification: c.waiverJustification,
      waivedById: c.waivedById,
      retestOfId: c.retestOfId,
      comments: c.comments,
      createdAt: c.createdAt ? (c.createdAt instanceof Date ? c.createdAt.toISOString() : new Date(c.createdAt).toISOString()) : new Date().toISOString(),
      updatedAt: c.updatedAt ? (c.updatedAt instanceof Date ? c.updatedAt.toISOString() : new Date(c.updatedAt).toISOString()) : new Date().toISOString(),
    };
  }
}
