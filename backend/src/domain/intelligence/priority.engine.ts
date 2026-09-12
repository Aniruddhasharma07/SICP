import { PriorityLevel, SeverityLevel } from '@sicp/shared';

export interface PriorityCalculationParams {
  severity: SeverityLevel;
  urgency?: PriorityLevel;
  affectedPopulation?: number | null;
  impactMagnitude?: number | null;
  impactExplanation?: string | null;
  durationMonths?: number | null;
  communityVotesCount?: number;
  evidenceCount?: number;
}

export interface PriorityCalculationResult {
  score: number; // 0.0 to 100.0
  priorityLevel: PriorityLevel;
  factorBreakdown: {
    severityScore: number;
    urgencyScore: number;
    populationScore: number;
    impactScore: number;
    durationScore: number;
    communitySupportScore: number;
    evidenceQualityScore: number;
  };
  explanation: string;
}

export class PriorityEngine {
  public static calculate(params: PriorityCalculationParams): PriorityCalculationResult {
    // 1. Severity weight (35%)
    let severityScore = 25; // MODERATE baseline
    if (params.severity === SeverityLevel.LOW) severityScore = 10;
    else if (params.severity === SeverityLevel.MODERATE) severityScore = 30;
    else if (params.severity === SeverityLevel.SEVERE) severityScore = 65;
    else if (params.severity === SeverityLevel.CATASTROPHIC) severityScore = 100;

    // 2. Urgency weight (20%)
    let urgencyScore = 25;
    const urgency = params.urgency || PriorityLevel.MEDIUM;
    if (urgency === PriorityLevel.LOW) urgencyScore = 10;
    else if (urgency === PriorityLevel.MEDIUM) urgencyScore = 35;
    else if (urgency === PriorityLevel.HIGH) urgencyScore = 70;
    else if (urgency === PriorityLevel.CRITICAL) urgencyScore = 100;

    // 3. Problem-Specific Impact Magnitude (20%)
    let impactScore = 10;
    const pop = params.affectedPopulation || 1;
    if (params.impactMagnitude !== undefined && params.impactMagnitude !== null) {
      impactScore = Math.min(100, Math.max(0, Math.round(params.impactMagnitude)));
    } else {
      if (pop > 10000) impactScore = 100;
      else if (pop > 2000) impactScore = 80;
      else if (pop > 500) impactScore = 60;
      else if (pop > 100) impactScore = 40;
      else if (pop > 10) impactScore = 25;
    }
    const populationScore = impactScore; // backward compatibility alias

    // 4. Problem duration / chronicity (10%)
    let durationScore = 15;
    const duration = params.durationMonths || 1;
    if (duration >= 24) durationScore = 100; // Chronic > 2 years
    else if (duration >= 12) durationScore = 80;
    else if (duration >= 6) durationScore = 55;
    else if (duration >= 1) durationScore = 30;

    // 5. Community voting support (10%)
    let communitySupportScore = 0;
    const votes = params.communityVotesCount || 0;
    if (votes > 100) communitySupportScore = 100;
    else if (votes > 50) communitySupportScore = 80;
    else if (votes > 20) communitySupportScore = 55;
    else if (votes > 5) communitySupportScore = 30;
    else communitySupportScore = Math.min(votes * 5, 25);

    // 6. Evidence quality (5%)
    let evidenceQualityScore = 10;
    const evidence = params.evidenceCount || 0;
    if (evidence >= 3) evidenceQualityScore = 100;
    else if (evidence === 2) evidenceQualityScore = 70;
    else if (evidence === 1) evidenceQualityScore = 40;

    // Weighted aggregation
    const totalScore =
      severityScore * 0.35 +
      urgencyScore * 0.20 +
      populationScore * 0.20 +
      durationScore * 0.10 +
      communitySupportScore * 0.10 +
      evidenceQualityScore * 0.05;

    const roundedScore = Math.round(totalScore * 10) / 10;

    // Determine discrete priority level
    let priorityLevel = PriorityLevel.LOW;
    if (roundedScore >= 75) {
      priorityLevel = PriorityLevel.CRITICAL;
    } else if (roundedScore >= 50) {
      priorityLevel = PriorityLevel.HIGH;
    } else if (roundedScore >= 25) {
      priorityLevel = PriorityLevel.MEDIUM;
    }

    const impactLabel = params.impactExplanation ? `Impact: ${params.impactExplanation}` : `Population: ${pop}`;
    const explanation = `Score ${roundedScore}/100 [Severity: ${params.severity} (${severityScore}), Urgency: ${urgency} (${urgencyScore}), ${impactLabel} (Magnitude: ${impactScore}), Chronicity: ${duration}mo (${durationScore}), Support: ${votes} votes (${communitySupportScore}), Evidence: ${evidence} items (${evidenceQualityScore})]`;

    return {
      score: roundedScore,
      priorityLevel,
      factorBreakdown: {
        severityScore,
        urgencyScore,
        populationScore,
        impactScore,
        durationScore,
        communitySupportScore,
        evidenceQualityScore,
      },
      explanation,
    };
  }
}
