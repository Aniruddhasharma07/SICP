import { TopologyDto } from '@sicp/shared';
import { ITopologyProvider, TopologyRequestParams } from './topology.interface';
import { prisma } from '../../../database/prisma';

export class ElectricityTopologyProvider implements ITopologyProvider {
  public readonly domain = 'PUBLIC_LIGHTING_ENERGY';

  public async getTopology(params: TopologyRequestParams): Promise<TopologyDto> {
    try {
      const dbNodes = await prisma.infrastructureNode.findMany({
        where: {
          category: { in: ['ELECTRICITY', 'POWER', 'ENERGY', 'LIGHTING'] },
          ...(params.district ? { district: { contains: params.district, mode: 'insensitive' } } : {}),
        },
        take: 50,
      });

      if (dbNodes && dbNodes.length > 0) {
        const nodeIds = dbNodes.map((n) => n.id);
        const dbEdges = await prisma.infrastructureEdge.findMany({
          where: {
            OR: [
              { sourceNodeId: { in: nodeIds } },
              { targetNodeId: { in: nodeIds } },
            ],
          },
        });

        return {
          status: 'AVAILABLE',
          domain: 'PUBLIC_LIGHTING_ENERGY',
          provenance: dbNodes[0].provenance || 'UTILITY_MAP',
          nodes: dbNodes.map((n) => ({
            id: n.id,
            code: n.code,
            name: n.name,
            type: n.type,
            latitude: n.latitude,
            longitude: n.longitude,
            zone: n.serviceAreaName,
            capacity: n.capacity,
            status: n.operationalStatus,
          })),
          edges: dbEdges.map((e) => ({
            id: e.id,
            fromNodeId: e.sourceNodeId,
            toNodeId: e.targetNodeId,
            sourceNodeId: e.sourceNodeId,
            targetNodeId: e.targetNodeId,
            edgeType: e.edgeType,
            status: e.status,
          })),
          explanation: 'Authoritative electrical grid feeder schematics loaded.',
        };
      }
    } catch {
      // Fallback
    }

    return {
      status: 'UNAVAILABLE',
      domain: 'PUBLIC_LIGHTING_ENERGY',
      provenance: 'UNAVAILABLE - Electrical distribution feeder map not registered',
      nodes: [],
      edges: [],
      explanation: `Electrical distribution feeder map is not registered for ${params.district || 'this utility zone'}. Feeder phase analysis and outage clusters are evaluated.`,
    };
  }
}
