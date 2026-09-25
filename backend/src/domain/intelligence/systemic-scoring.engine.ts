import {
  SeverityLevel,
  SystemicFactorBreakdown,
} from '@sicp/shared';
import { SpatialPolicyEngine } from './spatial-policy.engine';
import { RelationshipScoringEngine } from './relationship-scoring.engine';

export interface SystemicSignalInput {
  id: string;
  title: string;
  description: string;
  category: string;
  severity?: SeverityLevel | string | null;
  latitude?: number | null;
  longitude?: number | null;
  district?: string | null;
  state?: string | null;
  reportedAt?: Date | string | null;
  symptoms?: string[];
  infrastructureEntity?: string | null;
  rootCause?: string | null;
  hasHistoricalPrecedent?: boolean;
}

export interface SystemicEvaluationResult {
  systemicScore: number; // 0.0 to 1.0 (heuristic evidence strength, NOT calibrated probability)
  evidenceStrength: 'INSUFFICIENT' | 'EMERGING' | 'MODERATE' | 'STRONG';
  classification: 'DUPLICATE' | 'RECURRING' | 'LOCAL_CLUSTER' | 'SYSTEMIC_FAILURE' | 'INDEPENDENT';
  factorBreakdown: SystemicFactorBreakdown;
  sharedInfrastructure: string | null;
  reasoning: string;
  requiresInvestigation: boolean;
}

export class SystemicScoringEngine {
  public static readonly SCORING_MODEL_VERSION = 'Heuristic Evidence Assessment v1.0';

  /**
   * Default baseline weights for the 7 systemic factors
   */
  private static readonly BASE_WEIGHTS: Record<string, number> = {
    semantic: 0.20,
    spatial: 0.15,
    temporal: 0.15,
    symptom: 0.15,
    infrastructure: 0.15,
    rootCause: 0.10,
    historical: 0.10,
  };

