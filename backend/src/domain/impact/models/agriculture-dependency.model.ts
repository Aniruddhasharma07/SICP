import {
  ProblemType,
  ImpactMetricType,
  ImpactTimeBasis,
  ImpactVerificationStatus,
  AdaptiveQuestionDto,
} from '@sicp/shared';
import { IImpactModel, ImpactEvaluationContext, ImpactEvaluationResult } from '../impact.types';

export class AgricultureDependencyImpactModel implements IImpactModel {
  public readonly problemType = ProblemType.AGRICULTURE_DEPENDENCY;
  public readonly defaultMetricType = ImpactMetricType.AFFECTED_FARMS;
  public readonly defaultUnit = 'FARMS';
  public readonly defaultTimeBasis = ImpactTimeBasis.TOTAL_EXPOSURE;

  public getAdaptiveQuestions(): AdaptiveQuestionDto[] {
    return [
      {
        id: 'affectedFarms',
        prompt: 'Approximately how many farming families or agricultural landholdings are affected?',
        placeholder: 'e.g. 85',
        inputType: 'number',
        unit: 'FARMS',
      },
      {
        id: 'affectedHectares',
        prompt: 'Total land area impacted in hectares or acres?',
        placeholder: 'e.g. 120',
        inputType: 'number',
        unit: 'HECTARES',
      },
      {
        id: 'standingCropRisk',
        prompt: 'Is there imminent risk of complete harvest loss to standing seasonal crops?',
        inputType: 'boolean',
      },
    ];
  }

  public evaluate(
    inputs: Record<string, unknown>,
    context: ImpactEvaluationContext
  ): ImpactEvaluationResult {
    const affectedFarms = Number(inputs.affectedFarms) || Number(inputs.affectedFarmers) || 0;
    const affectedHectares = Number(inputs.affectedHectares) || 0;
    const standingCropRisk = Boolean(inputs.standingCropRisk);

    const evidenceBasis: string[] = [];
    const dataSources: string[] = [];
    const missingInformation: string[] = [];

    let value = 0;
    let calculationMethod = '';
    let confidence = 0.5;

    if (affectedFarms > 0) {
      value = affectedFarms;
      calculationMethod = 'DIRECT_FARM_LANDHOLDING_CENSUS';
      evidenceBasis.push(`${affectedFarms} agricultural landholdings directly reported`);
      dataSources.push('Gram Panchayat farmer registry / submitter report');
      confidence = 0.85;
    } else if (affectedHectares > 0) {
      // Small & marginal farmer average holding benchmark in India ~ 1.08 ha
      value = Math.max(1, Math.round(affectedHectares / 1.1));
      calculationMethod = 'HECTARE_LANDHOLDING_DIVISOR';
      evidenceBasis.push(`${affectedHectares} hectares divided by average 1.1 ha smallholder plot`);
      dataSources.push('Agricultural census average landholding divisor');
      confidence = 0.75;
    } else {
      value = 65; // Village command area tail-end baseline
      calculationMethod = 'COMMAND_AREA_TAIL_END_BENCHMARK';
      evidenceBasis.push('Estimated command area tail-end farmer count applied');
      dataSources.push('Irrigation department canal distributary norms');
      missingInformation.push('Farmer head-count or acreage not recorded');
      confidence = 0.4;
    }

    if (inputs.standingCropRisk === undefined) {
      missingInformation.push('Standing crop vegetative/harvest stage risk unverified');
    }

    // Normalization into 0–100 magnitude score
    let magnitude = Math.min(100, Math.round(15 * Math.log(1 + value)));
    if (standingCropRisk) {
      magnitude = Math.min(100, magnitude + 15); // Total seasonal livelihood destruction penalty
    }

    const explanation = `Estimated ${value.toLocaleString()} farming households directly impacted (${calculationMethod}). Standing crop total loss risk: ${standingCropRisk ? 'Imminent' : 'Low'}.`;

    return {
      problemType: this.problemType,
      metricType: this.defaultMetricType,
      value,
      unit: this.defaultUnit,
      timeBasis: this.defaultTimeBasis,
      calculationMethod,
      inputs: {
        affectedFarms: affectedFarms || null,
        affectedHectares: affectedHectares || null,
        standingCropRisk,
      },
      confidence,
      evidenceBasis,
      dataSources,
      verificationStatus: affectedFarms > 0 || affectedHectares > 0 ? ImpactVerificationStatus.ESTIMATED : ImpactVerificationStatus.REPORTED,
      normalizedMagnitude: magnitude,
      missingInformation,
      suggestedQuestions: this.getAdaptiveQuestions(),
      requiresHumanReview: confidence < 0.6 || standingCropRisk,
      explanation,
    };
  }
}
