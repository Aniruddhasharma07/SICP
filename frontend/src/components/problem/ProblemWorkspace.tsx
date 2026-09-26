'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Layers,
  Network,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Info,
  GraduationCap,
  Building2,
  CheckCircle2,
} from 'lucide-react';
import {
  ChallengeDto,
  ChallengeStatus,
  ChallengeTimelineDto,
  ChallengeRelationshipDto,
  UserRole,
  CitizenFeedbackDto,
  HistoricalRecommendationDto,
  EvidenceEpistemicClass,
  InfrastructureGraphDto,
  RootCauseHypothesisDto,
  HypothesisStatus,
  SentinelProbeRequestDto,
  SentinelChoice,
} from '@sicp/shared';
import { ProblemHeader } from './ProblemHeader';
import { FourCoreQuestionsBanner } from './FourCoreQuestionsBanner';
import { SignalLayer } from './SignalLayer';
import { RelationshipLayer } from './RelationshipLayer';
import { InvestigationLayer } from './InvestigationLayer';
import { ValidationLayer } from './ValidationLayer';
import { MemoryLayer } from './MemoryLayer';
import { CollaborationLayer } from './CollaborationLayer';
import { OutcomeLayer } from './OutcomeLayer';
import { ContextualActionRail } from './ContextualActionRail';
import { CompareCaseDrawer } from '../intelligence/CompareCaseDrawer';
import { PrecedentDetailDrawer } from '../intelligence/PrecedentDetailDrawer';
import {
  UniversityMatchDto,
  IndustryMatchDto,
  collaborationService,
} from '../../services/collaborationService';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Modal } from '../ui/Modal';

export interface ExtendedChallenge extends ChallengeDto {
  timelines: ChallengeTimelineDto[];
  relationships?: ChallengeRelationshipDto[];
  supportVotesCount?: number;
  aiAnalysis?: any;
  projects?: { id: string; title: string; status: any }[];
  validatedByName?: string;
  validationReason?: string;
}

export interface ProblemWorkspaceProps {
  challenge: ExtendedChallenge;
  currentUser: any;
  hasVoted: boolean;
  voteCount: number;
  isVoting: boolean;
  onToggleVote: () => void;
  actionReason: string;
  onChangeActionReason: (val: string) => void;
  onExecuteTransition: (toStatus: ChallengeStatus, reasonReq?: boolean) => void;
  isSubmittingAction: boolean;
  feedbacks: CitizenFeedbackDto[];
  feedbackForm: any;
  onChangeFeedbackForm: (updater: (prev: any) => any) => void;
  onSubmitCitizenFeedback: (e: React.FormEvent) => Promise<void>;
  feedbackSubmitting: boolean;
  feedbackSuccess: boolean;
  historicalSolutions: HistoricalRecommendationDto[];
  historicalEvaluation: any | null;
  loadingHistorical: boolean;
  activeRecurrenceSignal: any | null;
  isTriggeringAi: boolean;
  onTriggerAi: () => void;
  aiNotice: { type: 'success' | 'warning' | 'error'; message: string } | null;
  onExecuteMerge: (secondId: string, title: string, reason: string) => Promise<void>;
  // Systemic & AMCH & Topology
  linkedGraph?: InfrastructureGraphDto | null;
  hypotheses?: RootCauseHypothesisDto[];
  selectedHypothesisId?: string;
  onSelectHypothesis?: (h: RootCauseHypothesisDto) => void;
  sentinelProbes?: SentinelProbeRequestDto[];
  onSendSentinelResponse?: (data: { choice: SentinelChoice; feedbackText?: string }) => Promise<void>;
  isLoadingSentinel?: boolean;
  branchDifferentialDeduction?: string | null;
  // Multi-Sector Collaboration Matching
  universityMatches?: UniversityMatchDto[];
  industryMatches?: IndustryMatchDto[];
  loadingCollaboration?: boolean;
}

