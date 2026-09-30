import {
  IDomainIntelligenceProvider,
  DomainIntelligenceAnalysis,
  PossibleCauseDto,
  DomainEvidenceRequirement,
} from './domain-intelligence.interface';
import { GenericTopologyProvider } from '../topology/generic-topology.provider';

export class GenericIntelligenceProvider implements IDomainIntelligenceProvider {
  public readonly domain = 'GENERIC';
  private topologyProvider = new GenericTopologyProvider();

  public async analyze(challenge: any): Promise<DomainIntelligenceAnalysis> {
    const possibleCauses = await this.getPossibleCauses(challenge);
    const evidence = await this.getEvidence(challenge);
    const techData = await this.getTechnicalData(challenge);

    return {
      category: challenge.category || 'General Civic Infrastructure',
      domain: this.domain,
      civicSummary: 'A citizen-reported civic issue.',
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
        id: `cause-gen-1-${challenge.id}`,
        title: 'Civic asset maintenance deficit',
        description: 'Scheduled preventive maintenance cycle interval exceeded, resulting in localized operational failure.',
        category: challenge.category || 'General Civic Infrastructure',
        status: 'Requires field verification',
        score: 65,
        falsificationCriteria: 'Department maintenance log verifies recent inspection and component replacement.',
        provenance: 'MUNICIPAL_MAINTENANCE_TAXONOMY',
      },
      {
        id: `cause-gen-2-${challenge.id}`,
        title: 'Physical wear from environmental exposure',
        description: 'Atmospheric or weather-related degradation of public municipal asset.',
        category: challenge.category || 'General Civic Infrastructure',
        status: 'Requires field verification',
        score: 55,
        falsificationCriteria: 'Material integrity assessment confirms compliance with nominal operating tolerance.',
        provenance: 'CIVIC_MONITORING',
      },
      {
        id: `cause-gen-3-${challenge.id}`,
        title: 'Localized service capacity overload',
        description: 'Citizen demand exceeding localized infrastructure sizing or scheduling.',
        category: challenge.category || 'General Civic Infrastructure',
        status: 'Requires field verification',
        score: 45,
        falsificationCriteria: 'Peak usage audit indicates demand within designed volumetric capacity.',
        provenance: 'CIVIC_MONITORING',
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
          title: att.originalName || 'Citizen Attached Media',
          description: `Visual evidence submitted by community member (${att.mimeType || 'attachment'}).`,
          source: 'OBSERVED' as const,
          diagnosticWeight: 0.85,
          observedAt: att.createdAt ? new Date(att.createdAt).toISOString() : new Date().toISOString(),
          sourceName: 'Citizen Upload',
        });
      }
    } else {
      missing.push({
        id: `ev-miss-photo-${challenge.id}`,
        title: 'Photographic Site Documentation',
        description: 'Photo of the civic issue from the ground.',
        requiredFor: 'Visual validation by reviewing officer',
      });
    }

    missing.push({
      id: `ev-miss-inspection-${challenge.id}`,
      title: 'On-Site Municipal Field Inspection',
      description: 'Physical inspection and verification by authorized municipal department.',
      requiredFor: 'Administrative validation',
    });

    missing.push({
      id: `ev-miss-statutory-${challenge.id}`,
      title: 'Statutory Officer Sign-Off',
      description: 'Review and sign-off by competent government officer.',
      requiredFor: 'Institutional problem transition',
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
      category: challenge.category || 'UNKNOWN',
      district: challenge.district,
      state: challenge.state,
      isDemo: false,
    });

    return {
      topology,
      lcaExplanation: 'Spatial adjacency and municipal service boundary analysis.',
      amchExplanation: 'Comparison of competing maintenance deficit versus environmental wear hypotheses.',
      sentinelExplanation: 'Field officer verification used to update civic problem hypotheses.',
    };
  }
}
