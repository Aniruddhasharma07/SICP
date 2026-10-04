import { TopologyDto } from '@sicp/shared';
import { ITopologyProvider, TopologyRequestParams } from './topology.interface';
import { SystemicIncidentService } from '../systemic-incident.service';
import { prisma } from '../../../database/prisma';

export class WaterTopologyProvider implements ITopologyProvider {
  public readonly domain = 'WATER';

  public async getTopology(params: TopologyRequestParams): Promise<TopologyDto> {
    const isBhopalDemo = params.isDemo === true;

    if (isBhopalDemo) {
      const demo = SystemicIncidentService.getControlledDemoScenario();
      return {
        status: 'CONTROLLED_DEMO',
        domain: 'WATER',
        provenance: 'CONTROLLED_DEMO - Bhopal PHED Kolar Water Supply Network',
        nodes: demo.graph.nodes.map((n) => ({
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
        edges: demo.graph.edges.map((e) => ({
          id: e.id,
          fromNodeId: e.sourceNodeId,
          toNodeId: e.targetNodeId,
          sourceNodeId: e.sourceNodeId,
          targetNodeId: e.targetNodeId,
          edgeType: e.edgeType,
          status: e.status,
        })),
        lcaNodeId: 'node-trunk-04',
        lcaNodeName: 'Trunk Distribution Feeder Main 4 (South Sector)',
        explanation: 'Trunk Feeder Line 4 is the lowest common ancestor supplying the affected wards in the controlled demo scenario.',
      };
    }

    // Attempt authoritative database lookup for real water network nodes
    try {
      const dbNodes = await prisma.infrastructureNode.findMany({
        where: {
          category: 'WATER',
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
          domain: 'WATER',
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
          explanation: 'Authoritative municipal water network topology loaded from GIS records.',
        };
      }
    } catch {
      // Database query failed or unmigrated; fall through to UNAVAILABLE
    }

    // Honest zero-fabrication: Never invent fake pipes or treatment plants
    return {
      status: 'UNAVAILABLE',
      domain: 'WATER',
      provenance: 'UNAVAILABLE - No authoritative municipal GIS schematic registered',
      nodes: [],
      edges: [],
      explanation: `No municipal water utility GIS schematic is registered for ${params.district || 'this jurisdiction'}. Spatial correlation and symptom profile are utilized instead.`,
    };
  }
}
