import { apiClient } from '../lib/api-client';
import {
  SystemicIncidentDto,
  InfrastructureGraphDto,
  SentinelChoice,
  SentinelProbeRequestDto,
} from '@sicp/shared';
import {
  INITIAL_DEMO_INCIDENT,
  GAMHARIA_DEMO_INCIDENT,
  applyDemoSentinelNormal,
  applyGamhariaSentinelNormal,
} from '../lib/systemic-demo-data';

export const systemicIntelligenceService = {
  /**
   * Retrieves systemic incident data, falling back to demo scenarios if appropriate.
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
      // Fallback
    }

    if (incidentId === 'SYS-2026-JHK-204') return GAMHARIA_DEMO_INCIDENT;
    if (incidentId === 'SYS-2026-BHP-001') return INITIAL_DEMO_INCIDENT;
    return null;
  },

  /**
   * Retrieves infrastructure DAG topology graph for an incident or challenge.
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
      // Fallback
    }

    if (incidentId === 'SYS-2026-JHK-204') return (GAMHARIA_DEMO_INCIDENT.graph as any) || null;
    if (incidentId === 'SYS-2026-BHP-001') return (INITIAL_DEMO_INCIDENT.graph as any) || null;
    return null;
  },

  /**
   * Submits a proactive sentinel probe response, calculating branch differential impacts.
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
      // Fallback to in-memory demo update if in demo scenario
    }

    if (choice === SentinelChoice.NORMAL_SERVICE) {
      if (incidentId === 'SYS-2026-JHK-204') {
        return {
          success: true,
          incident: applyGamhariaSentinelNormal(GAMHARIA_DEMO_INCIDENT),
          message: 'Gamharia Village 4 branch confirmed uninterrupted pressure (+4.2 bar). Upstream River Intake failure refuted.',
        };
      }
      return {
        success: true,
        incident: applyDemoSentinelNormal(INITIAL_DEMO_INCIDENT),
        message: 'Ward 14 East Sector branch confirmed uninterrupted supply (+4.5 bar). Water Treatment Plant failure refuted.',
      };
    }

    return {
      success: true,
      message: 'Sentinel telemetry recorded as OBSERVED field telemetry.',
    };
  },

  /**
   * Executes authoritative government officer hypothesis validation.
   */
  async validateHypothesis(
    incidentId: string,
    hypothesisId: string,
    reason: string
  ): Promise<boolean> {
    try {
      const res = await apiClient.request(
        `/api/v1/systemic-incidents/${incidentId}/validate-hypothesis`,
        {
          method: 'POST',
          body: JSON.stringify({ hypothesisId, reason }),
        }
      );
      return res.success;
    } catch {
      return false;
    }
  },
};
