import { prisma } from '../../database/prisma';
import { PriorityEngine } from '../../domain/intelligence/priority.engine';
import { NotFoundError } from '../../utils/errors';
import { PriorityLevel, SeverityLevel } from '@sicp/shared';

export class VoteService {
  public static async toggleVote(challengeId: string, userId: string): Promise<{
    voted: boolean;
    totalVotes: number;
    newPriorityScore: number;
  }> {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: { evidence: true },
    });

    if (!challenge) {
      throw new NotFoundError('Challenge', challengeId);
    }

    const existingVote = await prisma.communityVote.findUnique({
      where: {
        challengeId_userId: { challengeId, userId },
      },
    });

    let voted = false;
    if (existingVote) {
      // Remove vote
      await prisma.communityVote.delete({
        where: { id: existingVote.id },
      });
      voted = false;
    } else {
      // Add vote
      await prisma.communityVote.create({
        data: { challengeId, userId },
      });
      voted = true;
    }

    const totalVotes = await prisma.communityVote.count({
      where: { challengeId },
    });

    // Recalculate priority
    const priorityCalc = PriorityEngine.calculate({
      severity: challenge.severity as unknown as SeverityLevel,
      urgency: challenge.priority as unknown as PriorityLevel,
      affectedPopulation: challenge.affectedPopulation,
      durationMonths: challenge.durationMonths,
      communityVotesCount: totalVotes,
      evidenceCount: challenge.evidence.length,
    });

    await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        priorityScore: priorityCalc.score,
      },
    });

    return {
      voted,
      totalVotes,
      newPriorityScore: priorityCalc.score,
    };
  }

  public static async getVoteStatus(challengeId: string, userId?: string): Promise<{
    hasVoted: boolean;
    totalVotes: number;
  }> {
    const totalVotes = await prisma.communityVote.count({
      where: { challengeId },
    });

    let hasVoted = false;
    if (userId) {
      const existing = await prisma.communityVote.findUnique({
        where: { challengeId_userId: { challengeId, userId } },
      });
      hasVoted = !!existing;
    }

    return { hasVoted, totalVotes };
  }
}
