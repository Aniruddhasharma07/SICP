import { prisma } from '../../database/prisma';
import { ImpactModelRegistry } from './impact-model.registry';
import { PriorityEngine } from '../intelligence/priority.engine';
import {
  ImpactVerificationStatus,
  ProblemType,
  SeverityLevel,
  PriorityLevel,
  UserRole,
  AuditAction,
} from '@sicp/shared';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export class ImpactService {
  /**
   * Evaluates problem-specific impact intelligence and persists ChallengeImpact record
   */
  public static async computeAndPersistImpact(
    challengeId: string,
    inputs: Record<string, unknown> = {},
    userProvidedPopulation?: number | null
  ) {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: { impact: true },
    });

    if (!challenge) {
      throw new NotFoundError('Challenge', challengeId);
    }

    // If already verified by a government authority, preserve the authoritative verified value!
    if (challenge.impact?.verificationStatus === ImpactVerificationStatus.VERIFIED) {
      logger.info(`Preserving government verified impact for challenge ${challengeId}`);
      return challenge.impact;
    }

    const evaluation = ImpactModelRegistry.evaluateImpact(
      {
        challengeId,
        category: challenge.category,
        title: challenge.title,
        description: challenge.description,
        durationMonths: challenge.durationMonths,
        userProvidedPopulation: userProvidedPopulation !== undefined ? userProvidedPopulation : challenge.affectedPopulation,
      },
      inputs
    );

    // Upsert ChallengeImpact record in PostgreSQL
    const savedImpact = await prisma.challengeImpact.upsert({
      where: { challengeId },
      create: {
        challengeId,
        problemType: evaluation.problemType,
        metricType: evaluation.metricType,
        unit: evaluation.unit,
        timeBasis: evaluation.timeBasis,
        estimatedValue: evaluation.value,
        normalizedMagnitude: evaluation.normalizedMagnitude,
        calculationMethod: evaluation.calculationMethod,
        inputs: evaluation.inputs as import('@prisma/client').Prisma.InputJsonValue,
        confidence: evaluation.confidence,
        evidenceBasis: evaluation.evidenceBasis,
        dataSources: evaluation.dataSources,
        verificationStatus: evaluation.verificationStatus,
        missingInformation: evaluation.missingInformation,
        suggestedQuestions: evaluation.suggestedQuestions as unknown as import('@prisma/client').Prisma.InputJsonValue,
        requiresHumanReview: evaluation.requiresHumanReview,
        explanation: evaluation.explanation,
      },
      update: {
        problemType: evaluation.problemType,
        metricType: evaluation.metricType,
        unit: evaluation.unit,
        timeBasis: evaluation.timeBasis,
        estimatedValue: evaluation.value,
        normalizedMagnitude: evaluation.normalizedMagnitude,
        calculationMethod: evaluation.calculationMethod,
        inputs: evaluation.inputs as import('@prisma/client').Prisma.InputJsonValue,
        confidence: evaluation.confidence,
        evidenceBasis: evaluation.evidenceBasis,
        dataSources: evaluation.dataSources,
        verificationStatus: evaluation.verificationStatus,
        missingInformation: evaluation.missingInformation,
        suggestedQuestions: evaluation.suggestedQuestions as unknown as import('@prisma/client').Prisma.InputJsonValue,
        requiresHumanReview: evaluation.requiresHumanReview,
        explanation: evaluation.explanation,
      },
    });

    // Recalculate transparent priority score using the problem-specific impact magnitude
    const priorityCalc = PriorityEngine.calculate({
      severity: challenge.severity as unknown as SeverityLevel,
      urgency: challenge.priority as unknown as PriorityLevel,
      impactMagnitude: evaluation.normalizedMagnitude,
      impactExplanation: `${evaluation.value.toLocaleString()} ${evaluation.unit.toLowerCase().replace(/_/g, ' ')}`,
      durationMonths: challenge.durationMonths,
      communityVotesCount: 0, // preserved via vote recalculation if needed
      evidenceCount: 0,
    });

    await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        priorityScore: priorityCalc.score,
        affectedPopulation: Math.round(evaluation.value), // synchronized for high-level queries
      },
    });

    logger.info(`Computed impact for challenge ${challengeId}: ${evaluation.value} ${evaluation.unit} (magnitude ${evaluation.normalizedMagnitude})`);
    return savedImpact;
  }

  /**
   * Allows Government Officers to authoritatively verify, modify, or challenge an impact estimate
   */
  public static async verifyOrModifyImpact(params: {
    challengeId: string;
    action: 'VERIFY' | 'MODIFY' | 'REQUEST_EVIDENCE';
    verifiedValue?: number;
    verificationNotes?: string;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }) {
    const { challengeId, action, verifiedValue, verificationNotes, actorId, actorRole, requestId, ipAddress } = params;

    return await prisma.$transaction(async tx => {
      const challenge = await tx.challenge.findUnique({
        where: { id: challengeId },
        include: { impact: true },
      });

      if (!challenge) {
        throw new NotFoundError('Challenge', challengeId);
      }

      if (!challenge.impact) {
        throw new ValidationError('Impact record has not yet been computed for this challenge');
      }

      const prevImpact = challenge.impact;
      let finalVerifiedValue: number | null = prevImpact.verifiedValue;
      let finalStatus: string = prevImpact.verificationStatus;
      let finalMagnitude = prevImpact.normalizedMagnitude;

      if (action === 'VERIFY') {
        finalStatus = ImpactVerificationStatus.VERIFIED;
        finalVerifiedValue = verifiedValue !== undefined ? verifiedValue : prevImpact.estimatedValue;
        // Re-scale magnitude based on authoritative verified value
        finalMagnitude = Math.min(100, Math.round(11 * Math.log(1 + finalVerifiedValue)));
      } else if (action === 'MODIFY') {
        if (verifiedValue === undefined || verifiedValue < 0) {
          throw new ValidationError('A positive numerical value is required to modify impact');
        }
        finalStatus = ImpactVerificationStatus.VERIFIED;
        finalVerifiedValue = verifiedValue;
        finalMagnitude = Math.min(100, Math.round(11 * Math.log(1 + verifiedValue)));
      } else if (action === 'REQUEST_EVIDENCE') {
        finalStatus = ImpactVerificationStatus.REPORTED;
      }

      const updatedImpact = await tx.challengeImpact.update({
        where: { challengeId },
        data: {
          verifiedValue: finalVerifiedValue,
          verificationStatus: finalStatus,
          normalizedMagnitude: finalMagnitude,
          verifiedById: actorId,
          verifiedAt: new Date(),
          verificationNotes: verificationNotes || null,
        },
      });

      // Recalculate priority score with the verified authoritative magnitude
      const priorityCalc = PriorityEngine.calculate({
        severity: challenge.severity as unknown as SeverityLevel,
        urgency: challenge.priority as unknown as PriorityLevel,
        impactMagnitude: finalMagnitude,
        impactExplanation: `${(finalVerifiedValue ?? prevImpact.estimatedValue).toLocaleString()} ${prevImpact.unit.toLowerCase().replace(/_/g, ' ')} (Verified by Gov)`,
        durationMonths: challenge.durationMonths,
      });

      const updatedChallenge = await tx.challenge.update({
        where: { id: challengeId },
        data: {
          priorityScore: priorityCalc.score,
          affectedPopulation: finalVerifiedValue ? Math.round(finalVerifiedValue) : undefined,
          version: { increment: 1 },
        },
      });

      // Audit trail record
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: AuditAction.CHALLENGE_STATE_TRANSITION,
          resource: 'ChallengeImpact',
          resourceId: updatedImpact.id,
          previousState: {
            verificationStatus: prevImpact.verificationStatus,
            estimatedValue: prevImpact.estimatedValue,
            verifiedValue: prevImpact.verifiedValue,
            priorityScore: challenge.priorityScore,
          },
          newState: {
            verificationStatus: updatedImpact.verificationStatus,
            verifiedValue: updatedImpact.verifiedValue,
            normalizedMagnitude: updatedImpact.normalizedMagnitude,
            priorityScore: updatedChallenge.priorityScore,
          },
          reason: verificationNotes || `Government impact ${action}`,
          requestId,
          ipAddress: ipAddress || null,
        },
      });

      logger.info(`Government impact ${action} on challenge ${challengeId} by ${actorRole}: verifiedValue=${finalVerifiedValue}`);

      return {
        impact: updatedImpact,
        challenge: updatedChallenge,
      };
    });
  }

  /**
   * Submits answers to adaptive questions and recomputes the impact metric
   */
  public static async answerAdaptiveQuestions(params: {
    challengeId: string;
    answers: Record<string, unknown>;
    actorId: string;
  }) {
    const { challengeId, answers } = params;

    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: { impact: true },
    });

    if (!challenge) {
      throw new NotFoundError('Challenge', challengeId);
    }

    const existingInputs = (challenge.impact?.inputs as Record<string, unknown>) || {};
    const mergedInputs = { ...existingInputs, ...answers };

    return await this.computeAndPersistImpact(challengeId, mergedInputs);
  }
}
