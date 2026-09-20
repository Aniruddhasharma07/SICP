'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  XCircle,
  AlertOctagon,
  BookOpen,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';
import { Button } from '../ui/Button';

export interface HistoricalFailureWarningProps {
  memoryId?: string;
  solutionTitle?: string;
  intendedOutcome?: string;
  observedOutcome?: string;
  failureFactors?: string[] | string;
  knownLimitations?: string;
  institutionalLesson?: string;
  onReviewEvidence?: (memoryId?: string) => void;
  className?: string;
}

export function HistoricalFailureWarning({
  memoryId,
  solutionTitle = 'Historical Engineering Intervention',
  intendedOutcome,
  observedOutcome,
  failureFactors,
  knownLimitations,
  institutionalLesson,
  onReviewEvidence,
  className = '',
}: HistoricalFailureWarningProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const failureList = Array.isArray(failureFactors)
    ? failureFactors
    : typeof failureFactors === 'string'
    ? [failureFactors]
    : [];

  return (
    <div
      className={`rounded-xl border border-rose-300 bg-rose-50/50 p-4 sm:p-5 text-slate-800 shadow-xs space-y-3.5 ${className}`}
      data-testid="historical-failure-warning"
    >
      {/* Warning Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-200/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-rose-600 text-white shrink-0">
            <AlertOctagon className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-rose-900">
                Historical Failure Warning
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200/80 text-rose-950 border border-rose-300">
                Institutional Memory Alert
              </span>
            </div>
            <h3 className="text-sm font-bold text-rose-950 mt-0.5">
              Previous Attempt Failed: {solutionTitle}
            </h3>
          </div>
        </div>

        {memoryId && (
          <Link href={`/solutions/${memoryId}`}>
            <Button
              variant="outline"
              size="sm"
              className="text-xs border-rose-300 hover:bg-rose-100 text-rose-900 shrink-0 h-7"
            >
              <span>View Case Dossier</span>
              <ExternalLink className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        )}
      </div>

      {/* Core Warning Content */}
      <div className="space-y-2 text-xs">
        <p className="text-slate-700 leading-relaxed font-medium">
          A similar engineering approach was implemented for this problem domain previously but failed to achieve sustainable operational outcomes.
          Review the documented failure factors below to prevent repeating known pitfalls.
        </p>

        {/* Failure Factors Pills / List */}
        {failureList.length > 0 && (
          <div className="space-y-1 pt-1">
            <span className="text-[10px] uppercase font-bold text-rose-800 tracking-wider">
              Documented Failure Factors:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {failureList.map((factor, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-md bg-white border border-rose-200 text-rose-900 text-xs font-medium"
                >
                  ⚠ {factor}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Institutional Lesson Highlight */}
        {institutionalLesson && (
          <div className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs space-y-1 mt-2 shadow-xs">
            <div className="flex items-center gap-1.5 text-rose-300 font-bold text-[10px] uppercase tracking-wider">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Evidence-Backed Institutional Lesson</span>
            </div>
            <p className="text-slate-200 font-medium leading-relaxed">
              &ldquo;{institutionalLesson}&rdquo;
            </p>
          </div>
        )}

        {/* Expandable Limitations */}
        {isExpanded && (
          <div className="space-y-2 pt-2 border-t border-rose-200/60 animate-in fade-in">
            {intendedOutcome && (
              <div>
                <span className="font-bold text-slate-700">Intended Outcome: </span>
                <span className="text-slate-600">{intendedOutcome}</span>
              </div>
            )}
            {observedOutcome && (
              <div>
                <span className="font-bold text-slate-700">Observed Real-World Outcome: </span>
                <span className="text-rose-800">{observedOutcome}</span>
              </div>
            )}
            {knownLimitations && (
              <div>
                <span className="font-bold text-slate-700">Known Technical Limitations: </span>
                <span className="text-slate-600">{knownLimitations}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Toggle */}
      <div className="flex items-center justify-between pt-1 text-xs">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-rose-800 hover:text-rose-950 font-semibold flex items-center gap-1"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Hide Details</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Examine Failure Evidence & Boundaries</span>
            </>
          )}
        </button>

        {onReviewEvidence && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onReviewEvidence(memoryId)}
            className="text-xs text-rose-700 hover:text-rose-900 hover:bg-rose-100/50 h-7"
          >
            Review Evidence Chain
          </Button>
        )}
      </div>
    </div>
  );
}
