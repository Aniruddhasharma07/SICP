import { UserRole } from '../enums/roles.enum';
import {
  ChallengeStatus,
  OrganizationType,
  VerificationStatus,
  AIAnalysisStatus,
  PriorityLevel,
  SeverityLevel,
  RelationshipType,
  RelationshipStatus,
  ProjectStatus,
  ProposalStatus,
  MilestoneStatus,
  DeliverableStatus,
  PartnershipType,
  PartnershipStatus,
  TestStatus,
  PilotStatus,
  OutcomeType,
  MemoryOutcomeStatus,
  TeamRole,
  MatchStatus,
  ProblemType,
  ImpactMetricType,
  ImpactTimeBasis,
  ImpactVerificationStatus,
  InvitationStatus,
  FundingStatus,
  RiskSeverity,
  RiskProbability,
  RiskStatus,
  FacultyAvailabilityStatus,
  PrototypeStatus,
  TestCaseStatus,
  DeploymentStatus,
  OutcomeVerificationStatus,
  MetricProvenance,
  CitizenProblemStatus,
  SolutionMemoryStatus,
  ReusabilityClass,
  EvidenceLevel,
  EmbeddingStatus,
} from '../enums/status.enum';

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  role: UserRole;
  organizationId?: string | null;
  organization?: OrganizationDto | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationDto {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  status: string;
  verificationStatus: VerificationStatus;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeEvidenceDto {
  id: string;
  challengeId: string;
  fileKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  storageBucket: string;
  uploadedById: string;
  createdAt: string;
}

export interface AdaptiveQuestionDto {
  id: string;
  prompt: string;
  placeholder?: string;
  inputType: 'number' | 'text' | 'select' | 'boolean';
  unit?: string;
  options?: string[];
  helpText?: string;
}

export interface ImpactMetricDto {
  id?: string;
  challengeId?: string;
  problemType: ProblemType;
  metricType: ImpactMetricType;
  value: number;
  unit: string;
  timeBasis: ImpactTimeBasis;
  calculationMethod: string;
  inputs: Record<string, unknown>;
  confidence: number;
  evidenceBasis: string[];
  dataSources: string[];
  verificationStatus: ImpactVerificationStatus;
  verifiedValue?: number | null;
  verifiedById?: string | null;
  verifiedAt?: string | null;
  verificationNotes?: string | null;
  normalizedMagnitude: number;
  missingInformation: string[];
  suggestedQuestions: AdaptiveQuestionDto[];
  requiresHumanReview: boolean;
  explanation: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ChallengeDto {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: SeverityLevel;
  priority: PriorityLevel;
  priorityScore?: number;
  status: ChallengeStatus;
  submitterId: string;
  submitterOrgId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  district?: string | null;
  state?: string | null;
  affectedPopulation?: number | null;
  durationMonths?: number | null;
  isSystemic?: boolean;
  systemicSummary?: string | null;
  isCanonical?: boolean;
  canonicalClusterId?: string | null;
  supportVotesCount?: number;
  version: number;
  submitter?: { id: string; fullName: string; email?: string } | null;
  evidence?: ChallengeEvidenceDto[];
  impact?: ImpactMetricDto | null;
  projects?: { id: string; title: string; status: ProjectStatus }[];
  createdAt: string;
  updatedAt: string;
}

export interface ChallengeTimelineDto {
  id: string;
  challengeId: string;
  fromStatus: ChallengeStatus;
  toStatus: ChallengeStatus;
  actorId: string;
  actorRole: UserRole;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface CommunityVoteDto {
  id: string;
  challengeId: string;
  userId: string;
  createdAt: string;
}

export interface RelationshipFactorBreakdown {
  problemSimilarity: number;      // 0 to 100
  locationSimilarity: number;     // 0 to 100
  categoryCompatibility: number;  // 0 to 100
  infrastructureOverlap: number;  // 0 to 100
  rootCauseSimilarity: number;    // 0 to 100
  evidenceConsistency: number;    // 0 to 100
  temporalRelationship: number;   // 0 to 100
}

export interface ChallengeRelationshipDto {
  id: string;
  sourceChallengeId: string;
  targetChallengeId: string;
  sourceChallengeTitle?: string;
  targetChallengeTitle?: string;
  relationType: RelationshipType;
  status: RelationshipStatus;
  confidenceScore: number;
  reasoning: string;
  factorBreakdown?: RelationshipFactorBreakdown | null;
  distanceMeters?: number | null;
  aiExplanation?: string | null;
  sharedInfrastructure?: string | null;
  recommendedAction?: string | null;
  requiresHumanReview?: boolean;
  model?: string | null;
  modelVersion?: string | null;
  approvedById?: string | null;
  reviewedAt?: string | null;
  reversalReason?: string | null;
  reversedAt?: string | null;
  reversedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProblemClusterDto {
  id: string;
  canonicalId?: string | null;
  canonicalTitle?: string | null;
  title: string;
  rootCauseTitle: string;
  rootCauseSummary: string;
  category: string;
  district?: string | null;
  state?: string | null;
  clusterType: RelationshipType;
  confidenceScore: number;
  status: RelationshipStatus;
  memberCount: number;
  memberChallengeIds: string[];
  members?: Array<{
    challengeId: string;
    title: string;
    category: string;
    district?: string | null;
    state?: string | null;
    isCanonical: boolean;
    status: ChallengeStatus;
    submitterName?: string;
    createdAt: string;
  }>;
  createdById?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  reversalReason?: string | null;
  reversedAt?: string | null;
  reversedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProblemMergeDecisionDto {
  id: string;
  clusterId?: string | null;
  relationshipId?: string | null;
  action: 'MERGE' | 'KEEP_SEPARATE' | 'REQUEST_EXPERT_REVIEW' | 'REJECT' | 'DEFER' | 'UNMERGE';
  actorId: string;
  actorRole: UserRole;
  actorName?: string;
  reason: string;
  previousPriority?: number | null;
  newPriority?: number | null;
  priorityDeltaReason?: string | null;
  aiConfidence?: number | null;
  createdAt: string;
}

export interface ContextAwareCandidateDto {
  challengeId: string;
  title: string;
  category: string;
  district?: string | null;
  state?: string | null;
  distanceKm?: number | null;
  distanceMeters?: number | null;
  semanticSimilarity: number;
  overallScore: number;
  recommendedRelation: RelationshipType;
  relationshipClassification: 'DUPLICATE' | 'RELATED' | 'SYSTEMIC_CANDIDATE' | 'UNRELATED';
  reasoning: string;
  factorBreakdown?: RelationshipFactorBreakdown;
  sharedInfrastructure?: string | null;
  recommendedAction?: string;
  requiresHumanReview?: boolean;
}

export interface TopicInsightItemDto {
  challengeId: string;
  title: string;
  category: string;
  district?: string | null;
  state?: string | null;
}

export type LocationQuality = 'NONE' | 'ADMIN_ONLY' | 'COORDINATES' | 'PRECISE_COORDINATES';

export interface ReverseGeocodeResultDto {
  latitude: number;
  longitude: number;
  district?: string | null;
  state?: string | null;
  locality?: string | null;
  postcode?: string | null;
  formattedAddress?: string | null;
  resolved: boolean;
  message?: string;
}

export interface ContextAwareDuplicateCheckResultDto {
  locationProvided: boolean;
  locationQuality: LocationQuality;
  locationSummary?: {
    quality: LocationQuality;
    hasCoordinates: boolean;
    hasDistrict: boolean;
    hasState: boolean;
    district?: string | null;
    state?: string | null;
    village?: string | null;
    ward?: string | null;
    address?: string | null;
  };
  problemUnderstanding: {
    category: string;
    possibleCauses: string[];
    topicKeywords: string[];
  };
  topicInsights?: {
    notice: string;
    relatedTopicChallenges: TopicInsightItemDto[];
  };
  localIntelligence?: {
    duplicates: ContextAwareCandidateDto[];
    related: ContextAwareCandidateDto[];
    systemicCandidates: ContextAwareCandidateDto[];
    unrelatedCount: number;
  };
  candidates: ContextAwareCandidateDto[];
}

export interface OrganizationRatingDimensionDto {
  technicalCompetence: number; // 1-5
  timeliness: number;          // 1-5
  collaboration: number;       // 1-5
  outcomeQuality: number;      // 1-5
}

export interface OrganizationRatingRecordDto {
  id: string;
  ratingScore: number;
  dimensions: OrganizationRatingDimensionDto;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: string;
  reason: string;
  evidenceReferences?: string[];
  timestamp: string;
  relatedProjectIds: string[];
}

export interface OrganizationRatingSubmissionDto {
  ratingScore: number;
  dimensions: OrganizationRatingDimensionDto;
  reason: string;
  evidenceReferences?: string[];
  relatedProjectIds?: string[];
}


export interface ChallengeSLADto {
  id: string;
  challengeId: string;
  reviewDeadline: string;
  escalationStatus: 'NORMAL' | 'WARNING' | 'ESCALATED';
  escalatedAt?: string | null;
  assignedOfficerId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UniversityMatchDto {
  id: string;
  challengeId: string;
  universityOrgId: string;
  universityName?: string;
  matchScore: number;
  matchReasons: string[];
  status: MatchStatus;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TeamMemberDto {
  id: string;
  teamId: string;
  userId: string;
  userName?: string;
  userRole?: UserRole;
  roleInTeam: TeamRole;
  invitationStatus: InvitationStatus;
  invitedAt?: string | null;
  respondedAt?: string | null;
  declineReason?: string | null;
  joinedAt: string;
}

export interface MultidisciplinaryTeamDto {
  id: string;
  name: string;
  challengeId?: string | null;
  leadFacultyId: string;
  leadFacultyName?: string;
  members: TeamMemberDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectProposalDto {
  id: string;
  projectId: string;
  challengeId?: string | null;
  authorId?: string | null;
  authorName?: string;
  version: number;
  problemUnderstanding: string;
  rootCauseHypothesis: string;
  technicalApproach: string;
  budgetBreakdown?: Record<string, number> | null;
  expectedImpact: string;
  risksAndMitigations: string;
  sustainabilityPlan: string;
  status: ProposalStatus;
  reviewComments?: string | null;
  rejectionReason?: string | null;
  requiredChanges?: string[] | null;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviews?: ProposalReviewDto[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectDeliverableDto {
  id: string;
  milestoneId: string;
  projectId: string;
  title: string;
  fileKey: string;
  version: number;
  status: DeliverableStatus;
  comments?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMilestoneDto {
  id: string;
  projectId: string;
  title: string;
  description: string;
  orderNumber: number;
  deadline: string;
  budgetAllocated?: number | null;
  status: MilestoneStatus;
  blockedReason?: string | null;
  dependencyId?: string | null;
  progressPct?: number;
  deliverables?: ProjectDeliverableDto[];
  createdAt: string;
  updatedAt: string;
}

export interface IndustryPartnershipDto {
  id: string;
  projectId: string;
  partnerOrgId: string;
  partnerOrgName?: string;
  partnershipType: PartnershipType;
  fundingOffered?: number | null;
  equipmentOffered?: string | null;
  status: PartnershipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTestExecutionDto {
  id: string;
  projectId: string;
  testPlan: string;
  testCases: Array<{ id: string; description: string; expected: string; actual?: string; passed: boolean }>;
  resultsSummary: string;
  metrics?: Record<string, unknown> | null;
  status: TestStatus;
  iterationNumber: number;
  conductedById: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectPilotDto {
  id: string;
  projectId: string;
  location: string;
  district: string;
  state: string;
  targetBeneficiaries: number;
  startDate: string;
  endDate?: string | null;
  baselineMetrics: Record<string, unknown>;
  observedOutcome?: Record<string, unknown> | null;
  findings?: string | null;
  status: PilotStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CitizenVerificationDto {
  id: string;
  projectId: string;
  challengeId: string;
  citizenId: string;
  citizenName?: string;
  rating: number;
  comments: string;
  verifiedImprovement: boolean;
  unresolvedIssues?: string | null;
  isRecurrenceReported: boolean;
  createdAt: string;
}

export interface InnovationOutcomeDto {
  id: string;
  projectId: string;
  challengeId: string;
  outcomeType: OutcomeType;
  title: string;
  referenceIdentifier?: string | null;
  verifiedBeneficiaries: number;
  measurableImpactSummary: string;
  registeredAt: string;
}

export interface SolutionMemoryDto {
  id: string;
  projectId?: string | null;
  projectTitle?: string | null;
  challengeId?: string | null;
  challengeTitle?: string | null;
  title: string;
  summary: string;
  challengeCategory: string;
  problemType?: ProblemType | null;
  problemSummary: string;
  rootCause: string;
  rootCauseSummary?: string | null;
  technicalApproach: string;
  solutionSummary?: string | null;
  implementationSummary?: string | null;
  impactSummary?: string | null;
  lessonsLearned: string;
  whatWorked?: string | null;
  whatFailed?: string | null;
  futureWarnings?: string | null;
  limitations?: string | null;
  reusabilityScore?: number | null;
  reusabilityClass: ReusabilityClass;
  reusabilityExplanation?: string | null;
  evidenceLevel: EvidenceLevel;
  status: SolutionMemoryStatus;
  outcomeStatus: MemoryOutcomeStatus;
  canonicalText?: string | null;
  embeddingModel?: string | null;
  embeddingVersion?: string | null;
  embeddingStatus: EmbeddingStatus;
  embeddingGeneratedAt?: string | null;
  embeddingFailureReason?: string | null;
  reviewedById?: string | null;
  reviewerName?: string | null;
  lastReviewedAt?: string | null;
  reviewNotes?: string | null;
  failureContext?: string | null;
  constraints?: string | null;
  locationContext?: Record<string, unknown> | null;
  tags: string[];
  viewCount: number;
  reuseCount: number;
  applications?: SolutionMemoryApplicationDto[];
  effectivenessProfile?: EffectivenessProfileDto | null;
  implementationCount?: number;
  successCount?: number;
  partialCount?: number;
  failureCount?: number;
  inconclusiveCount?: number;
  guidanceVerdict?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SolutionMemoryApplicationDto {
  id: string;
  solutionMemoryId: string;
  projectId: string;
  projectTitle?: string | null;
  challengeId: string;
  challengeTitle?: string | null;
  outcomeStatus: MemoryOutcomeStatus;
  evidenceLevel: EvidenceLevel;
  observedImpact?: string | null;
  targetAchieved: boolean;
  successFactors: string[];
  failureFactors: string[];
  failureReason?: string | null;
  maintenanceIssues?: string | null;
  adoptionIssues?: string | null;
  unexpectedResults?: string | null;
  contextConditions?: Record<string, unknown> | null;
  verifiedById?: string | null;
  verifiedAt: string;
  createdAt: string;
}

export interface EffectivenessProfileDto {
  implementationCount: number;
  successCount: number;
  partialCount: number;
  failureCount: number;
  inconclusiveCount: number;
  successRate?: number | null;
  commonSuccessFactors: string[];
  commonFailureFactors: string[];
  failurePatterns: string[];
  applicableContexts: string[];
  knownLimitations: string[];
  overallEvidence: 'HIGHLY_EFFECTIVE' | 'EFFECTIVE' | 'MIXED' | 'INEFFECTIVE' | 'INCONCLUSIVE';
}

export interface RecordProjectOutcomeDto {
  outcomeStatus: MemoryOutcomeStatus;
  actualSolutionUsed?: string;
  implementationResult?: string;
  measurableImpact?: string;
  targetAchieved?: boolean;
  citizenVerificationNotes?: string;
  governmentVerificationNotes?: string;
  successFactors?: string[];
  failureFactors?: string[];
  failureReason?: string;
  lessonsLearned?: string;
  maintenanceIssues?: string;
  adoptionIssues?: string;
  unexpectedResults?: string;
  contextConditions?: {
    ruralUrban?: 'RURAL' | 'URBAN' | 'SEMI_URBAN';
    geology?: string;
    rainfall?: 'HIGH' | 'MODERATE' | 'LOW';
    maintenanceCapacity?: 'HIGH' | 'MODERATE' | 'LOW';
    populationScale?: number;
    infrastructureDomain?: string;
  };
  existingSolutionMemoryId?: string | null;
}

export interface CreateSolutionMemoryDto {
  projectId?: string | null;
  challengeId?: string | null;
  title: string;
  summary: string;
  challengeCategory: string;
  problemType?: ProblemType | null;
  problemSummary: string;
  rootCause: string;
  rootCauseSummary?: string | null;
  technicalApproach: string;
  solutionSummary?: string | null;
  implementationSummary?: string | null;
  impactSummary?: string | null;
  lessonsLearned: string;
  whatWorked?: string | null;
  whatFailed?: string | null;
  futureWarnings?: string | null;
  limitations?: string | null;
  reusabilityScore?: number;
  reusabilityClass?: ReusabilityClass;
  reusabilityExplanation?: string | null;
  evidenceLevel?: EvidenceLevel;
  outcomeStatus?: MemoryOutcomeStatus;
  failureContext?: string | null;
  constraints?: string | null;
  locationContext?: Record<string, unknown> | null;
  tags?: string[];
}

export interface ReviewSolutionMemoryDto {
  status: SolutionMemoryStatus;
  reviewNotes?: string | null;
  reusabilityClass?: ReusabilityClass;
  outcomeStatus?: MemoryOutcomeStatus;
  whatWorked?: string | null;
  whatFailed?: string | null;
  futureWarnings?: string | null;
  limitations?: string | null;
}

export interface SolutionRetrievalFilterDto {
  query?: string;
  category?: string;
  problemType?: ProblemType;
  district?: string;
  state?: string;
  outcomeStatus?: MemoryOutcomeStatus;
  reusabilityClass?: ReusabilityClass;
  evidenceLevel?: EvidenceLevel;
  status?: SolutionMemoryStatus;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface MatchFactorBreakdownDto {
  problemSimilarity: number;
  rootCauseAlignment: number;
  geographicContext: number;
  verifiedEvidence: number;
  implementationCompatibility: number;
  finalScore: number;
}

export interface HistoricalRecommendationDto {
  memoryId: string;
  title: string;
  challengeCategory: string;
  problemSummary: string;
  rootCause: string;
  technicalApproach: string;
  outcomeStatus: MemoryOutcomeStatus;
  evidenceLevel: EvidenceLevel;
  reusabilityClass: ReusabilityClass;
  reusabilityScore: number;
  relevanceScore: number;
  matchBreakdown: MatchFactorBreakdownDto;
  explanation: string;
  guidanceVerdict: 'RECOMMEND' | 'WARN' | 'CAUTION' | 'NO_MEMORY';
  guidanceLabel: string;
  historicalApplicationsCount?: number;
  successCount?: number;
  failureCount?: number;
  partialCount?: number;
  failurePattern?: string | null;
  effectiveForContext?: string[];
  lessEffectiveForContext?: string[];
  verifiedImpact?: string | null;
  lessonsLearned?: string | null;
  whatWorked?: string | null;
  whatFailed?: string | null;
  knownLimitations?: string | null;
  historicalWarning?: string | null;
  recommendedPrerequisites?: string[] | null;
  sourceProjectId?: string | null;
  sourceChallengeId?: string | null;
}

export interface SolutionComparisonDto {
  solutions: Array<{
    id: string;
    title: string;
    category: string;
    problemType?: string | null;
    problemSummary: string;
    rootCause: string;
    technicalApproach: string;
    outcomeStatus: MemoryOutcomeStatus;
    evidenceLevel: EvidenceLevel;
    reusabilityClass: ReusabilityClass;
    whatWorked?: string | null;
    whatFailed?: string | null;
    limitations?: string | null;
    futureWarnings?: string | null;
    beneficiaries?: number | null;
    sourceProjectTitle?: string | null;
  }>;
  comparisonDimensions: {
    problemAndRootCause: Record<string, string>;
    technologyAndApproach: Record<string, string>;
    outcomesAndImpact: Record<string, string>;
    limitationsAndFailureModes: Record<string, string>;
    reusabilityAndAdoption: Record<string, string>;
  };
}

export interface KnowledgeAnalyticsDto {
  totalMemories: number;
  publishedMemories: number;
  underReviewMemories: number;
  requiresReviewMemories: number;
  memoriesByDomain: Record<string, number>;
  memoriesByOutcome: {
    successful: number;
    partiallyEffective: number;
    failed: number;
    requiresReview: number;
    underEvaluation: number;
  };
  memoriesByReusability: Record<string, number>;
  evidenceLevelDistribution: Record<string, number>;
  topReusableInterventions: Array<{
    id: string;
    title: string;
    category: string;
    reusabilityClass: ReusabilityClass;
    reuseCount: number;
    viewCount: number;
  }>;
  commonFailureCauses: Array<{ cause: string; count: number }>;
  commonRootCauses: Array<{ cause: string; count: number }>;
}

export interface KnowledgeAssistantRequestDto {
  query: string;
  challengeId?: string;
  projectId?: string;
  contextCategory?: string;
}

export interface KnowledgeAssistantResponseDto {
  answer: string;
  citations: Array<{
    recordType: 'CHALLENGE' | 'PROJECT' | 'SOLUTION_MEMORY' | 'OUTCOME_VERIFICATION' | 'PILOT_METRIC';
    recordId: string;
    recordTitle: string;
    outcomeStatus?: string | null;
    relevanceContext: string;
    actionUrl: string;
  }>;
  historicalWarnings: string[];
  suggestedFollowUpQuestions: string[];
  evidenceQuality: 'HIGH_CONFIDENCE' | 'MEDIUM_CONFIDENCE' | 'LOW_CONFIDENCE' | 'INSUFFICIENT_EVIDENCE';
}

export interface RecurrenceSignalDto {
  isRecurrenceSignal: boolean;
  correlationScore: number; // 0.0 to 1.0
  correlationBreakdown: {
    spatialDistanceKm: number | null;
    semanticSimilarity: number;
    rootCauseAlignment: number;
    timeElapsedMonths: number | null;
    sharedCluster: boolean;
  };
  previousCase: {
    id: string;
    title: string;
    category: string;
    completedAt?: string | null;
    interventionApproach: string;
    outcomeStatus: MemoryOutcomeStatus | string;
    evidenceLevel: EvidenceLevel | string;
    whatWorked?: string | null;
    whatFailed?: string | null;
    futureWarnings?: string | null;
  };
  investigationStatus: 'UNDER_INVESTIGATION' | 'RESOLVED_AS_MAINTENANCE' | 'RESOLVED_AS_EXTERNAL_SHOCK' | 'CONFIRMED_DESIGN_FAILURE' | 'PENDING_OFFICER_REVIEW';
  evidenceStrength: 'STRONG' | 'MODERATE' | 'LIMITED';
  guidanceNote: string;
}

export interface InstitutionalLearningDto {
  organizationId: string;
  organizationName: string;
  organizationType: string;
  totalProjects: number;
  completedProjects: number;
  sampleSizeDisclosure: string;
  successfulOutcomes: number;
  partialOutcomes: number;
  failedOutcomes: number;
  domainExpertise: string[];
  reusableInnovationsCount: number;
  patentsCount: number;
  startupsCount: number;
  recentMemories: Array<{
    id: string;
    title: string;
    outcomeStatus: MemoryOutcomeStatus;
    reusabilityClass: ReusabilityClass;
    createdAt: string;
  }>;
}

export interface ProjectDto {
  id: string;
  challengeId: string;
  challengeTitle?: string;
  title: string;
  description: string;
  leadingOrgId: string;
  leadingOrgName?: string;
  teamId?: string | null;
  team?: MultidisciplinaryTeamDto | null;
  status: ProjectStatus;
  budget?: number | null;
  version: number;
  proposalId?: string | null;
  activatedAt?: string | null;
  proposals?: ProjectProposalDto[];
  milestones?: ProjectMilestoneDto[];
  partnerships?: IndustryPartnershipDto[];
  testExecutions?: ProjectTestExecutionDto[];
  pilots?: ProjectPilotDto[];
  citizenVerifications?: CitizenVerificationDto[];
  innovationOutcomes?: InnovationOutcomeDto[];
  risks?: ProjectRiskDto[];
  fundingRequests?: FundingRequestDto[];
  activationChecklist?: ProjectActivationChecklistDto;
  createdAt: string;
  updatedAt: string;
}

export interface AIAnalysisDto {
  id: string;
  challengeId: string;
  status: AIAnalysisStatus;
  rawResponse?: Record<string, unknown> | null;
  confidenceScore?: number | null;
  reasoningSummary?: string | null;
  requiresHumanReview: boolean;
  appliedRules?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface DetailedAIAnalysisDto extends AIAnalysisDto {
  normalizedStatement?: string;
  subcategory?: string;
  entities?: string[];
  durationEstimatedMonths?: number;
  severityBreakdown?: {
    risk: SeverityLevel;
    urgency: PriorityLevel;
    serviceDisruption: string;
    environmentalImpact: string;
    vulnerabilityScore: number;
  };
  priorityFactors?: {
    numericalScore: number;
    recommendedClass: PriorityLevel;
    weightsExplanation: string;
  };
  duplicateCandidates?: Array<{
    challengeId: string;
    title: string;
    similarityScore: number;
    reason: string;
  }>;
  rootCauseHypotheses?: string[];
  systemicClusterRecommendation?: {
    isSystemicCandidate: boolean;
    clusterReason?: string;
    scope: 'VILLAGE' | 'WARD' | 'DISTRICT' | 'INDEPENDENT';
  };
  problemType?: ProblemType;
  impactIntelligence?: ImpactMetricDto;
  missingInformation?: string[];
  suggestedQuestions?: AdaptiveQuestionDto[];
}

export interface AuditLogDto {
  id: string;
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  resource: string;
  resourceId: string;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  reason?: string | null;
  requestId: string;
  ipAddress?: string | null;
  createdAt: string;
}

export interface NotificationDto {
  id: string;
  recipientId: string;
  title: string;
  message: string;
  type: string;
  actionUrl?: string | null;
  isRead: boolean;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
}

export interface FacultyProfileDto {
  id: string;
  userId: string;
  fullName?: string;
  email?: string;
  department: string;
  designation: string;
  expertiseTags: string[];
  researchInterests: string[];
  publicationsCount: number;
  patentsCount: number;
  pastProjectsCount: number;
  availabilityStatus: FacultyAvailabilityStatus | string;
  maxSimultaneousProjects: number;
  activeProjectCount: number;
  bio?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface FacultyMatchScoreDto {
  facultyId: string;
  facultyName: string;
  department: string;
  designation: string;
  universityId: string;
  universityName?: string;
  overallScore: number;
  breakdown: {
    departmentScore: number;
    expertiseScore: number;
    trackRecordScore: number;
    workloadScore: number;
  };
  matchedTags: string[];
  explanation: string;
  availabilityStatus: FacultyAvailabilityStatus | string;
  activeProjectCount: number;
}

export interface IndustryPartnerProfileDto {
  id: string;
  organizationId: string;
  organizationName?: string;
  sector: string;
  capabilities: string[];
  technologies: string[];
  fundingCapacity?: number | null;
  csrFocusAreas: string[];
  supportedStages: string[];
  geographicCoverage: string[];
  activeProjectsCount: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface IndustryMatchScoreDto {
  partnerOrgId: string;
  partnerName: string;
  sector: string;
  overallScore: number;
  breakdown: {
    technologyFit: number;
    domainFit: number;
    resourceFit: number;
    fundingFit: number;
    deploymentCapability: number;
    geographicFit: number;
    experienceFit: number;
  };
  matchedCapabilities: string[];
  explanation: string;
}

export interface ProposalReviewDto {
  id: string;
  proposalId: string;
  reviewerId: string;
  reviewerName?: string;
  decision: ProposalStatus;
  comments: string;
  requiredChanges?: string[] | null;
  createdAt: string;
}

export interface FundingRequestDto {
  id: string;
  projectId: string;
  stage: string;
  totalAmount: number;
  approvedAmount?: number | null;
  fundingSource: string;
  partnerOrgId?: string | null;
  partnerOrgName?: string | null;
  status: FundingStatus;
  budgetBreakdown?: Record<string, number> | null;
  justification: string;
  decisionNotes?: string | null;
  reviewedById?: string | null;
  reviewedAt?: string | null;
  fundingGap?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectRiskDto {
  id: string;
  projectId: string;
  title: string;
  severity: RiskSeverity;
  probability: RiskProbability;
  impact: string;
  owner?: string | null;
  mitigation: string;
  status: RiskStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectActivationChecklistDto {
  isChallengeApproved: boolean;
  isUniversityAccepted: boolean;
  hasValidTeam: boolean;
  hasConfirmedLeadFaculty: boolean;
  isProposalApproved: boolean;
  canActivate: boolean;
  missingPrerequisites: string[];
}

// --------------------------------------------------------------------------
// PHASE 5: PROTOTYPE, TESTING, PILOT, DEPLOYMENT, OUTCOMES & RECURRENCE DTOS
// --------------------------------------------------------------------------

export interface PrototypeDto {
  id: string;
  projectId: string;
  version: number;
  title: string;
  description: string;
  prototypeType: string;
  technicalApproach: string;
  objectives: string[];
  components?: Record<string, unknown> | null;
  repositoryUrl?: string | null;
  documentationUrl?: string | null;
  createdById: string;
  createdByName?: string;
  status: PrototypeStatus;
  submittedAt?: string | null;
  reviewedAt?: string | null;
  reviewedById?: string | null;
  reviewDecision?: string | null;
  reviewComments?: string | null;
  requiredChanges?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrototypeDto {
  title: string;
  description: string;
  prototypeType?: string;
  technicalApproach: string;
  objectives: string[];
  components?: Record<string, unknown>;
  repositoryUrl?: string;
  documentationUrl?: string;
}

export interface ReviewPrototypeDto {
  decision: 'APPROVE' | 'REQUEST_REVISION' | 'REJECT';
  comments: string;
  requiredChanges?: string[];
}

export interface TestCaseDto {
  id: string;
  testExecutionId: string;
  title: string;
  description: string;
  expectedResult: string;
  actualResult?: string | null;
  status: TestCaseStatus;
  severity: RiskSeverity;
  evidence?: string | null;
  testerId?: string | null;
  testerName?: string | null;
  executedAt?: string | null;
  defectReference?: string | null;
  blockerReason?: string | null;
  blockerActor?: string | null;
  waiverJustification?: string | null;
  waivedById?: string | null;
  retestOfId?: string | null;
  comments?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TestExecutionDto {
  id: string;
  projectId: string;
  testPlan: string;
  testCases: unknown[];
  resultsSummary: string;
  metrics?: Record<string, unknown> | null;
  status: TestStatus;
  iterationNumber: number;
  conductedById: string;
  conductedByName?: string;
  testCasesList?: TestCaseDto[];
  passRate?: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTestCaseDto {
  title: string;
  description: string;
  expectedResult: string;
  severity?: RiskSeverity;
}

export interface ExecuteTestCaseDto {
  status: TestCaseStatus;
  actualResult?: string;
  evidence?: string;
  defectReference?: string;
  blockerReason?: string;
  blockerActor?: string;
  waiverJustification?: string;
  comments?: string;
}

export interface PilotMetricDto {
  id: string;
  pilotId: string;
  name: string;
  category: string;
  unit: string;
  baselineValue: number;
  targetValue: number;
  observedValue?: number | null;
  absoluteChange?: number | null;
  percentageChange?: number | null;
  targetAchievement?: number | null;
  method: string;
  source: string;
  provenance: MetricProvenance | string;
  isVerified: boolean;
  collectionDate?: string | null;
  notes?: string | null;
}

export interface PilotDto {
  id: string;
  projectId: string;
  location: string;
  district: string;
  state: string;
  targetBeneficiaries: number;
  startDate: string;
  endDate?: string | null;
  baselineMetrics: Record<string, unknown>;
  observedOutcome?: Record<string, unknown> | null;
  findings?: string | null;
  status: PilotStatus;
  metricsList?: PilotMetricDto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePilotDto {
  location: string;
  district: string;
  state: string;
  targetBeneficiaries: number;
  startDate: string;
  endDate?: string;
  baselineMetrics: Record<string, unknown>;
  findings?: string;
}

export interface RecordPilotMetricDto {
  name: string;
  category: string;
  unit: string;
  baselineValue: number;
  targetValue: number;
  observedValue: number;
  method: string;
  source: string;
  provenance?: MetricProvenance;
  notes?: string;
}

export interface DeploymentDto {
  id: string;
  projectId: string;
  title: string;
  location: string;
  district?: string | null;
  state?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  deploymentOrg: string;
  deploymentDate: string;
  scope: string;
  beneficiariesCount: number;
  infrastructure: string;
  responsibleTeam: string;
  implementationPartners?: string[] | null;
  status: DeploymentStatus;
  blockerReason?: string | null;
  blockerActor?: string | null;
  failureRootCause?: string | null;
  rollbackReason?: string | null;
  operationalNotes?: string | null;
  evidenceReferences?: string[] | null;
  deployedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DeploymentReadinessConditionDto {
  requirement: string;
  requirementType: 'REQUIRED' | 'OPTIONAL' | 'NOT_APPLICABLE';
  isMet: boolean;
  currentValue: string;
  expectedValue: string;
  blocking: boolean;
  responsibleActor: string;
  suggestedAction: string;
}

export interface DeploymentReadinessChecklistDto {
  canDeploy: boolean;
  conditions: DeploymentReadinessConditionDto[];
  blockingCount: number;
}

export interface CreateDeploymentDto {
  title: string;
  location: string;
  district?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  deploymentOrg: string;
  deploymentDate: string;
  scope: string;
  beneficiariesCount: number;
  infrastructure: string;
  responsibleTeam: string;
  implementationPartners?: string[];
  operationalNotes?: string;
}

export interface CitizenFeedbackDto {
  id: string;
  projectId: string;
  challengeId: string;
  citizenId: string;
  citizenName?: string;
  rating: number;
  comments: string;
  verifiedImprovement: boolean;
  problemStatus?: CitizenProblemStatus | string | null;
  effectivenessRating?: number | null;
  improvementRating?: number | null;
  unresolvedIssues?: string | null;
  introducedNewIssues?: string | null;
  isRecurrenceReported: boolean;
  evidenceFileKey?: string | null;
  createdAt: string;
}

export interface CreateCitizenFeedbackDto {
  rating: number;
  comments: string;
  verifiedImprovement: boolean;
  problemStatus: CitizenProblemStatus;
  effectivenessRating?: number;
  improvementRating?: number;
  unresolvedIssues?: string;
  introducedNewIssues?: string;
  isRecurrenceReported?: boolean;
  evidenceFileKey?: string;
}

export interface OutcomeVerificationDto {
  id: string;
  projectId: string;
  challengeId: string;
  reviewerId: string;
  reviewerName?: string;
  status: OutcomeVerificationStatus;
  baselineSummary: string;
  targetSummary: string;
  observedSummary: string;
  calculatedImpact?: Record<string, unknown> | null;
  citizenFeedbackSummary?: Record<string, unknown> | null;
  limitations?: string | null;
  followUpRequired: boolean;
  followUpAction?: string | null;
  notes?: string | null;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewOutcomeVerificationDto {
  status: OutcomeVerificationStatus;
  baselineSummary: string;
  targetSummary: string;
  observedSummary: string;
  calculatedImpact?: Record<string, unknown>;
  citizenFeedbackSummary?: Record<string, unknown>;
  limitations?: string;
  followUpRequired?: boolean;
  followUpAction?: string;
  notes?: string;
}

export interface InnovationOutcomeDto {
  id: string;
  projectId: string;
  challengeId: string;
  outcomeType: OutcomeType;
  title: string;
  description?: string | null;
  referenceIdentifier?: string | null;
  verifiedBeneficiaries: number;
  measurableImpactSummary: string;
  evidenceUrl?: string | null;
  responsibleOrg?: string | null;
  isVerified: boolean;
  verifiedById?: string | null;
  verifiedAt?: string | null;
  registeredAt: string;
}

export interface CreateInnovationOutcomeDto {
  outcomeType: OutcomeType;
  title: string;
  description?: string;
  referenceIdentifier?: string;
  verifiedBeneficiaries: number;
  measurableImpactSummary: string;
  evidenceUrl?: string;
  responsibleOrg?: string;
}

export interface RecurrenceDetectionResultDto {
  isRecurrence: boolean;
  confidenceScore: number;
  candidateChallengeId?: string;
  deployedProjectId?: string;
  classification: 'RECURRENCE' | 'PARTIAL_EFFECTIVENESS' | 'IMPLEMENTATION_FAILURE' | 'EXTERNAL_NEW_CAUSE' | 'INSUFFICIENT_EVIDENCE';
  reasoning: string;
  actionRequired: string;
}

export interface PrimaryProblemDto {
  domain: string;
  category: string;
  problemType: string;
  normalizedStatement: string;
  confidence: number;
}

export interface ProblemObservationDto {
  description: string;
  evidenceSource: 'TEXT' | 'AUDIO' | 'IMAGE' | 'VIDEO' | 'DOCUMENT';
  confidence: number;
}

export interface ContributingFactorDto {
  factor: string;
  evidence: string;
  confidence: number;
  status: 'AI_HYPOTHESIS' | 'SUPPORTED' | 'GOVERNMENT_VALIDATED' | 'REJECTED' | 'INSUFFICIENT_EVIDENCE';
}

export interface RootCauseHypothesisItemDto {
  cause: string;
  reasoning: string;
  supportingEvidence: string;
  confidence: number;
  validationStatus: 'AI_HYPOTHESIS' | 'SUPPORTED' | 'GOVERNMENT_VALIDATED' | 'REJECTED' | 'INSUFFICIENT_EVIDENCE';
}

export interface SeverityRecommendationDto {
  level: string;
  reasoning: string;
  confidence: number;
}

export interface ImpactAssessmentDto {
  affectedGroups: string[];
  affectedAssets: string[];
  geographicScope: 'LOCAL' | 'WARD' | 'DISTRICT' | 'REGIONAL';
  estimatedScale: number;
  basis: 'KNOWN' | 'ESTIMATED' | 'UNKNOWN';
  confidence: number;
  dataLimitations: string;
}

export interface EvidenceAssessmentDto {
  availableEvidence: string[];
  limitations: string;
  evidenceQuality: 'LOW' | 'MODERATE' | 'HIGH';
}

export interface FieldConfidenceBreakdownDto {
  categoryConfidence: number;
  problemTypeConfidence: number;
  severityConfidence: number;
  impactConfidence: number;
  rootCauseConfidence: number;
  duplicateConfidence: number;
  systemicConfidence: number;
}

export interface AiStructuredAnalysisDto {
  primaryProblem?: PrimaryProblemDto;
  observations?: ProblemObservationDto[];
  contributingFactors?: ContributingFactorDto[];
  rootCauseHypothesesItems?: RootCauseHypothesisItemDto[];
  severityRecommendation?: SeverityRecommendationDto;
  impactAssessment?: ImpactAssessmentDto;
  missingInformation?: string[];
  evidenceAssessment?: EvidenceAssessmentDto;
  fieldConfidences?: FieldConfidenceBreakdownDto;
  category: string;
  subcategory: string;
  problemUnderstanding: string;
  problemType: string;
  normalizedStatement: string;
  entities: string[];
  estimatedSeverity: string;
  preliminaryPriority: string;
  priorityScore: number;
  severityBreakdown: {
    riskLevel: string;
    urgencyLevel: string;
    serviceDisruption: string;
    environmentalImpact: string;
    vulnerabilityScore: number;
  };
  rootCauseHypotheses: string[];
  systemicIndicators: string[];
  duplicateKeywords: string[];
  confidenceScore: number;
  reasoningSummary: string;
  evidenceSummary?: Record<string, unknown>;
  modalitiesAnalyzed?: string[];
  impactEstimate?: Record<string, unknown>;
  requiresHumanReview: boolean;
  dataLimitations: string;
  appliedRules: string[];
  aiProvider: string;
}

