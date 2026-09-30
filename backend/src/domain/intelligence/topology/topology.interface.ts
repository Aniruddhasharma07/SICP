import { TopologyDto } from '@sicp/shared';

export interface TopologyRequestParams {
  challengeId: string;
  category?: string;
  district?: string;
  state?: string;
  isDemo?: boolean;
}

export interface ITopologyProvider {
  readonly domain: string;
  getTopology(params: TopologyRequestParams): Promise<TopologyDto>;
}
