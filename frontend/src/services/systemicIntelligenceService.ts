import { apiClient } from '../lib/api-client';
import {
  SystemicIncidentDto,
  InfrastructureGraphDto,
  SentinelChoice,
} from '@sicp/shared';

export const systemicIntelligenceService = {
  /**
   * Retrieves systemic incident data from backend API. Returns null if not found.
   */
  async getIncident(incidentId: string): Promise<SystemicIncidentDto | null> {
    try {
      const res = await apiClient.request<SystemicIncidentDto>(
        `/api/v1/systemic-incidents/${incidentId}`
      );
      if (res.success && res.data) {
        return res.data;
      }
    } catch {
      // Return null on failure - zero synthetic fallback
    }

    return null;
  },

  /**
   * Retrieves infrastructure DAG topology graph for an incident or challenge.
   * Returns null if no authoritative topology is registered.
   */
  async getGraph(incidentId: string): Promise<InfrastructureGraphDto | null> {
    try {
      const res = await apiClient.request<InfrastructureGraphDto>(
        `/api/v1/systemic-incidents/${incidentId}/graph`
      );
      if (res.success && res.data) {
        return res.data;
      }
    } catch {
      // Return null on failure - zero synthetic fallback
    }

    return null;
  },

  /**
   * Submits a proactive sentinel probe response.
   */
  async submitSentinelResponse(
    incidentId: string,
    choice: SentinelChoice,
    feedbackText?: string
  ): Promise<{ success: boolean; incident?: SystemicIncidentDto; message?: string }> {
    try {
      const res = await apiClient.request<{ message: string; incident: SystemicIncidentDto }>(
        `/api/v1/systemic-incidents/${incidentId}/sentinel-response`,
        {
          method: 'POST',
          body: JSON.stringify({ choice, feedbackText }),
        }
      );
      if (res.success && res.data) {
        return {
          success: true,
          incident: res.data.incident,
          message: res.data.message,
        };
      }
    } catch {
      // ignore
    }

    return {
      success: false,
      message: 'Sentinel response could not be submitted. Please check network connection.',
    };
  },

  /**
   * Dispatches a field technician or utility verification team to an infrastructure node.
   */
  async dispatchFieldTeam(params: {
    incidentId: string;
    nodeId: string;
    teamName: string;
    instructions: string;
  }): Promise<{ success: boolean; message: string }> {
    try {
      const res = await apiClient.request<{ message: string }>(
        `/api/v1/systemic-incidents/${params.incidentId}/dispatch-team`,
        {
          method: 'POST',
          body: JSON.stringify(params),
        }
      );
      if (res.success && res.data) {
        return { success: true, message: res.data.message };
      }
    } catch {
      // ignore
    }

    return {
      success: false,
      message: 'Failed to dispatch field team.',
    };
  },
};
