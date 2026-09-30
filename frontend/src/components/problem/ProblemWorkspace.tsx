'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ThumbsUp,
  MessageSquare,
  Clock,
  Layers,
  GraduationCap,
  Building2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import {
  ChallengeDto,
  ChallengeStatus,
  ChallengeTimelineDto,
  ChallengeRelationshipDto,
  UserRole,
  CitizenFeedbackDto,
  HistoricalRecommendationDto,
  InfrastructureGraphDto,
  RootCauseHypothesisDto,
  SentinelProbeRequestDto,
  SentinelChoice,
  ChallengeIntelligenceDto,
} from '@sicp/shared';
import { ProblemOverview } from './ProblemOverview';
import { NextActionPanel } from './NextActionPanel';
import { RelationshipPanel } from './RelationshipPanel';
import { EvidencePanel } from './EvidencePanel';
import { PossibleCauses } from './PossibleCauses';
import { SolutionMemoryPanel } from './SolutionMemoryPanel';
import { TechnicalInvestigationDrawer } from './TechnicalInvestigationDrawer';
import { PrecedentDetailDrawer } from '../intelligence/PrecedentDetailDrawer';
import {
  UniversityMatchDto,
  IndustryMatchDto,
  collaborationService,
} from '../../services/collaborationService';
import { ChallengeIntelligenceClient } from '../../services/challengeIntelligenceService';
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
  intelligence?: ChallengeIntelligenceDto | null;
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
  intelligence,
}: ProblemWorkspaceProps) {
  const router = useRouter();

  // Technical Investigation Drawer State
  const [showTechDrawer, setShowTechDrawer] = useState(false);

  // In-place Precedent Detail Drawer
  const [selectedMemoryDetail, setSelectedMemoryDetail] = useState<any | null>(null);
  const [precedentDrawerOpen, setPrecedentDrawerOpen] = useState(false);

  // Statutory Validation State
  const [isValidating, setIsValidating] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(false);

  // Feedback Modal
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);

  // University Engagement Modal
  const [showUniModal, setShowUniModal] = useState(false);
  const [selectedUniMatch, setSelectedUniMatch] = useState<UniversityMatchDto | null>(null);
  const [uniInquiry, setUniInquiry] = useState('');
  const [uniSubmitting, setUniSubmitting] = useState(false);
  const [uniSuccess, setUniSuccess] = useState(false);

  // Industry CSR Modal
  const [showIndModal, setShowIndModal] = useState(false);
  const [selectedIndMatch, setSelectedIndMatch] = useState<IndustryMatchDto | null>(null);
  const [indInquiry, setIndInquiry] = useState('');
  const [indSubmitting, setIndSubmitting] = useState(false);
  const [indSuccess, setIndSuccess] = useState(false);

  // Escape key listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTechDrawer) setShowTechDrawer(false);
        if (showUniModal) setShowUniModal(false);
        if (showIndModal) setShowIndModal(false);
        if (showFeedbackModal) setShowFeedbackModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTechDrawer, showUniModal, showIndModal, showFeedbackModal]);

  const handleValidateInvestigation = async () => {
    setIsValidating(true);
    try {
      const res = await ChallengeIntelligenceClient.validateInvestigation(
        challenge.id,
        'Statutory verification approved following engineering review.'
      );
      if (res.success) {
        setValidationSuccess(true);
        setTimeout(() => {
          router.refresh();
        }, 1200);
      }
    } finally {
      setIsValidating(false);
    }
  };

  const handleInspectPrecedent = (memory: any) => {
    setSelectedMemoryDetail(memory);
    setPrecedentDrawerOpen(true);
  };

  const handleOpenUniversityModal = (match: UniversityMatchDto) => {
    setSelectedUniMatch(match);
    setUniInquiry(
      `Request for Research Proposal (RFP) regarding ${challenge.title}. Faculty expertise in ${
        match.matchedDepartments?.[0] || 'applied engineering'
      } requested for validation testing.`
    );
    setUniSuccess(false);
    setShowUniModal(true);
  };

  const handleOpenIndustryModal = (match: IndustryMatchDto) => {
    setSelectedIndMatch(match);
    setIndInquiry(
      `Schedule VII Co-Funding Inquiry for ${challenge.title}. Target allocation under ${
        match.eligibleCsrPrograms?.[0] || 'municipal infrastructure'
      }.`
    );
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

  return (
    <div className="min-h-screen -m-4 md:-m-8 p-4 md:p-8 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors pb-24">
      {/* Top Utility Breadcrumbs */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-3 mb-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/challenges"
              className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Problems</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">•</span>
            <span className="text-slate-500 font-mono">
              ID: {challenge.id.slice(0, 8)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleVote}
              disabled={isVoting}
              className={`text-xs h-7 px-2.5 ${
                hasVoted
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50 dark:bg-blue-950/30'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              <ThumbsUp className={`w-3.5 h-3.5 mr-1 ${hasVoted ? 'fill-blue-600' : ''}`} />
              Support ({voteCount})
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content: Clean, Understandable in 5 Seconds */}
      <main className="max-w-6xl mx-auto space-y-6">
        {/* SECTION 1: PROBLEM OVERVIEW */}
        <ProblemOverview challenge={challenge} intelligence={intelligence} />

        {/* SECTION 2: WHAT HAPPENS NEXT */}
        <NextActionPanel
          challenge={challenge}
          intelligence={intelligence}
          currentUser={currentUser}
          onOpenTechnicalDrawer={() => setShowTechDrawer(true)}
          onOpenAddEvidence={() => setShowFeedbackModal(true)}
          onValidateInvestigation={handleValidateInvestigation}
          isValidating={isValidating}
        />

        {/* 2-Column Structured Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Column: Core Investigative Findings */}
          <div className="lg:col-span-8 space-y-6">
            {/* SECTION 3: RELATED SIGNALS (Related Reports) */}
            <RelationshipPanel challenge={challenge} intelligence={intelligence} />

            {/* SECTION 4: AVAILABLE EVIDENCE */}
            <EvidencePanel challenge={challenge} intelligence={intelligence} />

            {/* SECTION 5: POSSIBLE EXPLANATIONS */}
            <PossibleCauses challenge={challenge} intelligence={intelligence} />

            {/* INSTITUTIONAL SOLUTION MEMORY */}
            <SolutionMemoryPanel
              challenge={challenge}
              intelligence={intelligence}
              onInspectPrecedent={handleInspectPrecedent}
            />

            {/* COMMUNITY FEEDBACK & VERIFICATION SUBMISSIONS */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Community Verification
                  </h3>
                  <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Citizen Field Feedback
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => setShowFeedbackModal(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold"
                >
                  Submit Observation
                </Button>
              </div>

              {feedbacks.length === 0 ? (
                <p className="text-xs text-slate-500 py-3">
                  No citizen observations recorded yet. Nearby residents can provide real-time updates on problem status.
                </p>
              ) : (
                <div className="space-y-3 pt-2">
                  {feedbacks.map((fb, idx) => (
                    <div
                      key={fb.id || idx}
                      className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {fb.citizenName || 'Resident Observer'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {fb.createdAt ? new Date(fb.createdAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-300">{fb.comments}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          {/* Side Column: Institutional Collaboration & Public Ledger */}
          <div className="lg:col-span-4 space-y-6">
            {/* Municipal Timeline Ledger */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4" id="problem-timeline">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Municipal Action History
              </h3>

              <div className="space-y-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
                {challenge.timelines && challenge.timelines.length > 0 ? (
                  challenge.timelines.map((tl, i) => (
                    <div key={tl.id || i} className="relative pl-7 text-xs space-y-0.5">
                      <div className="absolute left-1.5 top-1 w-3 h-3 rounded-full border-2 border-blue-500 bg-white dark:bg-slate-900" />
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        {tl.toStatus?.replace(/_/g, ' ') || 'Stage Recorded'}
                      </span>
                      <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                        {tl.reason || 'Status updated on SICP ledger.'}
                      </p>
                      <span className="text-[10px] text-slate-400 block">
                        {tl.createdAt ? new Date(tl.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="relative pl-7 text-xs space-y-0.5">
                    <div className="absolute left-1.5 top-1 w-3 h-3 rounded-full border-2 border-emerald-500 bg-white dark:bg-slate-900" />
                    <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                      Problem Registered
                    </span>
                    <p className="text-slate-600 dark:text-slate-400 text-[11px]">
                      Awaiting municipal assignment.
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* University Solver Matching */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  University R&D Labs
                </h3>
              </div>

              {universityMatches.length > 0 ? (
                <div className="space-y-2.5">
                  {universityMatches.slice(0, 2).map((m, idx) => (
                    <div
                      key={m.universityOrgId || idx}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs space-y-1.5"
                    >
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        {m.universityName}
                      </span>
                      <p className="text-[11px] text-slate-500">
                        {m.matchedDepartments?.join(', ') || 'Engineering Faculty'}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenUniversityModal(m)}
                        className="text-[11px] h-7 w-full border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300"
                      >
                        Engage Faculty
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  Institutes of national importance will be routed upon municipal validation.
                </p>
              )}
            </section>

            {/* Industry CSR Co-Funding */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Industry CSR Co-Funding
                </h3>
              </div>

              {industryMatches.length > 0 ? (
                <div className="space-y-2.5">
                  {industryMatches.slice(0, 2).map((m, idx) => (
                    <div
                      key={m.industryOrgId || idx}
                      className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs space-y-1.5"
                    >
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        {m.companyName || 'CSR Partner'}
                      </span>
                      <p className="text-[11px] text-slate-500">
                        Focus: {m.eligibleCsrPrograms?.join(', ') || 'Urban Infrastructure'}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenIndustryModal(m)}
                        className="text-[11px] h-7 w-full border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300"
                      >
                        Pledge CSR Co-Fund
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  CSR partners eligible under Schedule VII can co-fund remediation projects.
                </p>
              )}
            </section>
          </div>
        </div>
      </main>

      {/* SECTION 6: TECHNICAL INVESTIGATION DRAWER */}
      <TechnicalInvestigationDrawer
        isOpen={showTechDrawer}
        onClose={() => setShowTechDrawer(false)}
        challenge={challenge}
        intelligence={intelligence}
      />

      {/* In-Place Precedent Detail Inspector Drawer */}
      <PrecedentDetailDrawer
        isOpen={precedentDrawerOpen}
        onClose={() => setPrecedentDrawerOpen(false)}
        memory={selectedMemoryDetail}
      />

      {/* Feedback Submission Modal */}
      <Modal
        isOpen={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
        title="Submit Ground Truth Field Observation"
      >
        <form onSubmit={onSubmitCitizenFeedback} className="space-y-4 text-xs">
          <div>
            <label className="font-semibold block mb-1">Current Problem Status</label>
            <select
              value={feedbackForm.problemStatus}
              onChange={(e) =>
                onChangeFeedbackForm((prev: any) => ({ ...prev, problemStatus: e.target.value }))
              }
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
            >
              <option value="YES">Problem is still present and unresolved</option>
              <option value="NO">Problem has been resolved on the ground</option>
              <option value="PARTIALLY">Partially addressed / temporary patch</option>
            </select>
          </div>

          <div>
            <label className="font-semibold block mb-1">Your Detailed Observation</label>
            <textarea
              rows={3}
              value={feedbackForm.comments}
              onChange={(e) =>
                onChangeFeedbackForm((prev: any) => ({ ...prev, comments: e.target.value }))
              }
              placeholder="Describe current on-site conditions..."
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowFeedbackModal(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={feedbackSubmitting}
              className="bg-blue-600 text-white font-semibold"
            >
              {feedbackSubmitting ? 'Submitting...' : 'Submit Observation'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* University Engagement Modal */}
      <Modal
        isOpen={showUniModal}
        onClose={() => setShowUniModal(false)}
        title="Engage University Research Faculty"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            Send formal academic inquiry to {selectedUniMatch?.universityName}.
          </p>
          <textarea
            rows={4}
            value={uniInquiry}
            onChange={(e) => setUniInquiry(e.target.value)}
            className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono"
          />
          {uniSuccess && (
            <p className="text-emerald-600 font-semibold">Faculty inquiry dispatched successfully!</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowUniModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmAssignUniversity}
              disabled={uniSubmitting}
              className="bg-purple-600 text-white"
            >
              {uniSubmitting ? 'Dispatching...' : 'Confirm RFP Dispatch'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Industry CSR Modal */}
      <Modal
        isOpen={showIndModal}
        onClose={() => setShowIndModal(false)}
        title="Schedule VII CSR Co-Funding"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            Formulate co-funding allocation with {selectedIndMatch?.companyName || 'CSR Partner'}.
          </p>
          <textarea
            rows={4}
            value={indInquiry}
            onChange={(e) => setIndInquiry(e.target.value)}
            className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 font-mono"
          />
          {indSuccess && (
            <p className="text-emerald-600 font-semibold">CSR co-funding inquiry recorded!</p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowIndModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirmPledgeIndustry}
              disabled={indSubmitting}
              className="bg-emerald-600 text-white"
            >
              {indSubmitting ? 'Recording...' : 'Pledge Co-Funding'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
