import {
  ProblemType,
  ImpactMetricType,
  ImpactTimeBasis,
  ImpactVerificationStatus,
  AdaptiveQuestionDto,
} from '@sicp/shared';
import { IImpactModel, ImpactEvaluationContext, ImpactEvaluationResult } from '../impact.types';

export class RoadUsageImpactModel implements IImpactModel {
  public readonly problemType = ProblemType.ROAD_USAGE;
  public readonly defaultMetricType = ImpactMetricType.DAILY_ROAD_USERS;
  public readonly defaultUnit = 'USERS_PER_DAY';
  public readonly defaultTimeBasis = ImpactTimeBasis.PER_DAY;

  public getAdaptiveQuestions(): AdaptiveQuestionDto[] {
    return [
      {
        id: 'dailyVehicleTraffic',
        prompt: 'Estimated count of motorized vehicles (cars, motorcycles, auto-rickshaws, trucks) using this segment daily?',
        placeholder: 'e.g. 1800',
        inputType: 'number',
        unit: 'VEHICLES/DAY',
      },
      {
        id: 'dailyPedestrians',
        prompt: 'Approximately how many pedestrians and cyclists cross or use this road daily?',
        placeholder: 'e.g. 500',
        inputType: 'number',
        unit: 'PEDESTRIANS/DAY',
      },
      {
        id: 'publicTransitBuses',
        prompt: 'Do public transit buses, school vans, or shared jeeps operate on this route?',
        inputType: 'boolean',
        helpText: 'Routes carrying public buses directly affect hundreds of non-motorized commuters.',
      },
      {
        id: 'vitalServiceAccess',
        prompt: 'Is this road the primary corridor to a hospital, major school, or agricultural market?',
        inputType: 'boolean',
      },
      {
        id: 'alternativeDetourKm',
        prompt: 'If this road is blocked, how long is the alternative detour route in kilometers?',
        placeholder: 'e.g. 4.5',
        inputType: 'number',
        unit: 'KM',
      },
    ];
  }

  public evaluate(
    inputs: Record<string, unknown>,
    context: ImpactEvaluationContext
  ): ImpactEvaluationResult {
    const dailyVehicles = Number(inputs.dailyVehicleTraffic) || 0;
    const dailyPedestrians = Number(inputs.dailyPedestrians) || 0;
    const transitUsers = Number(inputs.publicTransitUsers) || (inputs.publicTransitBuses ? 450 : 0);
    const vitalServiceAccess = Boolean(inputs.vitalServiceAccess);
    const alternativeDetourKm = Number(inputs.alternativeDetourKm) || 0;
    const roadClass = (inputs.roadClassification as string) || 'LOCAL_CONNECTOR';

    const evidenceBasis: string[] = [];
    const dataSources: string[] = [];
    const missingInformation: string[] = [];

    let value = 0;
    let calculationMethod = '';
    let confidence = 0.5;

    if (dailyVehicles > 0 || dailyPedestrians > 0) {
      value = dailyVehicles + dailyPedestrians + transitUsers;
      calculationMethod = 'TRAFFIC_FLOW_MULTI_MODAL_SUM';
      evidenceBasis.push(
        `${dailyVehicles.toLocaleString()} vehicles/day + ${dailyPedestrians.toLocaleString()} pedestrians/day + ${transitUsers} transit passengers/day`
      );
      dataSources.push('Submitter reported traffic counts', 'Route modality survey');
      confidence = 0.85;
    } else {
      // Benchmark based on road classification when specific traffic counts are missing
      const defaultsByClass: Record<string, number> = {
        MAJOR_HIGHWAY: 8500,
        ARTERIAL_ROAD: 3500,
        LOCAL_CONNECTOR: 1200,
        VILLAGE_LANE: 350,
      };
      value = defaultsByClass[roadClass] || 1200;
      calculationMethod = 'ROAD_CLASSIFICATION_BENCHMARK';
      evidenceBasis.push(`Benchmark traffic volume applied for road class ${roadClass}`);
      dataSources.push('State PWD road classification traffic standards');
      missingInformation.push('Actual vehicle counts and pedestrian volume not surveyed');
      confidence = 0.5;
    }

    if (inputs.vitalServiceAccess === undefined) {
      missingInformation.push('Emergency access to hospitals or schools via this road not specified');
    }

    // Normalization into 0–100 magnitude score
    // 200 users/day -> ~30, 2000 users/day -> ~60, 10000+ users/day -> ~85, 25000+ -> 100
    let magnitude = Math.min(100, Math.round(10.5 * Math.log(1 + value)));
    if (vitalServiceAccess) {
      magnitude = Math.min(100, magnitude + 10); // Vital corridor bonus (hospital / school access)
    }
    if (alternativeDetourKm > 5) {
      magnitude = Math.min(100, magnitude + 6); // Severe detour penalty
    }

    const explanation = `Estimated ${value.toLocaleString()} daily road users affected (${calculationMethod}). Metric is distinct from local residential census to reflect actual corridor mobility. Vital corridor: ${vitalServiceAccess ? 'Yes' : 'No'}.`;

    return {
      problemType: this.problemType,
      metricType: this.defaultMetricType,
      value,
      unit: this.defaultUnit,
      timeBasis: this.defaultTimeBasis,
      calculationMethod,
      inputs: {
        dailyVehicleTraffic: dailyVehicles || null,
        dailyPedestrians: dailyPedestrians || null,
        publicTransitUsers: transitUsers || null,
        vitalServiceAccess,
        alternativeDetourKm,
        roadClassification: roadClass,
      },
      confidence,
      evidenceBasis,
      dataSources,
      verificationStatus: dailyVehicles > 0 ? ImpactVerificationStatus.ESTIMATED : ImpactVerificationStatus.REPORTED,
      normalizedMagnitude: magnitude,
      missingInformation,
      suggestedQuestions: this.getAdaptiveQuestions(),
      requiresHumanReview: confidence < 0.6 || value > 10000,
      explanation,
    };
  }
}
