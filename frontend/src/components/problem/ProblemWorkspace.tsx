'use client';

import React, { useState } from 'react';
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
import { SignalLayer } from './SignalLayer';
import { RelationshipLayer } from './RelationshipLayer';
import { InvestigationLayer } from './InvestigationLayer';
import { ValidationLayer } from './ValidationLayer';
import { MemoryLayer } from './MemoryLayer';
import { CollaborationLayer } from './CollaborationLayer';
import { OutcomeLayer } from './OutcomeLayer';
import { ContextualActionRail } from './ContextualActionRail';
import { CompareCaseDrawer } from '../intelligence/CompareCaseDrawer';
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

interface ProblemWorkspaceProps {
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
}: ProblemWorkspaceProps) {
  const router = useRouter();

  // Drawers and Modals
  const [compareDrawerOpen, setCompareDrawerOpen] = useState(false);
  const [comparingMemory, setComparingMemory] = useState<any | null>(null);
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTitle, setMergeTitle] = useState('');
  const [mergeReason, setMergeReason] = useState('');
  const [mergeSecondId, setMergeSecondId] = useState('');
  const [isMerging, setIsMerging] = useState(false);

  // Heuer AMCH Hypotheses generation from AI Analysis
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

    // Default AMCH competing hypotheses based on problem domain
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

  const hypotheses = getConstructedHypotheses();

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

  const isGovOrAdmin =
    currentUser?.role === UserRole.GOVERNMENT_OFFICER ||
    currentUser?.role === UserRole.GOVERNMENT_DEPARTMENT ||
    currentUser?.role === UserRole.SYSTEM_ADMIN;

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
            />

            {/* Layer 2: Connected Signals, 7-Factor Heuristic & Infrastructure Topology */}
            <RelationshipLayer
              challenge={challenge}
              onOpenSystemicMerge={() => setShowMergeModal(true)}
              isGovOrAdmin={isGovOrAdmin}
            />

            {/* Layer 3: Competing Hypotheses (AMCH) & Sentinel Probing */}
            <InvestigationLayer
              hypotheses={hypotheses}
              branchDifferentialDeduction="Differential Check: Parallel branch Sector 3 reports uninterrupted normal supply, mathematically ruling out feeder pump station shutdown."
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
              onExploreCollaboration={() => handleJumpToLayer('collaboration-layer')}
            />

            {/* Layer 6: Multi-Sector Partnership & R&D Routing */}
            <CollaborationLayer
              challenge={challenge}
              currentUserRole={currentUser?.role}
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
        historicalCases={comparingMemory ? [comparingMemory] : []}
      />

      {/* Systemic Issue Grouping / Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-sicp-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl text-slate-100">
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
