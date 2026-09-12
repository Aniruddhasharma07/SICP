import { Request, Response, NextFunction } from 'express';
import { TestingService } from './testing.service';
import { sendSuccess } from '../../utils/response';

export class TestingController {
  public static async createExecution(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: projectId } = req.params;
      const user = req.user!;
      const result = await TestingService.createTestExecution({
        projectId,
        testPlan: req.body.testPlan,
        resultsSummary: req.body.resultsSummary,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-test-create',
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async addCase(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: testExecutionId } = req.params;
      const user = req.user!;
      const result = await TestingService.addTestCase({
        testExecutionId,
        dto: req.body,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-testcase-add',
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async executeCase(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: testCaseId } = req.params;
      const user = req.user!;
      const result = await TestingService.executeTestCase({
        testCaseId,
        dto: req.body,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-testcase-exec',
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async retestCase(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: testCaseId } = req.params;
      const user = req.user!;
      const result = await TestingService.retestTestCase({
        failedTestCaseId: testCaseId,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-testcase-retest',
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async submitExecution(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: testExecutionId } = req.params;
      const user = req.user!;
      const result = await TestingService.submitTestExecution({
        testExecutionId,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-test-submit',
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async listForProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: projectId } = req.params;
      const result = await TestingService.getProjectTests(projectId);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}
