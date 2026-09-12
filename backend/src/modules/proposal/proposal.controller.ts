import { Request, Response, NextFunction } from 'express';
import { ProposalService } from './proposal.service';
import { sendSuccess } from '../../utils/response';
import { ValidationError } from '../../utils/errors';

export class ProposalController {
  public static async createProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const {
        projectId,
        challengeId,
        problemUnderstanding,
        rootCauseHypothesis,
        technicalApproach,
        budgetBreakdown,
        expectedImpact,
        risksAndMitigations,
        sustainabilityPlan,
      } = req.body;

      if (!projectId) {
        throw new ValidationError('projectId is required.');
      }

      const proposal = await ProposalService.createProposal({
        projectId,
        challengeId,
        problemUnderstanding,
        rootCauseHypothesis,
        technicalApproach,
        budgetBreakdown,
        expectedImpact,
        risksAndMitigations,
        sustainabilityPlan,
        actorId: req.user!.id,
        actorRole: req.user!.role,
        requestId: res.locals.requestId,
        ipAddress: req.ip,
      });

      sendSuccess(res, proposal, 201);
    } catch (err) {
      next(err);
    }
  }

  public static async getProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const proposalId = req.params.id;
      const proposal = await ProposalService.getProposal(proposalId);
      sendSuccess(res, proposal, 200);
    } catch (err) {
      next(err);
    }
  }

  public static async submitProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const proposalId = req.params.id;
      const updated = await ProposalService.submitProposal({
        proposalId,
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

  public static async reviewProposal(req: Request, res: Response, next: NextFunction) {
    try {
      const proposalId = req.params.id;
      const { decision, comments, requiredChanges } = req.body;

      if (!decision || !['APPROVED', 'REVISION_REQUESTED', 'REJECTED'].includes(decision)) {
        throw new ValidationError("decision must be 'APPROVED', 'REVISION_REQUESTED', or 'REJECTED'.");
      }

      const result = await ProposalService.reviewProposal({
        proposalId,
        decision,
        comments,
        requiredChanges,
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
}
