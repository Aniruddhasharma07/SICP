'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Scale,
  FileSearch,
  ShieldCheck,
  Award,
  Sparkles,
  BookOpen,
  ArrowRight,
  Info,
  MapPin,
  Clock,
  Layers,
} from 'lucide-react';
import {
  MemoryOutcomeStatus,
  ReusabilityClass,
  EvidenceLevel,
  HistoricalRecommendationDto,
} from '@sicp/shared';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export interface SolutionMemoryCardProps {
  memory: HistoricalRecommendationDto | any;
  currentProblemContext?: {
    title?: string;
    description?: string;
    category?: string;
    district?: string;
  };
  onCompare?: (memoryId: string) => void;
  onReviewEvidence?: (memoryId: string) => void;
  showCompareAction?: boolean;
  compact?: boolean;
  className?: string;
}

export function SolutionMemoryCard({
  memory,
  currentProblemContext,
  onCompare,
  onReviewEvidence,
  showCompareAction = true,
  compact = false,
  className = '',
}: SolutionMemoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);

  // Normalize Guidance State into 4 canonical states
  const outcome = String(memory.outcomeStatus || '').toUpperCase();
  const guidance = String(memory.guidanceVerdict || '').toUpperCase();
  const reusability = String(memory.reusabilityClass || '').toUpperCase();

  let stateVariant: 'WORKED' | 'FAILED' | 'MIXED' | 'REVIEW' = 'REVIEW';
  let stateLabel = 'Requires Review';
  let secondaryLabel = 'Insufficient evidence / Under evaluation';
  let stateBorder = 'border-slate-300';
  let stateBadgeBg = 'bg-slate-100 text-slate-700 border-slate-300';
  let StateIcon = HelpCircle;
  let iconColor = 'text-slate-500';

  if (
    guidance === 'WARN' ||
    outcome === 'FAILED' ||
    outcome === 'INEFFECTIVE' ||
    reusability === 'NOT_RECOMMENDED'
  ) {
    stateVariant = 'FAILED';
    stateLabel = 'Failed Before';
    secondaryLabel = 'Warn about previous failure';
    stateBorder = 'border-rose-300';
    stateBadgeBg = 'bg-rose-50 text-rose-800 border-rose-200';
    StateIcon = XCircle;
    iconColor = 'text-rose-600';
  } else if (
    guidance === 'CAUTION' ||
    outcome === 'PARTIALLY_EFFECTIVE' ||
    outcome === 'PARTIAL_SUCCESS' ||
    reusability === 'REQUIRES_ADAPTATION' ||
    reusability === 'CONDITIONALLY_REUSABLE' ||
    (memory.failureCount && memory.failureCount > 0)
  ) {
    stateVariant = 'MIXED';
    stateLabel = 'Mixed / Context-Dependent';
    secondaryLabel = 'Use with caution / Requires adaptation';
    stateBorder = 'border-amber-300';
    stateBadgeBg = 'bg-amber-50 text-amber-800 border-amber-200';
    StateIcon = AlertTriangle;
    iconColor = 'text-amber-600';
  } else if (
    guidance === 'RECOMMEND' ||
    outcome === 'SUCCESSFUL' ||
    outcome === 'EFFECTIVE' ||
    outcome === 'SUCCESS' ||
    reusability === 'HIGHLY_REUSABLE'
  ) {
    stateVariant = 'WORKED';
    stateLabel = 'Worked Before';
    secondaryLabel = 'Recommend as reference';
    stateBorder = 'border-emerald-300';
    stateBadgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-200';
    StateIcon = CheckCircle2;
    iconColor = 'text-emerald-600';
  }

  // Extract separate confidence indicators
  const aiUnderstandingPct = Math.round(
    ((memory.matchBreakdown?.problemSimilarity || memory.relevanceScore || 0.85) * 100)
  );
  const historicalRelevancePct = Math.round(
    ((memory.relevanceScore || 0.82) * 100)
  );
  const evidenceLevelStr = String(memory.evidenceLevel || 'CALCULATED').replace(/_/g, ' ');

  const reusabilityScore = memory.reusabilityScore ?? 75;

  return (
    <div
      className={`rounded-xl border bg-white shadow-xs transition-all hover:shadow-md ${stateBorder} ${className}`}
      data-testid={`solution-memory-card-${memory.memoryId || memory.id}`}
    >
      {/* Top Meta Bar */}
      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${stateBadgeBg}`}>
            <StateIcon className={`w-3.5 h-3.5 ${iconColor}`} />
            <span>{stateLabel}</span>
          </span>
          <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">
            • {secondaryLabel}
          </span>
        </div>

        {/* 3 Separate Confidences Bar */}
        <div className="flex items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1" title="How accurately the AI identified the problem structure">
            <span className="text-slate-400 font-medium">AI Understanding:</span>
            <span className="font-bold text-slate-800">{aiUnderstandingPct}%</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1" title="Similarity to historical problem context">
            <span className="text-slate-400 font-medium">Relevance:</span>
            <span className="font-bold text-blue-700">{historicalRelevancePct}%</span>
          </div>
          <span className="text-slate-300">|</span>
          <div className="flex items-center gap-1" title="Audit and verification rigor of the outcome">
            <span className="text-slate-400 font-medium">Evidence:</span>
            <span className="font-bold text-emerald-700 uppercase text-[10px]">{evidenceLevelStr}</span>
          </div>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-4 sm:p-5 space-y-3.5">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                {memory.challengeCategory || 'Civic Infrastructure'}
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-0.5 leading-snug">
                {memory.title}
              </h3>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Reusability</span>
              <span className="text-sm font-black text-slate-800">{reusabilityScore}/100</span>
            </div>
          </div>
          <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
            {memory.problemSummary || memory.summary}
          </p>
        </div>

        {/* Technical Approach & Root Cause Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Root Cause Addressed</span>
            <p className="font-medium text-slate-800 mt-0.5">{memory.rootCause || 'Unspecified systemic defect'}</p>
          </div>
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Technical Approach Applied</span>
            <p className="font-medium text-slate-800 mt-0.5">{memory.technicalApproach || 'Municipal pilot blueprint'}</p>
          </div>
        </div>

        {/* Explainability: "WHY THIS PRECEDENT?" */}
        <div className="bg-blue-50/50 border border-blue-100 p-2.5 rounded-lg text-xs space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-blue-900 text-[11px]">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>WHY THIS PRECEDENT WAS SELECTED</span>
          </div>
          <p className="text-slate-700 text-[11px] leading-relaxed">
            {memory.explanation || 'Matches problem category, infrastructure domain, and root cause profile.'}
          </p>
          <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] font-medium text-slate-600">
            {memory.challengeCategory && (
              <span className="px-1.5 py-0.5 rounded bg-white border border-blue-200 text-blue-800">
                ✓ Category: {memory.challengeCategory}
              </span>
            )}
            {memory.matchBreakdown?.rootCauseAlignment && memory.matchBreakdown.rootCauseAlignment > 0.4 && (
              <span className="px-1.5 py-0.5 rounded bg-white border border-blue-200 text-blue-800">
                ✓ Root Cause Aligned
              </span>
            )}
            {memory.matchBreakdown?.geographicContext && memory.matchBreakdown.geographicContext > 0.7 && (
              <span className="px-1.5 py-0.5 rounded bg-white border border-blue-200 text-blue-800">
                ✓ Regional Catchment Match
              </span>
            )}
            {memory.whatFailed && (
              <span className="px-1.5 py-0.5 rounded bg-amber-100 border border-amber-200 text-amber-900">
                ⚠ Known Constraints Documented
              </span>
            )}
          </div>
        </div>

        {/* High-visibility Failure Warning or Success Factors */}
        {stateVariant === 'FAILED' && (memory.whatFailed || memory.historicalWarning) && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-start gap-2 text-rose-900 text-xs">
            <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-800">Why It Failed Previously: </span>
              <span>{memory.whatFailed || memory.historicalWarning}</span>
            </div>
          </div>
        )}

        {stateVariant === 'MIXED' && memory.historicalWarning && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-amber-900 text-xs">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-800">Operational Caution: </span>
              <span>{memory.historicalWarning}</span>
            </div>
          </div>
        )}

        {/* Institutional Lesson (Signature Experience) */}
        {memory.lessonsLearned && (
          <div className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs space-y-1 shadow-xs">
            <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-[10px] uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Institutional Lesson</span>
            </div>
            <p className="text-slate-200 font-medium leading-relaxed">
              &ldquo;{memory.lessonsLearned}&rdquo;
            </p>
          </div>
        )}

        {/* Expanded Deep Dossier Details */}
        {isExpanded && (
          <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
            {/* What Worked & What Failed Side-by-Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg">
                <span className="font-bold text-emerald-800 block mb-1">What Worked</span>
                <p className="text-emerald-950">
                  {memory.whatWorked || memory.verifiedImpact || 'Demonstrated operational effectiveness in pilot.'}
                </p>
              </div>
              <div className="p-2.5 bg-rose-50/60 border border-rose-200 rounded-lg">
                <span className="font-bold text-rose-800 block mb-1">What Failed / Limitations</span>
                <p className="text-rose-950">
                  {memory.whatFailed || memory.knownLimitations || 'No persistent structural failure recorded.'}
                </p>
              </div>
            </div>

            {/* Prerequisites */}
            {Array.isArray(memory.recommendedPrerequisites) && memory.recommendedPrerequisites.length > 0 && (
              <div className="text-xs space-y-1">
                <span className="font-bold text-slate-700">Implementation Prerequisites:</span>
                <ul className="list-disc list-inside space-y-0.5 text-slate-600 text-[11px]">
                  {memory.recommendedPrerequisites.map((p: string, idx: number) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Historical Application Stats */}
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1">
              <span>Applications: <strong className="text-slate-800">{memory.historicalApplicationsCount || 1}</strong></span>
              <span>Successes: <strong className="text-emerald-700">{memory.successCount || 1}</strong></span>
              <span>Failures: <strong className="text-rose-700">{memory.failureCount || 0}</strong></span>
              <span>Partials: <strong className="text-amber-700">{memory.partialCount || 0}</strong></span>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>Show Less</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>View Full Evidence & History</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-2">
            {showCompareAction && onCompare && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onCompare(memory.memoryId || memory.id)}
                className="h-7 text-xs border-slate-300 hover:bg-slate-50"
              >
                <Scale className="w-3.5 h-3.5 mr-1" />
                <span>Compare</span>
              </Button>
            )}

            <Link href={`/solutions/${memory.memoryId || memory.id}`}>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="h-7 text-xs flex items-center gap-1"
              >
                <span>Review Applicability</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
