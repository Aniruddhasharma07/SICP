import { Request, Response, NextFunction } from 'express';
import { VoteService } from './vote.service';
import { sendSuccess } from '../../utils/response';
import { UnauthorizedError } from '../../utils/errors';

export class VoteController {
  public static async toggle(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required to support a challenge');
      }

      const { challengeId } = req.params;
      const result = await VoteService.toggleVote(challengeId, req.user.id);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { challengeId } = req.params;
      const userId = req.user?.id;
      const result = await VoteService.getVoteStatus(challengeId, userId);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}
