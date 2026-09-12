import {
  ProblemType,
  ImpactMetricType,
  ImpactTimeBasis,
  ImpactVerificationStatus,
  AdaptiveQuestionDto,
} from '@sicp/shared';
import { IImpactModel, ImpactEvaluationContext, ImpactEvaluationResult } from '../impact.types';

export class HealthcareServiceImpactModel implements IImpactModel {
  public readonly problemType = ProblemType.HEALTHCARE_SERVICE;
  public readonly defaultMetricType = ImpactMetricType.PATIENTS_AFFECTED;
  public readonly defaultUnit = 'PATIENTS_PER_MONTH';
  public readonly defaultTimeBasis = ImpactTimeBasis.PER_MONTH;

  public getAdaptiveQuestions(): AdaptiveQuestionDto[] {
    return [
      {
        id: 'dailyPatientVisits',
        prompt: 'Average number of daily outpatients and emergencies visiting this facility?',
        placeholder: 'e.g. 80',
        inputType: 'number',
        unit: 'PATIENTS/DAY',
      },
      {
        id: 'facilityType',
        prompt: 'What tier of healthcare facility is experiencing this failure?',
        inputType: 'select',
        options: ['SUB_CENTRE', 'PRIMARY_HEALTH_CENTRE', 'COMMUNITY_HEALTH_CENTRE', 'DISTRICT_HOSPITAL'],
        helpText: 'Helps determine standard catchment size and service dependency.',
      },
      {
        id: 'emergencyServicesHalted',
        prompt: 'Are emergency, maternal delivery, or critical life-support services halted?',
        inputType: 'boolean',
      },
      {
        id: 'distanceToAlternativeKm',
        prompt: 'Distance in kilometers to the nearest alternative functional healthcare facility?',
        placeholder: 'e.g. 18',
        inputType: 'number',
        unit: 'KM',
      },
    ];
  }

  public evaluate(
    inputs: Record<string, unknown>,
    context: ImpactEvaluationContext
  ): ImpactEvaluationResult {
    const dailyVisits = Number(inputs.dailyPatientVisits) || 0;
    const monthlyPatients = Number(inputs.monthlyPatients) || 0;
    const facilityType = (inputs.facilityType as string) || 'PRIMARY_HEALTH_CENTRE';
    const emergencyHalted = Boolean(inputs.emergencyServicesHalted);
    const distanceToAltKm = Number(inputs.distanceToAlternativeKm) || 0;

    const evidenceBasis: string[] = [];
    const dataSources: string[] = [];
    const missingInformation: string[] = [];

    let value = 0;
    let calculationMethod = '';
    let confidence = 0.5;

    if (monthlyPatients > 0) {
      value = monthlyPatients;
      calculationMethod = 'REPORTED_MONTHLY_PATIENT_VOLUME';
      evidenceBasis.push(`${monthlyPatients.toLocaleString()} patients/month treated at facility`);
      dataSources.push('Health facility registry / submitter report');
      confidence = 0.85;
    } else if (dailyVisits > 0) {
      value = dailyVisits * 30;
      calculationMethod = 'DAILY_OPD_EXTRAPOLATION_PRODUCT';
      evidenceBasis.push(`${dailyVisits} daily outpatients × 30 days`);
      dataSources.push('Outpatient department daily log');
      confidence = 0.8;
    } else {
      const standardMonthlyByTier: Record<string, number> = {
        SUB_CENTRE: 350,
        PRIMARY_HEALTH_CENTRE: 1200,
        COMMUNITY_HEALTH_CENTRE: 3600,
        DISTRICT_HOSPITAL: 12500,
      };
      value = standardMonthlyByTier[facilityType] || 1200;
      calculationMethod = 'FACILITY_TIER_BENCHMARK';
      evidenceBasis.push(`Standard patient catchment estimate for ${facilityType}`);
      dataSources.push('National Health Mission facility averages');
      missingInformation.push('Actual daily or monthly patient footfall not verified');
      confidence = 0.5;
    }

    if (inputs.emergencyServicesHalted === undefined) {
      missingInformation.push('Impact on emergency and maternal delivery services unverified');
    }

    // Normalization into 0–100 magnitude score
    let magnitude = Math.min(100, Math.round(11 * Math.log(1 + value)));
    if (emergencyHalted) {
      magnitude = Math.min(100, magnitude + 15); // Severe clinical risk penalty
    }
    if (distanceToAltKm > 10) {
      magnitude = Math.min(100, magnitude + 8); // Remote catchment isolation penalty
    }

    const explanation = `Estimated ${value.toLocaleString()} patients per month impacted by disrupted clinical services (${calculationMethod}). Emergency services halted: ${emergencyHalted ? 'Yes' : 'No'}. Nearest alternative: ${distanceToAltKm > 0 ? `${distanceToAltKm} km` : 'Local'}.`;

    return {
      problemType: this.problemType,
      metricType: this.defaultMetricType,
      value,
      unit: this.defaultUnit,
      timeBasis: this.defaultTimeBasis,
      calculationMethod,
      inputs: {
        dailyPatientVisits: dailyVisits || null,
        monthlyPatients: monthlyPatients || null,
        facilityType,
        emergencyServicesHalted: emergencyHalted,
        distanceToAlternativeKm: distanceToAltKm,
      },
      confidence,
      evidenceBasis,
      dataSources,
      verificationStatus: dailyVisits > 0 || monthlyPatients > 0 ? ImpactVerificationStatus.ESTIMATED : ImpactVerificationStatus.REPORTED,
      normalizedMagnitude: magnitude,
      missingInformation,
      suggestedQuestions: this.getAdaptiveQuestions(),
      requiresHumanReview: confidence < 0.6 || emergencyHalted,
      explanation,
    };
  }
}
