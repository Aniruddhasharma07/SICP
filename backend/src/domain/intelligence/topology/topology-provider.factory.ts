import { ITopologyProvider } from './topology.interface';
import { WaterTopologyProvider } from './water-topology.provider';
import { RoadTopologyProvider } from './road-topology.provider';
import { DrainageTopologyProvider } from './drainage-topology.provider';
import { ElectricityTopologyProvider } from './electricity-topology.provider';
import { GenericTopologyProvider } from './generic-topology.provider';

export class TopologyProviderFactory {
  private static providers: Map<string, ITopologyProvider> = new Map<string, ITopologyProvider>([
    ['WATER', new WaterTopologyProvider()],
    ['WATER_SUPPLY', new WaterTopologyProvider()],
    ['DRINKING_WATER', new WaterTopologyProvider()],
    ['ROADS_TRANSPORT', new RoadTopologyProvider()],
    ['ROAD', new RoadTopologyProvider()],
    ['TRANSPORT', new RoadTopologyProvider()],
    ['DRAINAGE_ENVIRONMENT', new DrainageTopologyProvider()],
    ['DRAINAGE', new DrainageTopologyProvider()],
    ['SANITATION', new DrainageTopologyProvider()],
    ['PUBLIC_LIGHTING_ENERGY', new ElectricityTopologyProvider()],
    ['ELECTRICITY', new ElectricityTopologyProvider()],
    ['POWER', new ElectricityTopologyProvider()],
  ]);

  private static genericProvider: ITopologyProvider = new GenericTopologyProvider();

  public static getProvider(domainOrCategory?: string | null): ITopologyProvider {
    if (!domainOrCategory) return this.genericProvider;
    const key = domainOrCategory.toUpperCase().trim().replace(/[\s&]+/g, '_');
    for (const [registeredKey, provider] of this.providers.entries()) {
      if (key.includes(registeredKey) || registeredKey.includes(key)) {
        return provider;
      }
    }
    return this.genericProvider;
  }
}
