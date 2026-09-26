'use client';

import React, { use } from 'react';
import { useRouter } from 'next/navigation';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { Button } from '../../../src/components/ui/Button';
import { useAuth } from '../../../src/lib/auth-context';
import { ProblemWorkspace } from '../../../src/components/problem/ProblemWorkspace';
import { useProblemIntelligence } from '../../../src/hooks/useProblemIntelligence';

export default function ChallengeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const pi = useProblemIntelligence(resolvedParams.id);

  if (pi.loading) {
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

  if (!pi.challenge) {
    return (
      <AppLayout>
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
          <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center space-y-4 text-slate-100 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-100">Problem Record Not Found</h2>
            <p className="text-xs text-slate-400">
              {pi.error || 'The requested challenge ID does not exist in the SICP registry.'}
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
        challenge={pi.challenge}
        currentUser={user}
        hasVoted={pi.hasVoted}
        voteCount={pi.voteCount}
        isVoting={pi.isVoting}
        onToggleVote={pi.handleToggleVote}
        actionReason={pi.actionReason}
        onChangeActionReason={pi.setActionReason}
        onExecuteTransition={pi.handleExecuteTransition}
        isSubmittingAction={pi.isSubmittingAction}
        feedbacks={pi.feedbacks}
        feedbackForm={pi.feedbackForm}
        onChangeFeedbackForm={pi.setFeedbackForm}
        onSubmitCitizenFeedback={pi.handleSubmitCitizenFeedback}
        feedbackSubmitting={pi.feedbackSubmitting}
        feedbackSuccess={pi.feedbackSuccess}
        historicalSolutions={pi.historicalSolutions}
        historicalEvaluation={pi.historicalEvaluation}
        loadingHistorical={pi.loadingHistorical}
        activeRecurrenceSignal={pi.activeRecurrenceSignal}
        isTriggeringAi={pi.isTriggeringAi}
        onTriggerAi={pi.handleTriggerAi}
        aiNotice={pi.aiNotice}
        onExecuteMerge={pi.handleExecuteMerge}
        // Enriched Systemic, AMCH, Topology & Collaboration
        linkedGraph={pi.linkedGraph}
        hypotheses={pi.hypotheses}
        selectedHypothesisId={pi.selectedHypothesisId}
        onSelectHypothesis={hyp => pi.setSelectedHypothesisId(hyp.id)}
        sentinelProbes={pi.sentinelProbes}
        onSendSentinelResponse={pi.handleSendSentinelResponse}
        isLoadingSentinel={pi.isLoadingSentinel}
        branchDifferentialDeduction={pi.branchDifferentialDeduction}
        universityMatches={pi.universityMatches}
        industryMatches={pi.industryMatches}
        loadingCollaboration={pi.loadingCollaboration}
      />
    </AppLayout>
  );
}
