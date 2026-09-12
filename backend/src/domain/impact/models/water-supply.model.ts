import {
  ProblemType,
  ImpactMetricType,
  ImpactTimeBasis,
  ImpactVerificationStatus,
  AdaptiveQuestionDto,
} from '@sicp/shared';
import { IImpactModel, ImpactEvaluationContext, ImpactEvaluationResult } from '../impact.types';

export class WaterSupplyImpactModel implements IImpactModel {
  public readonly problemType = ProblemType.WATER_SUPPLY;
  public readonly defaultMetricType = ImpactMetricType.AFFECTED_PEOPLE;
  public readonly defaultUnit = 'PEOPLE';
  public readonly defaultTimeBasis = ImpactTimeBasis.TOTAL_EXPOSURE;

  public getAdaptiveQuestions(): AdaptiveQuestionDto[] {
    return [
      {
        id: 'connectedHouseholds',
        prompt: 'How many households depend directly on this affected water source or pipeline?',
        placeholder: 'e.g. 150',
        inputType: 'number',
        unit: 'HOUSEHOLDS',
        helpText: 'Count of residential houses or connections that receive water from this source.',
      },
      {
        id: 'villagePopulation',
        prompt: 'What is the approximate total population of the affected village or municipal ward?',
        placeholder: 'e.g. 2500',
        inputType: 'number',
        unit: 'RESIDENTS',
      },
      {
        id: 'alternativeSourcesAvailable',
        prompt: 'Are functional alternative water sources available nearby (within 500m)?',
        inputType: 'boolean',
        helpText: 'Indicates whether clean tanker supply, tube-wells, or springs are accessible.',
      },
      {
        id: 'durationDays',
        prompt: 'For how many days has the water supply been disrupted or contaminated?',
        placeholder: 'e.g. 7',
        inputType: 'number',
        unit: 'DAYS',
      },
    ];
  }

  public evaluate(
    inputs: Record<string, unknown>,
    context: ImpactEvaluationContext
  ): ImpactEvaluationResult {
    const connectedHouseholds = Number(inputs.connectedHouseholds) || 0;
    const villagePopulation = Number(inputs.villagePopulation || inputs.wardPopulation) || 0;
    const dependencyRatio = Number(inputs.dependencyRatio) || 0.9;
    const householdSize = Number(inputs.householdSize) || 4.8;
    const alternativeSourcesAvailable = Boolean(inputs.alternativeSourcesAvailable);
    const durationDays = Number(inputs.durationDays) || (context.durationMonths ? context.durationMonths * 30 : 1);

    const evidenceBasis: string[] = [];
    const dataSources: string[] = [];
    const missingInformation: string[] = [];

    let value = 0;
    let calculationMethod = '';
    let confidence = 0.5;

    if (connectedHouseholds > 0) {
      value = Math.round(connectedHouseholds * householdSize);
      calculationMethod = 'HOUSEHOLD_DEPENDENCY_PRODUCT';
      evidenceBasis.push(`${connectedHouseholds} connected households multiplied by average household size (${householdSize})`);
      dataSources.push('Submitter reported household connections', 'Census avg household benchmark (4.8)');
      confidence = 0.85;
    } else if (villagePopulation > 0) {
      value = Math.round(villagePopulation * dependencyRatio);
      calculationMethod = 'VILLAGE_POPULATION_DEPENDENCY_RATIO';
      evidenceBasis.push(`${villagePopulation} village population with ${Math.round(dependencyRatio * 100)}% estimated dependency on affected source`);
      dataSources.push('Local ward/village demographic estimate');
      confidence = 0.75;
    } else if (context.userProvidedPopulation && context.userProvidedPopulation > 0) {
      value = context.userProvidedPopulation;
      calculationMethod = 'CITIZEN_REPORTED_POPULATION';
      evidenceBasis.push(`${context.userProvidedPopulation} people reported by citizen submitter`);
      dataSources.push('Citizen report');
      confidence = 0.6;
    } else {
      value = 450; // Conservative local neighborhood cluster baseline
      calculationMethod = 'NEIGHBORHOOD_BASELINE_ESTIMATE';
      missingInformation.push('Exact household count or village demographic data not supplied');
      dataSources.push('Civic default cluster estimate');
      confidence = 0.35;
    }

    if (!inputs.connectedHouseholds && !inputs.villagePopulation) {
      missingInformation.push('Specify connected households or ward population for precise calculation');
    }
    if (inputs.alternativeSourcesAvailable === undefined) {
      missingInformation.push('Availability of functional alternative water sources not confirmed');
    }

    // Normalization into 0–100 magnitude score
    // 50 people -> ~20, 500 people -> ~50, 5000 people -> ~80, 25000+ people -> 100
    let magnitude = Math.min(100, Math.round(11 * Math.log(1 + value)));
    if (!alternativeSourcesAvailable) {
      magnitude = Math.min(100, magnitude + 5); // Scarcity penalty when no alternative water is accessible
    }
    if (durationDays > 14) {
      magnitude = Math.min(100, magnitude + 8); // Chronic water scarcity escalation
    }

    const explanation = `Estimated ${value.toLocaleString()} people dependent on affected water infrastructure (${calculationMethod}). Confidence: ${Math.round(confidence * 100)}%. Alternative source: ${alternativeSourcesAvailable ? 'Available' : 'None accessible'}.`;

    return {
      problemType: this.problemType,
      metricType: this.defaultMetricType,
      value,
      unit: this.defaultUnit,
      timeBasis: this.defaultTimeBasis,
      calculationMethod,
      inputs: {
        connectedHouseholds: connectedHouseholds || null,
        villagePopulation: villagePopulation || null,
        dependencyRatio,
        householdSize,
        alternativeSourcesAvailable,
        durationDays,
      },
      confidence,
      evidenceBasis,
      dataSources,
      verificationStatus: ImpactVerificationStatus.ESTIMATED,
      normalizedMagnitude: magnitude,
      missingInformation,
      suggestedQuestions: this.getAdaptiveQuestions(),
      requiresHumanReview: confidence < 0.6 || value > 5000,
      explanation,
    };
  }
}
