/**
 * Spatial Policy Engine
 * 
 * Implements domain-specific spatial tolerance policies to evaluate
 * geographic proximity between civic challenges without naive binary cliffs.
 * 
 * E.g., two streetlights 100m apart are completely different assets,
 * while two water supply contamination reports 1.5km apart often share
 * an identical upstream pipeline or treatment plant root cause.
 */

export interface SpatialPolicyConfig {
  immediateRadiusMeters: number; // Distances <= this receive 100% proximity score
  maxBoundaryMeters: number;     // Distances >= this receive 0% proximity score
  allowCrossDistrictSystemic: boolean;
  defaultRelationshipSuggestion: 'DUPLICATE' | 'SYSTEMIC_ROOT_CAUSE' | 'RELATED';
}

export class SpatialPolicyEngine {
  // Domain-specific spatial tolerances
  private static readonly POLICIES: Record<string, SpatialPolicyConfig> = {
    // Street lighting / localized physical assets
    STREETLIGHT: {
      immediateRadiusMeters: 25,
      maxBoundaryMeters: 75,
      allowCrossDistrictSystemic: false,
      defaultRelationshipSuggestion: 'DUPLICATE',
    },
    LIGHTING: {
      immediateRadiusMeters: 25,
      maxBoundaryMeters: 75,
      allowCrossDistrictSystemic: false,
      defaultRelationshipSuggestion: 'DUPLICATE',
    },

    // Roads, potholes, pedestrian walkways
    ROAD_POTHOLE: {
      immediateRadiusMeters: 50,
      maxBoundaryMeters: 200,
      allowCrossDistrictSystemic: false,
      defaultRelationshipSuggestion: 'DUPLICATE',
    },
    ROADS: {
      immediateRadiusMeters: 50,
      maxBoundaryMeters: 300,
      allowCrossDistrictSystemic: false,
      defaultRelationshipSuggestion: 'DUPLICATE',
    },
    TRANSPORT: {
      immediateRadiusMeters: 100,
      maxBoundaryMeters: 1000,
      allowCrossDistrictSystemic: true,
      defaultRelationshipSuggestion: 'RELATED',
    },

    // Drainage, sewage, localized sanitation
    DRAINAGE_BLOCKAGE: {
      immediateRadiusMeters: 100,
      maxBoundaryMeters: 500,
      allowCrossDistrictSystemic: false,
      defaultRelationshipSuggestion: 'SYSTEMIC_ROOT_CAUSE',
    },
    DRAINAGE: {
      immediateRadiusMeters: 100,
      maxBoundaryMeters: 800,
      allowCrossDistrictSystemic: false,
      defaultRelationshipSuggestion: 'SYSTEMIC_ROOT_CAUSE',
    },
    SANITATION: {
      immediateRadiusMeters: 100,
      maxBoundaryMeters: 800,
      allowCrossDistrictSystemic: false,
      defaultRelationshipSuggestion: 'SYSTEMIC_ROOT_CAUSE',
    },

    // Water supply networks (mains, feeder lines, contamination)
    WATER_SUPPLY: {
      immediateRadiusMeters: 500,
      maxBoundaryMeters: 3000,
      allowCrossDistrictSystemic: true,
      defaultRelationshipSuggestion: 'SYSTEMIC_ROOT_CAUSE',
    },
    WATER: {
      immediateRadiusMeters: 500,
      maxBoundaryMeters: 3000,
      allowCrossDistrictSystemic: true,
      defaultRelationshipSuggestion: 'SYSTEMIC_ROOT_CAUSE',
    },

    // Electricity & Power grid distribution
    ELECTRICITY_NETWORK: {
      immediateRadiusMeters: 1000,
      maxBoundaryMeters: 5000,
      allowCrossDistrictSystemic: true,
      defaultRelationshipSuggestion: 'SYSTEMIC_ROOT_CAUSE',
    },
    ELECTRICITY: {
      immediateRadiusMeters: 800,
      maxBoundaryMeters: 4000,
      allowCrossDistrictSystemic: true,
      defaultRelationshipSuggestion: 'SYSTEMIC_ROOT_CAUSE',
    },
    POWER: {
      immediateRadiusMeters: 800,
      maxBoundaryMeters: 4000,
      allowCrossDistrictSystemic: true,
      defaultRelationshipSuggestion: 'SYSTEMIC_ROOT_CAUSE',
    },

    // Agriculture, canals, irrigation
    AGRICULTURE: {
      immediateRadiusMeters: 2000,
      maxBoundaryMeters: 15000,
      allowCrossDistrictSystemic: true,
      defaultRelationshipSuggestion: 'SYSTEMIC_ROOT_CAUSE',
    },
    IRRIGATION: {
      immediateRadiusMeters: 2000,
      maxBoundaryMeters: 15000,
      allowCrossDistrictSystemic: true,
      defaultRelationshipSuggestion: 'SYSTEMIC_ROOT_CAUSE',
    },

    // Flood, catchment basins, environmental disasters
    FLOOD_ENVIRONMENTAL: {
      immediateRadiusMeters: 5000,
      maxBoundaryMeters: 25000,
      allowCrossDistrictSystemic: true,
      defaultRelationshipSuggestion: 'SYSTEMIC_ROOT_CAUSE',
    },
    ENVIRONMENT: {
      immediateRadiusMeters: 3000,
      maxBoundaryMeters: 20000,
      allowCrossDistrictSystemic: true,
      defaultRelationshipSuggestion: 'SYSTEMIC_ROOT_CAUSE',
    },
    DISASTER: {
      immediateRadiusMeters: 5000,
      maxBoundaryMeters: 30000,
      allowCrossDistrictSystemic: true,
      defaultRelationshipSuggestion: 'SYSTEMIC_ROOT_CAUSE',
    },
  };

