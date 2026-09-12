import {
  ProblemType,
  ImpactMetricType,
  ImpactTimeBasis,
  ImpactVerificationStatus,
  AdaptiveQuestionDto,
} from '@sicp/shared';
import { IImpactModel, ImpactEvaluationContext, ImpactEvaluationResult } from '../impact.types';

export class UnknownImpactModel implements IImpactModel {
  public readonly problemType = ProblemType.UNKNOWN;
  public readonly defaultMetricType = ImpactMetricType.UNKNOWN_METRIC;
  public readonly defaultUnit = 'UNITS';
  public readonly defaultTimeBasis = ImpactTimeBasis.TOTAL_EXPOSURE;

  public getAdaptiveQuestions(): AdaptiveQuestionDto[] {
    return [
      {
        id: 'beneficiaryCount',
        prompt: 'Approximately how many people or facilities directly depend on the affected service?',
        placeholder: 'e.g. 200',
        inputType: 'number',
        unit: 'PEOPLE',
      },
      {
        id: 'serviceNature',
        prompt: 'Briefly specify what public service or infrastructure asset is failing (e.g. library, cemetery, park, telecom tower):',
        placeholder: 'e.g. Rural post office banking terminal',
        inputType: 'text',
      },
    ];
  }

  public evaluate(
    inputs: Record<string, unknown>,
    context: ImpactEvaluationContext
  ): ImpactEvaluationResult {
    const userReported = Number(inputs.beneficiaryCount) || context.userProvidedPopulation || 0;

    const missingInformation: string[] = [
      'Problem type does not map to a standard domain impact model',
      'Specific dependent beneficiary population or asset throughput unverified',
    ];

    if (userReported > 0) {
      const magnitude = Math.min(100, Math.round(10 * Math.log(1 + userReported)));
      return {
        problemType: this.problemType,
        metricType: ImpactMetricType.AFFECTED_PEOPLE,
        value: userReported,
        unit: 'PEOPLE',
        timeBasis: this.defaultTimeBasis,
        calculationMethod: 'CITIZEN_REPORTED_ESTIMATE_UNVERIFIED',
        inputs: { reportedCount: userReported },
        confidence: 0.4,
        evidenceBasis: [`${userReported} beneficiaries claimed by submitter`],
        dataSources: ['Direct submitter report'],
        verificationStatus: ImpactVerificationStatus.REPORTED,
        normalizedMagnitude: magnitude,
        missingInformation,
        suggestedQuestions: this.getAdaptiveQuestions(),
        requiresHumanReview: true,
        explanation: `Impact metric cannot yet be modeled automatically. Using submitter-reported count (${userReported} people) pending government classification.`,
      };
    }

    // Zero fake data - explicit honest fallback
    return {
      problemType: this.problemType,
      metricType: this.defaultMetricType,
      value: 0,
      unit: this.defaultUnit,
      timeBasis: this.defaultTimeBasis,
      calculationMethod: 'UNCLASSIFIED_MODEL_PENDING_REVIEW',
      inputs: {},
      confidence: 0.1,
      evidenceBasis: ['Unclassified problem domain with no beneficiary quantity supplied'],
      dataSources: [],
      verificationStatus: ImpactVerificationStatus.UNKNOWN,
      normalizedMagnitude: 20, // Baseline neutral magnitude
      missingInformation,
      suggestedQuestions: this.getAdaptiveQuestions(),
      requiresHumanReview: true,
      explanation: 'Problem-specific impact model unavailable for this category. Requires manual administrative evaluation or additional citizen input.',
    };
  }
}
