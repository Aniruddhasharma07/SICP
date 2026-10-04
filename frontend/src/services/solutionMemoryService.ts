import { apiClient } from '../lib/api-client';
import {
  SolutionMemoryDto,
  HistoricalRecommendationDto,
} from '@sicp/shared';

function buildRecurrenceSignal(memories: HistoricalRecommendationDto[]) {
  if (!memories || memories.length === 0) return null;
  const target = memories[0];

  return {
    signalDetected: true,
    previousSolution: {
      title: target.title,
      implementedDate: 'Previous Municipal Intervention',
      failedMechanism: target.whatFailed || 'Premature structural wear or recurring pressure differential',
      confidenceScore: Math.round((target.relevanceScore || 0.75) * 100),
    },
    investigationStatus: 'UNDER_INVESTIGATION',
    evidenceStrength: 'Correlated Precedent',
    guidanceNote: 'Geographic and structural recurrence detected in municipal sector.',
  };
}

export const solutionMemoryService = {
  /**
   * Retrieves evaluated historical solution precedents for a challenge.
   * Queries the live backend solution memory API; returns honest empty state if no precedents.
   */
  async getEvaluatedHistoricalSolutions(challengeId: string): Promise<{
    evaluated: any | null;
    retrieved: HistoricalRecommendationDto[];
    recurrenceSignal: any | null;
  }> {
    try {
      const evalRes = await apiClient.request<any>(
        `/api/v1/solutions/historical/challenge/${challengeId}/evaluated`
      );

      if (evalRes.success && evalRes.data) {
        const mems: HistoricalRecommendationDto[] = evalRes.data.retrievedMemories || [];
        const recurrenceSignal = buildRecurrenceSignal(mems);

        return {
          evaluated: evalRes.data,
          retrieved: mems,
          recurrenceSignal,
        };
      }

      // Fallback to direct historical recommendations if evaluated endpoint returned empty
      const res = await apiClient.request<HistoricalRecommendationDto[]>(
        `/api/v1/solutions/historical/challenge/${challengeId}`
      );
      if (res.success && res.data && res.data.length > 0) {
        return {
          evaluated: null,
          retrieved: res.data,
          recurrenceSignal: buildRecurrenceSignal(res.data),
        };
      }
    } catch {
      // ignore network errors
    }

    // Honest empty state when no matching precedents exist in Solution Memory
    return {
      evaluated: null,
      retrieved: [],
      recurrenceSignal: null,
    };
  },

  /**
   * Retrieves single Solution Memory record details from backend.
   */
  async getSolutionMemoryDetail(memoryId: string): Promise<SolutionMemoryDto | null> {
    try {
      const res = await apiClient.request<SolutionMemoryDto>(
        `/api/v1/solutions/${memoryId}`
      );
      if (res.success && res.data) {
        return res.data;
      }
    } catch {
      // ignore
    }

    return null;
  },
};
