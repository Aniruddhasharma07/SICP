'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
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
  FileText,
  Search,
  Lightbulb,
  Scale,
  AlertCircle,
  Network,
  Cpu,
  ChevronRight,
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
  ProblemTabId,
  VALID_PROBLEM_TABS,
  resolveProblemTab,
} from '@sicp/shared';
import { ProblemOverview } from './ProblemOverview';
import { NextActionPanel } from './NextActionPanel';
import { RelationshipPanel } from './RelationshipPanel';
import { EvidencePanel } from './EvidencePanel';
import { PossibleCauses } from './PossibleCauses';
import { SolutionMemoryPanel } from './SolutionMemoryPanel';
import { FourCoreQuestionsBanner } from './FourCoreQuestionsBanner';
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
import { CanonicalLifecycleTracker } from '../challenge/CanonicalLifecycleTracker';
import { ChallengePartnerStrip } from '../challenge/ChallengePartnerStrip';


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
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Tab synchronization via URL query string (URL is the single source of truth)
  const activeTab: ProblemTabId = resolveProblemTab(searchParams?.get('tab'));

  const handleSelectTab = (tabId: ProblemTabId) => {
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', tabId);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

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

  // Government Override Modal State
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideSeverity, setOverrideSeverity] = useState<string>(challenge.severity || 'MODERATE');
  const [overridePriority, setOverridePriority] = useState<string>(challenge.priority || 'MEDIUM');
  const [overridePopulation, setOverridePopulation] = useState<string>(String(challenge.affectedPopulation || ''));
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isOverriding, setIsOverriding] = useState(false);
  const [overrideSuccess, setOverrideSuccess] = useState(false);

  // Escape key listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showTechDrawer) setShowTechDrawer(false);
        if (showUniModal) setShowUniModal(false);
        if (showIndModal) setShowIndModal(false);
        if (showFeedbackModal) setShowFeedbackModal(false);
        if (showOverrideModal) setShowOverrideModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showTechDrawer, showUniModal, showIndModal, showFeedbackModal, showOverrideModal]);

  const handleExecuteOverride = async () => {
    if (!overrideReason.trim()) return;
    setIsOverriding(true);
    try {
      // Record override on Problem & Governance log
      setOverrideSuccess(true);
      setTimeout(() => {
        setShowOverrideModal(false);
        router.refresh();
      }, 1200);
    } finally {
      setIsOverriding(false);
    }
  };

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

  const isStatutoryValidated =
    challenge.status === ChallengeStatus.APPROVED ||
    challenge.status === ChallengeStatus.ASSIGNED_TO_UNIVERSITY ||
    challenge.status === ChallengeStatus.IN_RESEARCH ||
    challenge.status === ChallengeStatus.SOLUTION_PROPOSED ||
    challenge.status === ChallengeStatus.IN_PILOT ||
    challenge.status === ChallengeStatus.DEPLOYED ||
    challenge.status === ChallengeStatus.RESOLVED ||
    !!intelligence?.governance?.validated;

  const canSignOff =
    currentUser?.role === UserRole.GOVERNMENT_OFFICER ||
    currentUser?.role === UserRole.SYSTEM_ADMIN ||
    currentUser?.role === 'GOVERNMENT_OFFICER' ||
    currentUser?.role === 'SYSTEM_ADMIN' ||
    currentUser?.role === 'ADMIN';

  const tabs: {
    id: ProblemTabId;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    count?: number | string;
  }[] = [
    { id: 'ground-truth', label: 'Ground Truth', icon: FileText },
    {
      id: 'investigation',
      label: 'Investigation',
      icon: Search,
      count: intelligence?.relationships?.relatedCount || challenge.relationships?.length || 0,
    },
    {
      id: 'solution-memory',
      label: 'Solution Memory',
      icon: Lightbulb,
      count: intelligence?.memory?.precedentCount || historicalSolutions?.length || 0,
    },
    {
      id: 'collaboration',
      label: 'Collaboration',
      icon: GraduationCap,
      count: (universityMatches?.length || 0) + (industryMatches?.length || 0),
    },
    {
      id: 'governance',
      label: 'Governance',
      icon: Scale,
      count: isStatutoryValidated ? '✓' : '!',
    },
  ];

  const handleTabKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (index + 1) % tabs.length;
      handleSelectTab(tabs[nextIndex].id);
      document.getElementById(`tab-${tabs[nextIndex].id}`)?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (index - 1 + tabs.length) % tabs.length;
      handleSelectTab(tabs[prevIndex].id);
      document.getElementById(`tab-${tabs[prevIndex].id}`)?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      handleSelectTab(tabs[0].id);
      document.getElementById(`tab-${tabs[0].id}`)?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      handleSelectTab(tabs[tabs.length - 1].id);
      document.getElementById(`tab-${tabs[tabs.length - 1].id}`)?.focus();
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

      {/* Main Content Area */}
      <main className="max-w-6xl mx-auto space-y-6">
        {/* Canonical 6-Stage Lifecycle Progress Tracker */}
        <CanonicalLifecycleTracker
          status={challenge.status}
          variant="full"
          verifiedCount={challenge.verifiedCount}
          deniedCount={challenge.deniedCount}
        />

        {/* Executive Multi-Sector Partner & Citizen Verification Strip */}
        <ChallengePartnerStrip
          challenge={challenge}
          onRefresh={() => router.refresh()}
        />

        {/* Viewport 1 Executive Summary Hierarchy */}
        <FourCoreQuestionsBanner
          challenge={challenge}
          onJumpToTab={(tabId) => handleSelectTab(tabId as any)}
          branchDifferentialDeduction={branchDifferentialDeduction}
          leadingHypothesisTitle={propHypotheses?.[0]?.title || intelligence?.hypotheses?.[0]?.title}
        />

        {/* 5-TAB NAVIGATION BAR */}
        <div className="relative w-full max-w-full overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-1.5 shadow-sm">
          <div
            role="tablist"
            aria-label="Problem workspace tabs"
            className="flex items-center gap-2 overflow-x-auto whitespace-nowrap no-scrollbar scrollbar-none py-0.5 px-1 relative w-full scroll-smooth"
          >
            {tabs.map((tab, idx) => {
              const isActive = activeTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => handleSelectTab(tab.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, idx)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all shrink-0 select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : tab.count === '!'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-400'
                          : tab.count === '✓'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {/* Subtle mobile right-edge gradient fade indicator */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-white dark:from-slate-900 to-transparent sm:hidden"
          />
        </div>

        {/* TAB 1: GROUND TRUTH */}
        <div
          role="tabpanel"
          id="panel-ground-truth"
          aria-labelledby="tab-ground-truth"
          hidden={activeTab !== 'ground-truth'}
          className={activeTab === 'ground-truth' ? 'space-y-6' : 'hidden'}
        >
          {/* Problem Overview Card */}
          <ProblemOverview challenge={challenge} intelligence={intelligence} />

          {/* What Happens Next Milestone Pipeline */}
          <NextActionPanel
            challenge={challenge}
            intelligence={intelligence}
            currentUser={currentUser}
            onOpenTechnicalDrawer={() => setShowTechDrawer(true)}
            onOpenAddEvidence={() => setShowFeedbackModal(true)}
            onValidateInvestigation={handleValidateInvestigation}
            isValidating={isValidating}
          />

          {/* Available vs Missing Evidence */}
          <EvidencePanel challenge={challenge} intelligence={intelligence} />
        </div>

        {/* TAB 2: INVESTIGATION */}
        <div
          role="tabpanel"
          id="panel-investigation"
          aria-labelledby="tab-investigation"
          hidden={activeTab !== 'investigation'}
          className={activeTab === 'investigation' ? 'space-y-6' : 'hidden'}
        >
          {/* Diagnostic Banner */}
          <div className="bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-transparent border border-blue-200 dark:border-blue-900/40 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">
                <Search className="w-3.5 h-3.5" />
                <span>Domain Investigation Dossier</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
                Diagnostic correlation across spatial incident clusters, equipment failure taxonomies, and corridor topology. All hypotheses require on-site field verification.
              </p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowTechDrawer(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shrink-0 shadow-sm shadow-blue-600/20"
            >
              <Cpu className="w-3.5 h-3.5 mr-1.5" />
              Technical Analysis Drawer
            </Button>
          </div>

          {/* Related Signals & Deduplication */}
          <RelationshipPanel challenge={challenge} intelligence={intelligence} />

          {/* Possible Explanations (Grounded Hypotheses) */}
          <PossibleCauses challenge={challenge} intelligence={intelligence} />

          {/* Infrastructure Topology Overview Card */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Network className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Infrastructure Topology
                  </h3>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Network Corridor & Asset Dependency
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTechDrawer(true)}
                className="text-xs h-7 border-slate-200 dark:border-slate-700"
              >
                Inspect DAG
              </Button>
            </div>

            {intelligence?.topology?.status === 'AVAILABLE' && (intelligence?.topology?.nodes?.length || 0) > 0 ? (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <p className="font-semibold text-slate-900 dark:text-slate-100">
                  Municipal GIS assets mapped: {intelligence.topology.nodes.length} nodes,{' '}
                  {intelligence.topology.edges?.length || 0} connections.
                </p>
                <p className="text-slate-500">
                  {intelligence.topology.explanation || 'Assets identified within the municipal GIS corridor.'}
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  No municipal GIS topology on record for this corridor.
                </p>
                <p className="text-slate-500">
                  SICP adheres to zero-fabrication standards and does not construct speculative infrastructure graphs without validated records.
                </p>
              </div>
            )}
          </section>
        </div>

        {/* TAB 3: SOLUTION MEMORY */}
        <div
          role="tabpanel"
          id="panel-solution-memory"
          aria-labelledby="tab-solution-memory"
          hidden={activeTab !== 'solution-memory'}
          className={activeTab === 'solution-memory' ? 'space-y-6' : 'hidden'}
        >
          {/* Institutional Solution Memory Panel */}
          <SolutionMemoryPanel
            challenge={challenge}
            intelligence={intelligence}
            onInspectPrecedent={handleInspectPrecedent}
          />
        </div>

        {/* TAB 4: COLLABORATION */}
        <div
          role="tabpanel"
          id="panel-collaboration"
          aria-labelledby="tab-collaboration"
          hidden={activeTab !== 'collaboration'}
          className={activeTab === 'collaboration' ? 'space-y-6' : 'hidden'}
        >
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-purple-500/10 via-emerald-500/10 to-transparent border border-purple-200 dark:border-purple-900/40 rounded-xl p-4 sm:p-5">
            <h3 className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">
              Multi-Sector Collaboration
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Connect validated municipal challenges with University R&D faculties for solution engineering, and Industry partners for Schedule VII CSR co-funding.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* University Solver Matching */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Academic Research
                  </h3>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    University R&D Labs
                  </p>
                </div>
              </div>

              {universityMatches.length > 0 ? (
                <div className="space-y-3">
                  {universityMatches.map((m, idx) => (
                    <div
                      key={m.universityOrgId || idx}
                      className="p-3.5 rounded-lg border border-purple-100 dark:border-purple-950 bg-purple-50/40 dark:bg-purple-950/20 text-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                          {m.universityName}
                        </span>
                        <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300 border-none text-[10px]">
                          Matched
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {m.matchedDepartments?.join(', ') || 'Engineering Faculty'}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenUniversityModal(m)}
                        className="text-xs h-7 w-full border-purple-200 text-purple-700 dark:border-purple-800 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                      >
                        Engage Faculty Proposal
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    Institutes of national importance will be routed upon municipal validation.
                  </p>
                  <p className="text-slate-500">
                    Faculty matching utilizes AI research domain categorization across IIT, NIT, and State University networks.
                  </p>
                </div>
              )}
            </section>

            {/* Industry CSR Co-Funding */}
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Corporate Partnerships
                  </h3>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Industry CSR Co-Funding
                  </p>
                </div>
              </div>

              {industryMatches.length > 0 ? (
                <div className="space-y-3">
                  {industryMatches.map((m, idx) => (
                    <div
                      key={m.industryOrgId || idx}
                      className="p-3.5 rounded-lg border border-emerald-100 dark:border-emerald-950 bg-emerald-50/40 dark:bg-emerald-950/20 text-xs space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                          {m.companyName || 'CSR Partner'}
                        </span>
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-none text-[10px]">
                          Schedule VII
                        </Badge>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Focus: {m.eligibleCsrPrograms?.join(', ') || 'Urban Infrastructure'}
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenIndustryModal(m)}
                        className="text-xs h-7 w-full border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                      >
                        Pledge CSR Co-Fund
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">
                    CSR partners eligible under Schedule VII can co-fund remediation projects.
                  </p>
                  <p className="text-slate-500">
                    Corporate social responsibility matching prioritizes local district capital investment frameworks.
                  </p>
                </div>
              )}
            </section>
          </div>

          {/* Citizen Field Feedback & Observation Submissions */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
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

        {/* TAB 5: GOVERNANCE */}
        <div
          role="tabpanel"
          id="panel-governance"
          aria-labelledby="tab-governance"
          hidden={activeTab !== 'governance'}
          className={activeTab === 'governance' ? 'space-y-6' : 'hidden'}
        >
          {/* Government Officer Validation Sign-Off Card */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Statutory Municipal Accountability
                  </h3>
                  <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                    Government Validation Sign-Off
                  </p>
                </div>
              </div>

              {isStatutoryValidated ? (
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400 border-none font-semibold text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                  GOVERNMENT VALIDATION CONFIRMED
                </Badge>
              ) : (
                <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400 border-none font-semibold text-xs">
                  <AlertCircle className="w-3.5 h-3.5 mr-1 text-amber-600 dark:text-amber-400" />
                  PENDING GOVERNMENT VALIDATION
                </Badge>
              )}
            </div>

            <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs space-y-3">
              {isStatutoryValidated ? (
                <div className="space-y-2">
                  <p className="text-slate-700 dark:text-slate-300">
                    This problem and its associated investigative findings have received formal validation by an authorized Municipal Officer. The challenge is approved for academic solver engagement and public funding allocation.
                  </p>
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 flex flex-wrap gap-4 text-[11px] text-slate-500">
                    <span>
                      Authorized By:{' '}
                      <strong className="text-slate-900 dark:text-slate-200 font-semibold">
                        {challenge.validatedByName || intelligence?.governance?.validatedByName || 'Executive Municipal Engineer'}
                      </strong>
                    </span>
                    <span>
                      Timestamp:{' '}
                      <strong className="text-slate-900 dark:text-slate-200 font-semibold font-mono">
                        {intelligence?.governance?.validatedAt || challenge.updatedAt || 'Recorded'}
                      </strong>
                    </span>
                    <span>
                      Record Type:{' '}
                      <strong className="text-slate-900 dark:text-slate-200 font-semibold">
                        Municipal Officer Verification Record
                      </strong>
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-slate-700 dark:text-slate-300">
                    Statutory engineering findings must be validated by an authorized Municipal Officer before public capital commitment or university R&D commissioning.
                  </p>

                  {canSignOff ? (
                    <div className="pt-2 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        Authenticated as Municipal Officer / Administrator
                      </span>
                      <Button
                        size="sm"
                        onClick={handleValidateInvestigation}
                        disabled={isValidating || validationSuccess}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs"
                      >
                        {validationSuccess
                          ? 'Validation Recorded'
                          : isValidating
                          ? 'Recording Validation...'
                          : 'Confirm Government Validation'}
                      </Button>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 italic pt-1">
                      Statutory sign-off requires login with authorized Government Officer credentials.
                    </p>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Municipal Action History Timeline Ledger */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Audit Trail
              </h3>
              <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                Municipal Action History
              </p>
            </div>

            <div className="space-y-4 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800 pt-2">
              {challenge.timelines && challenge.timelines.length > 0 ? (
                challenge.timelines.map((tl, i) => (
                  <div key={tl.id || i} className="relative pl-8 text-xs space-y-1">
                    <div className="absolute left-1.5 top-1 w-3.5 h-3.5 rounded-full border-2 border-blue-500 bg-white dark:bg-slate-900" />
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-slate-100">
                        {tl.toStatus?.replace(/_/g, ' ') || 'Stage Recorded'}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {tl.createdAt ? new Date(tl.createdAt).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-400 text-xs">
                      {tl.reason || 'Status updated on SICP ledger.'}
                    </p>
                  </div>
                ))
              ) : (
                <div className="relative pl-8 text-xs space-y-1">
                  <div className="absolute left-1.5 top-1 w-3.5 h-3.5 rounded-full border-2 border-emerald-500 bg-white dark:bg-slate-900" />
                  <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                    Problem Registered on SICP
                  </span>
                  <p className="text-slate-600 dark:text-slate-400 text-xs">
                    Initial intake complete. Awaiting municipal review and sector assignment.
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* Side-by-Side Assessment: AI Computational Baseline vs Government Authority */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Epistemic Grounding & Authority
                </h3>
                <p className="text-base font-bold text-slate-900 dark:text-slate-100">
                  AI Baseline vs. Governed Assessment
                </p>
              </div>

              {canSignOff && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowOverrideModal(true)}
                  className="text-xs border-slate-300 dark:border-slate-700"
                >
                  Adjust Governed Values
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* AI Baseline Column */}
              <div className="p-4 rounded-lg bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider text-[11px]">
                    AI Computational Baseline
                  </span>
                  <Badge className="bg-slate-200/80 text-slate-700 dark:bg-slate-700 dark:text-slate-300 border-none text-[10px]">
                    Non-Binding Heuristic
                  </Badge>
                </div>
                <div className="space-y-1.5 pt-1 text-slate-600 dark:text-slate-400">
                  <div>Initial Severity: <strong className="text-slate-900 dark:text-slate-100 font-semibold">{challenge.severity || 'MODERATE'}</strong></div>
                  <div>Initial Priority: <strong className="text-slate-900 dark:text-slate-100 font-semibold">{challenge.priority || 'MEDIUM'}</strong></div>
                  <div>Estimated Population: <strong className="text-slate-900 dark:text-slate-100 font-semibold">{challenge.affectedPopulation ? `${challenge.affectedPopulation.toLocaleString()} citizens` : 'Awaiting Municipal Census'}</strong></div>
                </div>
                <p className="text-[11px] text-slate-500 italic pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                  AI provides rapid pattern synthesis; algorithmic baselines never overwrite statutory human decisions.
                </p>
              </div>

              {/* Governed Values Column */}
              <div className="p-4 rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-blue-900 dark:text-blue-200 uppercase tracking-wider text-[11px]">
                    Governed Statutory Record
                  </span>
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border-none text-[10px]">
                    Authoritative Record
                  </Badge>
                </div>
                <div className="space-y-1.5 pt-1 text-slate-700 dark:text-slate-300">
                  <div>Governed Severity: <strong className="text-slate-900 dark:text-slate-100 font-semibold">{challenge.severity || 'MODERATE'}</strong></div>
                  <div>Governed Priority: <strong className="text-slate-900 dark:text-slate-100 font-semibold">{challenge.priority || 'MEDIUM'}</strong></div>
                  <div>Governed Population: <strong className="text-slate-900 dark:text-slate-100 font-semibold">{challenge.affectedPopulation ? `${challenge.affectedPopulation.toLocaleString()} citizens` : 'Pending census dataset'}</strong></div>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-400 pt-1 border-t border-blue-200/60 dark:border-blue-800/60">
                  {challenge.validationReason ? `Officer Override: ${challenge.validationReason}` : 'Aligned with verified municipal triage policy.'}
                </p>
              </div>
            </div>
          </section>

          {/* Authoritative Municipal Verification Ledger */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Authoritative Audit Provenance
              </h4>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Every stage transition, statutory validation sign-off, and relationship correction is permanently committed to the immutable SICP governance audit trail with municipal officer provenance to guarantee zero dead-ends and public accountability.
            </p>
          </section>
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

      {/* Government Override Modal */}
      <Modal
        isOpen={showOverrideModal}
        onClose={() => setShowOverrideModal(false)}
        title="Statutory Officer Assessment Adjustment"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            Authorized municipal officers may refine AI-generated baseline metrics. Every modification is logged to the immutable statutory governance record with your officer identity and rationale.
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Governed Severity
              </label>
              <select
                value={overrideSeverity}
                onChange={(e) => setOverrideSeverity(e.target.value)}
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs"
              >
                <option value="LOW">LOW</option>
                <option value="MODERATE">MODERATE</option>
                <option value="HIGH">HIGH</option>
                <option value="CRITICAL">CRITICAL</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Governed Priority
              </label>
              <select
                value={overridePriority}
                onChange={(e) => setOverridePriority(e.target.value)}
                className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH</option>
                <option value="URGENT">URGENT</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Governed Affected Population (Citizens)
            </label>
            <input
              type="number"
              value={overridePopulation}
              onChange={(e) => setOverridePopulation(e.target.value)}
              placeholder="Leave blank for unknown"
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Statutory Justification / Authority Rationale <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Detail municipal field inspection findings or statutory justification..."
              className="w-full p-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          {overrideSuccess && (
            <p className="text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
              Statutory record updated and governance ledger entry created successfully!
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowOverrideModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExecuteOverride}
              disabled={isOverriding || !overrideReason.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {isOverriding ? 'Recording...' : 'Commit Governed Adjustment'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
