'use client';

import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Layers,
  Sparkles,
  Info,
  Clock,
  ExternalLink,
  X,
  FileText,
  Award,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ChallengeIntelligenceDto, HistoricalRecommendationDto } from '@sicp/shared';
import { ExtendedChallenge } from './ProblemWorkspace';
import { apiClient } from '../../lib/api-client';

interface SolutionMemoryPanelProps {
  challenge: ExtendedChallenge;
  intelligence?: ChallengeIntelligenceDto | null;
  historicalSolutions?: HistoricalRecommendationDto[];
  historicalEvaluation?: any;
  loadingHistorical?: boolean;
  onInspectPrecedent?: (memory: any) => void;
}

export function SolutionMemoryPanel({
  challenge,
  intelligence,
  historicalSolutions = [],
  historicalEvaluation,
  loadingHistorical = false,
  onInspectPrecedent,
}: SolutionMemoryPanelProps) {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'WORKED' | 'NOT_WORKED' | 'MIXED'>('ALL');
  const [liveFetchedMatches, setLiveFetchedMatches] = useState<any[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [inspectingPrecedent, setInspectingPrecedent] = useState<any | null>(null);

  // Combine intelligence matches, passed historical solutions, and live fallback
  const intelMatches = intelligence?.memory?.matches || [];

  const historicalMapped = historicalSolutions.map((hs) => ({
    id: hs.memoryId,
    title: hs.title,
    domain: hs.challengeCategory || challenge.category,
    similarityScore: hs.relevanceScore,
    outcome:
      hs.outcomeStatus === 'SUCCESSFUL' || (hs.outcomeStatus as string) === 'EFFECTIVE'
        ? 'PREVIOUSLY_WORKED'
        : hs.outcomeStatus === 'FAILED'
        ? 'NOT_WORKED'
        : 'MIXED_OUTCOME',
    summary: hs.technicalApproach || hs.problemSummary || hs.title,
    intervention: hs.technicalApproach,
    reusableComponents: hs.recommendedPrerequisites || ['Engineering Protocol', 'Field Specification'],
    whatWorked: hs.whatWorked,
    whatFailed: hs.whatFailed,
    knownLimitations: hs.knownLimitations,
    lessonsLearned: hs.lessonsLearned,
    reusabilityScore: hs.reusabilityScore,
    evidenceLevel: hs.evidenceLevel,
  }));

  // Direct live fetch from backend if neither intelligence matches nor historical mapped is available
  useEffect(() => {
    if (intelMatches.length === 0 && historicalMapped.length === 0 && challenge.id) {
      setLiveLoading(true);
      apiClient
        .request<any>(`/api/v1/problems/challenges/${challenge.id}/solution-memory`)
        .then((res) => {
          if (res.success && res.data?.challengeLevel && res.data.challengeLevel.length > 0) {
            setLiveFetchedMatches(
              res.data.challengeLevel.map((m: any) => ({
                id: m.id,
                title: m.title,
                domain: m.domain || challenge.category,
                similarityScore: m.relevanceScore || 0.82,
                outcome: m.classification || 'PREVIOUSLY_WORKED',
                summary: m.intervention || m.title,
                intervention: m.intervention,
                reusableComponents: ['Municipal Blueprint', 'Standard Operating Protocol'],
                whatWorked: m.whatWorked,
                whatFailed: m.whatFailed,
                knownLimitations: m.knownLimitations,
                lessonsLearned: m.lessonsLearned,
                reusabilityScore: m.reusabilityScore,
              }))
            );
          } else {
            // Also try historical challenge endpoint
            apiClient
              .request<HistoricalRecommendationDto[]>(`/api/v1/solutions/historical/challenge/${challenge.id}`)
              .then((histRes) => {
                if (histRes.success && histRes.data && histRes.data.length > 0) {
                  setLiveFetchedMatches(
                    histRes.data.map((hs) => ({
                      id: hs.memoryId,
                      title: hs.title,
                      domain: hs.challengeCategory || challenge.category,
                      similarityScore: hs.relevanceScore,
                      outcome:
                        hs.outcomeStatus === 'SUCCESSFUL' || (hs.outcomeStatus as string) === 'EFFECTIVE'
                          ? 'PREVIOUSLY_WORKED'
                          : hs.outcomeStatus === 'FAILED'
                          ? 'NOT_WORKED'
                          : 'MIXED_OUTCOME',
                      summary: hs.technicalApproach || hs.problemSummary || hs.title,
                      intervention: hs.technicalApproach,
                      reusableComponents: hs.recommendedPrerequisites || ['Engineering Protocol', 'Field Specification'],
                      whatWorked: hs.whatWorked,
                      whatFailed: hs.whatFailed,
                      knownLimitations: hs.knownLimitations,
                      lessonsLearned: hs.lessonsLearned,
                      reusabilityScore: hs.reusabilityScore,
                      evidenceLevel: hs.evidenceLevel,
                    }))
                  );
                }
              })
              .catch(() => {});
          }
        })
        .catch(() => {})
        .finally(() => setLiveLoading(false));
    }
  }, [challenge.id, intelMatches.length, historicalMapped.length, challenge.category]);

  const matches =
    intelMatches.length > 0
      ? intelMatches
      : historicalMapped.length > 0
      ? historicalMapped
      : liveFetchedMatches;

  // Categorize matches into 3 AI-grounded buckets
  const workedSolutions = matches.filter((m) =>
    ['PREVIOUSLY_WORKED', 'SUCCESSFUL', 'EFFECTIVE', 'WORKED', 'HIGHLY_EFFECTIVE'].includes(
      (m.outcome || '').toUpperCase()
    )
  );

  const notWorkedSolutions = matches.filter((m) =>
    ['NOT_WORKED', 'FAILED', 'INEFFECTIVE', 'REJECTED'].includes(
      (m.outcome || '').toUpperCase()
    )
  );

  const mixedSolutions = matches.filter(
    (m) => !workedSolutions.includes(m) && !notWorkedSolutions.includes(m)
  );

  const filteredMatches =
    activeFilter === 'WORKED'
      ? workedSolutions
      : activeFilter === 'NOT_WORKED'
      ? notWorkedSolutions
      : activeFilter === 'MIXED'
      ? mixedSolutions
      : matches;

  // Group-level solution memories (symptom level)
  const groupMemories = (challenge.problemGroups || []).flatMap((g: any) =>
    (g.solutionMemories || []).map((sm: any) => ({ ...sm, groupTitle: g.title }))
  );

  const handleOpenDetails = (item: any) => {
    if (onInspectPrecedent) {
      onInspectPrecedent(item);
    } else {
      setInspectingPrecedent(item);
    }
  };

  return (
    <div className="space-y-6">
      {/* SECTION 1: Systemic Root-Cause Solution Memory (Challenge Level) */}
      <section className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Systemic Solution Memory
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Live Repository Precedents
              </span>
              {(loadingHistorical || liveLoading) && (
                <span className="text-[10px] text-slate-400 animate-pulse font-medium">
                  Querying live memory...
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              AI Evaluated Intervention Precedents
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Historical engineering outcomes and proven blueprints for this problem category across municipal deployments.
            </p>
          </div>

          {/* 3-Bucket Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All ({matches.length})
            </button>
            <button
              onClick={() => setActiveFilter('WORKED')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                activeFilter === 'WORKED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Worked ({workedSolutions.length})
            </button>
            <button
              onClick={() => setActiveFilter('NOT_WORKED')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                activeFilter === 'NOT_WORKED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
              }`}
            >
              <XCircle className="w-3 h-3" />
              Not Worked ({notWorkedSolutions.length})
            </button>
            <button
              onClick={() => setActiveFilter('MIXED')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                activeFilter === 'MIXED'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Mixed ({mixedSolutions.length})
            </button>
          </div>
        </div>

        {filteredMatches.length === 0 ? (
          <div className="py-8 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 space-y-2">
            <BookOpen className="w-7 h-7 text-slate-400 mx-auto opacity-70" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No matching solution precedents in this category filter.
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Switch to "All ({matches.length})" to inspect all live historical engineering precedents across municipal sectors.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredMatches.map((item, idx) => {
              const isWorked = workedSolutions.includes(item);
              const isNotWorked = notWorkedSolutions.includes(item);

              return (
                <div
                  key={item.id || idx}
                  className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between space-y-3 shadow-2xs ${
                    isWorked
                      ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/25 dark:bg-emerald-950/10'
                      : isNotWorked
                      ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/25 dark:bg-rose-950/10'
                      : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/25 dark:bg-amber-950/10'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {item.title}
                      </h4>
                      <Badge
                        className={`text-[10px] font-bold border-none shrink-0 ${
                          isWorked
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                            : isNotWorked
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                        }`}
                      >
                        {isWorked ? 'Worked' : isNotWorked ? 'Not Worked' : 'Mixed Outcome'}
                      </Badge>
                    </div>

                    <p className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-relaxed line-clamp-3">
                      {(item as any).summary ||
                        (item as any).intervention ||
                        (item.reusableComponents && item.reusableComponents.length > 0
                          ? `Protocol: ${item.reusableComponents.join(', ')}`
                          : 'Recorded engineering intervention protocol.')}
                    </p>

                    {item.whatWorked && isWorked && (
                      <div className="text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-950/40 p-2 rounded-lg">
                        <strong>Proven Factor:</strong> {item.whatWorked}
                      </div>
                    )}

                    {item.whatFailed && isNotWorked && (
                      <div className="text-[11px] text-rose-800 dark:text-rose-300 bg-rose-100/60 dark:bg-rose-950/40 p-2 rounded-lg">
                        <strong>Failure Mode:</strong> {item.whatFailed}
                      </div>
                    )}
                  </div>

                  <div className="pt-2.5 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    <span className="truncate max-w-[60%]">
                      Domain: <strong className="text-slate-700 dark:text-slate-300">{item.domain || challenge.category}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenDetails(item)}
                      className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer shrink-0"
                    >
                      <span>Inspect Precedent</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: Problem Group Symptom-Level Solution Memory */}
      <section className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Symptom-Level Solution Memory
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Problem Group Level
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              Group Remediations & Immediate Field Mitigations
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Specific remediations recorded for localized symptom clusters (distinct from systemic root-cause interventions).
            </p>
          </div>
        </div>

        {groupMemories.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-400" />
              Symptom-level mitigations stored per problem group.
            </p>
            <p className="text-slate-500 text-[11.5px]">
              When individual problem clusters (e.g. surface cold-patching or drain desilting) are carried out, their specific outcomes are archived at the problem-group tier without polluting the systemic root-cause hypothesis.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {groupMemories.map((gm: any, idx: number) => (
              <div
                key={gm.id || idx}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{gm.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({gm.groupTitle})</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{gm.intervention}</p>
                </div>
                <Badge className="text-[10px] bg-slate-100 dark:bg-slate-800 border-none font-semibold">
                  {gm.classification?.replace(/_/g, ' ') || 'PREVIOUSLY_WORKED'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* IN-PLACE PRECEDENT INSPECTION MODAL */}
      {inspectingPrecedent && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
        >
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                  Solution Precedent Dossier
                </span>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {inspectingPrecedent.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setInspectingPrecedent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200">
                {inspectingPrecedent.domain || challenge.category}
              </Badge>
              <Badge
                className={
                  inspectingPrecedent.outcome === 'PREVIOUSLY_WORKED'
                    ? 'bg-emerald-100 text-emerald-800'
                    : inspectingPrecedent.outcome === 'NOT_WORKED'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }
              >
                {inspectingPrecedent.outcome?.replace(/_/g, ' ') || 'PREVIOUSLY WORKED'}
              </Badge>
              {inspectingPrecedent.similarityScore && (
                <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  Relevance: {Math.round(inspectingPrecedent.similarityScore * 100)}%
                </Badge>
              )}
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <div className="font-bold text-slate-900 dark:text-slate-100 mb-1">
                  Technical Approach &amp; Intervention Protocol
                </div>
                <p>
                  {inspectingPrecedent.intervention ||
                    inspectingPrecedent.summary ||
                    'Standard verified engineering protocol documented on municipal memory ledger.'}
                </p>
              </div>

              {inspectingPrecedent.whatWorked && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-emerald-800 dark:text-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>What Worked (Verified Outcome)</span>
                  </div>
                  <p>{inspectingPrecedent.whatWorked}</p>
                </div>
              )}

              {inspectingPrecedent.whatFailed && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-rose-800 dark:text-rose-300">
                    <XCircle className="w-3.5 h-3.5" />
                    <span>What Failed &amp; Engineering Caveats</span>
                  </div>
                  <p>{inspectingPrecedent.whatFailed}</p>
                </div>
              )}

              {inspectingPrecedent.knownLimitations && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200">
                  <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Known Operational Limitations</span>
                  </div>
                  <p>{inspectingPrecedent.knownLimitations}</p>
                </div>
              )}

              {inspectingPrecedent.lessonsLearned && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800">
                  <div className="font-bold text-slate-900 dark:text-slate-100 mb-1">
                    Institutional Lessons Learned
                  </div>
                  <p>{inspectingPrecedent.lessonsLearned}</p>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectingPrecedent(null)}
                className="text-xs"
              >
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

