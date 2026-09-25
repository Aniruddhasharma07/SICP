import {
  HypothesisStatus,
  EvidenceEpistemicClass,
  EvidenceItemDto,
  RootCauseHypothesisDto,
} from '@sicp/shared';

export interface HypothesisEvaluationInput {
  id: string;
  incidentId: string;
  title: string;
  description: string;
  targetNodeId?: string | null;
  targetNodeName?: string | null;
  failureMode: string;
  initialScore?: number;
  status?: HypothesisStatus;
  supportingEvidence: EvidenceItemDto[];
  contradictingEvidence: EvidenceItemDto[];
  missingEvidence: string[];
  falsificationCriteria: string;
  refutationReason?: string | null;
  validatedById?: string | null;
  validatedByName?: string | null;
  validatedAt?: string | null;
  validationReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export class CompetingHypothesesEngine {
  /**
   * Recalculates diagnostic support score for each hypothesis across the evidence matrix.
   * Monotonically accounts for supporting, contradicting, and missing evidence.
   */
  public static evaluateMatrix(
    hypotheses: HypothesisEvaluationInput[],
    weakenedHypothesisIds: string[] = []
  ): RootCauseHypothesisDto[] {
    const evaluated: RootCauseHypothesisDto[] = hypotheses.map(h => {
      // Base score
      let score = h.initialScore ?? 50;

      // Calculate support from supporting evidence (weighted by epistemic class)
      let supportSum = 0;
      for (const ev of h.supportingEvidence) {
        const weight = Math.abs(ev.diagnosticWeight || 10);
        const classMultiplier = this.getEpistemicMultiplier(ev.epistemicClass);
        supportSum += weight * classMultiplier;
      }

      // Calculate contradiction penalty (contradicting evidence heavily penalizes)
      let contradictionSum = 0;
      for (const ev of h.contradictingEvidence) {
        const weight = Math.abs(ev.diagnosticWeight || 15);
        const classMultiplier = this.getEpistemicMultiplier(ev.epistemicClass);
        contradictionSum += weight * classMultiplier * 1.5; // Contradictions carry higher diagnostic weight in ACH
      }

      // If branch differential weakened this hypothesis
      if (weakenedHypothesisIds.includes(h.id)) {
        contradictionSum += 45;
      }

      // Missing evidence penalty (uncertainty)
      const missingCount = h.missingEvidence.length;
      const missingPenalty = Math.min(25, missingCount * 5);

      // Raw score synthesis
      const netDiagnostic = 50 + supportSum - contradictionSum - missingPenalty;
      score = Math.max(5, Math.min(95, Math.round(netDiagnostic)));

      // Determine hypothesis status
      let status: HypothesisStatus = h.status || HypothesisStatus.UNDER_EVALUATION;
      let refutationReason = h.refutationReason || null;

      if (status !== HypothesisStatus.HUMAN_VALIDATED) {
        if (score <= 15 || contradictionSum >= 60) {
          status = HypothesisStatus.REFUTED;
          refutationReason = refutationReason || 'Contradicting branch observation and topological differential refute this hypothesis.';
        } else {
          status = HypothesisStatus.UNDER_EVALUATION;
        }
      }

      return {
        id: h.id,
        incidentId: h.incidentId,
        title: h.title,
        description: h.description,
        targetNodeId: h.targetNodeId || null,
        targetNodeName: h.targetNodeName || null,
        failureMode: h.failureMode,
        diagnosticSupportScore: score,
        status,
        supportingEvidence: h.supportingEvidence,
        contradictingEvidence: h.contradictingEvidence,
        missingEvidence: h.missingEvidence,
        falsificationCriteria: h.falsificationCriteria,
        refutationReason,
        validatedById: h.validatedById || null,
        validatedByName: h.validatedByName || null,
        validatedAt: h.validatedAt || null,
        validationReason: h.validationReason || null,
        createdAt: h.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    });

    // Mark the leading hypothesis if any hypothesis is clear leader and not refuted/validated
    const nonRefuted = evaluated.filter(h => h.status !== HypothesisStatus.REFUTED && h.status !== HypothesisStatus.HUMAN_VALIDATED);
    if (nonRefuted.length > 0) {
      nonRefuted.sort((a, b) => b.diagnosticSupportScore - a.diagnosticSupportScore);
      const top = nonRefuted[0];
      const second = nonRefuted[1];

      // If top has at least 15 points advantage and score >= 60, mark as LEADING_HYPOTHESIS
      if (top.diagnosticSupportScore >= 60 && (!second || top.diagnosticSupportScore - second.diagnosticSupportScore >= 10)) {
        top.status = HypothesisStatus.LEADING_HYPOTHESIS;
      }
    }

    return evaluated;
  }

  /**
   * Diagnostic multiplier by evidence epistemic class
   */
  private static getEpistemicMultiplier(epistemicClass: EvidenceEpistemicClass): number {
    switch (epistemicClass) {
      case EvidenceEpistemicClass.HUMAN_VALIDATED:
      case EvidenceEpistemicClass.VERIFIED_OUTCOME:
        return 1.4;
      case EvidenceEpistemicClass.SOURCE_DERIVED:
      case EvidenceEpistemicClass.OBSERVED:
        return 1.2;
      case EvidenceEpistemicClass.COMPUTED:
        return 1.0;
      case EvidenceEpistemicClass.INFERRED:
      case EvidenceEpistemicClass.AI_INTERPRETED:
        return 0.7;
      case EvidenceEpistemicClass.HYPOTHESIZED:
      default:
        return 0.5;
    }
  }
}
