import { Request, Response, NextFunction } from 'express';
import { PilotService } from './pilot.service';
import { sendSuccess } from '../../utils/response';

export class PilotController {
  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: projectId } = req.params;
      const user = req.user!;
      const result = await PilotService.createPilot({
        projectId,
        dto: req.body,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-pilot-create',
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async recordMetric(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: pilotId } = req.params;
      const user = req.user!;
      const result = await PilotService.recordMetric({
        pilotId,
        dto: req.body,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-pilot-metric',
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: pilotId } = req.params;
      const user = req.user!;
      const result = await PilotService.updateStatus({
        pilotId,
        status: req.body.status,
        findings: req.body.findings,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-pilot-status',
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
      const result = await PilotService.getProjectPilots(projectId);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}
