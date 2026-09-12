import { Request, Response, NextFunction } from 'express';
import { PrototypeService } from './prototype.service';
import { sendSuccess } from '../../utils/response';

export class PrototypeController {
  public static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: projectId } = req.params;
      const user = req.user!;
      const result = await PrototypeService.createPrototype({
        projectId,
        dto: req.body,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-prototype-create',
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async submit(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: prototypeId } = req.params;
      const user = req.user!;
      const result = await PrototypeService.submitPrototype({
        prototypeId,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-prototype-submit',
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async review(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: prototypeId } = req.params;
      const user = req.user!;
      const result = await PrototypeService.reviewPrototype({
        prototypeId,
        dto: req.body,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-prototype-review',
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async revise(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: prototypeId } = req.params;
      const user = req.user!;
      const result = await PrototypeService.revisePrototype({
        prototypeId,
        dto: req.body,
        actorId: user.id,
        actorRole: user.role,
        requestId: (req as any).requestId || 'req-prototype-revise',
        ipAddress: req.ip,
      });
      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async listForProject(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: projectId } = req.params;
      const result = await PrototypeService.getProjectPrototypes(projectId);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id: prototypeId } = req.params;
      const result = await PrototypeService.getPrototypeById(prototypeId);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}
