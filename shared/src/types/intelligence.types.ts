import { EvidenceEpistemicClass } from '../enums/status.enum';
import { EvidenceItemDto } from './domain.types';

export type TopologyStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'CONTROLLED_DEMO';
export type CanonicalDomain = 'ROAD_TRANSPORT' | 'WATER_SUPPLY' | 'ELECTRICITY' | 'SANITATION' | 'GENERIC';

export interface TopologyNodeDto {
  id: string;
  code: string;
  name: string;
  type: string;
  latitude?: number | null;
  longitude?: number | null;
  zone?: string | null;
  capacity?: string | null;
  status: string;
  metadata?: Record<string, unknown> | null;
}

export interface TopologyEdgeDto {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  sourceNodeId?: string;
  targetNodeId?: string;
  edgeType: string;
  distanceMeters?: number | null;
  status: string;
  metadata?: Record<string, unknown> | null;
}

export interface TopologyDto {
  status: TopologyStatus;
  domain?: string;
  provenance: string;
  nodes: TopologyNodeDto[];
  edges: TopologyEdgeDto[];
  lcaNodeId?: string | null;
  lcaNodeName?: string | null;
  explanation?: string;
}

export interface MissingEvidenceDto {
  id: string;
  title: string;
  description: string;
  requiredFor: string;
}

export interface ChallengeIntelligenceDto {
  domain: CanonicalDomain | string;
  challenge: {
    id: string;
    title: string;
    description: string;
    category: string;
    subcategory?: string | null;
    district?: string | null;
    state?: string | null;
    status: string;
    severity: string;
    priority?: string;
    createdAt: string;
    updatedAt: string;
  };
  summary: {
    statement: string; // Level 1 Human Simple Statement
    category?: string;
    status: string;
    confidence: number;
    epistemicBadge: string;
    isSystemic: boolean;
  };
  understanding?: {
    severity: string;
    location: string;
    evidenceAvailable: boolean;
    hasPhoto: boolean;
    categoryDisplay: string;
  };
  relationships: {
    relatedCount: number;
    duplicateCount?: number;
    systemicPattern?: boolean;
    systemicPatternDetected: boolean;
    explanation: string; // Level 2 "Why" explanation
    spatialDistanceKm?: number | null;
    temporalWindowDays?: number | null;
    sharedCorridor?: string | null;
    items: Array<{
      id: string;
      title: string;
      category: string;
      type: 'DUPLICATE' | 'RELATED' | 'SYSTEMIC_PARENT' | 'SYSTEMIC_LEAF' | 'CORRIDOR_SHARED';
      similarityScore: number;
      district?: string | null;
      distanceKm?: number | null;
      timeRelation?: string;
      similarityReason?: string;
    }>;
  };
  evidence: {
    supporting: EvidenceItemDto[];
    contradicting: EvidenceItemDto[];
    unknown: EvidenceItemDto[];
    observed?: EvidenceItemDto[];
    computed?: EvidenceItemDto[];
    interpreted?: EvidenceItemDto[];
    validated?: EvidenceItemDto[];
    missing?: MissingEvidenceDto[];
  };
  hypotheses: Array<{
    id: string;
    title: string;
    description?: string;
    failureMode: string;
    score: number;
    status: string;
    provenance: string;
    falsificationCriteria?: string;
  }>;
  possibleCauses?: Array<{
    id: string;
    title: string;
    description?: string;
    failureMode?: string;
    category?: string;
    status: string;
    provenance?: string;
    falsificationCriteria?: string;
  }>;
  topology: TopologyDto;
  memory: {
    precedentCount: number;
    matches: Array<{
      id: string;
      title: string;
      domain: string;
      similarityScore: number;
      outcome: string;
      reusableComponents: string[];
    }>;
    explanation?: string;
  };
  governance: {
    validationRequired: boolean;
    validated: boolean;
    validatedByName?: string | null;
    validatedAt?: string | null;
    statutoryRoleRequired: string;
  };
  nextAction: {
    label: string;
    action: string;
    description: string;
    primary: boolean;
  };
  technicalAnalysis?: {
    lcaExplanation: string;
    amchExplanation: string;
    sentinelExplanation: string;
  };
}
