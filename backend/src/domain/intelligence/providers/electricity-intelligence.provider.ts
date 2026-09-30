import {
  IDomainIntelligenceProvider,
  DomainIntelligenceAnalysis,
  PossibleCauseDto,
  DomainEvidenceRequirement,
} from './domain-intelligence.interface';
import { ElectricityTopologyProvider } from '../topology/electricity-topology.provider';

export class ElectricityIntelligenceProvider implements IDomainIntelligenceProvider {
  public readonly domain = 'ELECTRICITY';
  private topologyProvider = new ElectricityTopologyProvider();

  public async analyze(challenge: any): Promise<DomainIntelligenceAnalysis> {
    const possibleCauses = await this.getPossibleCauses(challenge);
    const evidence = await this.getEvidence(challenge);
    const techData = await this.getTechnicalData(challenge);

    return {
      category: 'Public Lighting & Energy',
      domain: this.domain,
      civicSummary: 'A citizen-reported electrical distribution issue.',
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
        id: `cause-power-1-${challenge.id}`,
        title: 'Distribution transformer phase unbalance or localized overload',
        description: 'Excessive phase loading exceeding transformer thermal capacity, triggering protective cutoff.',
        category: 'Public Lighting & Energy',
        status: 'Requires field verification',
        score: 70,
        falsificationCriteria: 'Substation automated meter readings confirm balanced phase load below 80% rated capacity.',
        provenance: 'POWER_GRID_TAXONOMY',
      },
      {
        id: `cause-power-2-${challenge.id}`,
        title: 'Secondary distribution line fault or cable joint degradation',
        description: 'Aerial bunched cable or underground joint insulation breakdown leading to intermittent phase grounding.',
        category: 'Public Lighting & Energy',
        status: 'Requires field verification',
        score: 62,
        falsificationCriteria: 'Insulation megger test indicates resistance above 5 Megaohms.',
        provenance: 'DISCOM_FIELD_STANDARD',
      },
      {
        id: `cause-power-3-${challenge.id}`,
        title: 'Feeder circuit breaker trip or scheduled load management',
        description: 'Upstream 11kV substation breaker opened due to transient grid surge or scheduled maintenance.',
        category: 'Public Lighting & Energy',
        status: 'Requires field verification',
        score: 48,
        falsificationCriteria: 'Substation SCADA log confirms breaker remained closed with continuous feeder energization.',
        provenance: 'SCADA_SUBSTATION_LOG',
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
        title: 'Site / Equipment Photo',
        description: 'Photographic evidence of downed wire, dark street pole, or spark at transformer.',
        requiredFor: 'Safety dispatch triage',
      });
    }

    missing.push({
      id: `ev-miss-scada-${challenge.id}`,
      title: 'Substation SCADA Feeder Log',
      description: 'Automated 11kV/33kV breaker status and fault current log.',
      requiredFor: 'Distinguishing grid fault from localized household trip',
    });

    missing.push({
      id: `ev-miss-thermal-${challenge.id}`,
      title: 'Transformer Thermal & Physical Scan',
      description: 'Field inspection of transformer oil level and thermal imaging of bushings.',
      requiredFor: 'Equipment safety validation',
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
      category: 'PUBLIC_LIGHTING_ENERGY',
      district: challenge.district,
      state: challenge.state,
      isDemo: false,
    });

    return {
      topology,
      lcaExplanation: 'Shared upstream electrical substation or distribution transformer dependency analysis.',
      amchExplanation: 'Comparison of competing overload, joint fault, and breaker trip explanations.',
      sentinelExplanation: 'Additional current telemetry observation used to update electrical fault hypotheses.',
    };
  }
}
