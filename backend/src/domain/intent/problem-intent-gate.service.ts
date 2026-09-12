import {
  ProblemIntentClassification,
  IntentNextAction,
  ProblemIntentResultDto,
  ValidateIntentPayload,
} from '@sicp/shared';
import { DeterministicIntentValidator } from './deterministic-intent.validator';
import { AiServiceClient } from '../intelligence/ai-service.client';
import { logger } from '../../utils/logger';

export class ProblemIntentGateService {
  /**
   * Multi-signal intent validation pipeline:
   * Tier 1: Deterministic fast-path
   * Tier 2: AI evaluation via FastAPI / Gemini (if ambiguous or valid)
   * Tier 3: Deterministic fallback on AI error / offline
   */
  public static async validate(
    payload: ValidateIntentPayload,
    requestId: string = 'req-intent-val'
  ): Promise<ProblemIntentResultDto> {
    const rawTitle = (payload.title || '').trim();

    // Tier 1: Fast deterministic checks
    const fastCheck = DeterministicIntentValidator.validate(payload);

    // High confidence rejection (Gibberish, Test, Non-problem) -> Short-circuit immediately
    if (
      fastCheck.confidence >= 0.85 &&
      (fastCheck.classification === ProblemIntentClassification.GIBBERISH ||
       fastCheck.classification === ProblemIntentClassification.TEST_INPUT ||
       fastCheck.classification === ProblemIntentClassification.NON_PROBLEM ||
       fastCheck.classification === ProblemIntentClassification.SPAM ||
       fastCheck.classification === ProblemIntentClassification.ABUSIVE_OR_UNSAFE)
    ) {
      logger.info(`[INTENT_GATE_REJECT] Deterministic rejection: ${fastCheck.classification}`, {
        requestId,
        title: rawTitle,
      });
      return fastCheck;
    }

    // Tier 2: Invoke FastAPI Gemini validation
    try {
      logger.info(`[INTENT_GATE_AI] Calling AI intent validation`, { requestId, title: rawTitle });
      const aiResult = await AiServiceClient.validateProblemIntent(payload, requestId);
      logger.info(`[INTENT_GATE_AI_SUCCESS] Intent classified as ${aiResult.classification}`, {
        requestId,
        confidence: aiResult.confidence,
      });

      // Defensive location normalization: Step 01 does not require location (captured in Step 02)
      if (aiResult.classification === ProblemIntentClassification.UNCLEAR_PROBLEM) {
        const textToCheck = `${aiResult.reason || ''} ${aiResult.suggestedClarification || ''} ${(aiResult.missingContext || []).join(' ')}`.toLowerCase();
        const locPhrases = [
          'fails to provide specific location',
          'location details',
          'missing location',
          'without location',
          'no location',
          'village name',
          'specify location',
          'location information',
          'where this',
          'geographic',
        ];
        const isLocComplaint = locPhrases.some(p => textToCheck.includes(p));
        const onlyLocMissing = (aiResult.missingContext || []).length > 0 &&
          (aiResult.missingContext || []).every((c: string) => locPhrases.some(p => c.toLowerCase().includes(p)));

        if (isLocComplaint || onlyLocMissing) {
          logger.info(`[INTENT_GATE_LOCATION_NORMALIZED] Normalizing UNCLEAR_PROBLEM due to missing location for Step 01`, {
            requestId,
            title: rawTitle,
          });
          aiResult.classification = ProblemIntentClassification.VALID_PROBLEM;
          aiResult.nextAction = IntentNextAction.CONTINUE_ANALYSIS;
          aiResult.reason = 'Civic problem statement clearly identified. Specific geographic location can be pinned in the next step.';
          aiResult.suggestedClarification = undefined;
        }
      }

      return {
        ...aiResult,
        validationMode: 'ai',
      };
    } catch (err: unknown) {
      // Tier 3: Fallback to deterministic assessment
      logger.warn(`[INTENT_GATE_FALLBACK] AI intent validation unreachable; falling back to deterministic: ${(err as Error).message}`, {
        requestId,
      });
      return {
        ...fastCheck,
        validationMode: 'deterministic',
      };
    }
  }
}
