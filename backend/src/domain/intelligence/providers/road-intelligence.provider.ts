import {
  IDomainIntelligenceProvider,
  DomainIntelligenceAnalysis,
  PossibleCauseDto,
  DomainEvidenceRequirement,
} from './domain-intelligence.interface';
import { RoadTopologyProvider } from '../topology/road-topology.provider';

export class RoadIntelligenceProvider implements IDomainIntelligenceProvider {
  public readonly domain = 'ROADS_TRANSPORT';
  private topologyProvider = new RoadTopologyProvider();

  public async analyze(challenge: any): Promise<DomainIntelligenceAnalysis> {
    const possibleCauses = await this.getPossibleCauses(challenge);
    const evidence = await this.getEvidence(challenge);
    const techData = await this.getTechnicalData(challenge);

    return {
      category: 'Road & Transport',
      domain: this.domain,
      civicSummary: 'A citizen-reported road infrastructure issue.',
      severity: challenge.severity || 'MODERATE',
      possibleCauses,
      evidence,
      topology: techData.topology,
      technicalDetails: {
        lcaExplanation: techData.lcaExplanation,
        amchExplanation: techData.amchExplanation,
        sentinelExplanation: techData.sentinelExplanation,
      },
    };
  }

  public async getPossibleCauses(challenge: any): Promise<PossibleCauseDto[]> {
    return [
      {
        id: `cause-road-1-${challenge.id}`,
        title: 'Surface asphalt wear and weathering from traffic load',
        description: 'Repeated axle weight stress and bituminous binder oxidation leading to surface cracking or potholes.',
        category: 'Road & Transport',
        status: 'Requires field verification',
        score: 72,
        falsificationCriteria: 'Core drill sample demonstrates intact sub-base and nominal binder thickness.',
        provenance: 'PAVEMENT_ENGINEERING_TAXONOMY',
      },
      {
        id: `cause-road-2-${challenge.id}`,
        title: 'Sub-base waterlogging and inadequate stormwater runoff',
        description: 'Poor roadside drainage gradient causing moisture entrapment and subgrade bearing capacity loss.',
        category: 'Road & Transport',
        status: 'Requires field verification',
        score: 65,
        falsificationCriteria: 'Continuous rainfall drainage velocity test indicates zero standing water in road bed.',
        provenance: 'DRAINAGE_CORRELATION',
      },
      {
        id: `cause-road-3-${challenge.id}`,
        title: 'Subsurface utility trench settlement or construction cut subsidence',
        description: 'Uncompacted utility backfill settling under cyclic vehicle passage along corridor.',
        category: 'Road & Transport',
        status: 'Requires field verification',
        score: 54,
        falsificationCriteria: 'Municipal utility right-of-way registry confirms no utility cuts in this segment within 24 months.',
        provenance: 'MUNICIPAL_UTILITY_AUDIT',
      },
    ];
  }

  public async getEvidence(challenge: any): Promise<DomainEvidenceRequirement> {
    const available = [];
    const missing = [];

    // Citizen Narrative
    available.push({
      id: `ev-desc-${challenge.id}`,
      title: 'Citizen Narrative Statement',
      description: challenge.description || 'Description provided by community reporter.',
      source: 'OBSERVED' as const,
      diagnosticWeight: 0.75,
      observedAt: challenge.createdAt ? new Date(challenge.createdAt).toISOString() : new Date().toISOString(),
      sourceName: challenge.submitter?.email || 'Citizen Reporter',
    });

    // Photos / Media
    const attachments = challenge.evidence || [];
    if (attachments.length > 0) {
      for (const att of attachments) {
        available.push({
          id: att.id,
          title: att.originalName || 'Citizen Attached Photo',
          description: `Visual evidence submitted by community member (${att.mimeType || 'image'}).`,
          source: 'OBSERVED' as const,
          diagnosticWeight: 0.85,
          observedAt: att.createdAt ? new Date(att.createdAt).toISOString() : new Date().toISOString(),
          sourceName: 'Citizen Camera Upload',
        });
      }
    } else {
      missing.push({
        id: `ev-miss-photo-${challenge.id}`,
        title: 'Geo-tagged Site Photograph',
        description: 'Visual confirmation of surface condition, pothole depth, and surrounding drainage.',
        requiredFor: 'Prioritization and field crew material estimation',
      });
    }

    missing.push({
      id: `ev-miss-inspect-${challenge.id}`,
      title: 'Pavement Condition Index (PCI) Field Inspection',
      description: 'Physical inspection by municipal road maintenance engineer.',
      requiredFor: 'Statutory work order generation',
    });

    missing.push({
      id: `ev-miss-gis-${challenge.id}`,
      title: 'Road Asset Registry Cross-Reference',
      description: 'Verification of municipal road ownership (PWD vs NHAI vs Municipal Corporation).',
      requiredFor: 'Jurisdictional department dispatch',
    });

    return { available, missing };
  }

  public async getTechnicalData(challenge: any): Promise<{
    topology: any;
    lcaExplanation: string;
    amchExplanation: string;
    sentinelExplanation: string;
  }> {
    const topology = await this.topologyProvider.getTopology({
      challengeId: challenge.id,
      category: 'ROADS_TRANSPORT',
      district: challenge.district,
      state: challenge.state,
      isDemo: false,
    });

    return {
      topology,
      lcaExplanation: 'Shared upstream corridor dependency analysis across connected municipal transit segments.',
      amchExplanation: 'Comparison of competing structural versus environmental wear explanations.',
      sentinelExplanation: 'Additional field observation used to update pavement degradation hypotheses.',
    };
  }
}
