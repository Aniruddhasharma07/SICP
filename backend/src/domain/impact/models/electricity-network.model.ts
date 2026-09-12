import {
  ProblemType,
  ImpactMetricType,
  ImpactTimeBasis,
  ImpactVerificationStatus,
  AdaptiveQuestionDto,
} from '@sicp/shared';
import { IImpactModel, ImpactEvaluationContext, ImpactEvaluationResult } from '../impact.types';

export class ElectricityNetworkImpactModel implements IImpactModel {
  public readonly problemType = ProblemType.ELECTRICITY_NETWORK;
  public readonly defaultMetricType = ImpactMetricType.HOUSEHOLDS_WITHOUT_POWER;
  public readonly defaultUnit = 'HOUSEHOLDS';
  public readonly defaultTimeBasis = ImpactTimeBasis.CONTINUOUS;

  public getAdaptiveQuestions(): AdaptiveQuestionDto[] {
    return [
      {
        id: 'connectedHouseholds',
        prompt: 'Approximately how many households are fed by this failed transformer or feeder line?',
        placeholder: 'e.g. 180',
        inputType: 'number',
        unit: 'HOUSEHOLDS',
      },
      {
        id: 'criticalFacilitiesAffected',
        prompt: 'Are public water pumps, clinics, or grain mills dependent on this electrical circuit?',
        inputType: 'boolean',
      },
      {
        id: 'outageDurationHours',
        prompt: 'How many continuous hours has the electricity been out?',
        placeholder: 'e.g. 48',
        inputType: 'number',
        unit: 'HOURS',
      },
    ];
  }

  public evaluate(
    inputs: Record<string, unknown>,
    context: ImpactEvaluationContext
  ): ImpactEvaluationResult {
    const connectedHouseholds = Number(inputs.connectedHouseholds) || 0;
    const commercialCount = Number(inputs.commercialEstablishments) || 0;
    const criticalFacilities = Boolean(inputs.criticalFacilitiesAffected);
    const outageHours = Number(inputs.outageDurationHours) || (context.durationMonths ? context.durationMonths * 30 * 24 : 24);

    const evidenceBasis: string[] = [];
    const dataSources: string[] = [];
    const missingInformation: string[] = [];

    let value = 0;
    let calculationMethod = '';
    let confidence = 0.5;

    if (connectedHouseholds > 0) {
      value = connectedHouseholds + commercialCount;
      calculationMethod = 'FEEDER_CIRCUIT_CONNECTION_COUNT';
      evidenceBasis.push(`${connectedHouseholds} domestic households + ${commercialCount} commercial units connected to circuit`);
      dataSources.push('Consumer electrical meter records / local lineman report');
      confidence = 0.85;
    } else {
      value = 140; // Standard 25kVA / 63kVA rural distribution transformer capacity benchmark
      calculationMethod = 'DISTRIBUTION_TRANSFORMER_CAPACITY_BENCHMARK';
      evidenceBasis.push('Standard benchmark for 25kVA distribution transformer consumer load applied');
      dataSources.push('DISCOM distribution planning norms');
      missingInformation.push('Exact household meter connections on feeder not specified');
      confidence = 0.45;
    }

    if (inputs.criticalFacilitiesAffected === undefined) {
      missingInformation.push('Impact on community drinking water pumps or medical refrigeration unconfirmed');
    }

    // Normalization into 0–100 magnitude score
    let magnitude = Math.min(100, Math.round(14 * Math.log(1 + value)));
    if (criticalFacilities) {
      magnitude = Math.min(100, magnitude + 12); // Critical community water/medical pump disruption
    }
    if (outageHours > 72) {
      magnitude = Math.min(100, magnitude + 8); // Severe prolonged outage penalty
    }

    const explanation = `Estimated ${value.toLocaleString()} households/establishments without continuous electrical power (${calculationMethod}). Outage duration: ${outageHours}h. Critical facilities affected: ${criticalFacilities ? 'Yes' : 'No'}.`;

    return {
      problemType: this.problemType,
      metricType: this.defaultMetricType,
      value,
      unit: this.defaultUnit,
      timeBasis: this.defaultTimeBasis,
      calculationMethod,
      inputs: {
        connectedHouseholds: connectedHouseholds || null,
        commercialEstablishments: commercialCount || null,
        criticalFacilitiesAffected: criticalFacilities,
        outageDurationHours: outageHours,
      },
      confidence,
      evidenceBasis,
      dataSources,
      verificationStatus: connectedHouseholds > 0 ? ImpactVerificationStatus.ESTIMATED : ImpactVerificationStatus.REPORTED,
      normalizedMagnitude: magnitude,
      missingInformation,
      suggestedQuestions: this.getAdaptiveQuestions(),
      requiresHumanReview: confidence < 0.6 || criticalFacilities,
      explanation,
    };
  }
}
