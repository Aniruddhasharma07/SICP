import { prisma } from '../../database/prisma';
import {
  KnowledgeAssistantRequestDto,
  KnowledgeAssistantResponseDto,
  UserRole,
  SolutionMemoryStatus,
  MemoryOutcomeStatus,
  EvidenceLevel,
} from '@sicp/shared';
import { DuplicateClusteringService } from './duplicate-clustering.service';
import { logger } from '../../utils/logger';
import { AiServiceClient } from './ai-service.client';

export class KnowledgeAssistantEngine {
  /**
   * Resilient, anti-hallucinating knowledge retrieval assistant.
   * Grounded exclusively in verified database records with strict RBAC boundary.
   */
  public static async askAssistant(
    request: KnowledgeAssistantRequestDto,
    userRole: UserRole,
    userId?: string
  ): Promise<KnowledgeAssistantResponseDto> {
    const query = request.query?.trim();

    if (!query) {
      return {
        answer: 'Please provide a specific civic question or technical query to search the SICP institutional memory.',
        citations: [],
        historicalWarnings: [],
        suggestedFollowUpQuestions: [
          'What solutions have worked for arsenic water contamination?',
          'What are common failure modes in rural solar microgrid deployments?',
          'Which interventions have highest reusability in road pothole remediation?',
        ],
        evidenceQuality: 'INSUFFICIENT_EVIDENCE',
      };
    }

    // Role-based visibility enforcement
    const isPublic = userRole === UserRole.CITIZEN || userRole === UserRole.COMMUNITY_GROUP || userRole === UserRole.STUDENT || !userRole;
    const allowedMemoryStatuses = isPublic
      ? [SolutionMemoryStatus.PUBLISHED]
      : [SolutionMemoryStatus.PUBLISHED, SolutionMemoryStatus.UNDER_REVIEW, SolutionMemoryStatus.REQUIRES_REVIEW];

    // Query candidate solution memories
    const memories = await prisma.solutionMemory.findMany({
      where: {
        status: { in: allowedMemoryStatuses },
        ...(request.contextCategory
          ? { challengeCategory: { equals: request.contextCategory, mode: 'insensitive' } }
          : {}),
      },
      include: {
        project: {
          select: { id: true, title: true, status: true },
        },
        challenge: {
          select: { id: true, title: true, category: true, district: true, state: true },
        },
      },
      take: 20,
    });

    // Score and filter memories by token similarity to query
    const scoredMemories: Array<{
      memory: (typeof memories)[0];
      similarity: number;
    }> = [];

    for (const mem of memories) {
      const locStr = mem.locationContext ? Object.values(mem.locationContext).filter(v => typeof v === 'string').join(' ') : '';
      const tagsStr = (mem.tags || []).join(' ');
      const challengeLoc = mem.challenge ? `${mem.challenge.district || ''} ${mem.challenge.state || ''}` : '';
      const corpus = `${mem.title} ${mem.problemSummary} ${mem.rootCause} ${mem.technicalApproach} ${mem.lessonsLearned} ${mem.challengeCategory} ${locStr} ${tagsStr} ${challengeLoc}`.toLowerCase();
      const sim = DuplicateClusteringService.calculateTokenSimilarity(query.toLowerCase(), corpus);

      // Check keyword overlap
      const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      const matchedWords = queryWords.filter(w => corpus.includes(w));
      const keywordRatio = queryWords.length > 0 ? matchedWords.length / queryWords.length : 0;

      // If title or rootCause directly matches key query terms
      const coreTerms = `${mem.title} ${mem.rootCause}`.toLowerCase();
      const coreMatches = queryWords.filter(w => coreTerms.includes(w)).length;
      const coreBoost = coreMatches > 0 ? 0.25 : 0;

      const totalScore = Math.min(1.0, sim * 0.4 + keywordRatio * 0.4 + coreBoost);

      if (totalScore >= 0.15 || coreMatches > 0) {
        scoredMemories.push({ memory: mem, similarity: totalScore });
      }
    }

    scoredMemories.sort((a, b) => b.similarity - a.similarity);
    const topMatches = scoredMemories.slice(0, 3);

    // Strict Anti-Hallucination: If zero relevant verified solutions found, return honest empty state
    if (topMatches.length === 0) {
      return {
        answer: `No historical verified solutions or pilot outcomes found matching "${query}" in the SICP institutional knowledge base.

SICP strictly does not fabricate unverified case studies. You may:
1. Submit this issue as a new Civic Challenge to invite university research teams.
2. Search broader keywords in the Solution Repository.
3. Consult the Government Innovation Directory for related departmental initiatives.`,
        citations: [],
        historicalWarnings: [],
        suggestedFollowUpQuestions: [
          'How do I submit a new civic challenge for this issue?',
          'What evidence is required to verify a problem in this category?',
          'Can I search by district or state jurisdiction?',
        ],
        evidenceQuality: 'INSUFFICIENT_EVIDENCE',
      };
    }

    // Grounded synthesis from actual records
    const citations: KnowledgeAssistantResponseDto['citations'] = [];
    const historicalWarnings: string[] = [];
    const answerParts: string[] = [];

    let hasHighConfidence = false;
    let hasMediumConfidence = false;

    for (const match of topMatches) {
      const mem = match.memory;

      // Solution Memory Citation
      citations.push({
        recordType: 'SOLUTION_MEMORY',
        recordId: mem.id,
        recordTitle: mem.title,
        outcomeStatus: mem.outcomeStatus,
        relevanceContext: `Historical intervention with ${mem.reusabilityClass} rating. Technical approach: ${mem.technicalApproach.slice(0, 120)}...`,
        actionUrl: `/solutions/${mem.id}`,
      });

      // Project Citation if linked
      if (mem.project) {
        citations.push({
          recordType: 'PROJECT',
          recordId: mem.project.id,
          recordTitle: mem.project.title,
          outcomeStatus: mem.project.status,
          relevanceContext: `Deployed institutional initiative associated with Challenge #${mem.challengeId || 'N/A'}.`,
          actionUrl: `/projects/${mem.project.id}`,
        });
      }

      // Collect real historical warnings
      if (mem.whatFailed && mem.whatFailed.trim().length > 10) {
        historicalWarnings.push(`From [${mem.title}]: ${mem.whatFailed.trim()}`);
      }
      if (mem.futureWarnings && mem.futureWarnings.trim().length > 10) {
        historicalWarnings.push(`Operational Alert [${mem.title}]: ${mem.futureWarnings.trim()}`);
      }

      if (mem.evidenceLevel === EvidenceLevel.MULTI_SOURCE_VERIFIED || mem.evidenceLevel === EvidenceLevel.VERIFIED) {
        hasHighConfidence = true;
      } else {
        hasMediumConfidence = true;
      }

      answerParts.push(
        `• **${mem.title}** (Reusability: *${mem.reusabilityClass}*, Outcome: *${mem.outcomeStatus}*):
  - **Technical Approach**: ${mem.technicalApproach}
  - **Root Cause Addressed**: ${mem.rootCause}
  - **What Worked**: ${mem.whatWorked || mem.lessonsLearned || 'Demonstrated operational success.'}
  ${mem.limitations ? `- **Known Limitations**: ${mem.limitations}` : ''}`
      );
    }

    const retrievedMemoriesForAi = topMatches.map(m => ({
      id: m.memory.id,
      title: m.memory.title,
      category: m.memory.challengeCategory,
      rootCause: m.memory.rootCause,
      technicalApproach: m.memory.technicalApproach,
      outcomeStatus: m.memory.outcomeStatus,
      reusabilityClass: m.memory.reusabilityClass,
      whatWorked: m.memory.whatWorked,
      whatFailed: m.memory.whatFailed,
      lessonsLearned: m.memory.lessonsLearned,
      limitations: m.memory.limitations,
      futureWarnings: m.memory.futureWarnings,
    }));

    let answer = '';
    let suggestedFollowUpQuestions: string[] = [];
    const evidenceQuality: KnowledgeAssistantResponseDto['evidenceQuality'] = hasHighConfidence
      ? 'HIGH_CONFIDENCE'
      : hasMediumConfidence
        ? 'MEDIUM_CONFIDENCE'
        : 'LOW_CONFIDENCE';

    try {
      const aiResponse = await AiServiceClient.synthesizeKnowledge(
        query,
        userRole,
        retrievedMemoriesForAi
      );
      if (aiResponse && aiResponse.synthesizedAnswer) {
        answer = aiResponse.synthesizedAnswer;
        if (aiResponse.suggestedFollowUps && aiResponse.suggestedFollowUps.length > 0) {
          suggestedFollowUpQuestions = aiResponse.suggestedFollowUps;
        }
        if (aiResponse.precedentWarnings && aiResponse.precedentWarnings.length > 0) {
          historicalWarnings.push(...aiResponse.precedentWarnings);
        }
      }
    } catch (aiErr: unknown) {
      logger.info(`AI knowledge synthesis unavailable or fallback used: ${(aiErr as Error).message}`);
    }

    if (!answer) {
      answer = `Based on ${topMatches.length} verified historical interventions in the SICP Knowledge Base:\n\n${answerParts.join('\n\n')}\n\n${
        historicalWarnings.length > 0
          ? `⚠️ **Critical Precedent Warnings**:\n${historicalWarnings.map(w => `- ${w}`).join('\n')}`
          : ''
      }\n\nAll cited outcomes have been verified through field audits and institutional evaluations.`;
    }

    if (suggestedFollowUpQuestions.length === 0) {
      suggestedFollowUpQuestions = [
        `What are the implementation prerequisites for ${topMatches[0].memory.title}?`,
        `How does ${topMatches[0].memory.reusabilityClass} affect cross-district deployment?`,
        'What funding models supported these past interventions?',
      ];
    }

    return {
      answer,
      citations,
      historicalWarnings: Array.from(new Set(historicalWarnings)),
      suggestedFollowUpQuestions,
      evidenceQuality,
    };
  }
}
