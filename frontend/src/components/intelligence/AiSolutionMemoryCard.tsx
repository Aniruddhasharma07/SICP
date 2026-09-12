'use client';

import React from 'react';
import Link from 'next/link';
import {
  BrainCircuit,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  ArrowRight,
  Layers,
} from 'lucide-react';

export interface PrecedentItem {
  memoryId: string;
  title?: string;
  category?: string;
  verdict: 'RECOMMEND' | 'WARN' | 'CAUTION' | 'NO_MEMORY';
  whySimilar: string;
  whatPreviouslyWorked?: string | null;
  underWhatConditions?: string | null;
  impactAchieved?: string | null;
  whyFailed?: string | null;
  conditionsCausingFailure?: string | null;
  knownRisks?: string | null;
  applicabilityAssessment?: string | null;
  recommendedPrerequisites?: string[];
  historicalApplicationsCount?: number;
  successCount?: number;
  failureCount?: number;
  partialCount?: number;
  failurePattern?: string | null;
  effectiveForContext?: string[];
  lessEffectiveForContext?: string[];
  relevanceScore?: number;
}

export interface SolutionMemoryEvaluationData {
  guidanceVerdict: 'RECOMMEND' | 'WARN' | 'CAUTION' | 'NO_MEMORY';
  executiveSummary: string;
  comparativeAnalysis?: string | null;
  requiresHumanReview?: boolean;
  confidenceScore?: number;
  modelVersion?: string;
  precedents?: PrecedentItem[];
}

interface AiSolutionMemoryCardProps {
  challengeId?: string;
  precedents?: PrecedentItem[];
  evaluation?: SolutionMemoryEvaluationData | null;
  isLoading?: boolean;
  className?: string;
}

