import { Request, Response, NextFunction } from 'express';
import { SearchService, SearchQueryInput } from './search.service';
import { sendSuccess } from '../../utils/response';

export class SearchController {
  public static async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const params: SearchQueryInput = {
        q: req.query.q as string | undefined,
        type: req.query.type as SearchQueryInput['type'],
        category: req.query.category as string | undefined,
        severity: req.query.severity as string | undefined,
        priority: req.query.priority as string | undefined,
        status: req.query.status as string | undefined,
        district: req.query.district as string | undefined,
        state: req.query.state as string | undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      };

      const result = await SearchService.search(params, req.user);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}
