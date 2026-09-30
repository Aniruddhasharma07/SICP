import { apiClient } from '../lib/api-client';
import { ChallengeIntelligenceDto } from '@sicp/shared';

export class ChallengeIntelligenceClient {
  public static async getIntelligence(challengeId: string): Promise<ChallengeIntelligenceDto | null> {
    try {
      const res = await apiClient.request<ChallengeIntelligenceDto>(`/api/v1/challenges/${challengeId}/intelligence`);
      if (res.success && res.data) {
        return res.data;
      }
      return null;
    } catch {
      return null;
    }
  }

  public static async validateInvestigation(
    challengeId: string,
    notes?: string
  ): Promise<{ success: boolean; message: string; validatedAt?: string }> {
    try {
      const res = await apiClient.request<{ success: boolean; message: string; validatedAt: string }>(
        `/api/v1/challenges/${challengeId}/validate`,
        {
          method: 'POST',
          body: JSON.stringify({ notes }),
        }
      );
      if (res.success && res.data) {
        return res.data;
      }
      return { success: false, message: res.error?.message || 'Validation failed' };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error' };
    }
  }
}