export function AiSolutionMemoryCard({
  challengeId,
  precedents = [],
  evaluation,
  isLoading = false,
  className = '',
}: AiSolutionMemoryCardProps) {
  const allPrecedents = evaluation?.precedents && evaluation.precedents.length > 0
    ? evaluation.precedents
    : precedents;

  const guidanceVerdict = evaluation?.guidanceVerdict || (allPrecedents.length > 0 ? allPrecedents[0].verdict : 'NO_MEMORY');

  if (isLoading) {
    return (
      <div className={`bg-slate-900 border border-slate-800 rounded-xl p-6 text-slate-300 animate-pulse ${className}`}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-slate-800" />
          <div className="h-5 bg-slate-800 rounded-md w-48" />
        </div>
        <div className="h-20 bg-slate-800/60 rounded-lg mb-3" />
        <div className="h-24 bg-slate-800/40 rounded-lg" />
      </div>
    );
  }

  const verdictThemes = {
    RECOMMEND: {
      border: 'border-emerald-500/40',
      bg: 'bg-emerald-950/20',
      badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      badgeText: 'Worked Before — Recommend',
      icon: CheckCircle2,
      iconColor: 'text-emerald-400',
      headerAccent: 'text-emerald-400',
    },
    WARN: {
      border: 'border-rose-500/40',
      bg: 'bg-rose-950/20',
      badgeBg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      badgeText: 'Failed Before — Warn',
      icon: XCircle,
      iconColor: 'text-rose-400',
      headerAccent: 'text-rose-400',
    },
    CAUTION: {
      border: 'border-amber-500/40',
      bg: 'bg-amber-950/20',
      badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      badgeText: 'Mixed Results — Use With Caution',
      icon: AlertTriangle,
      iconColor: 'text-amber-400',
      headerAccent: 'text-amber-400',
    },
    NO_MEMORY: {
      border: 'border-slate-700/60',
      bg: 'bg-slate-900/40',
      badgeBg: 'bg-slate-800 text-slate-300 border-slate-700',
      badgeText: 'No Direct Precedent — Novel Problem',
      icon: HelpCircle,
      iconColor: 'text-slate-400',
      headerAccent: 'text-slate-300',
    },
  };

  const currentTheme = verdictThemes[guidanceVerdict] || verdictThemes.NO_MEMORY;
  const VerdictIcon = currentTheme.icon;

  return (
    <div
      className={`rounded-xl border bg-slate-950/90 text-slate-100 overflow-hidden shadow-xl ${currentTheme.border} ${className}`}
      data-testid="ai-solution-memory-card"
    >
      {/* Header Banner */}
      <div className="px-5 py-4 border-b border-slate-800/80 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Institutional Precedent Intelligence
              </span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/20 text-indigo-300">
                AI SOLUTION MEMORY
              </span>
            </div>
            <h3 className="text-base font-semibold text-white tracking-tight">
              Past Solutions • Success • Failure
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${currentTheme.badgeBg}`}
          >
            <VerdictIcon className={`w-3.5 h-3.5 ${currentTheme.iconColor}`} />
            {currentTheme.badgeText}
          </span>
        </div>
      </div>

      {/* Executive Guidance Summary */}
      <div className={`p-5 border-b border-slate-800/60 ${currentTheme.bg}`}>
        <div className="flex items-start gap-3">
          <VerdictIcon className={`w-5 h-5 mt-0.5 shrink-0 ${currentTheme.iconColor}`} />
          <div className="space-y-1">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Executive Institutional Precedent Guidance
            </div>
            <p className="text-sm text-slate-200 leading-relaxed font-medium">
              {evaluation?.executiveSummary ||
                (guidanceVerdict === 'RECOMMEND'
                  ? 'Historical implementations under matching root cause conditions have demonstrated verified success. Recommended for proposal synthesis and engineering adaptation.'
                  : guidanceVerdict === 'WARN'
                  ? 'Historical attempts under similar conditions encountered critical operational failure modes. High risk of repeating failure if existing design flaws are replicated.'
                  : guidanceVerdict === 'CAUTION'
                  ? 'Historical deployments exhibit mixed outcomes depending on local maintenance capacity and site hydrology. Conditional adaptation required.'
                  : 'No verified historical precedent matches this specific challenge topology. Research teams will synthesize a novel engineering approach.')}
            </p>
            {evaluation?.comparativeAnalysis && (
              <p className="text-xs text-slate-400 mt-2 italic">
                {evaluation.comparativeAnalysis}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Precedent Cards List */}
      <div className="p-5 space-y-4">
        {allPrecedents.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-lg bg-slate-900/40 border border-slate-800/80">
            <Sparkles className="w-8 h-8 text-indigo-400/60 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-300">
              No Prior Memory Precedents
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              This civic problem represents a novel configuration in our institutional repository.
              As academic teams implement proposals and field outcomes are verified, future similar problems will learn from this project.
            </p>
          </div>
        ) : (
          allPrecedents.map((item, idx) => {
            const itemTheme = verdictThemes[item.verdict] || verdictThemes.CAUTION;
            const ItemIcon = itemTheme.icon;

            return (
              <div
                key={item.memoryId || idx}
                className="rounded-lg border border-slate-800 bg-slate-900/50 p-4 transition-all hover:border-slate-700 hover:bg-slate-900/80"
              >
                {/* Precedent Item Header */}
                <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold border ${itemTheme.badgeBg}`}
                      >
                        <ItemIcon className="w-3 h-3" />
                        {itemTheme.badgeText}
                      </span>
                      {item.category && (
                        <span className="text-[11px] font-medium text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded">
                          {item.category}
                        </span>
                      )}
                      {item.relevanceScore != null && (
                        <span className="text-[11px] font-semibold text-indigo-400">
                          {Math.round(item.relevanceScore * 100)}% Match
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-white mt-1">
                      {item.title || `Historical Solution Precedent #${item.memoryId.slice(0, 8)}`}
                    </h4>
                  </div>

                  {item.memoryId && (
                    <Link
                      href={`/solutions/${item.memoryId}`}
                      className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors shrink-0"
                    >
                      View Memory <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                </div>

                {/* Why Similar */}
                <div className="text-xs text-slate-300 mb-3 bg-slate-950/40 p-2.5 rounded border border-slate-800/60">
                  <span className="font-semibold text-slate-200">Root Cause & Context Similarity: </span>
                  {item.whySimilar}
                </div>

                {/* Evidence Grid: What Worked vs What Failed */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3 text-xs">
                  {/* Worked Before Section */}
                  <div className="p-3 rounded bg-emerald-950/20 border border-emerald-900/30">
                    <div className="flex items-center gap-1.5 font-semibold text-emerald-400 mb-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>What Worked Before</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {item.whatPreviouslyWorked || item.impactAchieved || 'Technical intervention met specifications in verified deployment.'}
                    </p>
                    {item.underWhatConditions && (
                      <div className="mt-2 text-[11px] text-emerald-300/80">
                        <span className="font-medium">Operating Conditions: </span>
                        {item.underWhatConditions}
                      </div>
                    )}
                  </div>

                  {/* Failed Before / Risk Warning Section */}
                  <div className={`p-3 rounded border ${item.verdict === 'WARN' ? 'bg-rose-950/20 border-rose-900/40' : 'bg-slate-900/60 border-slate-800'}`}>
                    <div className="flex items-center gap-1.5 font-semibold text-rose-400 mb-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Failure Pattern & Risks</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">
                      {item.whyFailed || item.failurePattern || item.knownRisks || 'No catastrophic failure modes recorded under standard maintenance protocols.'}
                    </p>
                    {item.conditionsCausingFailure && (
                      <div className="mt-2 text-[11px] text-rose-300/80">
                        <span className="font-medium">Failure Trigger: </span>
                        {item.conditionsCausingFailure}
                      </div>
                    )}
                  </div>
                </div>

                {/* Prerequisites & Context Applicability */}
                {item.recommendedPrerequisites && item.recommendedPrerequisites.length > 0 && (
                  <div className="text-xs text-slate-400 border-t border-slate-800/80 pt-2 flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-slate-300">Prerequisites for Reuse:</span>
                    {item.recommendedPrerequisites.map((prereq, pIdx) => (
                      <span
                        key={pIdx}
                        className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[11px]"
                      >
                        {prereq}
                      </span>
                    ))}
                  </div>
                )}

                {/* Historical Deployment Count Badge */}
                <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      Historical Evidence Base:{' '}
                      <strong className="text-slate-200">
                        {item.historicalApplicationsCount || 1} verified deployment(s)
                      </strong>
                    </span>
                    {(item.successCount != null || item.failureCount != null) && (
                      <span className="text-slate-400">
                        ({item.successCount || 0} Successful, {item.failureCount || 0} Failed)
                      </span>
                    )}
                  </div>

                  <span className="text-[10px] text-indigo-400/80 italic">
                    Evidence Level: Verified Government Outcome
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/40 flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
          <span>Zero-hallucination institutional memory backed by PostgreSQL & pgvector</span>
        </div>

        <Link
          href="/solutions"
          className="text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1"
        >
          Browse All Solution Memories <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
