import {
  SentinelProbeStatus,
  SentinelChoice,
  BranchDifferentialStatus,
  SentinelProbeRequestDto,
  SentinelProbeResponseDto,
} from '@sicp/shared';

export interface DispatchProbeParams {
  incidentId: string;
  targetNodeId?: string | null;
  targetNodeName?: string | null;
  serviceAreaName: string;
  category: string; // e.g. "WATER"
}

export class ProactiveSentinelService {
  /**
   * Generates strictly non-leading, unbiased civic inquiry copy
   */
  public static generateNeutralInquiry(category: string, serviceAreaName: string): { title: string; text: string } {
    const norm = category.toUpperCase();

    if (norm.includes('WATER')) {
      return {
        title: `Municipal Utility Quality Check — ${serviceAreaName}`,
        text: `Periodic municipal utility check: How is the tap water pressure and clarity at your premises today? Please report your direct observation.`,
      };
    } else if (norm.includes('POWER') || norm.includes('ELECTRICITY')) {
      return {
        title: `Grid Voltage & Supply Check — ${serviceAreaName}`,
        text: `Periodic grid maintenance check: How is the electricity supply and voltage stability at your location today?`,
      };
    } else if (norm.includes('DRAIN') || norm.includes('FLOOD')) {
      return {
        title: `Stormwater Runoff Check — ${serviceAreaName}`,
        text: `Municipal drainage assessment: How is stormwater runoff and street waterlogging in your immediate street today?`,
      };
    } else {
      return {
        title: `Civic Infrastructure Service Check — ${serviceAreaName}`,
        text: `Community service quality check: How is the municipal utility service at your premises currently operating?`,
      };
    }
  }

  /**
   * Aggregates responses and determines branch verification outcome
   */
  public static aggregateResponses(
    responses: SentinelProbeResponseDto[]
  ): {
    totalResponses: number;
    breakdown: Record<string, number>;
    outcome: BranchDifferentialStatus;
    summary: string;
  } {
    const total = responses.length;
    const breakdown: Record<string, number> = {
      [SentinelChoice.NORMAL_SERVICE]: 0,
      [SentinelChoice.DEGRADED_PRESSURE]: 0,
      [SentinelChoice.CONTAMINATION_ODOR]: 0,
      [SentinelChoice.NO_SERVICE]: 0,
      [SentinelChoice.UNSURE]: 0,
      [SentinelChoice.OTHER]: 0,
    };

    responses.forEach(r => {
      const choice = r.responseChoice || SentinelChoice.UNSURE;
      breakdown[choice] = (breakdown[choice] || 0) + 1;
    });

    if (total === 0) {
      return {
        totalResponses: 0,
        breakdown,
        outcome: BranchDifferentialStatus.INSUFFICIENT_EVIDENCE,
        summary: 'No sentinel responses received yet. Branch status remains unknown.',
      };
    }

    const normalCount = breakdown[SentinelChoice.NORMAL_SERVICE] || 0;
    const failureCount =
      (breakdown[SentinelChoice.DEGRADED_PRESSURE] || 0) +
      (breakdown[SentinelChoice.CONTAMINATION_ODOR] || 0) +
      (breakdown[SentinelChoice.NO_SERVICE] || 0);

    let outcome: BranchDifferentialStatus = BranchDifferentialStatus.INCONCLUSIVE;
    let summary = '';

    // If at least 65% of responses confirm normal service (with minimum 2 responses)
    if (normalCount >= 2 && normalCount / (normalCount + failureCount) >= 0.65) {
      outcome = BranchDifferentialStatus.BRANCH_UNAFFECTED_DISPROVED_UPSTREAM;
      summary = `${normalCount} of ${total} community sentinel responses (${Math.round((normalCount / total) * 100)}%) confirm normal service. Consistent with an unaffected branch; provides evidence against upstream trunk-wide failure.`;
    }
    // If at least 60% of responses report failure
    else if (failureCount >= 2 && failureCount / (normalCount + failureCount) >= 0.6) {
      outcome = BranchDifferentialStatus.CONFIRMED_AFFECTED;
      summary = `${failureCount} of ${total} community sentinel responses confirm supply degradation or contamination. Promotes this branch to observed affected.`;
    } else {
      outcome = BranchDifferentialStatus.INCONCLUSIVE;
      summary = `Mixed community feedback (${normalCount} normal, ${failureCount} degraded). Evidence is currently inconclusive across this branch.`;
    }

    return {
      totalResponses: total,
      breakdown,
      outcome,
      summary,
    };
  }
}