export function ProblemWorkspace({
  challenge,
  currentUser,
  hasVoted,
  voteCount,
  isVoting,
  onToggleVote,
  actionReason,
  onChangeActionReason,
  onExecuteTransition,
  isSubmittingAction,
  feedbacks,
  feedbackForm,
  onChangeFeedbackForm,
  onSubmitCitizenFeedback,
  feedbackSubmitting,
  feedbackSuccess,
  historicalSolutions,
  historicalEvaluation,
  loadingHistorical,
  activeRecurrenceSignal,
  isTriggeringAi,
  onTriggerAi,
  aiNotice,
  onExecuteMerge,
  linkedGraph,
  hypotheses: propHypotheses,
  selectedHypothesisId,
  onSelectHypothesis,
  sentinelProbes = [],
  onSendSentinelResponse,
  isLoadingSentinel = false,
  branchDifferentialDeduction,
  universityMatches = [],
  industryMatches = [],
  loadingCollaboration = false,
}: ProblemWorkspaceProps) {
  const router = useRouter();

  // Drawers and Modals State
  const [compareDrawerOpen, setCompareDrawerOpen] = useState(false);
  const [comparingMemory, setComparingMemory] = useState<any | null>(null);

  // In-place Precedent Detail Drawer
  const [selectedMemoryDetail, setSelectedMemoryDetail] = useState<any | null>(null);
  const [precedentDrawerOpen, setPrecedentDrawerOpen] = useState(false);

  // In-place University Engagement Modal
  const [showUniModal, setShowUniModal] = useState(false);
  const [selectedUniMatch, setSelectedUniMatch] = useState<UniversityMatchDto | null>(null);
  const [uniInquiry, setUniInquiry] = useState('');
  const [uniSubmitting, setUniSubmitting] = useState(false);
  const [uniSuccess, setUniSuccess] = useState(false);

  // In-place Industry CSR Modal
  const [showIndModal, setShowIndModal] = useState(false);
  const [selectedIndMatch, setSelectedIndMatch] = useState<IndustryMatchDto | null>(null);
  const [indInquiry, setIndInquiry] = useState('');
  const [indSubmitting, setIndSubmitting] = useState(false);
  const [indSuccess, setIndSuccess] = useState(false);

  // Merge Modal State
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTitle, setMergeTitle] = useState('');
  const [mergeReason, setMergeReason] = useState('');
  const [mergeSecondId, setMergeSecondId] = useState('');
  const [isMerging, setIsMerging] = useState(false);

  // Escape key listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showUniModal) setShowUniModal(false);
        if (showIndModal) setShowIndModal(false);
        if (showMergeModal) setShowMergeModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showUniModal, showIndModal, showMergeModal]);

  // Heuer AMCH Hypotheses generation fallback
  const getConstructedHypotheses = (): RootCauseHypothesisDto[] => {
    const rawHypotheses: string[] = challenge.aiAnalysis?.rawResponse?.rootCauseHypotheses || [];

    if (rawHypotheses.length > 0) {
      return rawHypotheses.map((hypText, i) => {
        const isLeading = i === 0;
        return {
          id: `hyp-${challenge.id}-${i}`,
          incidentId: challenge.id,
          title: hypText.split(':')[0] || `Hypothesis ${i + 1}`,
          description: hypText,
          failureMode: challenge.category || 'Civic Infrastructure Failure',
          diagnosticSupportScore: isLeading ? 82 : 45 - i * 10,
          status: isLeading ? HypothesisStatus.LEADING_HYPOTHESIS : HypothesisStatus.UNDER_EVALUATION,
          supportingEvidence: [
            {
              id: `ev-sup-${i}`,
              title: 'Citizen Field Telemetry',
              description: challenge.description.slice(0, 120),
              epistemicClass: EvidenceEpistemicClass.OBSERVED,
              supportWeight: 0.8,
            } as any,
          ],
          contradictingEvidence: [],
          missingEvidence: [
            'Upstream pressure transducer log confirmation',
            'Subsurface soil saturation ground sample',
          ],
          falsificationCriteria:
            'Acoustic leak telemetry or high branch flow meter confirms downstream pipe integrity intact.',
          createdAt: challenge.createdAt,
          updatedAt: challenge.updatedAt,
        };
      });
    }

    return [
      {
        id: `hyp-default-1`,
        incidentId: challenge.id,
        title: 'H1: Upstream Distribution Pressure Drop & Structural Leakage',
        description: 'Physical breach or localized seal failure in feeder pipeline causing pressure loss.',
        failureMode: 'Hydraulic Rupture / Joint Failure',
        diagnosticSupportScore: 78,
        status: HypothesisStatus.LEADING_HYPOTHESIS,
        supportingEvidence: [
          {
            id: 'ev-1',
            title: 'Citizen Signal Clustering',
            description: 'Repeated reports of drop in water pressure and localized turbidity.',
            epistemicClass: EvidenceEpistemicClass.OBSERVED,
            supportWeight: 0.85,
          } as any,
        ],
        contradictingEvidence: [],
        missingEvidence: ['Subsurface acoustic correlator telemetry'],
        falsificationCriteria: 'Feeder main acoustic test shows nominal baseline acoustic response.',
        createdAt: challenge.createdAt,
        updatedAt: challenge.updatedAt,
      },
      {
        id: `hyp-default-2`,
        incidentId: challenge.id,
        title: 'H2: Downstream Junction Valve Stagnation & Backflow Contamination',
        description: 'Backpressure differential across downstream branch cross-connect during unpressurized hours.',
        failureMode: 'Cross-Contamination & Backsiphonage',
        diagnosticSupportScore: 52,
        status: HypothesisStatus.UNDER_EVALUATION,
        supportingEvidence: [
          {
            id: 'ev-2',
            title: 'Intermittent Supply Schedule',
            description: 'Unpressurized pipeline intervals facilitate negative pressure vacuum ingestion.',
            epistemicClass: EvidenceEpistemicClass.COMPUTED,
            supportWeight: 0.6,
          } as any,
        ],
        contradictingEvidence: [],
        missingEvidence: ['Non-return valve physical inspection log'],
        falsificationCriteria: 'Static pressure remains positive throughout 24-hour supply cycle.',
        createdAt: challenge.createdAt,
        updatedAt: challenge.updatedAt,
      },
      {
        id: `hyp-default-3`,
        incidentId: challenge.id,
        title: 'H3: Localized Cistern Sedimentation Resuspension',
        description: 'Turbidity caused by reservoir bottom scour during high pump draw-down rather than pipeline rupture.',
        failureMode: 'Reservoir Sediment Scour',
        diagnosticSupportScore: 28,
        status: HypothesisStatus.REFUTED,
        supportingEvidence: [],
        contradictingEvidence: [
          {
            id: 'ev-3',
            title: 'Widespread Multi-Point Telemetry',
            description: 'Incident observed across multiple independent neighborhood distribution taps.',
            epistemicClass: EvidenceEpistemicClass.OBSERVED,
            supportWeight: 0.9,
          } as any,
        ],
        missingEvidence: ['Reservoir turbidity sensor reading'],
        falsificationCriteria: 'Reservoir outlet water purity test returns within ISO 10500 standards.',
        createdAt: challenge.createdAt,
        updatedAt: challenge.updatedAt,
      },
    ];
  };

  const hypotheses = propHypotheses && propHypotheses.length > 0 ? propHypotheses : getConstructedHypotheses();

  // Smooth scroll handler to jump between layers
  const handleJumpToLayer = (layerId: string) => {
    const el = document.getElementById(layerId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Compare solution memory helper
  const handleCompareCase = (memoryId: string) => {
    const found = historicalSolutions.find(m => (m.memoryId || (m as any).id) === memoryId);
    if (found) {
      setComparingMemory(found);
      setCompareDrawerOpen(true);
    }
  };

  // In-place Precedent Detail Inspector handler
  const handleInspectPrecedent = (memory: any) => {
    setSelectedMemoryDetail(memory);
    setPrecedentDrawerOpen(true);
  };

  // In-place University Engagement opener
  const handleOpenUniversityModal = (match: UniversityMatchDto) => {
    setSelectedUniMatch(match);
    setUniInquiry(`Request for Research Proposal (RFP) regarding ${challenge.title}. Faculty expertise in ${match.matchedDepartments?.[0] || 'applied engineering'} requested for validation testing.`);
    setUniSuccess(false);
    setShowUniModal(true);
  };

  // In-place Industry CSR Modal opener
  const handleOpenIndustryModal = (match: IndustryMatchDto) => {
    setSelectedIndMatch(match);
    setIndInquiry(`Schedule VII Co-Funding Inquiry for ${challenge.title}. Target allocation under ${match.eligibleCsrPrograms?.[0] || 'municipal infrastructure'}.`);
    setIndSuccess(false);
    setShowIndModal(true);
  };

  const handleConfirmAssignUniversity = async () => {
    if (!selectedUniMatch) return;
    setUniSubmitting(true);
    const orgId = selectedUniMatch.universityOrgId || 'demo-uni-org';
    const res = await collaborationService.assignUniversity(challenge.id, orgId, uniInquiry);
    setUniSubmitting(false);
    if (res.success) {
      setUniSuccess(true);
      setTimeout(() => setShowUniModal(false), 1500);
    }
  };

  const handleConfirmPledgeIndustry = async () => {
    if (!selectedIndMatch) return;
    setIndSubmitting(true);
    const indId = selectedIndMatch.industryOrgId || 'demo-ind-org';
    const res = await collaborationService.assignIndustry(challenge.id, indId, indInquiry);
    setIndSubmitting(false);
    if (res.success) {
      setIndSuccess(true);
      setTimeout(() => setShowIndModal(false), 1500);
    }
  };

  const isGovOrAdmin =
    currentUser?.role === UserRole.GOVERNMENT_OFFICER ||
    currentUser?.role === UserRole.GOVERNMENT_DEPARTMENT ||
    currentUser?.role === UserRole.SYSTEM_ADMIN;

  const effectiveDeduction =
    branchDifferentialDeduction ||
    'Differential Check: Parallel branch Sector 3 reports uninterrupted normal supply, mathematically ruling out feeder pump station shutdown.';

  return (
    <div className="min-h-screen -m-4 md:-m-8 p-4 md:p-8 bg-slate-950 text-slate-100 selection:bg-blue-900 selection:text-white pb-28">
      {/* Top Utility Bar */}
      <div className="border-b border-slate-900 bg-slate-950/80 backdrop-blur sticky top-0 z-30 px-4 py-2.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Explorer</span>
            </button>
            <span className="text-slate-700">|</span>
            <span className="text-slate-400 font-mono">
              Problem ID: <span className="text-slate-200">{challenge.id.slice(0, 8)}...</span>
            </span>
          </div>

          <div className="flex items-center gap-2">
            {challenge.isSystemic && (
              <Badge className="bg-purple-950/80 text-purple-300 border border-purple-700 text-[10px] font-mono">
                <Layers className="w-3 h-3 mr-1 text-purple-400" /> Systemic Hub
              </Badge>
            )}
            <Badge className="bg-slate-900 text-slate-400 border border-slate-800 text-[10px] font-mono">
              v{challenge.version || 1}
            </Badge>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 pt-6 space-y-6">
        {/* Master Problem Header */}
        <ProblemHeader
          challenge={challenge}
          hasVoted={hasVoted}
          voteCount={voteCount}
          isVoting={isVoting}
          onToggleVote={onToggleVote}
          onOpenSystemicMerge={() => setShowMergeModal(true)}
          isGovOrAdmin={isGovOrAdmin}
          activeStageLabel={challenge.status.replace(/_/g, ' ')}
        />

        {/* 4 Core Questions Living Header Banner */}
        <FourCoreQuestionsBanner
          challenge={challenge}
          onJumpToLayer={handleJumpToLayer}
          branchDifferentialDeduction={effectiveDeduction}
        />

        {/* Master 2-Column Responsive Workspace Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: 7 Analytical Layers (8 Cols on Desktop) */}
          <div className="lg:col-span-8 space-y-8">
            {/* Layer 1: Citizen Signal & Syntactic Understanding */}
            <SignalLayer
              challenge={challenge}
              isTriggeringAi={isTriggeringAi}
              onTriggerAi={onTriggerAi}
              aiNotice={aiNotice}
              onContinueToRelationship={() => handleJumpToLayer('relationship-layer')}
            />

            {/* Layer 2: Connected Signals, 7-Factor Heuristic & Infrastructure Topology */}
            <RelationshipLayer
              challenge={challenge}
              linkedGraph={linkedGraph}
              onOpenSystemicMerge={() => setShowMergeModal(true)}
              isGovOrAdmin={isGovOrAdmin}
              onContinueToInvestigation={() => handleJumpToLayer('investigation-layer')}
            />

            {/* Layer 3: Competing Hypotheses (AMCH) & Sentinel Probing */}
            <InvestigationLayer
              hypotheses={hypotheses}
              selectedHypothesisId={selectedHypothesisId}
              onSelectHypothesis={onSelectHypothesis}
              sentinelProbes={sentinelProbes}
              onSendSentinelResponse={onSendSentinelResponse}
              isLoadingSentinel={isLoadingSentinel}
              branchDifferentialDeduction={effectiveDeduction}
              onContinueToValidation={() => handleJumpToLayer('validation-layer')}
            />

            {/* Layer 4: Human Governance & Section 25 Statutory Sign-Off */}
            <ValidationLayer
              challenge={challenge}
              currentUserRole={currentUser?.role}
              currentUserName={currentUser?.fullName}
              actionReason={actionReason}
              onChangeActionReason={onChangeActionReason}
              onExecuteTransition={onExecuteTransition}
              isSubmittingAction={isSubmittingAction}
              onContinueToMemory={() => handleJumpToLayer('memory-layer')}
            />

            {/* Layer 5: Institutional Solution Memory & Precedents */}
            <MemoryLayer
              challenge={challenge}
              historicalSolutions={historicalSolutions}
              historicalEvaluation={historicalEvaluation}
              loadingHistorical={loadingHistorical}
              activeRecurrenceSignal={activeRecurrenceSignal}
              onCompareCase={handleCompareCase}
              onInspectMemory={handleInspectPrecedent}
              onExploreCollaboration={() => handleJumpToLayer('collaboration-layer')}
            />

            {/* Layer 6: Multi-Sector Partnership & R&D Routing */}
            <CollaborationLayer
              challenge={challenge}
              currentUserRole={currentUser?.role}
              universityMatches={universityMatches}
              industryMatches={industryMatches}
              loadingCollaboration={loadingCollaboration}
              onEngageUniversity={handleOpenUniversityModal}
              onEngageIndustry={handleOpenIndustryModal}
              onContinueToIntervention={() => handleJumpToLayer('outcome-layer')}
            />

            {/* Layer 7: Field Intervention & Empirical Ground Truth Verification */}
            <OutcomeLayer
              challenge={challenge}
              feedbacks={feedbacks}
              feedbackForm={feedbackForm}
              onChangeFeedbackForm={onChangeFeedbackForm}
              onSubmitFeedback={onSubmitCitizenFeedback}
              feedbackSubmitting={feedbackSubmitting}
              feedbackSuccess={feedbackSuccess}
              currentUser={currentUser}
              onJumpToMemory={() => handleJumpToLayer('memory-layer')}
            />
          </div>

          {/* Right Column: Sticky Contextual Action Rail (4 Cols on Desktop) */}
          <div className="lg:col-span-4 sticky top-16">
            <ContextualActionRail
              challenge={challenge}
              currentUserRole={currentUser?.role}
              onJumpToLayer={handleJumpToLayer}
              hasVoted={hasVoted}
              voteCount={voteCount}
              isVoting={isVoting}
              onToggleVote={onToggleVote}
              onExecuteTransition={onExecuteTransition}
              isSubmittingAction={isSubmittingAction}
              actionReason={actionReason}
              onChangeActionReason={onChangeActionReason}
            />
          </div>
        </div>
      </main>

      {/* Side-by-Side Comparison Drawer for Solution Memory */}
      <CompareCaseDrawer
        isOpen={compareDrawerOpen}
        onClose={() => setCompareDrawerOpen(false)}
        currentCase={{
          id: challenge.id,
          title: challenge.title,
          description: challenge.description,
          category: challenge.category,
          district: challenge.district || undefined,
          state: challenge.state || undefined,
          rootCause: challenge.impact?.problemType || 'Under investigation',
          severity: challenge.severity,
        }}
        historicalCases={
          comparingMemory
            ? [
                {
                  id: comparingMemory.memoryId || comparingMemory.id || 'mem-1',
                  title: comparingMemory.title || 'Verified Precedent',
                  category: comparingMemory.challengeCategory || comparingMemory.category || 'Civic Infrastructure',
                  problemSummary: comparingMemory.problemSummary || comparingMemory.summary || '',
                  rootCause: comparingMemory.rootCause || 'Hydraulic surge damage',
                  technicalApproach: comparingMemory.technicalApproach || 'Acoustic survey & relief valve installation',
                  outcomeStatus: comparingMemory.outcomeStatus || 'SUCCESSFUL',
                  evidenceLevel: comparingMemory.evidenceLevel || 'FIELD_VERIFIED',
                  reusabilityClass: comparingMemory.reusabilityClass || 'HIGHLY_REUSABLE',
                  reusabilityScore: comparingMemory.reusabilityScore ?? 84,
                  whatWorked: comparingMemory.whatWorked || 'Mitigated transient pressure spikes by 78%.',
                  whatFailed: comparingMemory.whatFailed || null,
                  limitations: comparingMemory.historicalWarning || comparingMemory.limitations || null,
                  lessonsLearned: comparingMemory.lessonsLearned || null,
                  district: comparingMemory.district || null,
                },
              ]
            : []
        }
      />

      {/* IN-PLACE Precedent Detail Drawer (Zero-Navigation Solution Memory Inspection) */}
      <PrecedentDetailDrawer
        isOpen={precedentDrawerOpen}
        onClose={() => setPrecedentDrawerOpen(false)}
        memory={selectedMemoryDetail}
        currentProblemId={challenge.id}
        onCompareWithCurrent={handleCompareCase}
      />

      {/* IN-PLACE Academic Research Lab Engagement Modal */}
      {showUniModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-sicp-fade"
          role="dialog"
          aria-modal="true"
          aria-label="Engage Academic Research Lab"
          onClick={e => {
            if (e.target === e.currentTarget) setShowUniModal(false);
          }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-100 animate-sicp-scale-in">
            <div className="space-y-1 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-400" />
                <span>Engage Academic Research Lab</span>
              </h3>
              <p className="text-xs text-slate-400">
                Dispatch an engineering inquiry or pilot development directive directly to matched university faculty.
              </p>
            </div>

            {uniSuccess ? (
              <div className="p-4 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-emerald-200">Assignment Dispatched</h4>
                <p className="text-xs text-emerald-300">
                  Engineering inquiry successfully transmitted to {selectedUniMatch?.universityName || 'Academic Research Lab'}.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-300 text-sm">
                      {selectedUniMatch?.universityName || 'IIT Bombay Civil Systems & Environmental Lab'}
                    </span>
                    <Badge className="bg-blue-950 text-blue-300 border border-blue-800 text-[10px] font-mono">
                      {selectedUniMatch?.matchScore || 94}% Match
                    </Badge>
                  </div>
                  <span className="text-slate-400 block text-[11px]">
                    Department: {selectedUniMatch?.matchedDepartments?.[0] || 'Department of Civil & Environmental Engineering'}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300 block">Engineering Scope &amp; Directive</label>
                  <textarea
                    rows={4}
                    value={uniInquiry}
                    onChange={e => setUniInquiry(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-100 focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowUniModal(false)}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmAssignUniversity}
                    isLoading={uniSubmitting}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-8"
                  >
                    Confirm &amp; Dispatch RFP
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IN-PLACE Industry CSR Co-Funding Modal */}
      {showIndModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-sicp-fade"
          role="dialog"
          aria-modal="true"
          aria-label="Request Corporate CSR Co-Funding"
          onClick={e => {
            if (e.target === e.currentTarget) setShowIndModal(false);
          }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-100 animate-sicp-scale-in">
            <div className="space-y-1 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                <span>Request Corporate CSR Co-Funding</span>
              </h3>
              <p className="text-xs text-slate-400">
                Submit a Schedule VII compliant co-funding grant application for this civic infrastructure pilot.
              </p>
            </div>

            {indSuccess ? (
              <div className="p-4 bg-emerald-950/60 border border-emerald-700/60 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-emerald-200">Proposal Dispatched</h4>
                <p className="text-xs text-emerald-300">
                  CSR Co-funding request registered with {selectedIndMatch?.companyName || 'Corporate Partner'}.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-emerald-300 text-sm">
                      {selectedIndMatch?.companyName || 'Tata Sustainability & Water Infrastructure Foundation'}
                    </span>
                    <Badge className="bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-mono">
                      Schedule VII
                    </Badge>
                  </div>
                  <span className="text-slate-400 block text-[11px]">
                    Eligibility: {selectedIndMatch?.eligibleCsrPrograms?.[0] || 'Item (i): Drinking water & sanitation'}
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300 block">Grant Application Justification</label>
                  <textarea
                    rows={4}
                    value={indInquiry}
                    onChange={e => setIndInquiry(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-100 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowIndModal(false)}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-8"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmPledgeIndustry}
                    isLoading={indSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8"
                  >
                    Submit CSR Proposal
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Systemic Issue Grouping / Merge Modal */}
      {showMergeModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-sicp-fade"
          role="dialog"
          aria-modal="true"
          aria-label="Elevate to Systemic Civic Cluster"
          onClick={e => {
            if (e.target === e.currentTarget) setShowMergeModal(false);
          }}
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-100 animate-sicp-scale-in">
            <div className="space-y-1 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Layers className="w-5 h-5 text-purple-400" />
                <span>Elevate to Systemic Civic Cluster</span>
              </h3>
              <p className="text-xs text-slate-400">
                Consolidate this problem with a correlated upstream incident into an authoritative master systemic problem.
              </p>
            </div>

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300 block">Master Systemic Cluster Title</label>
                <input
                  type="text"
                  value={mergeTitle}
                  onChange={e => setMergeTitle(e.target.value)}
                  placeholder="e.g. Ward 4 Trunk Pipeline Cavitation & Supply Stagnation"
                  className="w-full h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs text-slate-100 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300 block">Correlated Second Challenge UUID</label>
                <input
                  type="text"
                  value={mergeSecondId}
                  onChange={e => setMergeSecondId(e.target.value)}
                  placeholder="e.g. 8800230c-4e2b-4cea-8a67-5e446f8166fb"
                  className="w-full h-9 rounded-lg border border-slate-700 bg-slate-950 px-3 text-xs font-mono text-slate-100 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300 block">Administrative Consolidation Justification</label>
                <textarea
                  rows={3}
                  value={mergeReason}
                  onChange={e => setMergeReason(e.target.value)}
                  placeholder="Acoustic pressure telemetry and municipal boundary mapping confirm identical feeder junction root-cause."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2 text-xs text-slate-100 focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowMergeModal(false)}
                className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-8"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  setIsMerging(true);
                  await onExecuteMerge(mergeSecondId, mergeTitle, mergeReason);
                  setIsMerging(false);
                  setShowMergeModal(false);
                }}
                isLoading={isMerging}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-8"
              >
                Confirm Systemic Elevation
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
