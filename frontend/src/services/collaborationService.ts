import { apiClient } from '../lib/api-client';

export interface UniversityMatchDto {
  universityOrgId?: string;
  universityName?: string;
  score?: number;
  matchScore?: number;
  matchedDepartments?: string[];
  reasons?: string[];
  facultyMembers?: Array<{
    id: string;
    fullName: string;
    department: string;
    designation: string;
  }>;
}

export interface IndustryMatchDto {
  industryOrgId?: string;
  companyName?: string;
  matchScore?: number;
  eligibleCsrPrograms?: string[];
  scheduleViiItems?: string[];
  maxCoFundingPercentage?: number;
  reasons?: string[];
}

export const collaborationService = {
  /**
   * Retrieves university research lab and faculty matches for a challenge.
   */
  async getUniversityMatches(challengeId: string): Promise<UniversityMatchDto[]> {
    try {
      const res = await apiClient.request<any>(
        `/api/v1/government/challenges/${challengeId}/matches`
      );
      if (res.success && res.data) {
        if (Array.isArray(res.data)) return res.data;
        if (res.data.matches && Array.isArray(res.data.matches)) return res.data.matches;
      }
    } catch {
      // Fallback
    }

    return [];
  },

  /**
   * Retrieves eligible industry CSR co-funding partners for a challenge.
   */
  async getIndustryMatches(challengeId: string): Promise<IndustryMatchDto[]> {
    try {
      const res = await apiClient.request<any>(
        `/api/v1/government/challenges/${challengeId}/eligible-industries`
      );
      if (res.success && res.data) {
        if (Array.isArray(res.data)) return res.data;
        if (res.data.industries && Array.isArray(res.data.industries)) return res.data.industries;
      }
    } catch {
      // Fallback
    }

    return [];
  },

  /**
   * Assigns a challenge to a university research laboratory.
   */
  async assignUniversity(
    challengeId: string,
    universityOrgId: string,
    reason: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await apiClient.request<{ message?: string }>(
        `/api/v1/government/challenges/${challengeId}/assign-university`,
        {
          method: 'POST',
          body: JSON.stringify({ universityOrgId, reason }),
        }
      );
      return { success: res.success, message: res.data?.message };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Assignment failed' };
    }
  },

  /**
   * Invites an industry partner for CSR co-funding.
   */
  async assignIndustry(
    challengeId: string,
    industryOrgId: string,
    reason: string
  ): Promise<{ success: boolean; message?: string }> {
    try {
      const res = await apiClient.request<{ message?: string }>(
        `/api/v1/government/challenges/${challengeId}/assign-industry`,
        {
          method: 'POST',
          body: JSON.stringify({ industryOrgId, reason }),
        }
      );
      return { success: res.success, message: res.data?.message };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Industry invitation failed' };
    }
  },
};
