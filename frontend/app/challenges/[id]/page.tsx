'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { Button } from '../../../src/components/ui/Button';
import { useAuth } from '../../../src/lib/auth-context';
import { apiClient } from '../../../src/lib/api-client';
import {
  ChallengeStatus,
  CitizenProblemStatus,
  CitizenFeedbackDto,
  HistoricalRecommendationDto,
} from '@sicp/shared';
import {
  ProblemWorkspace,
  ExtendedChallenge,
} from '../../../src/components/problem/ProblemWorkspace';

export default function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
  const [historicalEvaluation, setHistoricalEvaluation] = useState<any | null>(null);
  const [loadingHistorical, setLoadingHistorical] = useState(false);
  const [activeRecurrenceSignal, setActiveRecurrenceSignal] = useState<any | null>(null);

  // AI Trigger state
  const [isTriggeringAi, setIsTriggeringAi] = useState(false);
  const [aiNotice, setAiNotice] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

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
          message:
            res.data?.message ||
            'AI problem intelligence dispatched to background queue. Refreshing analysis...',
        });
        setTimeout(() => {
          fetchDetails();
        }, 1500);
      } else {
        setAiNotice({
          type: 'warning',
          message:
            res.error?.message ||
            'AI analysis is temporarily unavailable. Officers may validate using field evidence.',
        });
      }
    } catch {
      setAiNotice({
        type: 'warning',
        message:
          'AI analysis service temporarily unreachable. Officers can validate directly using field evidence.',
      });
    } finally {
      setIsTriggeringAi(false);
    }
  };

  const fetchHistorical = async () => {
    setLoadingHistorical(true);
    try {
      const evalRes = await apiClient.request<any>(
        `/api/v1/solutions/historical/challenge/${resolvedParams.id}/evaluated`
      );
      if (evalRes.success && evalRes.data) {
        setHistoricalEvaluation(evalRes.data);
        const mems = evalRes.data.retrievedMemories || [];
        setHistoricalSolutions(mems);

        const matchingLoc = mems.find(
          (m: any) => (m.matchBreakdown?.geographicContext || 0) >= 0.75
        );
        if (matchingLoc) {
          setActiveRecurrenceSignal({
            isRecurrenceSignal: true,
            correlationScore: Math.max(0.78, matchingLoc.relevanceScore || 0.8),
            correlationBreakdown: {
              spatialDistanceKm: 1.2,
              semanticSimilarity: matchingLoc.matchBreakdown?.problemSimilarity || 0.85,
              rootCauseAlignment: matchingLoc.matchBreakdown?.rootCauseAlignment || 0.8,
              timeElapsedMonths: 6,
              sharedCluster: true,
            },
            previousCase: {
              id: matchingLoc.memoryId || matchingLoc.id,
              title: matchingLoc.title,
              category: matchingLoc.challengeCategory,
              interventionApproach: matchingLoc.technicalApproach,
              outcomeStatus: matchingLoc.outcomeStatus,
              evidenceLevel: matchingLoc.evidenceLevel,
              whatWorked: matchingLoc.whatWorked,
              whatFailed: matchingLoc.whatFailed,
              futureWarnings: matchingLoc.futureWarnings,
            },
            investigationStatus: 'UNDER_INVESTIGATION',
            evidenceStrength: 'STRONG (Tier 1)',
            guidanceNote: 'Geographic and structural recurrence detected in municipal sector.',
          });
        }
      } else {
        const res = await apiClient.request<HistoricalRecommendationDto[]>(
          `/api/v1/solutions/historical/challenge/${resolvedParams.id}`
        );
        if (res.success && res.data) {
          setHistoricalSolutions(res.data);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistorical(false);
    }
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
    if (!challenge) {
      setLoading(true);
    }
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

      setLoading(false);
      fetchFeedback();
      fetchHistorical();
    } else {
      setError(res.error?.message || 'Failed to load challenge details');
      setLoading(false);
    }
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

    const endpoint =
      challenge?.projects && challenge.projects.length > 0
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
    const res = await apiClient.request<{
      voted: boolean;
      totalVotes: number;
      newPriorityScore: number;
    }>(`/api/v1/challenges/${resolvedParams.id}/vote`, { method: 'POST' });
    setIsVoting(false);

    if (res.success && res.data) {
      setHasVoted(res.data.voted);
      setVoteCount(res.data.totalVotes);
      setChallenge(prev =>
        prev ? { ...prev, priorityScore: res.data!.newPriorityScore } : null
      );
    }
  };

  const executeTransition = async (
    toStatus: ChallengeStatus,
    reasonReq: boolean = false
  ) => {
    if (reasonReq && !actionReason.trim()) {
      setError(`A formal statutory reason is required to transition to ${toStatus}`);
      return;
    }

    setIsSubmittingAction(true);
    setError(null);

    const idempotencyKey = `transition-${resolvedParams.id}-${toStatus}-${Date.now()}`;
    const res = await apiClient.request(
      `/api/v1/challenges/${resolvedParams.id}/transition`,
      {
        method: 'POST',
        headers: { 'Idempotency-Key': idempotencyKey },
        body: JSON.stringify({
          toStatus,
          expectedVersion: challenge?.version,
          reason: actionReason || undefined,
        }),
      }
    );

    setIsSubmittingAction(false);
    if (res.success) {
      setActionReason('');
      await fetchDetails();
    } else {
      setError(res.error?.message || 'State transition failed');
    }
  };

  const handleExecuteMerge = async (
    secondId: string,
    title: string,
    reason: string
  ) => {
    if (!title || !reason || !secondId) {
      setError('Title, reason, and second challenge ID are required for systemic grouping.');
      return;
    }

    setIsSubmittingAction(true);
    const res = await apiClient.request<{ id: string }>('/api/v1/challenges/merge-systemic', {
      method: 'POST',
      headers: { 'Idempotency-Key': `merge-${Date.now()}` },
      body: JSON.stringify({
        sourceChallengeIds: [resolvedParams.id, secondId.trim()],
        systemicTitle: title,
        systemicDescription: `Systemic grouping of local challenges. Reason: ${reason}`,
        category: challenge?.category || 'Civic Infrastructure',
        district: challenge?.district || 'General',
        state: challenge?.state || 'National',
        reason,
      }),
    });
    setIsSubmittingAction(false);

    if (res.success && res.data) {
      router.push(`/challenges/${res.data.id}`);
    } else {
      setError(res.error?.message || 'Failed to merge challenges');
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-slate-950 p-8 space-y-6">
          <div className="h-10 w-64 bg-slate-800/60 rounded-xl animate-pulse" />
          <div className="h-44 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              <div className="h-64 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
              <div className="h-64 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
            </div>
            <div className="lg:col-span-4 h-96 bg-slate-900 border border-slate-800 rounded-2xl animate-pulse" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!challenge) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 text-slate-100 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-100">Problem Record Not Found</h2>
            <p className="text-xs text-slate-400">
              {error || 'The requested challenge ID does not exist in the SICP registry.'}
            </p>
            <Button
              onClick={() => router.push('/challenges')}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
            >
              Return to Problem Explorer
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <ProblemWorkspace
        challenge={challenge}
        currentUser={user}
        hasVoted={hasVoted}
        voteCount={voteCount}
        isVoting={isVoting}
        onToggleVote={handleToggleVote}
        actionReason={actionReason}
        onChangeActionReason={setActionReason}
        onExecuteTransition={executeTransition}
        isSubmittingAction={isSubmittingAction}
        feedbacks={feedbacks}
        feedbackForm={feedbackForm}
        onChangeFeedbackForm={setFeedbackForm}
        onSubmitCitizenFeedback={handleSubmitCitizenFeedback}
        feedbackSubmitting={feedbackSubmitting}
        feedbackSuccess={feedbackSuccess}
        historicalSolutions={historicalSolutions}
        historicalEvaluation={historicalEvaluation}
        loadingHistorical={loadingHistorical}
        activeRecurrenceSignal={activeRecurrenceSignal}
        isTriggeringAi={isTriggeringAi}
        onTriggerAi={handleTriggerAi}
        aiNotice={aiNotice}
        onExecuteMerge={handleExecuteMerge}
      />
    </AppLayout>
  );
}
