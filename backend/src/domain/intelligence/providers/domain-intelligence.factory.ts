import { IDomainIntelligenceProvider } from './domain-intelligence.interface';
import { RoadIntelligenceProvider } from './road-intelligence.provider';
import { WaterIntelligenceProvider } from './water-intelligence.provider';
import { ElectricityIntelligenceProvider } from './electricity-intelligence.provider';
import { GenericIntelligenceProvider } from './generic-intelligence.provider';

export class DomainIntelligenceProviderFactory {
  private static roadProvider = new RoadIntelligenceProvider();
  private static waterProvider = new WaterIntelligenceProvider();
  private static electricityProvider = new ElectricityIntelligenceProvider();
  private static genericProvider = new GenericIntelligenceProvider();

  public static getProvider(categoryOrText?: string | null): IDomainIntelligenceProvider {
    if (!categoryOrText) return this.genericProvider;

    const normalized = categoryOrText.toUpperCase().trim().replace(/[\s\-_]+/g, ' ');

    // 1. Electricity & Power (including street lighting)
    if (
      normalized.includes('TRANSFORMER') ||
      normalized.includes('ELECTRIC') ||
      normalized.includes('POWER') ||
      normalized.includes('LIGHT') ||
      normalized.includes('VOLTAGE') ||
      normalized.includes('WIRE') ||
      normalized.includes('SUBSTATION') ||
      normalized.includes('DISCOM')
    ) {
      return this.electricityProvider;
    }

    // 2. Water, Drainage & Sanitation
    if (
      normalized.includes('WATER') ||
      normalized.includes('DRINKING') ||
      normalized.includes('CONTAMINATION') ||
      normalized.includes('PIPELINE') ||
      normalized.includes('PIPE') ||
      normalized.includes('HYDRO') ||
      normalized.includes('DRAINAGE') ||
      normalized.includes('SEWER') ||
      normalized.includes('SANITATION') ||
      normalized.includes('SEWAGE') ||
      normalized.includes('CHLORINE')
    ) {
      return this.waterProvider;
    }

    // 3. Road & Transport keywords
    if (
      normalized.includes('ROAD') ||
      normalized.includes('TRANSPORT') ||
      normalized.includes('POTHOLE') ||
      normalized.includes('PAVEMENT') ||
      normalized.includes('HIGHWAY') ||
      normalized.includes('STREET') ||
      normalized.includes('TRAFFIC') ||
      normalized.includes('ASPHALT') ||
      normalized.includes('BRIDGE')
    ) {
      return this.roadProvider;
    }

    return this.genericProvider;
  }
}
