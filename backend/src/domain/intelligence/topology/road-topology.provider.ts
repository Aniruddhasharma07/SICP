import { TopologyDto } from '@sicp/shared';
import { ITopologyProvider, TopologyRequestParams } from './topology.interface';
import { prisma } from '../../../database/prisma';

export class RoadTopologyProvider implements ITopologyProvider {
  public readonly domain = 'ROADS_TRANSPORT';

  public async getTopology(params: TopologyRequestParams): Promise<TopologyDto> {
    try {
      const dbNodes = await prisma.infrastructureNode.findMany({
        where: {
          category: { in: ['ROAD', 'ROADS', 'TRANSPORT', 'ROADS_TRANSPORT'] },
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
          domain: 'ROADS_TRANSPORT',
          provenance: dbNodes[0].provenance || 'GIS_IMPORT',
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
          explanation: 'Authoritative road network corridor graph loaded from municipal GIS.',
        };
      }
    } catch {
      // Fallback
    }

    return {
      status: 'UNAVAILABLE',
      domain: 'ROADS_TRANSPORT',
      provenance: 'UNAVAILABLE - Road network corridor graph not registered',
      nodes: [],
      edges: [],
      explanation: `Road network topological corridor map is not registered for ${params.district || 'this jurisdiction'}. Spatial corridor proximity and traffic volumes are evaluated.`,
    };
  }
}
