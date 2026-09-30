import { TopologyDto } from '@sicp/shared';
import { ITopologyProvider, TopologyRequestParams } from './topology.interface';

export class GenericTopologyProvider implements ITopologyProvider {
  public readonly domain = 'GENERIC';

  public async getTopology(params: TopologyRequestParams): Promise<TopologyDto> {
    return {
      status: 'UNAVAILABLE',
      domain: params.category || 'CIVIC_INFRASTRUCTURE',
      provenance: 'UNAVAILABLE - Physical network topology not applicable or registered',
      nodes: [],
      edges: [],
      explanation: `Physical network graph is not registered for category '${params.category || 'General'}'. SICP analyzes this challenge using spatial clustering, temporal correlation, and symptom evidence.`,
    };
  }
}
