import { Request, Response, NextFunction } from 'express';
import { ReportsService, ExportReportParams } from './reports.service';
import { ValidationError } from '../../utils/errors';

export class ReportsController {
  public static async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const type = (req.query.type as string) || 'challenges';
      if (!['challenges', 'projects', 'solutions', 'outcomes'].includes(type)) {
        throw new ValidationError('Invalid export type. Must be challenges, projects, solutions, or outcomes');
      }

      const requestId = (res.locals.requestId as string) || 'req-export';
      const params: ExportReportParams = {
        type: type as ExportReportParams['type'],
        category: req.query.category as string | undefined,
        status: req.query.status as string | undefined,
        district: req.query.district as string | undefined,
        state: req.query.state as string | undefined,
        requestId,
        ipAddress: req.ip,
      };

      const result = await ReportsService.exportCsv(params, req.user!);

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      res.status(200).send(result.csv);
    } catch (err) {
      next(err);
    }
  }
}
