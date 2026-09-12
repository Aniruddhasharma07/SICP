import { Request, Response, NextFunction } from 'express';
import { TeamService } from './team.service';
import { sendSuccess } from '../../utils/response';
import { ValidationError } from '../../utils/errors';
import { TeamRole } from '@sicp/shared';

export class TeamController {
  public static async createTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, challengeId, leadFacultyId } = req.body;

      if (!name || !challengeId) {
        throw new ValidationError('name and challengeId are required.');
      }

      const team = await TeamService.createTeam({
        name,
        challengeId,
        leadFacultyId: leadFacultyId || req.user!.id,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        requestId: res.locals.requestId,
        ipAddress: req.ip,
      });

      sendSuccess(res, team, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getTeam(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.params.id;
      const team = await TeamService.getTeam(teamId);
      sendSuccess(res, team, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getTeamHealth(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.params.id;
      const health = await TeamService.getTeamHealth(teamId);
      sendSuccess(res, health, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async inviteMember(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.params.id;
      const { userId, roleInTeam } = req.body;

      if (!userId || !roleInTeam) {
        throw new ValidationError('userId and roleInTeam are required.');
      }

      if (!Object.values(TeamRole).includes(roleInTeam)) {
        throw new ValidationError(`Invalid roleInTeam. Allowed: ${Object.values(TeamRole).join(', ')}`);
      }

      const member = await TeamService.inviteMember({
        teamId,
        userId,
        roleInTeam,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        requestId: res.locals.requestId,
        ipAddress: req.ip,
      });

      sendSuccess(res, member, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async respondInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const teamId = req.params.id;
      const { decision, reason } = req.body;

      if (!decision || (decision !== 'ACCEPTED' && decision !== 'DECLINED')) {
        throw new ValidationError("decision must be 'ACCEPTED' or 'DECLINED'.");
      }

      const member = await TeamService.respondInvitation({
        teamId,
        userId: req.user!.id,
        decision,
        reason,
        requestId: res.locals.requestId,
        ipAddress: req.ip,
      });

      sendSuccess(res, member, 200);
    } catch (err) {
      next(err);
    }
  }
}
