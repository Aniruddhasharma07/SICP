import {
  ProblemType,
  ImpactMetricType,
  ImpactTimeBasis,
  ImpactVerificationStatus,
  AdaptiveQuestionDto,
  ImpactMetricDto,
} from '@sicp/shared';

export interface ImpactEvaluationContext {
  challengeId?: string;
  category: string;
  title?: string;
  description?: string;
  durationMonths?: number | null;
  userProvidedPopulation?: number | null;
}

export interface ImpactEvaluationResult {
  problemType: ProblemType;
  metricType: ImpactMetricType;
  value: number;
  unit: string;
  timeBasis: ImpactTimeBasis;
  calculationMethod: string;
  inputs: Record<string, unknown>;
  confidence: number;
  evidenceBasis: string[];
  dataSources: string[];
  verificationStatus: ImpactVerificationStatus;
  normalizedMagnitude: number;
  missingInformation: string[];
  suggestedQuestions: AdaptiveQuestionDto[];
  requiresHumanReview: boolean;
  explanation: string;
}

export interface IImpactModel {
  readonly problemType: ProblemType;
  readonly defaultMetricType: ImpactMetricType;
  readonly defaultUnit: string;
  readonly defaultTimeBasis: ImpactTimeBasis;

  evaluate(inputs: Record<string, unknown>, context: ImpactEvaluationContext): ImpactEvaluationResult;
  getAdaptiveQuestions(): AdaptiveQuestionDto[];
}
