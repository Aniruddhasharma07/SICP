'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { Button } from '../../../src/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Alert } from '../../../src/components/ui/Alert';
import { ZeroDeadEndNotice } from '../../../src/components/common/ZeroDeadEndNotice';
import { ImpactIntelligencePanel } from '../../../src/components/impact/ImpactIntelligencePanel';
import { PriorityScoreCard } from '../../../src/components/common/PriorityScoreCard';
import { AiIntelligenceAccordion } from '../../../src/components/intelligence/AiIntelligenceAccordion';
import { RootCauseFlowDiagram } from '../../../src/components/intelligence/RootCauseFlowDiagram';
import { ContextAwareAiDrawer } from '../../../src/components/intelligence/ContextAwareAiDrawer';
import { useAuth } from '../../../src/lib/auth-context';
import { apiClient } from '../../../src/lib/api-client';
import {
  ChallengeDto,
  ChallengeStatus,
  ChallengeTimelineDto,
  ChallengeRelationshipDto,
  UserRole,
  CitizenProblemStatus,
  CitizenFeedbackDto,
  HistoricalRecommendationDto,
} from '@sicp/shared';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Heart,
  BrainCircuit,
  Layers,
  FileText,
  MapPin,
  ExternalLink,
  GraduationCap,
  Star,
  ShieldAlert,
  FolderKanban,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface ExtendedChallenge extends ChallengeDto {
  timelines: ChallengeTimelineDto[];
  relationships?: ChallengeRelationshipDto[];
  supportVotesCount?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  aiAnalysis?: any;
}