  // Default fallback policy
  private static readonly DEFAULT_POLICY: SpatialPolicyConfig = {
    immediateRadiusMeters: 150,
    maxBoundaryMeters: 1500,
    allowCrossDistrictSystemic: false,
    defaultRelationshipSuggestion: 'RELATED',
  };

  /**
   * Resolve spatial configuration based on category / keywords
   */
  public static getPolicy(category: string): SpatialPolicyConfig {
    if (!category) return this.DEFAULT_POLICY;
    const normalized = category.trim().toUpperCase().replace(/[\s-]+/g, '_');

    // Direct key match
    if (this.POLICIES[normalized]) {
      return this.POLICIES[normalized];
    }

    // Keyword match
    for (const [key, policy] of Object.entries(this.POLICIES)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return policy;
      }
    }

    return this.DEFAULT_POLICY;
  }

  /**
   * Calculate precise Haversine distance in meters between two lat/lon coordinates
   */
  public static calculateDistanceMeters(
    lat1?: number | null,
    lon1?: number | null,
    lat2?: number | null,
    lon2?: number | null
  ): number | null {
    if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) {
      return null;
    }

    // Earth's mean radius in meters
    const R = 6371000;
    const phi1 = (lat1 * Math.PI) / 180;
    const phi2 = (lat2 * Math.PI) / 180;
    const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
    const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
      Math.cos(phi1) * Math.cos(phi2) *
      Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 10) / 10;
  }

  /**
   * Evaluate location proximity score (0 to 100) based on domain-specific policy
   * Uses smooth cosine / linear decay instead of binary cliff edge
   */
  public static evaluateProximityScore(
    category: string,
    distanceMeters: number | null
  ): {
    score: number;
    policyUsed: SpatialPolicyConfig;
    isWithinImmediateRadius: boolean;
    isWithinBoundary: boolean;
  } {
    const policy = this.getPolicy(category);

    if (distanceMeters === null) {
      return {
        score: 50, // Unknown/unspecified location gets neutral baseline score
        policyUsed: policy,
        isWithinImmediateRadius: false,
        isWithinBoundary: false,
      };
    }

    if (distanceMeters <= policy.immediateRadiusMeters) {
      return {
        score: 100,
        policyUsed: policy,
        isWithinImmediateRadius: true,
        isWithinBoundary: true,
      };
    }

    if (distanceMeters >= policy.maxBoundaryMeters) {
      return {
        score: 0,
        policyUsed: policy,
        isWithinImmediateRadius: false,
        isWithinBoundary: false,
      };
    }

    // Smooth cosine decay between immediateRadius and maxBoundary
    const progress = (distanceMeters - policy.immediateRadiusMeters) /
                     (policy.maxBoundaryMeters - policy.immediateRadiusMeters);
    // Cosine ease from 1.0 down to 0.0: (1 + cos(pi * progress)) / 2
    const smoothFactor = 0.5 * (1 + Math.cos(Math.PI * progress));
    const score = Math.round(smoothFactor * 1000) / 10;

    return {
      score,
      policyUsed: policy,
      isWithinImmediateRadius: false,
      isWithinBoundary: true,
    };
  }
}