  /**
   * Evaluates pairwise or multi-signal relationship to detect systemic pattern
   */
  public static evaluatePair(
    sigA: SystemicSignalInput,
    sigB: SystemicSignalInput
  ): SystemicEvaluationResult {
    // 1. Semantic Similarity (Token-based unigram/bigram Jaccard)
    const titleSim = RelationshipScoringEngine.calculateTokenSimilarity(sigA.title, sigB.title);
    const descSim = RelationshipScoringEngine.calculateTokenSimilarity(sigA.description, sigB.description);
    const semantic = Math.min(100, Math.round(titleSim * 0.5 + descSim * 0.5));

    // 2. Spatial Proximity
    const distanceMeters = SpatialPolicyEngine.calculateDistanceMeters(
      sigA.latitude,
      sigA.longitude,
      sigB.latitude,
      sigB.longitude
    );

    let spatial = 0;
    if (distanceMeters !== null) {
      const prox = SpatialPolicyEngine.evaluateProximityScore(sigA.category, distanceMeters);
      spatial = prox.score;
    } else if (sigA.district && sigB.district && sigA.district.toLowerCase() === sigB.district.toLowerCase()) {
      spatial = 60; // Same administrative district fallback
    } else if (sigA.state && sigB.state && sigA.state.toLowerCase() === sigB.state.toLowerCase()) {
      spatial = 30; // Same state fallback
    } else {
      spatial = 10;
    }

    // 3. Temporal Proximity
    let temporalDays = 999;
    if (sigA.reportedAt && sigB.reportedAt) {
      const tA = new Date(sigA.reportedAt).getTime();
      const tB = new Date(sigB.reportedAt).getTime();
      temporalDays = Math.abs(Math.round((tA - tB) / (1000 * 60 * 60 * 24)));
    }

    let temporal = 15;
    if (temporalDays <= 3) temporal = 100;
    else if (temporalDays <= 7) temporal = 90;
    else if (temporalDays <= 14) temporal = 75;
    else if (temporalDays <= 30) temporal = 55;
    else if (temporalDays <= 60) temporal = 35;
    else temporal = 15;

    // 4. Symptom & Failure Consistency
    const textA = `${sigA.title} ${sigA.description}`.toLowerCase();
    const textB = `${sigB.title} ${sigB.description}`.toLowerCase();

    const symptomCategories = [
      ['pressure', 'low pressure', 'no flow', 'no water', 'dry taps', 'scarcity'],
      ['contamination', 'dirty', 'smelly', 'odor', 'yellow', 'brown', 'turbid', 'sewage smell', 'unpotable'],
      ['burst', 'leak', 'rupture', 'pipe crack', 'flooding', 'spray', 'overflow'],
      ['power cut', 'low voltage', 'voltage fluctuation', 'blackout', 'tripping', 'feeder trip'],
      ['choked', 'blocked drain', 'waterlogging', 'monsoon runoff', 'overflowing drain'],
    ];

    let symptom = 20;
    let matchingCategories = 0;
    for (const group of symptomCategories) {
      const hasA = group.some(w => textA.includes(w));
      const hasB = group.some(w => textB.includes(w));
      if (hasA && hasB) matchingCategories++;
    }

    if (matchingCategories >= 2) symptom = 95;
    else if (matchingCategories === 1) symptom = 80;
    else symptom = 25;

    // 5. Infrastructure Entity Overlap
    const infraA = RelationshipScoringEngine.detectInfrastructure(`${sigA.title} ${sigA.description}`);
    const infraB = RelationshipScoringEngine.detectInfrastructure(`${sigB.title} ${sigB.description}`);
    
    let infrastructure = 15;
    let sharedInfrastructure: string | null = null;

    if (sigA.infrastructureEntity && sigB.infrastructureEntity) {
      if (sigA.infrastructureEntity.toLowerCase() === sigB.infrastructureEntity.toLowerCase()) {
        sharedInfrastructure = sigA.infrastructureEntity;
        infrastructure = 100;
      }
    } else {
      const commonInfra = infraA.filter(i => infraB.includes(i));
      if (commonInfra.length > 0) {
        sharedInfrastructure = commonInfra.join(', ');
        infrastructure = 95;
      } else if (infraA.length > 0 && infraB.length > 0) {
        infrastructure = 40;
      }
    }

    // 6. Root Cause Similarity
    let rootCause = 30;
    if (sigA.rootCause && sigB.rootCause) {
      rootCause = RelationshipScoringEngine.calculateTokenSimilarity(sigA.rootCause, sigB.rootCause);
    } else if (symptom >= 80) {
      rootCause = Math.round(symptom * 0.75);
    }

    // 7. Historical Precedent & Recurrence Signal
    let historical = 20;
    const hasHistorical = Boolean(sigA.hasHistoricalPrecedent || sigB.hasHistoricalPrecedent);
    if (hasHistorical) {
      historical = 75;
    }

    // Dynamic factor availability tracking
    const availableFactors: string[] = ['semantic', 'spatial', 'temporal', 'symptom'];
    const unavailableFactors: string[] = [];

    if (sharedInfrastructure !== null || infraA.length > 0 || infraB.length > 0) {
      availableFactors.push('infrastructure');
    } else {
      unavailableFactors.push('infrastructure');
    }

    if (sigA.rootCause || sigB.rootCause) {
      availableFactors.push('rootCause');
    } else {
      unavailableFactors.push('rootCause');
    }

    if (hasHistorical) {
      availableFactors.push('historical');
    } else {
      unavailableFactors.push('historical');
    }

    // Dynamic weight re-normalization over available factors
    let totalAvailableBaseWeight = 0;
    for (const factor of availableFactors) {
      totalAvailableBaseWeight += this.BASE_WEIGHTS[factor] || 0.1;
    }

    const dynamicWeights: Record<string, number> = {};
    for (const factor of Object.keys(this.BASE_WEIGHTS)) {
      if (availableFactors.includes(factor)) {
        dynamicWeights[factor] = Math.round(((this.BASE_WEIGHTS[factor] / totalAvailableBaseWeight) * 1000)) / 1000;
      } else {
        dynamicWeights[factor] = 0;
      }
    }

    // Calculate heuristic evidence score S_sys
    const rawScore =
      (dynamicWeights['semantic'] || 0) * semantic +
      (dynamicWeights['spatial'] || 0) * spatial +
      (dynamicWeights['temporal'] || 0) * temporal +
      (dynamicWeights['symptom'] || 0) * symptom +
      (dynamicWeights['infrastructure'] || 0) * infrastructure +
      (dynamicWeights['rootCause'] || 0) * rootCause +
      (dynamicWeights['historical'] || 0) * historical;

    const systemicScore = Math.min(0.99, Math.max(0.01, Math.round((rawScore / 100) * 100) / 100));

    // Categorize evidence strength
    let evidenceStrength: SystemicEvaluationResult['evidenceStrength'] = 'INSUFFICIENT';
    if (systemicScore >= 0.70) evidenceStrength = 'STRONG';
    else if (systemicScore >= 0.50) evidenceStrength = 'MODERATE';
    else if (systemicScore >= 0.30) evidenceStrength = 'EMERGING';
    else evidenceStrength = 'INSUFFICIENT';

    // Classification distinction
    let classification: SystemicEvaluationResult['classification'] = 'INDEPENDENT';
    let reasoning = '';
    let requiresInvestigation = false;

    // Check for RECURRING (chronic time gap >= 60 days, same location/infrastructure)
    if (temporalDays >= 60 && spatial >= 70 && (semantic >= 55 || infrastructure >= 60)) {
      classification = 'RECURRING';
      reasoning = `Chronic temporal recurrence (${temporalDays} days apart) at same locality/asset. Indicates recurring failure requiring intervention review.`;
      requiresInvestigation = true;
    }
    // Check for DUPLICATE (very close in space, recent, high semantic overlap, same symptoms)
    else if (spatial >= 75 && temporalDays <= 14 && semantic >= 65 && symptom >= 70) {
      classification = 'DUPLICATE';
      reasoning = `High spatial proximity with matching symptoms reported within ${temporalDays} days. Evaluated as duplicate report of same incident.`;
      requiresInvestigation = false;
    }
    // Check for SYSTEMIC_FAILURE (scattered locations, same domain/service area, matching symptoms/root-cause, shared infrastructure)
    else if (
      (systemicScore >= 0.60 && (sharedInfrastructure !== null || symptom >= 80)) ||
      (systemicScore >= 0.75)
    ) {
      classification = 'SYSTEMIC_FAILURE';
      const infraNote = sharedInfrastructure ? ` on shared asset "${sharedInfrastructure}"` : '';
      reasoning = `Systemic relationship pattern detected across distinct reporting points (${symptom}% symptom consistency${infraNote}). Suggests shared network failure.`;
      requiresInvestigation = true;
    }
    // Check for LOCAL_CLUSTER (spatial grouping without confirmed shared network failure)
    else if (spatial >= 65 && temporalDays <= 30) {
      classification = 'LOCAL_CLUSTER';
      reasoning = `Geographic proximity cluster within same area, but symptoms or infrastructure remain distinct.`;
      requiresInvestigation = false;
    } else {
      classification = 'INDEPENDENT';
      reasoning = `Distinct geographic and symptom characteristics. Evaluated as independent civic events.`;
      requiresInvestigation = false;
    }

    const factorBreakdown: SystemicFactorBreakdown = {
      semantic,
      spatial,
      temporal,
      symptom,
      infrastructure,
      rootCause,
      historical,
      weights: dynamicWeights,
      availableFactors,
      unavailableFactors,
      scoringModelVersion: this.SCORING_MODEL_VERSION,
    };

    return {
      systemicScore,
      evidenceStrength,
      classification,
      factorBreakdown,
      sharedInfrastructure,
      reasoning,
      requiresInvestigation,
    };
  }
}
