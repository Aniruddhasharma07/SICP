import { TopologyDto } from '@sicp/shared';
import { ITopologyProvider, TopologyRequestParams } from './topology.interface';
import { prisma } from '../../../database/prisma';

export class DrainageTopologyProvider implements ITopologyProvider {
  public readonly domain = 'DRAINAGE_ENVIRONMENT';

  public async getTopology(params: TopologyRequestParams): Promise<TopologyDto> {
    try {
      const dbNodes = await prisma.infrastructureNode.findMany({
        where: {
          category: { in: ['DRAINAGE', 'SANITATION', 'SEWER', 'STORMWATER'] },
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
          domain: 'DRAINAGE_ENVIRONMENT',
          provenance: dbNodes[0].provenance || 'MUNICIPAL_SCHEMATIC',
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
          explanation: 'Authoritative stormwater and drainage network schematics loaded.',
        };
      }
    } catch {
      // Fallback
    }

    return {
      status: 'UNAVAILABLE',
      domain: 'DRAINAGE_ENVIRONMENT',
      provenance: 'UNAVAILABLE - Stormwater network schematics not registered',
      nodes: [],
      edges: [],
      explanation: `Stormwater drainage network schematics are not registered for ${params.district || 'this urban local body'}. Elevation contours and runoff observations are evaluated.`,
    };
  }
}
