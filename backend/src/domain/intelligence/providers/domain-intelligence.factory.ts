import { IDomainIntelligenceProvider } from './domain-intelligence.interface';
import { DomainIntelligenceResolver } from './domain-intelligence-resolver';

export class DomainIntelligenceProviderFactory {
  public static getProvider(categoryOrText?: string | null): IDomainIntelligenceProvider {
    return DomainIntelligenceResolver.resolveProvider(categoryOrText);
  }
}

