import {
  ProblemType,
  ImpactMetricType,
  ImpactTimeBasis,
  ImpactVerificationStatus,
  AdaptiveQuestionDto,
} from '@sicp/shared';
import { IImpactModel, ImpactEvaluationContext, ImpactEvaluationResult } from '../impact.types';

export class SanitationServiceImpactModel implements IImpactModel {
  public readonly problemType = ProblemType.SANITATION_SERVICE;
  public readonly defaultMetricType = ImpactMetricType.AFFECTED_RESIDENTS;
  public readonly defaultUnit = 'RESIDENTS';
  public readonly defaultTimeBasis = ImpactTimeBasis.TOTAL_EXPOSURE;

  public getAdaptiveQuestions(): AdaptiveQuestionDto[] {
    return [
      {
        id: 'servedHouseholds',
        prompt: 'How many households are directly exposed to the open sewage, drain blockage, or waste overflow?',
        placeholder: 'e.g. 120',
        inputType: 'number',
        unit: 'HOUSEHOLDS',
      },
      {
        id: 'nearSchoolOrHospital',
        prompt: 'Is the waste or sewage accumulation directly adjacent to a school, Anganwadi, or healthcare clinic?',
        inputType: 'boolean',
      },
      {
        id: 'waterloggingContaminationRisk',
        prompt: 'Is overflowing sewage seeping into local drinking water pipelines or open shallow wells?',
        inputType: 'boolean',
      },
    ];
  }

  public evaluate(
    inputs: Record<string, unknown>,
    context: ImpactEvaluationContext
  ): ImpactEvaluationResult {
    const servedHouseholds = Number(inputs.servedHouseholds) || 0;
    const nearSchool = Boolean(inputs.nearSchoolOrHospital);
    const contaminationRisk = Boolean(inputs.waterloggingContaminationRisk);

    const evidenceBasis: string[] = [];
    const dataSources: string[] = [];
    const missingInformation: string[] = [];

    let value = 0;
    let calculationMethod = '';
    let confidence = 0.5;

    if (servedHouseholds > 0) {
      value = Math.round(servedHouseholds * 4.8);
      calculationMethod = 'SANITATION_CATCHMENT_HOUSEHOLD_PRODUCT';
      evidenceBasis.push(`${servedHouseholds} households along overflow catchment × 4.8 avg household size`);
      dataSources.push('Neighborhood sanitation route survey');
      confidence = 0.8;
    } else {
      value = 350; // Standard neighborhood lane catchment
      calculationMethod = 'MUNICIPAL_LANE_CATCHMENT_BENCHMARK';
      evidenceBasis.push('Standard urban/peri-urban lane sanitation catchment applied');
      dataSources.push('Swachh Bharat municipal sanitation guidelines');
      missingInformation.push('Specific household count along affected lane not provided');
      confidence = 0.45;
    }

    if (inputs.waterloggingContaminationRisk === undefined) {
      missingInformation.push('Drinking water pipe cross-contamination risk unverified');
    }

    // Normalization into 0–100 magnitude score
    let magnitude = Math.min(100, Math.round(12 * Math.log(1 + value)));
    if (contaminationRisk) {
      magnitude = Math.min(100, magnitude + 18); // Severe epidemic waterborne disease risk
    }
    if (nearSchool) {
      magnitude = Math.min(100, magnitude + 8); // Child vulnerability penalty
    }

    const explanation = `Estimated ${value.toLocaleString()} residents in active biological hazard exposure zone (${calculationMethod}). Drinking water contamination risk: ${contaminationRisk ? 'High' : 'Low'}. Adjacent to vulnerable facility: ${nearSchool ? 'Yes' : 'No'}.`;

    return {
      problemType: this.problemType,
      metricType: this.defaultMetricType,
      value,
      unit: this.defaultUnit,
      timeBasis: this.defaultTimeBasis,
      calculationMethod,
      inputs: {
        servedHouseholds: servedHouseholds || null,
        nearSchoolOrHospital: nearSchool,
        waterloggingContaminationRisk: contaminationRisk,
      },
      confidence,
      evidenceBasis,
      dataSources,
      verificationStatus: servedHouseholds > 0 ? ImpactVerificationStatus.ESTIMATED : ImpactVerificationStatus.REPORTED,
      normalizedMagnitude: magnitude,
      missingInformation,
      suggestedQuestions: this.getAdaptiveQuestions(),
      requiresHumanReview: confidence < 0.6 || contaminationRisk,
      explanation,
    };
  }
}
