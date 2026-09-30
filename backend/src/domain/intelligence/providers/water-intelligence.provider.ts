import {
  IDomainIntelligenceProvider,
  DomainIntelligenceAnalysis,
  PossibleCauseDto,
  DomainEvidenceRequirement,
} from './domain-intelligence.interface';
import { WaterTopologyProvider } from '../topology/water-topology.provider';
import { SystemicIncidentService } from '../systemic-incident.service';

export class WaterIntelligenceProvider implements IDomainIntelligenceProvider {
  public readonly domain = 'WATER_SUPPLY';
  private topologyProvider = new WaterTopologyProvider();

  public async analyze(challenge: any): Promise<DomainIntelligenceAnalysis> {
    const isDemo =
      challenge.id === 'demo' ||
      challenge.id?.startsWith('SYS-2026-BHP') ||
      challenge.id === 'sys-incident-bhopal-001';

    const possibleCauses = await this.getPossibleCauses(challenge);
    const evidence = await this.getEvidence(challenge);
    const techData = await this.getTechnicalData(challenge);

    return {
      category: 'Water & Sanitation',
      domain: this.domain,
      civicSummary: isDemo
        ? 'Possible shared water supply infrastructure disruption across Wards 11, 12, and 13.'
        : 'A citizen-reported water supply issue.',
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
    const isDemo =
      challenge.id === 'demo' ||
      challenge.id?.startsWith('SYS-2026-BHP') ||
      challenge.id === 'sys-incident-bhopal-001';

    if (isDemo) {
      const demo = SystemicIncidentService.getControlledDemoScenario();
      return demo.hypotheses.map((h) => ({
        id: h.id,
        title: h.title,
        description: h.description,
        category: 'Water Supply',
        status: 'Requires field verification',
        score: h.diagnosticSupportScore,
        falsificationCriteria: h.falsificationCriteria,
        provenance: 'CONTROLLED_AMCH_EVALUATION',
      }));
    }

    return [
      {
        id: `cause-water-1-${challenge.id}`,
        title: 'Feeder line pressure loss or localized seal failure',
        description: 'Physical joint failure or pipe fissure in distribution line causing localized pressure drop.',
        category: 'Water Supply',
        status: 'Requires field verification',
        score: 75,
        falsificationCriteria: 'Acoustic leak test shows normal baseline acoustic response throughout sector.',
        provenance: 'HYDRAULIC_TAXONOMY',
      },
      {
        id: `cause-water-2-${challenge.id}`,
        title: 'Intermittent backpressure surge during supply cycle',
        description: 'Rapid valve operation creating water hammer pressure waves or terminal vacuum.',
        category: 'Water Supply',
        status: 'Requires field verification',
        score: 58,
        falsificationCriteria: 'SCADA high-frequency transducer log confirms absence of transient pressure spikes.',
        provenance: 'HYDRAULIC_TAXONOMY',
      },
      {
        id: `cause-water-3-${challenge.id}`,
        title: 'Distribution terminal sedimentation or valve stagnation',
        description: 'Sediment accumulation in dead-end distribution pipe following supply hiatus.',
        category: 'Water Supply',
        status: 'Requires field verification',
        score: 42,
        falsificationCriteria: 'Terminal hydrant flush reveals water clarity within permissible limits.',
        provenance: 'WATER_QUALITY_STANDARD',
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
        title: 'Water Clarity / Leak Site Photo',
        description: 'Visual photograph of tap water discoloration or surface water pooling.',
        requiredFor: 'Diagnostic classification',
      });
    }

    missing.push({
      id: `ev-miss-acoustic-${challenge.id}`,
      title: 'Acoustic Pipe Correlator Telemetry',
      description: 'Underground acoustic sensor reading to detect active pipe ruptures.',
      requiredFor: 'Pinpointing subterranean leaks without excavation',
    });

    missing.push({
      id: `ev-miss-purity-${challenge.id}`,
      title: 'Water Purity & Residual Chlorine Field Test',
      description: 'Potable water laboratory testing kit result from municipal health team.',
      requiredFor: 'Potability verification before supply resumption',
    });

    return { available, missing };
  }

  public async getTechnicalData(challenge: any): Promise<{
    topology: any;
    lcaExplanation: string;
    amchExplanation: string;
    sentinelExplanation: string;
  }> {
    const isDemo =
      challenge.id === 'demo' ||
      challenge.id?.startsWith('SYS-2026-BHP') ||
      challenge.id === 'sys-incident-bhopal-001';

    const topology = await this.topologyProvider.getTopology({
      challengeId: challenge.id,
      category: 'WATER',
      district: challenge.district,
      state: challenge.state,
      isDemo,
    });

    return {
      topology,
      lcaExplanation: 'Shared upstream dependency analysis (lowest common distribution manifold or treatment pump).',
      amchExplanation: 'Comparison of competing hydraulic rupture versus terminal stagnation explanations.',
      sentinelExplanation: 'Additional pressure telemetry observation used to update hydraulic hypotheses.',
    };
  }
}
