import { Request, Response, NextFunction } from 'express';
import { AnalyticsService } from './analytics.service';
import { sendSuccess } from '../../utils/response';

export class AnalyticsController {
  public static async getPlatformAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const analytics = await AnalyticsService.getPlatformAnalytics();
      sendSuccess(res, analytics, 200);
    } catch (err) {
      next(err);
    }
  }
}
