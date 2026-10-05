import { prisma } from '../../database/prisma';
import { logger } from '../../utils/logger';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { NotificationService } from '../notification/notification.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '@sicp/shared';

export interface RequestClarificationParams {
  challengeId?: string;
  groupId?: string;
  problemId?: string;
  targetScope: 'GROUP' | 'PROBLEM';
  requestedById: string;
  requestedByRole?: string;
  question: string;
  requestId?: string;
  ipAddress?: string;
}

export interface RespondClarificationParams {
  requestId: string;
  problemId?: string;
  citizenId: string;
  response: string;
  evidenceFileKey?: string;
}

export class ClarificationService {
  /**
   * Request clarification from citizens at either Group-level or Problem-level.
   */
  public static async requestClarification(params: RequestClarificationParams) {
    if (!params.question || params.question.trim().length < 5) {
      throw new ValidationError('A detailed clarification question of at least 5 characters is required.');
    }

    if (params.targetScope === 'PROBLEM' && !params.problemId) {
      throw new ValidationError('problemId is required for Problem-level clarification.');
    }

    if (params.targetScope === 'GROUP' && !params.groupId && !params.challengeId) {
      throw new ValidationError('groupId or challengeId is required for Group-level clarification.');
    }

    let problem = null;
    if (params.problemId) {
      problem = await prisma.problem.findUnique({
        where: { id: params.problemId },
        include: { group: true },
      });
      if (!problem) throw new NotFoundError('Problem not found for clarification request.');
    }

    let group = null;
    if (params.groupId) {
      group = await prisma.problemGroup.findUnique({
        where: { id: params.groupId },
        include: { problems: true, members: { include: { problem: true } } },
      });
    }

    // Persist ClarificationRequest
    const request = await prisma.clarificationRequest.create({
      data: {
        challengeId: params.challengeId || problem?.group?.challengeId || group?.challengeId || null,
        groupId: params.groupId || problem?.groupId || null,
        problemId: params.problemId || null,
        targetScope: params.targetScope,
        requestedById: params.requestedById,
        question: params.question.trim(),
        status: 'PENDING',
      },
      include: {
        requestedBy: { select: { id: true, fullName: true, role: true } },
      },
    });

    // Notify citizens
    const recipientIds = new Set<string>();

    if (params.targetScope === 'PROBLEM' && problem?.submitterId) {
      recipientIds.add(problem.submitterId);
    } else if (params.targetScope === 'GROUP' && group) {
      // Collect submitter IDs of all problems in this group
      for (const p of group.problems) {
        if (p.submitterId) recipientIds.add(p.submitterId);
      }
      for (const m of group.members) {
        if (m.problem.submitterId) recipientIds.add(m.problem.submitterId);
      }
    }

    for (const citizenId of recipientIds) {
      await NotificationService.create({
        recipientId: citizenId,
        recipientRole: 'CITIZEN',
        portal: 'citizen',
        title: 'Clarification Requested on your Civic Grievance',
        message: `Government official has requested clarification: "${params.question.slice(0, 120)}..."`,
        type: 'CLARIFICATION_REQUEST',
        actionUrl: params.challengeId ? `/challenges/${params.challengeId}` : '/my-challenges',
        metadata: {
          clarificationRequestId: request.id,
          targetScope: params.targetScope,
          problemId: params.problemId,
          groupId: params.groupId,
        },
      });
    }

    // Record immutable audit log
    await AuditService.record({
      actorId: params.requestedById,
      actorRole: params.requestedByRole || 'GOVERNMENT_OFFICER',
      action: AuditAction.CHALLENGE_STATE_TRANSITION,
      resource: 'ClarificationRequest',
      resourceId: request.id,
      reason: `Clarification requested (${params.targetScope}): ${params.question.slice(0, 100)}`,
      requestId: params.requestId || 'system',
      ipAddress: params.ipAddress,
    });

    return request;
  }

  /**
   * Citizen submits clarification response.
   */
  public static async respondClarification(params: RespondClarificationParams) {
    if (!params.response || params.response.trim().length < 2) {
      throw new ValidationError('A response message is required.');
    }

    const request = await prisma.clarificationRequest.findUnique({
      where: { id: params.requestId },
      include: { requestedBy: true, challenge: true },
    });

    if (!request) {
      throw new NotFoundError('Clarification request not found.');
    }

    // Create ClarificationResponse
    const response = await prisma.clarificationResponse.create({
      data: {
        requestId: params.requestId,
        problemId: params.problemId || request.problemId || null,
        citizenId: params.citizenId,
        response: params.response.trim(),
        evidenceFileKey: params.evidenceFileKey || null,
      },
      include: {
        citizen: { select: { id: true, fullName: true, role: true } },
      },
    });

    // Update ClarificationRequest status
    await prisma.clarificationRequest.update({
      where: { id: params.requestId },
      data: { status: 'RESPONDED' },
    });

    // Notify the requesting government official
    await NotificationService.create({
      recipientId: request.requestedById,
      recipientRole: 'GOVERNMENT_OFFICER',
      portal: 'government',
      title: 'Citizen Clarification Received',
      message: `Citizen response received for "${request.question.slice(0, 80)}...": "${params.response.slice(0, 100)}..."`,
      type: 'CLARIFICATION_RESPONSE',
      actionUrl: request.challengeId ? `/challenges/${request.challengeId}` : '/government',
      metadata: {
        clarificationRequestId: request.id,
        clarificationResponseId: response.id,
        challengeId: request.challengeId,
      },
    });

    return response;
  }

  /**
   * Get all clarifications for a Challenge.
   */
  public static async getClarificationsForChallenge(challengeId: string) {
    return prisma.clarificationRequest.findMany({
      where: { challengeId },
      include: {
        requestedBy: { select: { id: true, fullName: true, role: true } },
        responses: {
          include: {
            citizen: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get clarifications for a specific Problem.
   */
  public static async getClarificationsForProblem(problemId: string) {
    return prisma.clarificationRequest.findMany({
      where: { problemId },
      include: {
        requestedBy: { select: { id: true, fullName: true, role: true } },
        responses: {
          include: {
            citizen: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get clarifications for a specific ProblemGroup.
   */
  public static async getClarificationsForGroup(groupId: string) {
    return prisma.clarificationRequest.findMany({
      where: { groupId },
      include: {
        requestedBy: { select: { id: true, fullName: true, role: true } },
        responses: {
          include: {
            citizen: { select: { id: true, fullName: true, role: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
