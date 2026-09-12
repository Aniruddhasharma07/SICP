import {
  ProblemType,
  ImpactMetricType,
  ImpactTimeBasis,
  ImpactVerificationStatus,
  AdaptiveQuestionDto,
} from '@sicp/shared';
import { IImpactModel, ImpactEvaluationContext, ImpactEvaluationResult } from '../impact.types';

export class FloodEnvironmentalImpactModel implements IImpactModel {
  public readonly problemType = ProblemType.FLOOD_ENVIRONMENTAL;
  public readonly defaultMetricType = ImpactMetricType.EXPOSED_POPULATION;
  public readonly defaultUnit = 'PEOPLE';
  public readonly defaultTimeBasis = ImpactTimeBasis.EPISODIC;

  public getAdaptiveQuestions(): AdaptiveQuestionDto[] {
    return [
      {
        id: 'exposedResidents',
        prompt: 'Approximately how many people reside within the active flood/hazard inundation zone?',
        placeholder: 'e.g. 1500',
        inputType: 'number',
        unit: 'PEOPLE',
      },
      {
        id: 'floodDepthCm',
        prompt: 'Maximum standing water or inundation depth in centimeters?',
        placeholder: 'e.g. 75',
        inputType: 'number',
        unit: 'CM',
      },
      {
        id: 'evacuationRequired',
        prompt: 'Are homes uninhabitable or is emergency evacuation currently required?',
        inputType: 'boolean',
      },
    ];
  }

  public evaluate(
    inputs: Record<string, unknown>,
    context: ImpactEvaluationContext
  ): ImpactEvaluationResult {
    const exposedResidents = Number(inputs.exposedResidents) || 0;
    const floodDepthCm = Number(inputs.floodDepthCm) || 0;
    const evacuationRequired = Boolean(inputs.evacuationRequired);

    const evidenceBasis: string[] = [];
    const dataSources: string[] = [];
    const missingInformation: string[] = [];

    let value = 0;
    let calculationMethod = '';
    let confidence = 0.5;

    if (exposedResidents > 0) {
      value = exposedResidents;
      calculationMethod = 'HAZARD_ZONE_RESIDENT_COUNT';
      evidenceBasis.push(`${exposedResidents.toLocaleString()} residents in immediate inundation perimeter`);
      dataSources.push('Field disaster response / citizen survey');
      confidence = 0.85;
    } else if (context.userProvidedPopulation && context.userProvidedPopulation > 0) {
      value = context.userProvidedPopulation;
      calculationMethod = 'SUBMITTER_REPORTED_EXPOSURE';
      evidenceBasis.push(`${context.userProvidedPopulation} exposed residents reported`);
      dataSources.push('Initial citizen submission');
      confidence = 0.6;
    } else {
      value = 600; // Low-lying settlement baseline cluster
      calculationMethod = 'LOW_LYING_SETTLEMENT_BASELINE';
      evidenceBasis.push('Disaster management low-lying cluster baseline applied');
      dataSources.push('Disaster vulnerability baseline maps');
      missingInformation.push('Actual resident census within inundated area not specified');
      confidence = 0.4;
    }

    if (inputs.evacuationRequired === undefined) {
      missingInformation.push('Emergency evacuation and shelter status not confirmed');
    }

    // Normalization into 0–100 magnitude score
    let magnitude = Math.min(100, Math.round(11 * Math.log(1 + value)));
    if (evacuationRequired) {
      magnitude = Math.min(100, magnitude + 20); // Immediate displacement emergency penalty
    }
    if (floodDepthCm > 60) {
      magnitude = Math.min(100, magnitude + 10); // Dangerous depth penalty
    }

    const explanation = `Estimated ${value.toLocaleString()} people within direct environmental/flood hazard perimeter (${calculationMethod}). Evacuation required: ${evacuationRequired ? 'Yes' : 'No'}. Inundation depth: ${floodDepthCm > 0 ? `${floodDepthCm} cm` : 'Unspecified'}.`;

    return {
      problemType: this.problemType,
      metricType: this.defaultMetricType,
      value,
      unit: this.defaultUnit,
      timeBasis: this.defaultTimeBasis,
      calculationMethod,
      inputs: {
        exposedResidents: exposedResidents || null,
        floodDepthCm: floodDepthCm || null,
        evacuationRequired,
      },
      confidence,
      evidenceBasis,
      dataSources,
      verificationStatus: exposedResidents > 0 ? ImpactVerificationStatus.ESTIMATED : ImpactVerificationStatus.REPORTED,
      normalizedMagnitude: magnitude,
      missingInformation,
      suggestedQuestions: this.getAdaptiveQuestions(),
      requiresHumanReview: confidence < 0.6 || evacuationRequired,
      explanation,
    };
  }
}
