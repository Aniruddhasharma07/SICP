import { logger } from '../../../utils/logger';
import { IDomainIntelligenceProvider } from './domain-intelligence.interface';
import { RoadIntelligenceProvider } from './road-intelligence.provider';
import { WaterIntelligenceProvider } from './water-intelligence.provider';
import { ElectricityIntelligenceProvider } from './electricity-intelligence.provider';
import { SanitationIntelligenceProvider } from './sanitation-intelligence.provider';
import { GenericIntelligenceProvider } from './generic-intelligence.provider';

export type DomainType =
  | 'ROAD_TRANSPORT'
  | 'WATER_SUPPLY'
  | 'ELECTRICITY'
  | 'SANITATION'
  | 'HEALTHCARE'
  | 'EDUCATION'
  | 'ENVIRONMENT'
  | 'AGRICULTURE'
  | 'GENERIC';

export class DomainIntelligenceResolver {
  private static roadProvider = new RoadIntelligenceProvider();
  private static waterProvider = new WaterIntelligenceProvider();
  private static electricityProvider = new ElectricityIntelligenceProvider();
  private static sanitationProvider = new SanitationIntelligenceProvider();
  private static genericProvider = new GenericIntelligenceProvider();

  /**
   * Converts all historical and future category strings into a canonical domain.
   * Tolerant to casing, spacing, and compound strings.
   */
  public static resolveDomain(categoryOrText?: string | null): DomainType {
    const raw = categoryOrText ?? '';
    const normalized = raw.toUpperCase().replace(/[^A-Z]/g, '_');

    // 1. Healthcare & Public Health keywords
    if (
      normalized.includes('HEALTH') ||
      normalized.includes('HOSPITAL') ||
      normalized.includes('CLINIC') ||
      normalized.includes('DOCTOR') ||
      normalized.includes('MEDICAL') ||
      normalized.includes('DISPENSARY') ||
      normalized.includes('PHC') ||
      normalized.includes('CHC') ||
      normalized.includes('AMBULANCE') ||
      normalized.includes('MEDICINE')
    ) {
      this.logResolution(raw, 'HEALTHCARE', 'RULE_MATCH');
      return 'HEALTHCARE';
    }

    // 2. Education & Schools keywords
    if (
      normalized.includes('SCHOOL') ||
      normalized.includes('EDUCATION') ||
      normalized.includes('COLLEGE') ||
      normalized.includes('TEACHER') ||
      normalized.includes('STUDENT') ||
      normalized.includes('CLASSROOM') ||
      normalized.includes('UNIVERSITY') ||
      normalized.includes('ANGANWADI')
    ) {
      this.logResolution(raw, 'EDUCATION', 'RULE_MATCH');
      return 'EDUCATION';
    }

    // 3. Road & Transport keywords
    if (
      normalized.includes('ROAD') ||
      normalized.includes('TRANSPORT') ||
      normalized.includes('HIGHWAY') ||
      normalized.includes('PAVEMENT') ||
      normalized.includes('POTHOLE') ||
      normalized.includes('ASPHALT') ||
      normalized.includes('BRIDGE')
    ) {
      this.logResolution(raw, 'ROAD_TRANSPORT', 'RULE_MATCH');
      return 'ROAD_TRANSPORT';
    }

    // 4. Water Supply keywords (Water, Jal, Pipe, Hydraulic, Drinking, Contamination, Chlorine)
    if (
      normalized.includes('WATER') ||
      normalized.includes('JAL') ||
      normalized.includes('PIPE') ||
      normalized.includes('PIPELINE') ||
      normalized.includes('HYDRAULIC') ||
      normalized.includes('HYDRO') ||
      normalized.includes('DRINKING') ||
      normalized.includes('CONTAMINATION') ||
      normalized.includes('CHLORINE')
    ) {
      this.logResolution(raw, 'WATER_SUPPLY', 'RULE_MATCH');
      return 'WATER_SUPPLY';
    }

    // 5. Electricity & Power keywords
    if (
      normalized.includes('POWER') ||
      normalized.includes('ELECTRIC') ||
      normalized.includes('GRID') ||
      normalized.includes('TRANSFORMER') ||
      normalized.includes('VOLTAGE') ||
      normalized.includes('WIRE') ||
      normalized.includes('LIGHT') ||
      normalized.includes('SUBSTATION') ||
      normalized.includes('DISCOM') ||
      normalized.includes('ENERGY')
    ) {
      this.logResolution(raw, 'ELECTRICITY', 'RULE_MATCH');
      return 'ELECTRICITY';
    }

    // 6. Drainage & Sanitation keywords
    if (
      normalized.includes('DRAIN') ||
      normalized.includes('SEWER') ||
      normalized.includes('SANITATION') ||
      normalized.includes('SEWAGE') ||
      normalized.includes('CULVERT') ||
      normalized.includes('TOILET') ||
      normalized.includes('WASHROOM')
    ) {
      this.logResolution(raw, 'SANITATION', 'RULE_MATCH');
      return 'SANITATION';
    }

    // 7. Environment & Flood keywords
    if (
      normalized.includes('FLOOD') ||
      normalized.includes('INUNDAT') ||
      normalized.includes('WATERLOG') ||
      normalized.includes('SUBMERG') ||
      normalized.includes('ENVIRONMENT') ||
      normalized.includes('WASTE') ||
      normalized.includes('GARBAGE') ||
      normalized.includes('POLLUTION')
    ) {
      this.logResolution(raw, 'ENVIRONMENT', 'RULE_MATCH');
      return 'ENVIRONMENT';
    }

    // 8. Agriculture keywords
    if (
      normalized.includes('AGRICULTUR') ||
      normalized.includes('FARM') ||
      normalized.includes('CROP') ||
      normalized.includes('IRRIGATION') ||
      normalized.includes('CANAL')
    ) {
      this.logResolution(raw, 'AGRICULTURE', 'RULE_MATCH');
      return 'AGRICULTURE';
    }

    this.logResolution(raw, 'GENERIC', 'FALLBACK');
    return 'GENERIC';
  }

  /**
   * Resolves the specialized investigation provider matching the canonical domain.
   */
  public static resolveProvider(categoryOrText?: string | null): IDomainIntelligenceProvider {
    const domain = this.resolveDomain(categoryOrText);

    switch (domain) {
      case 'ROAD_TRANSPORT':
        return this.roadProvider;
      case 'WATER_SUPPLY':
        return this.waterProvider;
      case 'ELECTRICITY':
        return this.electricityProvider;
      case 'SANITATION':
        return this.sanitationProvider;
      case 'HEALTHCARE':
      case 'EDUCATION':
      case 'ENVIRONMENT':
      case 'AGRICULTURE':
      case 'GENERIC':
      default:
        return this.genericProvider;
    }
  }

  /**
   * Structured logging for domain resolution observability.
   */
  private static logResolution(
    originalCategory: string,
    resolvedDomain: DomainType,
    confidence: 'RULE_MATCH' | 'FALLBACK'
  ) {
    logger.info(`Domain resolved for civic challenge: ${resolvedDomain}`, {
      operation: 'DOMAIN_RESOLUTION',
      originalCategory,
      resolvedDomain,
      confidence,
    });
  }
}
