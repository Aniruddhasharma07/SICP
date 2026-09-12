import { prisma } from '../../database/prisma';
import {
  FundingStatus,
  UserRole,
  AuditAction,
  FundingRequestDto,
} from '@sicp/shared';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export interface RequestFundingParams {
  projectId: string;
  stage: string;
  totalAmount: number;
  fundingSource: string;
  partnerOrgId?: string;
  budgetBreakdown?: Record<string, number>;
  justification: string;
  actorId: string;
  actorRole: UserRole;
  requestId: string;
  ipAddress?: string;
}

export interface ReviewFundingParams {
  fundingRequestId: string;
  status: 'APPROVED' | 'PARTIALLY_APPROVED' | 'REVISION_REQUESTED' | 'REJECTED';
  approvedAmount?: number;
  decisionNotes?: string;
  actorId: string;
  actorRole: UserRole;
  requestId: string;
  ipAddress?: string;
}

export class FundingService {
  /**
   * Creates or submits a stage funding request.
   */
  public static async requestFunding(params: RequestFundingParams) {
    const {
      projectId,
      stage,
      totalAmount,
      fundingSource,
      partnerOrgId,
      budgetBreakdown,
      justification,
      actorId,
      actorRole,
      requestId,
      ipAddress,
    } = params;

    if (!totalAmount || totalAmount <= 0) {
      throw new ValidationError('totalAmount must be greater than zero.');
    }

    if (!justification || justification.trim().length < 10) {
      throw new ValidationError('justification must be at least 10 characters.');
    }

    return await prisma.$transaction(async tx => {
      const project = await tx.project.findUnique({ where: { id: projectId } });
      if (!project) {
        throw new NotFoundError('Project', projectId);
      }

      const fundingRequest = await tx.fundingRequest.create({
        data: {
          projectId,
          stage,
          totalAmount: totalAmount as any,
          fundingSource,
          partnerOrgId,
          budgetBreakdown: budgetBreakdown ? (budgetBreakdown as any) : undefined,
          justification: justification.trim(),
          status: FundingStatus.SUBMITTED,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: AuditAction.FUNDING_REQUESTED,
          resource: 'FundingRequest',
          resourceId: fundingRequest.id,
          newState: { projectId, stage, totalAmount, fundingSource },
          requestId,
          ipAddress: ipAddress || null,
        },
      });

      logger.info(`Funding request ${fundingRequest.id} created for project ${projectId} (₹${totalAmount})`);

      return fundingRequest;
    });
  }

  /**
   * Reviews a funding request (Full Approval, Partial Approval, Revision, Rejection).
   * Implements explicit funding gap calculation and recovery actions.
   */
  public static async reviewFunding(params: ReviewFundingParams) {
    const {
      fundingRequestId,
      status,
      approvedAmount,
      decisionNotes,
      actorId,
      actorRole,
      requestId,
      ipAddress,
    } = params;

    return await prisma.$transaction(async tx => {
      const existing = await tx.fundingRequest.findUnique({
        where: { id: fundingRequestId },
        include: { project: true },
      });

      if (!existing) {
        throw new NotFoundError('FundingRequest', fundingRequestId);
      }

      const totalRequested = Number(existing.totalAmount);
      let effectiveApproved = approvedAmount !== undefined ? approvedAmount : totalRequested;
      let effectiveStatus = status;

      if (status === 'APPROVED' && effectiveApproved < totalRequested) {
        effectiveStatus = 'PARTIALLY_APPROVED';
      }

      if (effectiveStatus === 'PARTIALLY_APPROVED' && effectiveApproved >= totalRequested) {
        effectiveStatus = 'APPROVED';
      }

      const fundingGap = effectiveStatus === 'PARTIALLY_APPROVED' ? totalRequested - effectiveApproved : 0;

      const updated = await tx.fundingRequest.update({
        where: { id: fundingRequestId },
        data: {
          status: effectiveStatus as FundingStatus,
          approvedAmount: (effectiveStatus === 'APPROVED' || effectiveStatus === 'PARTIALLY_APPROVED') ? (effectiveApproved as any) : 0,
          decisionNotes: decisionNotes?.trim() || null,
          reviewedById: actorId,
          reviewedAt: new Date(),
        },
      });

      // If approved or partially approved, update project budget
      if (effectiveStatus === 'APPROVED' || effectiveStatus === 'PARTIALLY_APPROVED') {
        const currentBudget = Number(existing.project.budget || 0);
        await tx.project.update({
          where: { id: existing.projectId },
          data: { budget: (currentBudget + effectiveApproved) as any },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: AuditAction.FUNDING_REVIEWED,
          resource: 'FundingRequest',
          resourceId: fundingRequestId,
          previousState: { status: existing.status },
          newState: { status: updated.status, approvedAmount: effectiveApproved, fundingGap },
          reason: decisionNotes?.trim() || null,
          requestId,
          ipAddress: ipAddress || null,
        },
      });

      // Gap resolution options if partially approved
      let gapResolution = null;
      if (effectiveStatus === 'PARTIALLY_APPROVED' && fundingGap > 0) {
        gapResolution = {
          fundingGap,
          message: `Funding request was partially approved. A shortfall of ₹${fundingGap.toLocaleString('en-IN')} remains.`,
          recoveryOptions: [
            {
              strategy: 'CSR_CO_FUNDING',
              label: 'Match with CSR / Industry Co-Funders',
              actionUrl: `/university?tab=partnerships&projectId=${existing.projectId}`,
            },
            {
              strategy: 'SCOPE_ADJUSTMENT',
              label: 'Adjust Prototype Scope to Approved Budget',
              actionUrl: `/projects/${existing.projectId}`,
            },
            {
              strategy: 'GAP_GRANT',
              label: 'Apply for Fast-Track Innovation Gap Grant',
              actionUrl: `/university?tab=funding&projectId=${existing.projectId}`,
            },
          ],
        };
      }

      logger.info(`Funding request ${fundingRequestId} reviewed by ${actorId}: ${effectiveStatus} (Approved: ₹${effectiveApproved}, Gap: ₹${fundingGap})`);

      return {
        fundingRequest: updated,
        gapResolution,
      };
    });
  }

  /**
   * Retrieves all funding requests for a project with financial summary.
   */
  public static async getProjectFunding(projectId: string) {
    const requests = await prisma.fundingRequest.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    const totalRequested = requests.reduce((sum, r) => sum + Number(r.totalAmount), 0);
    const totalApproved = requests.reduce((sum, r) => sum + Number(r.approvedAmount || 0), 0);
    const totalGap = requests.reduce((sum, r) => {
      const req = Number(r.totalAmount);
      const app = Number(r.approvedAmount || 0);
      return sum + (r.status === 'PARTIALLY_APPROVED' ? req - app : 0);
    }, 0);

    return {
      requests,
      summary: {
        totalRequested,
        totalApproved,
        totalGap,
        count: requests.length,
      },
    };
  }
}