export default function ChallengeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [challenge, setChallenge] = useState<ExtendedChallenge | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [voteCount, setVoteCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [isVoting, setIsVoting] = useState(false);

  // Phase 5 Citizen Outcome Verification State
  const [feedbacks, setFeedbacks] = useState<CitizenFeedbackDto[]>([]);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackForm, setFeedbackForm] = useState({
    problemStatus: CitizenProblemStatus.YES,
    rating: 5,
    effectivenessRating: 5,
    improvementRating: 5,
    comments: '',
    unresolvedIssues: '',
    isRecurrenceReported: false,
  });

  // Phase 6 Historical Solution Memory State
  const [historicalSolutions, setHistoricalSolutions] = useState<HistoricalRecommendationDto[]>([]);
  const [loadingHistorical, setLoadingHistorical] = useState(false);

  // Merge modal
  const [showMergeModal, setShowMergeModal] = useState(false);
  const [mergeTitle, setMergeTitle] = useState('');
  const [mergeReason, setMergeReason] = useState('');
  const [mergeSecondId, setMergeSecondId] = useState('');

  // AI Trigger state
  const [isTriggeringAi, setIsTriggeringAi] = useState(false);
  const [aiNotice, setAiNotice] = useState<{ type: 'success' | 'warning' | 'error'; message: string } | null>(null);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);

  const handleTriggerAi = async () => {
    setIsTriggeringAi(true);
    setAiNotice(null);
    try {
      const res = await apiClient.request<{ message: string }>(
        `/api/v1/challenges/${resolvedParams.id}/analyze`,
        { method: 'POST' }
      );
      if (res.success) {
        setAiNotice({
          type: 'success',
          message: res.data?.message || 'AI problem intelligence dispatched to background queue. Refreshing analysis...',
        });
        setTimeout(() => {
          fetchDetails();
        }, 1500);
      } else {
        setAiNotice({
          type: 'warning',
          message: res.error?.message || 'AI analysis is temporarily unavailable. Officers may validate using field evidence.',
        });
      }
    } catch {
      setAiNotice({
        type: 'warning',
        message: 'AI analysis service temporarily unreachable. Officers can validate directly using field evidence.',
      });
    } finally {
      setIsTriggeringAi(false);
    }
  };

  const fetchHistorical = async () => {
    setLoadingHistorical(true);
    const res = await apiClient.request<HistoricalRecommendationDto[]>(
      `/api/v1/solutions/historical/challenge/${resolvedParams.id}`
    );
    if (res.success && res.data) {
      setHistoricalSolutions(res.data);
    }
    setLoadingHistorical(false);
  };

  const fetchFeedback = async () => {
    const fbRes = await apiClient.request<CitizenFeedbackDto[]>(
      `/api/v1/challenges/${resolvedParams.id}/citizen-feedback`
    );
    if (fbRes.success && fbRes.data) {
      setFeedbacks(fbRes.data);
    }
  };

  const fetchDetails = async () => {
    setLoading(true);
    const res = await apiClient.request<ExtendedChallenge>(
      `/api/v1/challenges/${resolvedParams.id}`
    );
    if (res.success && res.data) {
      setChallenge(res.data);
      setVoteCount(res.data.supportVotesCount || 0);

      // Check vote status
      if (user) {
        const voteRes = await apiClient.request<{ hasVoted: boolean; totalVotes: number }>(
          `/api/v1/challenges/${resolvedParams.id}/vote`
        );
        if (voteRes.success && voteRes.data) {
          setHasVoted(voteRes.data.hasVoted);
          setVoteCount(voteRes.data.totalVotes);
        }
      }

      // Fetch citizen feedback for advanced lifecycle stages
      await fetchFeedback();
      await fetchHistorical();
    } else {
      setError(res.error?.message || 'Failed to load challenge details');
    }
    setLoading(false);
  };

  const handleSubmitCitizenFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      router.push('/login');
      return;
    }
    if (!feedbackForm.comments.trim()) {
      setError('Please provide your observational comments or field details.');
      return;
    }

    setFeedbackSubmitting(true);
    setError(null);

    const endpoint = challenge?.projects && challenge.projects.length > 0
      ? `/api/v1/projects/${challenge.projects[0].id}/citizen-feedback`
      : `/api/v1/challenges/${resolvedParams.id}/citizen-feedback`;

    const res = await apiClient.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        ...feedbackForm,
        verifiedImprovement:
          feedbackForm.problemStatus === CitizenProblemStatus.YES ||
          feedbackForm.problemStatus === CitizenProblemStatus.PARTIALLY,
      }),
    });

    setFeedbackSubmitting(false);
    if (res.success) {
      setFeedbackSuccess(true);
      setFeedbackForm({
        problemStatus: CitizenProblemStatus.YES,
        rating: 5,
        effectivenessRating: 5,
        improvementRating: 5,
        comments: '',
        unresolvedIssues: '',
        isRecurrenceReported: false,
      });
      await fetchFeedback();
    } else {
      setError(res.error?.message || 'Failed to submit citizen verification.');
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [resolvedParams.id, user]);

  const handleToggleVote = async () => {
    if (!user) {
      router.push('/login');
      return;
    }

    setIsVoting(true);
    const res = await apiClient.request<{ voted: boolean; totalVotes: number; newPriorityScore: number }>(
      `/api/v1/challenges/${resolvedParams.id}/vote`,
      { method: 'POST' }
    );
    setIsVoting(false);

    if (res.success && res.data) {
      setHasVoted(res.data.voted);
      setVoteCount(res.data.totalVotes);
      setChallenge(prev => (prev ? { ...prev, priorityScore: res.data!.newPriorityScore } : null));
    }
  };

  const executeTransition = async (toStatus: ChallengeStatus, reasonReq: boolean = false) => {
    if (reasonReq && !actionReason.trim()) {
      setError(`A formal reason is required to transition to ${toStatus}`);
      return;
    }

    setIsSubmittingAction(true);
    setError(null);

    const idempotencyKey = `transition-${resolvedParams.id}-${toStatus}-${Date.now()}`;
    const res = await apiClient.request(`/api/v1/challenges/${resolvedParams.id}/transition`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({
        toStatus,
        expectedVersion: challenge?.version,
        reason: actionReason || undefined,
      }),
    });

    setIsSubmittingAction(false);
    if (res.success) {
      setActionReason('');
      await fetchDetails();
    } else {
      setError(res.error?.message || 'State transition failed');
    }
  };

  const handleExecuteMerge = async () => {
    if (!mergeTitle || !mergeReason || !mergeSecondId) {
      setError('Title, reason, and second challenge ID are required for systemic grouping.');
      return;
    }

    setIsSubmittingAction(true);
    const res = await apiClient.request<{ id: string }>('/api/v1/challenges/merge-systemic', {
      method: 'POST',
      headers: { 'Idempotency-Key': `merge-${Date.now()}` },
      body: JSON.stringify({
        sourceChallengeIds: [resolvedParams.id, mergeSecondId.trim()],
        systemicTitle: mergeTitle,
        systemicDescription: `Systemic grouping of local challenges. Reason: ${mergeReason}`,
        category: challenge?.category || 'Civic Infrastructure',
        district: challenge?.district || 'General',
        state: challenge?.state || 'National',
        reason: mergeReason,
      }),
    });
    setIsSubmittingAction(false);

    if (res.success && res.data) {
      setShowMergeModal(false);
      router.push(`/challenges/${res.data.id}`);
    } else {
      setError(res.error?.message || 'Failed to merge challenges');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="h-8 w-48 bg-slate-200 rounded animate-pulse" />
          <div className="h-64 bg-slate-200 rounded-xl animate-pulse" />
        </div>
      </AppLayout>
    );
  }

  if (!challenge) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto py-12 text-center space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Challenge Not Found</h2>
          <p className="text-sm text-slate-500">{error || 'The requested challenge ID does not exist.'}</p>
          <Button onClick={() => router.push('/challenges')}>Return to Explorer</Button>
        </div>
      </AppLayout>
    );
  }

  const isGovOrAdmin = user?.role === UserRole.GOVERNMENT_OFFICER || user?.role === UserRole.GOVERNMENT_DEPARTMENT || user?.role === UserRole.SYSTEM_ADMIN;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-center gap-2">
            {challenge.isSystemic && (
              <Badge variant="default" className="bg-purple-600 text-white font-bold">
                <Layers className="w-3.5 h-3.5 mr-1" /> Systemic Civic Issue
              </Badge>
            )}
            <span className="text-xs text-slate-400">Record Version:</span>
            <Badge variant="secondary">v{challenge.version}</Badge>
          </div>
        </div>

        {error && (
          <Alert variant="destructive">
            <span className="text-xs font-semibold">{error}</span>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{challenge.category}</Badge>
                <span className="text-xs text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {challenge.district ? `${challenge.district}, ${challenge.state}` : 'Location unmapped'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Badge
                  variant={
                    challenge.status === 'APPROVED'
                      ? 'success'
                      : challenge.status === 'REJECTED'
                      ? 'destructive'
                      : challenge.status === 'UNDER_GOV_REVIEW'
                      ? 'warning'
                      : 'default'
                  }
                >
                  {challenge.status}
                </Badge>
              </div>
            </div>
            <CardTitle className="text-xl md:text-2xl">{challenge.title}</CardTitle>
            <CardDescription className="text-slate-700 text-sm md:text-base whitespace-pre-line pt-2">
              {challenge.description}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 border-t border-slate-100 pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <span className="block text-slate-400 font-semibold uppercase">Severity</span>
                <span className="font-bold text-slate-800">{challenge.severity}</span>
              </div>
              <div>
                <span className="block text-slate-400 font-semibold uppercase">Priority Class</span>
                <span className="font-bold text-slate-800">{challenge.priority}</span>
              </div>
              <div>
                <span className="block text-slate-400 font-semibold uppercase">Priority Score</span>
                <span className="font-bold text-blue-600 font-mono text-sm">
                  {challenge.priorityScore !== undefined ? `${challenge.priorityScore}/100` : 'Evaluating'}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 font-semibold uppercase">
                  {challenge.impact?.unit ? `${challenge.impact.unit.replace(/_/g, ' ')}` : 'Est. Footprint'}
                </span>
                <span className="font-bold text-slate-800">
                  {challenge.impact?.verifiedValue
                    ? `${challenge.impact.verifiedValue.toLocaleString()} (Verified)`
                    : challenge.impact?.value
                    ? `${challenge.impact.value.toLocaleString()} (${challenge.impact.problemType?.replace(/_/g, ' ')})`
                    : challenge.affectedPopulation
                    ? `${challenge.affectedPopulation.toLocaleString()} citizens`
                    : 'Data Pending'}
                </span>
              </div>
              <div>
                <span className="block text-slate-400 font-semibold uppercase">Duration</span>
                <span className="font-bold text-slate-800">
                  {challenge.durationMonths ? `${challenge.durationMonths} months` : 'Recent'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <Button
                  variant={hasVoted ? 'primary' : 'outline'}
                  size="sm"
                  className={hasVoted ? 'bg-rose-600 hover:bg-rose-700 text-white' : ''}
                  onClick={handleToggleVote}
                  isLoading={isVoting}
                >
                  <Heart className={`w-4 h-4 mr-1.5 ${hasVoted ? 'fill-current' : ''}`} />
                  {hasVoted ? 'Supported' : 'Support this Issue'} ({voteCount})
                </Button>
                <span className="text-xs text-slate-500">
                  Community votes boost official priority score
                </span>
              </div>

              {isGovOrAdmin && !challenge.isSystemic && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowMergeModal(true)}
                  className="border-purple-300 text-purple-700 hover:bg-purple-50"
                >
                  <Layers className="w-4 h-4 mr-1.5" /> Group as Systemic Issue
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Problem-Type-Aware Impact Intelligence Panel */}
        <ImpactIntelligencePanel
          challengeId={challenge.id}
          impact={challenge.impact}
          userRole={user?.role}
          onImpactUpdated={fetchDetails}
        />

        {/* Phase 6 AI Solution Memory & Historical Precedents */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    AI Solution Memory & Historical Precedents
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-600">
                    Prior verified interventions, reusability scores, and operational warnings for similar societal problems.
                  </CardDescription>
                </div>
              </div>
              <Link href="/solutions">
                <Button variant="ghost" size="sm" className="text-xs text-blue-600 hover:text-blue-700 h-7 p-0 flex items-center gap-1">
                  <span>Explore All Solutions</span>
                  <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 pt-0">
            {loadingHistorical ? (
              <div className="py-6 text-center text-xs text-slate-500">
                Scanning historical solution memory for precedents...
              </div>
            ) : historicalSolutions.length === 0 ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-500 space-y-1">
                <p className="font-semibold text-slate-700">No Direct Historical Precedents Found</p>
                <p className="text-[11px] text-slate-500 max-w-lg mx-auto">
                  No verified solution memories match this problem profile yet. Academic and research teams will formulate a first-of-its-kind original intervention.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {historicalSolutions.map(rec => (
                  <div
                    key={rec.memoryId}
                    className="p-3.5 bg-slate-50 hover:bg-slate-100/70 transition-colors rounded-xl border border-slate-200 space-y-2 text-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-[10px]">
                            {Math.round(rec.relevanceScore * 100)}% Match
                          </Badge>
                          <Badge
                            variant={
                              rec.reusabilityClass === 'HIGHLY_REUSABLE'
                                ? 'success'
                                : rec.reusabilityClass === 'CONDITIONALLY_REUSABLE'
                                  ? 'default'
                                  : 'warning'
                            }
                          >
                            {rec.reusabilityClass.replace(/_/g, ' ')}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {rec.evidenceLevel}
                          </Badge>
                        </div>
                        <h4 className="font-bold text-sm text-slate-900">{rec.title}</h4>
                        <p className="text-slate-600 line-clamp-2">{rec.problemSummary}</p>
                      </div>

                      <Link href={`/solutions/${rec.memoryId}`}>
                        <Button size="sm" variant="outline" className="text-xs shrink-0 h-7">
                          View Solution
                        </Button>
                      </Link>
                    </div>

                    {/* Match explanation */}
                    <div className="text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-100">
                      <span className="font-semibold text-slate-700">Match Rationale: </span>
                      {rec.explanation}
                    </div>

                    {/* Operational Warning if present */}
                    {rec.historicalWarning && (
                      <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-900 text-xs">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold text-amber-800">Operational Precedent Warning: </span>
                          <span>{rec.historicalWarning}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Phase 4 Institutional Collaboration & Lifecycle Banner */}
        {['ASSIGNED_TO_UNIVERSITY', 'IN_RESEARCH', 'SOLUTION_PROPOSED', 'IN_PILOT', 'DEPLOYED', 'RESOLVED'].includes(challenge.status) && (
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50/50 to-indigo-50/50">
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-blue-600 text-white">
                    <GraduationCap className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Institutional Innovation & Research Lifecycle
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-600">
                      Active academic assignment, multidisciplinary prototyping, and project cockpit.
                    </CardDescription>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link href="/university">
                    <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50 text-xs">
                      University Portal <ExternalLink className="h-3.5 w-3.5 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="text-xs text-slate-700 space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-500 block text-[11px] uppercase">Current Lifecycle Stage</span>
                  <span className="font-bold text-slate-900 text-sm">{challenge.status.replace(/_/g, ' ')}</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-500 block text-[11px] uppercase">Institutional Routing</span>
                  <span className="font-bold text-slate-900 text-sm">Assigned & Monitored</span>
                </div>
                <div className="p-3 bg-white rounded-lg border border-slate-200">
                  <span className="font-semibold text-slate-500 block text-[11px] uppercase">Multidisciplinary Collaboration</span>
                  <span className="font-bold text-blue-600 text-sm">Faculty & Student Teams Active</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Consolidated Report Notice (If merged into another issue) */}
        {challenge.status === 'MERGED_INTO_SYSTEMIC' && (
          <div className="p-4 rounded-xl bg-purple-50 border-2 border-purple-300 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
                <Layers className="w-5 h-5 text-purple-700 shrink-0" />
                <span>Consolidated Civic Report — Merged Into Master Systemic Issue</span>
              </div>
              <Badge className="bg-purple-600 text-white text-[10px] uppercase font-bold">Citizen Credit Preserved</Badge>
            </div>
            <p className="text-xs text-purple-800 leading-relaxed">
              This report has been verified by municipal authorities and consolidated into a master problem to mobilize large-scale infrastructure solutions. Your submission credit, original timestamp, description, and attached evidence have been fully preserved in the systemic civic cluster.
            </p>
          </div>
        )}

        {/* Canonical Master Record Cockpit */}
        {((challenge as any).isCanonical || challenge.isSystemic) && (
          <Card className="border-purple-300 bg-gradient-to-r from-purple-50/80 via-indigo-50/40 to-slate-50 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-purple-600 text-white">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-bold text-purple-950">
                      Canonical Master Record / Systemic Infrastructure Root Cause
                    </CardTitle>
                    <CardDescription className="text-xs text-purple-800">
                      Authoritative consolidated problem representing multiple verified citizen incident reports.
                    </CardDescription>
                  </div>
                </div>
                <Badge className="bg-purple-600 text-white text-xs font-bold">
                  Master Cluster
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 pt-2">
              {challenge.systemicSummary && (
                <div className="p-2.5 bg-white border border-purple-200 rounded-lg text-xs space-y-1">
                  <span className="font-bold text-purple-900 block">Governance Consolidation Justification:</span>
                  <p className="text-slate-700">{challenge.systemicSummary}</p>
                </div>
              )}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2 bg-white rounded border border-purple-100 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Consolidated Status</span>
                  <span className="font-bold text-purple-700">{challenge.status}</span>
                </div>
                <div className="p-2 bg-white rounded border border-purple-100 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Community Priority</span>
                  <span className="font-bold text-amber-600">{challenge.priorityScore || 0} / 100</span>
                </div>
                <div className="p-2 bg-white rounded border border-purple-100 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Affected Reach</span>
                  <span className="font-bold text-blue-700">{challenge.affectedPopulation || 1} citizens</span>
                </div>
                <div className="p-2 bg-white rounded border border-purple-100 text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Jurisdiction</span>
                  <span className="font-bold text-slate-800">{challenge.district || 'District Wide'}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recurrence Detection & Root Cause Intelligence Alert */}
        {challenge.relationships?.some(r => r.relationType === 'SAME_ROOT_CAUSE' || r.relationType === 'DUPLICATE') && (
          <div className="p-4 rounded-xl bg-amber-50 border-2 border-amber-300 shadow-sm space-y-2">
            <div className="flex items-center gap-2 text-amber-900 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <span>Problem Recurrence & Root-Cause Intelligence Alert</span>
              <Badge variant="warning" className="ml-auto text-[10px] uppercase">Cross-Solution Overlap</Badge>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              AI Intelligence & Spatial Clustering identified that this societal issue shares direct geographic or structural root-causes with previously addressed civic challenges. Municipal field teams and university researchers must verify whether past interventions experienced partial effectiveness or external recurrence before deploying identical measures.
            </p>
          </div>
        )}

        {/* Linked Execution Project Cockpit Banner */}
        {challenge.projects && challenge.projects.length > 0 && (
          <div className="p-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-blue-200" />
                <span className="font-bold text-sm">Active Execution Project: {challenge.projects[0].title}</span>
                <Badge className="bg-blue-500/50 text-white text-[10px] uppercase">{challenge.projects[0].status}</Badge>
              </div>
              <p className="text-xs text-blue-100">
                Phase 5 multi-phase prototype, automated test suite, pilot metrics, 8-point deployment gate, and outcome tracking.
              </p>
            </div>
            <Link href={`/projects/${challenge.projects[0].id}`}>
              <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs shrink-0">
                Open Project Cockpit <ExternalLink className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        )}

        {/* AI Problem Intelligence Panel */}
        <Card className="border-indigo-100 bg-indigo-50/20">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-indigo-600" />
                <CardTitle className="text-base text-slate-900">AI Problem Intelligence (Gemini Engine)</CardTitle>
              </div>
              <div>
                {challenge.aiAnalysis?.status === 'COMPLETED' ? (
                  <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] font-semibold">
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Gemini Analysis Complete
                  </Badge>
                ) : challenge.aiAnalysis?.status === 'PROCESSING' || challenge.aiAnalysis?.status === 'PENDING' ? (
                  <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-[10px] font-semibold">
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Processing in Queue
                  </Badge>
                ) : challenge.aiAnalysis?.status === 'UNAVAILABLE' ? (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 text-[10px] font-semibold">
                    <AlertTriangle className="w-3 h-3 mr-1" /> AI Offline / Fallback Mode
                  </Badge>
                ) : challenge.aiAnalysis?.status === 'FAILED' ? (
                  <Badge className="bg-rose-100 text-rose-800 border-rose-300 text-[10px] font-semibold">
                    <XCircle className="w-3 h-3 mr-1" /> Analysis Failed
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-[10px]">
                    Not Analyzed
                  </Badge>
                )}
              </div>
            </div>
            <CardDescription className="text-xs">
              Structured civic intelligence and root-cause indicators informing government validation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs">
            {aiNotice && (
              <div
                className={`p-2.5 rounded text-xs border ${
                  aiNotice.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {aiNotice.message}
              </div>
            )}

            {challenge.aiAnalysis?.status === 'COMPLETED' ? (
              <>
                <div className="p-3 bg-white rounded-lg border border-indigo-100 space-y-1">
                  <span className="font-bold text-slate-700 block">Technical Problem Formulation:</span>
                  <p className="text-slate-800 font-medium">
                    {challenge.aiAnalysis.rawResponse?.normalizedStatement || challenge.title}
                  </p>
                </div>

                {challenge.aiAnalysis.rawResponse?.rootCauseHypotheses &&
                  Array.isArray(challenge.aiAnalysis.rawResponse.rootCauseHypotheses) &&
                  challenge.aiAnalysis.rawResponse.rootCauseHypotheses.length > 0 && (
                    <div className="p-3 bg-white rounded-lg border border-indigo-100 space-y-1">
                      <span className="font-bold text-slate-700 block">Root-Cause Hypotheses:</span>
                      <ul className="list-disc pl-4 text-slate-700 space-y-0.5">
                        {challenge.aiAnalysis.rawResponse.rootCauseHypotheses.map((hyp: string, i: number) => (
                          <li key={i}>{hyp}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                {challenge.aiAnalysis.rawResponse?.mitigationSuggestions &&
                  Array.isArray(challenge.aiAnalysis.rawResponse.mitigationSuggestions) &&
                  challenge.aiAnalysis.rawResponse.mitigationSuggestions.length > 0 && (
                    <div className="p-3 bg-white rounded-lg border border-indigo-100 space-y-1">
                      <span className="font-bold text-slate-700 block">Recommended Mitigations:</span>
                      <ul className="list-disc pl-4 text-slate-700 space-y-0.5">
                        {challenge.aiAnalysis.rawResponse.mitigationSuggestions.map((mit: string, i: number) => (
                          <li key={i}>{mit}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-indigo-100">
                  <span>Confidence Score: {((challenge.aiAnalysis.confidenceScore || 0.75) * 100).toFixed(0)}%</span>
                  <span>Human Oversight: {challenge.aiAnalysis.requiresHumanReview ? 'Mandatory' : 'Optional'}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                    onClick={handleTriggerAi}
                    disabled={isTriggeringAi}
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${isTriggeringAi ? 'animate-spin' : ''}`} />
                    {isTriggeringAi ? 'Re-analyzing...' : 'Re-analyze'}
                  </Button>
                </div>
              </>
            ) : challenge.aiAnalysis?.status === 'UNAVAILABLE' ? (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-slate-700 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>AI Intelligence Temporarily Unavailable</span>
                </div>
                <p className="text-slate-600">
                  {challenge.aiAnalysis?.reasoningSummary ||
                    'AI analysis is temporarily unavailable (Gemini unconfigured). Government officers can validate directly using field evidence.'}
                </p>
                <div className="pt-1 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">
                    Civic workflows remain 100% operational in honest manual fallback mode.
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-amber-300 text-amber-900 hover:bg-amber-100"
                    onClick={handleTriggerAi}
                    disabled={isTriggeringAi}
                  >
                    <RefreshCw className={`w-3 h-3 mr-1 ${isTriggeringAi ? 'animate-spin' : ''}`} />
                    {isTriggeringAi ? 'Retrying...' : 'Retry AI Analysis'}
                  </Button>
                </div>
              </div>
            ) : challenge.aiAnalysis?.status === 'PROCESSING' || challenge.aiAnalysis?.status === 'PENDING' ? (
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200 text-slate-700 space-y-2">
                <div className="flex items-center gap-1.5 font-semibold text-blue-800">
                  <RefreshCw className="w-4 h-4 shrink-0 text-blue-600 animate-spin" />
                  <span>AI Problem Intelligence in Progress</span>
                </div>
                <p className="text-slate-600">
                  This problem statement has been queued for background analysis by the Gemini worker.
                </p>
                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-blue-300 text-blue-900 hover:bg-blue-100"
                    onClick={fetchDetails}
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Check Status
                  </Button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-slate-700 space-y-2">
                <p className="text-slate-600">
                  This problem statement has not yet been processed by the Gemini problem intelligence engine.
                </p>
                <div>
                  <Button
                    size="sm"
                    className="h-7 text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={handleTriggerAi}
                    disabled={isTriggeringAi}
                  >
                    <Sparkles className="w-3 h-3 mr-1" />
                    {isTriggeringAi ? 'Dispatching Analysis...' : 'Run Gemini Analysis'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Relationship Intelligence & Clustering Cockpit */}
        <Card className="border-blue-200 bg-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-sm font-bold text-slate-900">
                  Relationship Intelligence & Clustering Cockpit ({challenge.relationships?.length || 0})
                </CardTitle>
              </div>
              <div className="flex items-center gap-1.5">
                {(user?.role === 'GOVERNMENT_OFFICER' || user?.role === 'SYSTEM_ADMIN') && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
                    onClick={() => setShowMergeModal(true)}
                  >
                    <Layers className="w-3.5 h-3.5 mr-1" />
                    Consolidate / Merge
                  </Button>
                )}
              </div>
            </div>
            <CardDescription className="text-xs text-slate-500">
              7-factor explainable intelligence detecting duplicates, upstream root causes, and recurring civic patterns.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1 pb-4">
            {challenge.relationships && challenge.relationships.length > 0 ? (
              challenge.relationships.map((rel, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-slate-50/80 border border-slate-200 space-y-2 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900 hover:text-blue-600">
                        {rel.sourceChallengeTitle || rel.targetChallengeTitle || 'Linked Incident Report'}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                        <Badge variant="secondary" className="text-[10px] font-semibold">
                          {rel.relationType}
                        </Badge>
                        <Badge
                          className={`text-[10px] font-semibold ${
                            rel.status === 'MERGED'
                              ? 'bg-purple-100 text-purple-800'
                              : rel.status === 'APPROVED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : rel.status === 'REVERSED'
                              ? 'bg-slate-100 text-slate-600 line-through'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {rel.status}
                        </Badge>
                        {rel.distanceMeters != null && (
                          <span className="font-medium text-amber-700 bg-amber-50 px-1 rounded">
                            📍 {rel.distanceMeters < 1000 ? `${rel.distanceMeters}m` : `${(rel.distanceMeters / 1000).toFixed(1)}km`}
                          </span>
                        )}
                        {rel.sharedInfrastructure && (
                          <span className="font-medium text-indigo-700 bg-indigo-50 px-1 rounded">
                            🔗 {rel.sharedInfrastructure}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-slate-700">
                        {Math.round(rel.confidenceScore * 100)}% Confidence
                      </span>
                      <Link
                        href={`/challenges/${rel.sourceChallengeId === challenge.id ? rel.targetChallengeId : rel.sourceChallengeId}`}
                        target="_blank"
                        className="p-1 rounded text-blue-600 hover:bg-blue-50"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>

                  <p className="text-slate-600 bg-white p-2 rounded border border-slate-100">
                    <strong className="text-slate-800">Explainable Rationale:</strong> {rel.reasoning}
                  </p>

                  {/* 7-Factor Breakdown Pills if available */}
                  {rel.factorBreakdown && (
                    <div className="flex flex-wrap gap-1 pt-1 text-[10px]">
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                        Problem: {rel.factorBreakdown.problemSimilarity}%
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                        Location: {rel.factorBreakdown.locationSimilarity}%
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100">
                        Category: {rel.factorBreakdown.categoryCompatibility}%
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                        Infra: {rel.factorBreakdown.infrastructureOverlap}%
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100">
                        Root Cause: {rel.factorBreakdown.rootCauseSimilarity}%
                      </span>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 italic py-2">
                No active duplicates or systemic relationships detected yet. The problem remains tracked as an independent incident.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Phase 5 Citizen Outcome Verification & Ground Truth Card */}
        {(['IN_PILOT', 'DEPLOYED', 'RESOLVED'].includes(challenge.status) || (challenge.projects && challenge.projects.length > 0)) && (
          <Card className="border-emerald-200 bg-gradient-to-b from-white to-emerald-50/20">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-600 text-white">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900">
                      Citizen Outcome Verification & Ground Truth
                    </CardTitle>
                    <CardDescription className="text-xs text-slate-500">
                      Community verification prevents artificial success claims. Citizens evaluate if deployed solutions genuinely solved the problem.
                    </CardDescription>
                  </div>
                </div>
                <Badge variant={challenge.status === 'RESOLVED' ? 'success' : 'secondary'} className="self-start sm:self-auto text-xs font-bold">
                  {challenge.status === 'RESOLVED' ? 'Officially Verified & Resolved' : 'Active Field Verification'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
              {/* Feedback Statistics / Summary */}
              {feedbacks.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Community Reports</span>
                    <span className="text-xl font-bold text-slate-900">{feedbacks.length}</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Avg Satisfaction</span>
                    <span className="text-xl font-bold text-amber-600">
                      {(feedbacks.reduce((acc, f) => acc + (f.rating || 0), 0) / feedbacks.length).toFixed(1)} / 5.0
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Resolved/Improved</span>
                    <span className="text-xl font-bold text-emerald-600">
                      {Math.round((feedbacks.filter(f => f.problemStatus === 'YES' || f.problemStatus === 'PARTIALLY').length / feedbacks.length) * 100)}%
                    </span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Recurrence Reported</span>
                    <span className="text-xl font-bold text-rose-600">
                      {feedbacks.filter(f => f.isRecurrenceReported).length}
                    </span>
                  </div>
                </div>
              )}

              {/* Form for Citizen Verification */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 text-amber-500 fill-current" />
                    <h4 className="font-bold text-sm text-slate-900">Submit Your Community Field Verification</h4>
                  </div>
                  {feedbackSuccess && (
                    <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                      ✓ Feedback Submitted Successfully
                    </span>
                  )}
                </div>

                {user ? (
                  <form onSubmit={handleSubmitCitizenFeedback} className="space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <label className="font-bold text-slate-700 block">Did the deployed solution solve or improve the problem in your area?</label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {[
                          { val: CitizenProblemStatus.YES, label: 'Yes, Fully Resolved', bg: 'hover:border-emerald-500' },
                          { val: CitizenProblemStatus.PARTIALLY, label: 'Partially Improved', bg: 'hover:border-amber-500' },
                          { val: CitizenProblemStatus.NO, label: 'No, Problem Persists', bg: 'hover:border-rose-500' },
                          { val: CitizenProblemStatus.NOT_SURE, label: 'Not Sure / Evaluating', bg: 'hover:border-slate-500' },
                        ].map(opt => (
                          <button
                            key={opt.val}
                            type="button"
                            onClick={() => setFeedbackForm(prev => ({ ...prev, problemStatus: opt.val }))}
                            className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                              feedbackForm.problemStatus === opt.val
                                ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-1 ring-blue-600 font-bold'
                                : `border-slate-200 text-slate-700 bg-white ${opt.bg}`
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Overall Satisfaction (1–5)</label>
                        <select
                          value={feedbackForm.rating}
                          onChange={e => setFeedbackForm(prev => ({ ...prev, rating: Number(e.target.value) }))}
                          className="w-full h-9 rounded-lg border border-slate-300 px-2.5 bg-white text-xs"
                        >
                          {[5, 4, 3, 2, 1].map(n => (
                            <option key={n} value={n}>{n} - {n === 5 ? 'Exceptional' : n === 4 ? 'Good' : n === 3 ? 'Acceptable' : n === 2 ? 'Poor' : 'Unacceptable'}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Solution Effectiveness (1–5)</label>
                        <select
                          value={feedbackForm.effectivenessRating}
                          onChange={e => setFeedbackForm(prev => ({ ...prev, effectivenessRating: Number(e.target.value) }))}
                          className="w-full h-9 rounded-lg border border-slate-300 px-2.5 bg-white text-xs"
                        >
                          {[5, 4, 3, 2, 1].map(n => (
                            <option key={n} value={n}>{n} - {n >= 4 ? 'Highly Effective' : n === 3 ? 'Moderate' : 'Ineffective'}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="font-semibold text-slate-700">Noticeable Improvement (1–5)</label>
                        <select
                          value={feedbackForm.improvementRating}
                          onChange={e => setFeedbackForm(prev => ({ ...prev, improvementRating: Number(e.target.value) }))}
                          className="w-full h-9 rounded-lg border border-slate-300 px-2.5 bg-white text-xs"
                        >
                          {[5, 4, 3, 2, 1].map(n => (
                            <option key={n} value={n}>{n} - {n >= 4 ? 'Great Improvement' : n === 3 ? 'Slight' : 'No Noticeable Change'}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Detailed Community Observations / Field Report *</label>
                      <textarea
                        rows={3}
                        required
                        value={feedbackForm.comments}
                        onChange={e => setFeedbackForm(prev => ({ ...prev, comments: e.target.value }))}
                        placeholder="Describe ground reality: e.g. Water flow restored at nominal pressure, but tap filtration still discharges slight sediment in morning hours..."
                        className="w-full p-2.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-semibold text-slate-700">Unresolved Issues or Remaining Gaps (Optional)</label>
                      <input
                        type="text"
                        value={feedbackForm.unresolvedIssues}
                        onChange={e => setFeedbackForm(prev => ({ ...prev, unresolvedIssues: e.target.value }))}
                        placeholder="e.g. Street lighting on northern lane still flickers."
                        className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="checkbox"
                        id="recurrenceCheck"
                        checked={feedbackForm.isRecurrenceReported}
                        onChange={e => setFeedbackForm(prev => ({ ...prev, isRecurrenceReported: e.target.checked }))}
                        className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                      />
                      <label htmlFor="recurrenceCheck" className="text-slate-700 font-semibold text-xs cursor-pointer">
                        Flag this as a Problem Recurrence (Issue returned after initial repair/deployment)
                      </label>
                    </div>

                    <div className="flex justify-end pt-2">
                      <Button type="submit" isLoading={feedbackSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                        <CheckCircle2 className="w-4 h-4 mr-1.5" /> Submit Field Verification
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-4 text-xs text-slate-500 space-y-2">
                    <p>Log in as a verified citizen or resident to register community field observations.</p>
                    <Link href="/login">
                      <Button size="sm" variant="outline">Log In to Verify</Button>
                    </Link>
                  </div>
                )}
              </div>

              {/* List of Verified Community Feedback */}
              {feedbacks.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                    Verified Citizen Field Observations ({feedbacks.length})
                  </h4>
                  <div className="space-y-2">
                    {feedbacks.map(f => (
                      <div key={f.id} className="p-3 bg-white rounded-lg border border-slate-200 text-xs space-y-1.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">{f.citizenName || 'Verified Citizen'}</span>
                            <Badge
                              variant={
                                f.problemStatus === 'YES'
                                  ? 'success'
                                  : f.problemStatus === 'PARTIALLY'
                                  ? 'warning'
                                  : f.problemStatus === 'NO'
                                  ? 'destructive'
                                  : 'secondary'
                              }
                              className="text-[10px]"
                            >
                              {f.problemStatus === 'YES' ? 'Resolved' : f.problemStatus === 'PARTIALLY' ? 'Partial' : f.problemStatus === 'NO' ? 'Not Improved' : 'Evaluating'}
                            </Badge>
                            {f.isRecurrenceReported && (
                              <Badge variant="destructive" className="text-[10px]">
                                Recurrence Flagged
                              </Badge>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(f.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-slate-700 italic bg-slate-50 p-2 rounded border border-slate-100">
                          &quot;{f.comments}&quot;
                        </p>
                        {f.unresolvedIssues && (
                          <div className="text-[11px] text-rose-700 font-medium">
                            Remaining Gap: {f.unresolvedIssues}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <ZeroDeadEndNotice
          whatHappened={`Challenge "${challenge.title}" is in "${challenge.status}" state.`}
          currentStatus={challenge.status}
          whyStatus={
            challenge.status === 'DRAFT'
              ? 'Draft status allows the citizen to edit and add evidence before formal submission.'
              : challenge.status === 'SUBMITTED'
              ? 'Awaiting review queue assignment by municipal or district government officer.'
              : challenge.status === 'UNDER_GOV_REVIEW'
              ? 'Government officer is actively assessing legal jurisdiction, urgency, and resource allocation.'
              : challenge.status === 'NEEDS_MORE_INFO'
              ? 'Government officer has requested supplementary evidence or clarification from submitter.'
              : challenge.status === 'APPROVED'
              ? 'Officially approved by government authority. Awaiting university allocation.'
              : challenge.status === 'MERGED_INTO_SYSTEMIC'
              ? 'Grouped into a higher-level systemic civic issue with shared infrastructure.'
              : 'Formally rejected by government authority with logged administrative justification.'
          }
          whoIsResponsible={
            challenge.status === 'DRAFT' || challenge.status === 'NEEDS_MORE_INFO'
              ? 'Citizen Submitter'
              : challenge.status === 'SUBMITTED' || challenge.status === 'UNDER_GOV_REVIEW'
              ? 'Government Officer'
              : 'System Administrator'
          }
          whatHappensIfIdle={
            challenge.status === 'DRAFT'
              ? 'Draft remains private indefinitely until submitter takes action.'
              : 'Escalation notification is delivered to the supervisory department officer.'
          }
          whatCanDoNext={[
            'Review Immutable Audit Trail',
            'Download Evidence Attachments',
            'View Linked Government Policy',
          ]}
        />

        <Card className="border-blue-200 bg-blue-50/20">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-600" />
              Authorized State Transitions
            </CardTitle>
            <CardDescription>
              Actions available based on active role: <strong>{user?.role || 'Guest (Read Only)'}</strong>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {challenge.status === 'DRAFT' && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => executeTransition(ChallengeStatus.SUBMITTED)}
                  isLoading={isSubmittingAction}
                >
                  Submit Challenge for Formal Review
                </Button>
                <span className="text-xs text-slate-500">Submits to government queue</span>
              </div>
            )}

            {challenge.status === 'SUBMITTED' && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => executeTransition(ChallengeStatus.UNDER_GOV_REVIEW)}
                  isLoading={isSubmittingAction}
                >
                  Begin Government Review
                </Button>
                <span className="text-xs text-slate-500">Claims problem for formal evaluation</span>
              </div>
            )}

            {challenge.status === 'UNDER_GOV_REVIEW' && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700">
                    Official Reason / Review Justification (Required for Reject & Info Request)
                  </label>
                  <input
                    type="text"
                    value={actionReason}
                    onChange={e => setActionReason(e.target.value)}
                    placeholder="e.g. Field inspection confirmed contamination; approving for university water lab pilot."
                    className="flex h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="primary"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={() => executeTransition(ChallengeStatus.APPROVED)}
                    isLoading={isSubmittingAction}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Approve Challenge
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => executeTransition(ChallengeStatus.NEEDS_MORE_INFO, true)}
                    isLoading={isSubmittingAction}
                  >
                    <AlertTriangle className="w-4 h-4 mr-1.5" /> Request Information
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => executeTransition(ChallengeStatus.REJECTED, true)}
                    isLoading={isSubmittingAction}
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Reject Challenge
                  </Button>
                </div>
              </div>
            )}

            {challenge.status === 'NEEDS_MORE_INFO' && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => executeTransition(ChallengeStatus.SUBMITTED)}
                  isLoading={isSubmittingAction}
                >
                  Resubmit With Requested Info
                </Button>
                <span className="text-xs text-slate-500">Sends back to review queue</span>
              </div>
            )}

            {challenge.status === 'APPROVED' && (
              <p className="text-xs font-semibold text-emerald-700">
                ✓ Challenge is approved. Foundational lifecycle complete; ready for university matching.
              </p>
            )}

            {challenge.status === 'REJECTED' && (
              <p className="text-xs font-semibold text-rose-700">
                ✕ Challenge was formally rejected. The administrative reason is recorded in the immutable timeline below.
              </p>
            )}

            {challenge.status === 'MERGED_INTO_SYSTEMIC' && (
              <p className="text-xs font-semibold text-purple-700">
                ⚑ Challenge merged into systemic civic issue. Follow updates via the parent systemic issue.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              State Machine Audit & Timeline
            </CardTitle>
            <CardDescription>Chronological sequence of verified transitions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {challenge.timelines && challenge.timelines.length > 0 ? (
              <div className="space-y-3 relative pl-6 border-l-2 border-slate-200">
                {challenge.timelines.map((t, idx) => (
                  <div key={idx} className="relative space-y-1">
                    <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-blue-600 ring-4 ring-white" />
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        {t.fromStatus} → {t.toStatus}
                      </span>
                      <Badge variant="secondary" className="text-[10px]">
                        {t.actorRole}
                      </Badge>
                      <span className="text-[11px] text-slate-400 ml-auto">
                        {new Date(t.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {t.reason && (
                      <p className="text-xs text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100">
                        &quot;{t.reason}&quot;
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No previous state transitions recorded.</p>
            )}
          </CardContent>
        </Card>

        {/* Systemic Merge Modal */}
        {showMergeModal && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">Elevate to Systemic Civic Issue</h3>
                <p className="text-xs text-slate-500">
                  Group this challenge with a related challenge into a parent regional systemic issue.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Systemic Issue Title</label>
                  <input
                    type="text"
                    value={mergeTitle}
                    onChange={e => setMergeTitle(e.target.value)}
                    placeholder="e.g. Ward-Wide Drinking Water Pipeline Contamination"
                    className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Second Challenge UUID</label>
                  <input
                    type="text"
                    value={mergeSecondId}
                    onChange={e => setMergeSecondId(e.target.value)}
                    placeholder="e.g. 123e4567-e89b-12d3-a456-426614174000"
                    className="w-full h-9 rounded-lg border border-slate-300 px-3 text-xs font-mono focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">Administrative Justification</label>
                  <textarea
                    rows={3}
                    value={mergeReason}
                    onChange={e => setMergeReason(e.target.value)}
                    placeholder="Physical site inspection confirmed both challenges stem from the main sewer line junction."
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setShowMergeModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleExecuteMerge} isLoading={isSubmittingAction}>
                  Confirm Systemic Grouping
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
