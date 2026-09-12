import { Request, Response, NextFunction } from 'express';
import { ProjectService } from './project.service';
import { sendSuccess } from '../../utils/response';
import { ValidationError } from '../../utils/errors';
import { MilestoneStatus, RiskSeverity, RiskProbability } from '@sicp/shared';

export class ProjectController {
  public static async list(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as any;
      const search = req.query.search as string | undefined;
      const orgId = req.query.orgId as string | undefined;
      const limit = Number(req.query.limit) || 20;
      const offset = Number(req.query.offset) || 0;

      const result = await ProjectService.listProjects({ status, search, orgId, limit, offset });
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getProject(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const project = await ProjectService.getProjectById(projectId);
      sendSuccess(res, project, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getCockpit(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const cockpit = await ProjectService.getProjectCockpit(projectId);
      sendSuccess(res, cockpit, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async checkActivationPrerequisites(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const checklist = await ProjectService.evaluateActivationPrerequisites(projectId);
      sendSuccess(res, checklist, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async activateProject(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const result = await ProjectService.activateProject({
        projectId,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        requestId: res.locals.requestId,
        ipAddress: req.ip,
      });

      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async createMilestone(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const { title, description, orderNumber, deadline, budgetAllocated, dependencyId } = req.body;

      if (!title || !deadline) {
        throw new ValidationError('title and deadline are required.');
      }

      const milestone = await ProjectService.createMilestone({
        projectId,
        title,
        description,
        orderNumber: orderNumber ? Number(orderNumber) : undefined,
        deadline,
        budgetAllocated: budgetAllocated ? Number(budgetAllocated) : undefined,
        dependencyId,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        requestId: res.locals.requestId,
        ipAddress: req.ip,
      });

      sendSuccess(res, milestone, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async updateMilestoneStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const milestoneId = req.params.milestoneId;
      const { status, progressPct, blockedReason } = req.body;

      if (!status || !Object.values(MilestoneStatus).includes(status)) {
        throw new ValidationError(`Valid milestone status is required. Allowed: ${Object.values(MilestoneStatus).join(', ')}`);
      }

      const updated = await ProjectService.updateMilestoneStatus({
        milestoneId,
        status,
        progressPct: progressPct !== undefined ? Number(progressPct) : undefined,
        blockedReason,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        requestId: res.locals.requestId,
        ipAddress: req.ip,
      });

      sendSuccess(res, updated, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async createRisk(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.id;
      const { title, severity, probability, impact, owner, mitigation } = req.body;

      if (!title || !severity || !probability || !impact || !mitigation) {
        throw new ValidationError('title, severity, probability, impact, and mitigation are required.');
      }

      const risk = await ProjectService.createRisk({
        projectId,
        title,
        severity: severity as RiskSeverity,
        probability: probability as RiskProbability,
        impact,
        owner,
        mitigation,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        requestId: res.locals.requestId,
        ipAddress: req.ip,
      });

      sendSuccess(res, risk, 201);
    } catch (err) {
      next(err);
    }
  }
}
