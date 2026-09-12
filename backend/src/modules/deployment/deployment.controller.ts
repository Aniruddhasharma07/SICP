import { Request, Response, NextFunction } from 'express';
import { DeploymentService } from './deployment.service';
import { sendSuccess } from '../../utils/response';

export class DeploymentController {
  public static async evaluateReadiness(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: projectId } = req.params;
      const result = await DeploymentService.evaluateReadinessGate(projectId);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: projectId } = req.params;
      const user = req.user!;
      const result = await DeploymentService.createDeployment({
        projectId,
        dto: req.body,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-deploy-create',
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: deploymentId } = req.params;
      const user = req.user!;
      const result = await DeploymentService.updateDeploymentStatus({
        deploymentId,
        status: req.body.status,
        blockerReason: req.body.blockerReason,
        blockerActor: req.body.blockerActor,
        failureRootCause: req.body.failureRootCause,
        rollbackReason: req.body.rollbackReason,
        operationalNotes: req.body.operationalNotes,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-deploy-status',
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
      const result = await DeploymentService.getProjectDeployments(projectId);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}
