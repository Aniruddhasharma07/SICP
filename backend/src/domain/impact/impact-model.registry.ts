import { ProblemType, AdaptiveQuestionDto } from '@sicp/shared';
import { IImpactModel, ImpactEvaluationContext, ImpactEvaluationResult } from './impact.types';
import { WaterSupplyImpactModel } from './models/water-supply.model';
import { RoadUsageImpactModel } from './models/road-usage.model';
import { HealthcareServiceImpactModel } from './models/healthcare-service.model';
import { EducationServiceImpactModel } from './models/education-service.model';
import { ElectricityNetworkImpactModel } from './models/electricity-network.model';
import { AgricultureDependencyImpactModel } from './models/agriculture-dependency.model';
import { SanitationServiceImpactModel } from './models/sanitation-service.model';
import { FloodEnvironmentalImpactModel } from './models/flood-environmental.model';
import { UnknownImpactModel } from './models/unknown.model';

export class ImpactModelRegistry {
  private static readonly models: Map<ProblemType, IImpactModel> = new Map();

  static {
    this.register(new WaterSupplyImpactModel());
    this.register(new RoadUsageImpactModel());
    this.register(new HealthcareServiceImpactModel());
    this.register(new EducationServiceImpactModel());
    this.register(new ElectricityNetworkImpactModel());
    this.register(new AgricultureDependencyImpactModel());
    this.register(new SanitationServiceImpactModel());
    this.register(new FloodEnvironmentalImpactModel());
    this.register(new UnknownImpactModel());
  }

  public static register(model: IImpactModel): void {
    this.models.set(model.problemType, model);
  }

  public static getModel(problemType: ProblemType): IImpactModel {
    return this.models.get(problemType) || this.models.get(ProblemType.UNKNOWN)!;
  }

  /**
   * Intelligently classifies civic issue category and text into a controlled ProblemType
   */
  public static detectProblemType(
    category: string,
    title: string = '',
    description: string = ''
  ): ProblemType {
    const text = `${category} ${title} ${description}`.toLowerCase();

    // 1. Water Supply
    if (
      text.includes('water supply') ||
      text.includes('drinking water') ||
      text.includes('pipeline') ||
      text.includes('borewell') ||
      text.includes('handpump') ||
      text.includes('tap water') ||
      text.includes('water contamination')
    ) {
      return ProblemType.WATER_SUPPLY;
    }

    // 2. Road Usage (distinct from general settlement)
    if (
      text.includes('road') ||
      text.includes('transport') ||
      text.includes('bridge') ||
      text.includes('pothole') ||
      text.includes('highway') ||
      text.includes('traffic') ||
      text.includes('culvert')
    ) {
      return ProblemType.ROAD_USAGE;
    }

    // 3. Healthcare Service
    if (
      text.includes('health') ||
      text.includes('hospital') ||
      text.includes('phc') ||
      text.includes('clinic') ||
      text.includes('doctor') ||
      text.includes('medicine') ||
      text.includes('ambulance') ||
      text.includes('patient')
    ) {
      return ProblemType.HEALTHCARE_SERVICE;
    }

    // 4. Education Service
    if (
      text.includes('education') ||
      text.includes('school') ||
      text.includes('classroom') ||
      text.includes('teacher') ||
      text.includes('student') ||
      text.includes('anganwadi')
    ) {
      return ProblemType.EDUCATION_SERVICE;
    }

    // 5. Electricity Network
    if (
      text.includes('electric') ||
      text.includes('power') ||
      text.includes('transformer') ||
      text.includes('blackout') ||
      text.includes('voltage') ||
      text.includes('feeder line')
    ) {
      return ProblemType.ELECTRICITY_NETWORK;
    }

    // 6. Agriculture Dependency
    if (
      text.includes('agri') ||
      text.includes('farm') ||
      text.includes('irrigation') ||
      text.includes('crop') ||
      text.includes('paddy') ||
      text.includes('canal')
    ) {
      return ProblemType.AGRICULTURE_DEPENDENCY;
    }

    // 7. Sanitation Service
    if (
      text.includes('sanitation') ||
      text.includes('sewer') ||
      text.includes('drain') ||
      text.includes('garbage') ||
      text.includes('waste') ||
      text.includes('toilet')
    ) {
      return ProblemType.SANITATION_SERVICE;
    }

    // 8. Flood / Environmental Exposure
    if (
      text.includes('flood') ||
      text.includes('waterlog') ||
      text.includes('inundation') ||
      text.includes('pollution') ||
      text.includes('toxic') ||
      text.includes('smoke') ||
      text.includes('air quality')
    ) {
      return ProblemType.FLOOD_ENVIRONMENTAL;
    }

    return ProblemType.UNKNOWN;
  }

  /**
   * Evaluates problem-specific impact metric and normalized magnitude
   */
  public static evaluateImpact(
    context: ImpactEvaluationContext,
    inputs: Record<string, unknown> = {},
    forcedProblemType?: ProblemType
  ): ImpactEvaluationResult {
    const problemType = forcedProblemType || this.detectProblemType(context.category, context.title, context.description);
    const model = this.getModel(problemType);
    return model.evaluate(inputs, context);
  }

  /**
   * Retrieves targeted adaptive questions for a problem type
   */
  public static getAdaptiveQuestions(problemType: ProblemType): AdaptiveQuestionDto[] {
    const model = this.getModel(problemType);
    return model.getAdaptiveQuestions();
  }
}
