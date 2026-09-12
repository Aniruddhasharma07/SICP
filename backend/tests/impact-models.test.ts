import { ImpactModelRegistry } from '../src/domain/impact/impact-model.registry';
import {
  ProblemType,
  ImpactMetricType,
  ImpactTimeBasis,
  ImpactVerificationStatus,
} from '@sicp/shared';

describe('Problem-Type-Aware Impact Intelligence Engine', () => {
  describe('Water Supply Impact Model', () => {
    it('calculates affected population from connected households multiplied by average household size', () => {
      const result = ImpactModelRegistry.evaluateImpact(
        { category: 'Water Supply', title: 'Pipeline ruptured' },
        { connectedHouseholds: 250, householdSize: 4.8, alternativeSourcesAvailable: false }
      );

      expect(result.problemType).toBe(ProblemType.WATER_SUPPLY);
      expect(result.metricType).toBe(ImpactMetricType.AFFECTED_PEOPLE);
      expect(result.unit).toBe('PEOPLE');
      expect(result.value).toBe(1200); // 250 * 4.8
      expect(result.calculationMethod).toBe('HOUSEHOLD_DEPENDENCY_PRODUCT');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
      expect(result.normalizedMagnitude).toBeGreaterThan(60);
    });

    it('calculates affected population from village census multiplied by dependency percentage', () => {
      const result = ImpactModelRegistry.evaluateImpact(
        { category: 'Water Supply', title: 'Borewell dried out' },
        { villagePopulation: 5200, dependencyRatio: 0.93, alternativeSourcesAvailable: true }
      );

      expect(result.value).toBe(4836); // 5200 * 0.93
      expect(result.calculationMethod).toBe('VILLAGE_POPULATION_DEPENDENCY_RATIO');
      expect(result.explanation).toContain('4,836');
    });

    it('provides targeted adaptive questions for water problems', () => {
      const questions = ImpactModelRegistry.getAdaptiveQuestions(ProblemType.WATER_SUPPLY);
      expect(questions.some(q => q.id === 'connectedHouseholds')).toBe(true);
      expect(questions.some(q => q.id === 'alternativeSourcesAvailable')).toBe(true);
    });
  });

  describe('Road Usage Impact Model — Does NOT use village residential population', () => {
    it('calculates daily corridor users as multi-modal sum of vehicles, pedestrians, and transit passengers', () => {
      const result = ImpactModelRegistry.evaluateImpact(
        { category: 'Roads & Transport', title: 'Cracked bridge on arterial road' },
        {
          dailyVehicleTraffic: 2100,
          dailyPedestrians: 700,
          publicTransitUsers: 400,
          vitalServiceAccess: true,
          alternativeDetourKm: 6.0,
        }
      );

      expect(result.problemType).toBe(ProblemType.ROAD_USAGE);
      expect(result.metricType).toBe(ImpactMetricType.DAILY_ROAD_USERS);
      expect(result.unit).toBe('USERS_PER_DAY');
      expect(result.timeBasis).toBe(ImpactTimeBasis.PER_DAY);
      expect(result.value).toBe(3200); // 2100 + 700 + 400
      expect(result.calculationMethod).toBe('TRAFFIC_FLOW_MULTI_MODAL_SUM');
      expect(result.explanation).toContain('distinct from local residential census');
      expect(result.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('uses road classification traffic benchmark when direct traffic survey is missing', () => {
      const result = ImpactModelRegistry.evaluateImpact(
        { category: 'Roads & Transport', title: 'Pothole stretch' },
        { roadClassification: 'ARTERIAL_ROAD' }
      );

      expect(result.value).toBe(3500);
      expect(result.calculationMethod).toBe('ROAD_CLASSIFICATION_BENCHMARK');
      expect(result.missingInformation).toContain('Actual vehicle counts and pedestrian volume not surveyed');
    });
  });

  describe('Healthcare Service Impact Model', () => {
    it('calculates monthly patient volume from daily outpatient footfall', () => {
      const result = ImpactModelRegistry.evaluateImpact(
        { category: 'Healthcare Access', title: 'PHC doctor missing' },
        { dailyPatientVisits: 65, emergencyServicesHalted: true, distanceToAlternativeKm: 14 }
      );

      expect(result.problemType).toBe(ProblemType.HEALTHCARE_SERVICE);
      expect(result.metricType).toBe(ImpactMetricType.PATIENTS_AFFECTED);
      expect(result.unit).toBe('PATIENTS_PER_MONTH');
      expect(result.value).toBe(1950); // 65 * 30
      expect(result.requiresHumanReview).toBe(true); // Due to emergency services halted
    });
  });

  describe('Education Service Impact Model', () => {
    it('calculates affected students for campus closure vs partial classroom damage', () => {
      const fullClosure = ImpactModelRegistry.evaluateImpact(
        { category: 'Education Infrastructure', title: 'Collapsed roof' },
        { enrolledStudents: 450, schoolClosureFull: true, boardExamBatch: true }
      );
      expect(fullClosure.value).toBe(450);
      expect(fullClosure.calculationMethod).toBe('TOTAL_ENROLLED_STUDENT_CENSUS');

      const partialClosure = ImpactModelRegistry.evaluateImpact(
        { category: 'Education Infrastructure', title: 'Two classrooms flooded' },
        { enrolledStudents: 400, schoolClosureFull: false, affectedClassrooms: 2, totalClassrooms: 8 }
      );
      expect(partialClosure.value).toBe(100); // 400 * (2 / 8)
      expect(partialClosure.calculationMethod).toBe('CLASSROOM_PROPORTION_STUDENT_PRODUCT');
    });
  });

  describe('Electricity Network Impact Model', () => {
    it('calculates households and commercial units deprived of power with critical facility flags', () => {
      const result = ImpactModelRegistry.evaluateImpact(
        { category: 'Energy & Power', title: 'Transformer burnt' },
        { connectedHouseholds: 220, commercialEstablishments: 15, criticalFacilitiesAffected: true, outageDurationHours: 96 }
      );

      expect(result.problemType).toBe(ProblemType.ELECTRICITY_NETWORK);
      expect(result.metricType).toBe(ImpactMetricType.HOUSEHOLDS_WITHOUT_POWER);
      expect(result.unit).toBe('HOUSEHOLDS');
      expect(result.value).toBe(235);
      expect(result.normalizedMagnitude).toBeGreaterThan(70);
    });
  });

  describe('Agriculture Dependency Impact Model', () => {
    it('calculates affected farms from direct census or landholding divisor', () => {
      const direct = ImpactModelRegistry.evaluateImpact(
        { category: 'Agriculture & Irrigation', title: 'Canal breached' },
        { affectedFarms: 140, standingCropRisk: true }
      );
      expect(direct.value).toBe(140);
      expect(direct.metricType).toBe(ImpactMetricType.AFFECTED_FARMS);

      const byHectares = ImpactModelRegistry.evaluateImpact(
        { category: 'Agriculture & Irrigation', title: 'Drying fields' },
        { affectedHectares: 110 }
      );
      expect(byHectares.value).toBe(100); // 110 / 1.1
    });
  });

  describe('Sanitation Service Impact Model', () => {
    it('calculates exposed residents and applies waterborne contamination risk escalation', () => {
      const result = ImpactModelRegistry.evaluateImpact(
        { category: 'Sanitation', title: 'Open drain overflow' },
        { servedHouseholds: 80, waterloggingContaminationRisk: true, nearSchoolOrHospital: true }
      );

      expect(result.problemType).toBe(ProblemType.SANITATION_SERVICE);
      expect(result.value).toBe(384); // 80 * 4.8
      expect(result.normalizedMagnitude).toBeGreaterThan(65);
    });
  });

  describe('Flood / Environmental Exposure Model', () => {
    it('calculates residents exposed within active inundation perimeter', () => {
      const result = ImpactModelRegistry.evaluateImpact(
        { category: 'Disaster Management', title: 'Severe monsoon flooding in ward' },
        { exposedResidents: 1800, floodDepthCm: 90, evacuationRequired: true }
      );

      expect(result.problemType).toBe(ProblemType.FLOOD_ENVIRONMENTAL);
      expect(result.metricType).toBe(ImpactMetricType.EXPOSED_POPULATION);
      expect(result.value).toBe(1800);
      expect(result.normalizedMagnitude).toBeGreaterThan(85);
    });
  });

  describe('Unknown / Unclassified Impact Model — Honest Zero-Fabrication', () => {
    it('does NOT invent fake numbers when problem type cannot be classified', () => {
      const result = ImpactModelRegistry.evaluateImpact(
        { category: 'Miscellaneous Civic Issues', title: 'Strange noise in public park at midnight' },
        {}
      );

      expect(result.problemType).toBe(ProblemType.UNKNOWN);
      expect(result.metricType).toBe(ImpactMetricType.UNKNOWN_METRIC);
      expect(result.value).toBe(0); // Zero fake data
      expect(result.confidence).toBeLessThan(0.25);
      expect(result.verificationStatus).toBe(ImpactVerificationStatus.UNKNOWN);
      expect(result.requiresHumanReview).toBe(true);
      expect(result.missingInformation.length).toBeGreaterThan(0);
      expect(result.suggestedQuestions.length).toBeGreaterThan(0);
    });
  });

  describe('Problem Type Keyword & Domain Detection', () => {
    it('accurately classifies domain categories into controlled problem types', () => {
      expect(ImpactModelRegistry.detectProblemType('Water Supply', 'Broken drinking tap')).toBe(ProblemType.WATER_SUPPLY);
      expect(ImpactModelRegistry.detectProblemType('Roads & Transport', 'Huge pothole on highway')).toBe(ProblemType.ROAD_USAGE);
      expect(ImpactModelRegistry.detectProblemType('Healthcare', 'PHC closed on weekdays')).toBe(ProblemType.HEALTHCARE_SERVICE);
      expect(ImpactModelRegistry.detectProblemType('Education', 'School wall damaged')).toBe(ProblemType.EDUCATION_SERVICE);
      expect(ImpactModelRegistry.detectProblemType('Electricity', 'Transformer burnt out')).toBe(ProblemType.ELECTRICITY_NETWORK);
      expect(ImpactModelRegistry.detectProblemType('Agriculture', 'Paddy canal dried up')).toBe(ProblemType.AGRICULTURE_DEPENDENCY);
      expect(ImpactModelRegistry.detectProblemType('Sanitation', 'Sewer line overflowing')).toBe(ProblemType.SANITATION_SERVICE);
      expect(ImpactModelRegistry.detectProblemType('Environment', 'Toxic industrial discharge in pond')).toBe(ProblemType.FLOOD_ENVIRONMENTAL);
    });
  });
});
