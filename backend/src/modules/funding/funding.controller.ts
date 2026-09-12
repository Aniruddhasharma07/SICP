import { Request, Response, NextFunction } from 'express';
import { FundingService } from './funding.service';
import { sendSuccess } from '../../utils/response';
import { ValidationError } from '../../utils/errors';

export class FundingController {
  public static async requestFunding(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        projectId,
        stage,
        totalAmount,
        fundingSource,
        partnerOrgId,
        budgetBreakdown,
        justification,
      } = req.body;

      if (!projectId || !stage || !totalAmount || !fundingSource || !justification) {
        throw new ValidationError('projectId, stage, totalAmount, fundingSource, and justification are required.');
      }

      const result = await FundingService.requestFunding({
        projectId,
        stage,
        totalAmount: Number(totalAmount),
        fundingSource,
        partnerOrgId,
        budgetBreakdown,
        justification,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        requestId: res.locals.requestId,
        ipAddress: req.ip,
      });

      sendSuccess(res, result, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async reviewFunding(req: Request, res: Response, next: NextFunction) {
    try {
      const fundingRequestId = req.params.id;
      const { status, approvedAmount, decisionNotes } = req.body;

      if (!status || !['APPROVED', 'PARTIALLY_APPROVED', 'REVISION_REQUESTED', 'REJECTED'].includes(status)) {
        throw new ValidationError("status must be 'APPROVED', 'PARTIALLY_APPROVED', 'REVISION_REQUESTED', or 'REJECTED'.");
      }

      const result = await FundingService.reviewFunding({
        fundingRequestId,
        status,
        approvedAmount: approvedAmount !== undefined ? Number(approvedAmount) : undefined,
        decisionNotes,
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

  public static async getProjectFunding(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = req.params.projectId;
      const result = await FundingService.getProjectFunding(projectId);
      sendSuccess(res, result, 200);
    } catch (err) {
      next(err);
    }
  }
}
