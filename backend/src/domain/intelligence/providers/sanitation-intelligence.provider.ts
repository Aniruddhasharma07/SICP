import {
  IDomainIntelligenceProvider,
  DomainIntelligenceAnalysis,
  PossibleCauseDto,
  DomainEvidenceRequirement,
} from './domain-intelligence.interface';
import { DrainageTopologyProvider } from '../topology/drainage-topology.provider';

export class SanitationIntelligenceProvider implements IDomainIntelligenceProvider {
  public readonly domain = 'SANITATION';
  private topologyProvider = new DrainageTopologyProvider();

  public async analyze(challenge: any): Promise<DomainIntelligenceAnalysis> {
    const possibleCauses = await this.getPossibleCauses(challenge);
    const evidence = await this.getEvidence(challenge);
    const techData = await this.getTechnicalData(challenge);

    return {
      category: 'Drainage & Sanitation',
      domain: this.domain,
      civicSummary: 'A citizen-reported drainage and sanitation issue.',
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
        id: `cause-san-1-${challenge.id}`,
        title: 'Culvert or roadside drain siltation and solid waste accumulation',
        description: 'Silt and domestic solid waste obstructing gravitational runoff along roadside conduit.',
        category: 'Drainage & Sanitation',
        status: 'Requires field verification',
        score: 72,
        falsificationCriteria: 'Cross-sectional flow inspection confirms drain conduit capacity at >90% unobstructed.',
        provenance: 'MUNICIPAL_DRAINAGE_AUDIT',
      },
      {
        id: `cause-san-2-${challenge.id}`,
        title: 'Manhole blockage or sewer line surcharge backflow',
        description: 'Underground sewerage line surcharge pushing wastewater back into street catchpits.',
        category: 'Drainage & Sanitation',
        status: 'Requires field verification',
        score: 60,
        falsificationCriteria: 'Downstream trunk sewer inspection indicates normal gravity flow velocity.',
        provenance: 'SANITATION_SYSTEM_TAXONOMY',
      },
      {
        id: `cause-san-3-${challenge.id}`,
        title: 'Structural collapse of roadside drain masonry or cover slab',
        description: 'Broken culvert cover slab or wall fracture impeding storm water exit.',
        category: 'Drainage & Sanitation',
        status: 'Requires field verification',
        score: 48,
        falsificationCriteria: 'Civil structure inspection verifies intact masonry along municipal segment.',
        provenance: 'CIVIC_INFRASTRUCTURE_AUDIT',
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
        title: 'Drain / Overflow Site Photograph',
        description: 'Visual evidence of stagnant water, silt level, or collapsed cover slab.',
        requiredFor: 'De-silting machine dispatch triage',
      });
    }

    missing.push({
      id: `ev-miss-inspection-${challenge.id}`,
      title: 'Municipal Sanitation Field Inspection',
      description: 'Physical inspection and verification by ULB sanitation inspector.',
      requiredFor: 'De-silting or sewer jetting dispatch',
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
      category: 'DRAINAGE',
      district: challenge.district,
      state: challenge.state,
      isDemo: false,
    });

    return {
      topology,
      lcaExplanation: 'Catchment basin and gravitational outfall gradient analysis.',
      amchExplanation: 'Comparison of localized blockage versus trunk sewer surcharge hypotheses.',
      sentinelExplanation: 'Downstream outfall inspection used to update drainage capacity hypotheses.',
    };
  }
}
