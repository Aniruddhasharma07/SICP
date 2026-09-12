import { Request, Response, NextFunction } from 'express';
import { UniversityService } from './university.service';
import { sendSuccess } from '../../utils/response';
import { ValidationError, ForbiddenError } from '../../utils/errors';
import { UserRole } from '@sicp/shared';

export class UniversityController {
  public static async acceptAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const challengeId = req.params.id;
      const universityOrgId = req.body.universityOrgId || req.user?.organizationId;

      if (!universityOrgId) {
        throw new ValidationError('University organization ID is required.');
      }

      // Ensure user belongs to this university organization unless SYSTEM_ADMIN
      if (req.user?.role !== UserRole.SYSTEM_ADMIN && req.user?.organizationId !== universityOrgId) {
        throw new ForbiddenError('You can only accept assignments for your own university organization.');
      }

      const result = await UniversityService.acceptAssignment({
        challengeId,
        universityOrgId,
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

  public static async declineAssignment(req: Request, res: Response, next: NextFunction) {
    try {
      const challengeId = req.params.id;
      const { reason } = req.body;
      const universityOrgId = req.body.universityOrgId || req.user?.organizationId;

      if (!universityOrgId) {
        throw new ValidationError('University organization ID is required.');
      }

      if (!reason) {
        throw new ValidationError('A detailed reason is mandatory to decline an assignment.');
      }

      if (req.user?.role !== UserRole.SYSTEM_ADMIN && req.user?.organizationId !== universityOrgId) {
        throw new ForbiddenError('You can only decline assignments for your own university organization.');
      }

      const result = await UniversityService.declineAssignment({
        challengeId,
        universityOrgId,
        reason,
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

  public static async expressInterest(req: Request, res: Response, next: NextFunction) {
    try {
      const challengeId = req.params.id;
      const { notes } = req.body || {};
      const universityOrgId = req.body?.universityOrgId || req.user?.organizationId;

      if (!universityOrgId) {
        throw new ValidationError('University organization ID is required.');
      }

      if (req.user?.role !== UserRole.SYSTEM_ADMIN && req.user?.organizationId !== universityOrgId) {
        throw new ForbiddenError('You can only express interest for your own university organization.');
      }

      const result = await UniversityService.expressInterest({
        challengeId,
        universityOrgId,
        notes,
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

  public static async getAssignedChallenges(req: Request, res: Response, next: NextFunction) {
    try {
      const universityOrgId = (req.query.universityOrgId as string) || req.user?.organizationId;

      if (!universityOrgId) {
        return sendSuccess(res, [], 200);
      }

      const challenges = await UniversityService.getAssignedChallenges(universityOrgId);
      sendSuccess(res, challenges, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getFacultyMatches(req: Request, res: Response, next: NextFunction) {
    try {
      const challengeId = req.params.id;
      const universityOrgId = (req.query.universityOrgId as string) || req.user?.organizationId || undefined;

      const matches = await UniversityService.getFacultyMatches(challengeId, universityOrgId);
      sendSuccess(res, matches, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async upsertFacultyProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.params.userId || req.user!.id;

      if (req.user?.role !== UserRole.SYSTEM_ADMIN && req.user?.id !== userId && req.user?.role !== UserRole.UNIVERSITY_ADMIN) {
        throw new ForbiddenError('You can only update your own faculty profile.');
      }

      const {
        department,
        designation,
        expertiseTags,
        researchInterests,
        publicationsCount,
        patentsCount,
        pastProjectsCount,
        maxSimultaneousProjects,
        bio,
      } = req.body;

      if (!department || !designation || !Array.isArray(expertiseTags)) {
        throw new ValidationError('Department, designation, and expertiseTags array are required.');
      }

      const profile = await UniversityService.upsertFacultyProfile({
        userId,
        department,
        designation,
        expertiseTags,
        researchInterests,
        publicationsCount: Number(publicationsCount) || 0,
        patentsCount: Number(patentsCount) || 0,
        pastProjectsCount: Number(pastProjectsCount) || 0,
        maxSimultaneousProjects: Number(maxSimultaneousProjects) || 3,
        bio,
      });

      sendSuccess(res, profile, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getRegisteredUniversities(req: Request, res: Response, next: NextFunction) {
    try {
      const universities = await UniversityService.getRegisteredUniversities();
      sendSuccess(res, universities, 200);
    } catch (err) {
      next(err);
    }
  }
}

