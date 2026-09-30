import { TopologyDto } from '@sicp/shared';

export interface PossibleCauseDto {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string; // e.g. 'Requires field verification'
  score?: number;
  falsificationCriteria?: string;
  provenance: string;
}

export interface EvidenceItemRecord {
  id: string;
  title: string;
  description: string;
  source: 'OBSERVED' | 'AI_INTERPRETED' | 'COMPUTED' | 'HUMAN_VALIDATED' | 'UNKNOWN';
  diagnosticWeight?: number;
  observedAt?: string;
  sourceName?: string;
}

export interface MissingEvidenceRecord {
  id: string;
  title: string;
  description: string;
  requiredFor: string;
}

export interface DomainEvidenceRequirement {
  available: EvidenceItemRecord[];
  missing: MissingEvidenceRecord[];
}

export interface DomainIntelligenceAnalysis {
  category: string;
  domain: string;
  civicSummary: string;
  severity: string;
  possibleCauses: PossibleCauseDto[];
  evidence: DomainEvidenceRequirement;
  topology: TopologyDto;
  technicalDetails: {
    lcaExplanation: string;
    amchExplanation: string;
    sentinelExplanation: string;
  };
}

export interface IDomainIntelligenceProvider {
  readonly domain: string;
  analyze(challenge: any): Promise<DomainIntelligenceAnalysis>;
  getPossibleCauses(challenge: any): Promise<PossibleCauseDto[]>;
  getEvidence(challenge: any): Promise<DomainEvidenceRequirement>;
  getTechnicalData(challenge: any): Promise<{
    topology: TopologyDto;
    lcaExplanation: string;
    amchExplanation: string;
    sentinelExplanation: string;
  }>;
}
