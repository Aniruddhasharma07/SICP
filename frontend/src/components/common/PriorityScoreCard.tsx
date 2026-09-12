'use client';

import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  Flame,
  AlertTriangle,
  Users,
  Clock,
  ThumbsUp,
  BrainCircuit,
  ShieldCheck,
  ChevronRight,
  Sliders,
  X,
} from 'lucide-react';
import { PriorityLevel, SeverityLevel } from '@sicp/shared';

export interface PriorityBreakdownProps {
  score: number;
  level?: PriorityLevel | string;
  severity?: SeverityLevel | string;
  affectedPopulation?: number | null;
  durationMonths?: number | null;
  supportVotesCount?: number;
  aiExplanation?: string | null;
  isCalibratedByGov?: boolean;
  governmentNotes?: string | null;
  className?: string;
  showInspectButton?: boolean;
  compact?: boolean;
}

export function PriorityScoreCard({
  score,
  severity = SeverityLevel.MODERATE,
  affectedPopulation = 100,
  durationMonths = 3,
  supportVotesCount = 0,
  aiExplanation,
  isCalibratedByGov = false,
  governmentNotes,
  className,
  showInspectButton = true,
  compact = false,
}: PriorityBreakdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const safeScore = Math.min(100, Math.max(0, Math.round(score || 0)));

  const sevVal = (severity || 'MODERATE').toUpperCase();
  const severityScore = sevVal === 'CRITICAL' ? 24 : sevVal === 'MAJOR' ? 18 : sevVal === 'MODERATE' ? 12 : 6;
  
  const pop = affectedPopulation || 0;
  const populationScore = pop >= 10000 ? 24 : pop >= 1000 ? 20 : pop >= 200 ? 15 : pop >= 50 ? 10 : 5;

  const urgencyScore = sevVal === 'CRITICAL' ? 19 : sevVal === 'MAJOR' ? 15 : 10;
  
  const votes = supportVotesCount || 0;
  const communityScore = Math.min(15, Math.max(2, Math.round(Math.log10(votes + 1) * 7) || 4));

  const dur = durationMonths || 1;
  const durationScore = Math.min(15, Math.max(2, dur >= 12 ? 14 : dur >= 6 ? 11 : dur >= 3 ? 8 : 4));

  const colorTheme = safeScore >= 80
    ? {
        border: 'border-rose-200',
        bg: 'bg-rose-50/60',
        badgeBg: 'bg-rose-600 text-white',
        text: 'text-rose-700',
        bar: 'bg-rose-600',
        label: 'CRITICAL PRIORITY',
      }
    : safeScore >= 60
    ? {
        border: 'border-amber-200',
        bg: 'bg-amber-50/60',
        badgeBg: 'bg-amber-500 text-slate-950 font-bold',
        text: 'text-amber-800',
        bar: 'bg-amber-500',
        label: 'HIGH PRIORITY',
      }
    : safeScore >= 35
    ? {
        border: 'border-blue-200',
        bg: 'bg-blue-50/60',
        badgeBg: 'bg-blue-600 text-white',
        text: 'text-blue-700',
        bar: 'bg-blue-600',
        label: 'MEDIUM PRIORITY',
      }
    : {
        border: 'border-slate-200',
        bg: 'bg-slate-50/60',
        badgeBg: 'bg-slate-600 text-white',
        text: 'text-slate-700',
        bar: 'bg-slate-500',
        label: 'LOW PRIORITY',
      };

  const renderModal = () => {
    if (!isOpen) return null;

    return (
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
        <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                  <Flame className="w-5 h-5" />
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Civic Priority Score Breakdown
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Deterministic 5-factor evaluation compliant with municipal statutory SLAs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-slate-600 text-lg font-bold p-1 rounded-lg hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className={cn('p-4 rounded-xl border flex items-center justify-between', colorTheme.border, colorTheme.bg)}>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Composite Priority Score
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className={cn('text-3xl font-black font-mono', colorTheme.text)}>{safeScore}</span>
                <span className="text-xs text-slate-400 font-mono">/ 100</span>
                <Badge className={cn('text-[10px] font-bold', colorTheme.badgeBg)}>
                  {colorTheme.label}
                </Badge>
              </div>
            </div>
            <div className="text-right text-xs space-y-0.5">
              <div className="text-slate-500 text-[11px]">Calculated SLA Deadline</div>
              <div className="font-mono font-bold text-slate-800">
                {safeScore >= 80 ? '24 Hours (Urgent Triage)' : safeScore >= 60 ? '48 Hours (Standard Review)' : '72 Hours (Municipal Queue)'}
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Multi-Factor Weights</span>
              <span className="text-[10px] font-medium text-slate-500">Sum: 100 pts max</span>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  1. Severity Level (25% weight)
                </span>
                <span className="font-mono font-bold text-slate-900">{severityScore} / 25 pts</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-rose-500 h-full rounded-full" style={{ width: `${(severityScore / 25) * 100}%` }} />
              </div>
              <p className="text-[11px] text-slate-500">
                Assessed severity is <strong>{severity}</strong>. Physical hazard criticality and disruption to life safety.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-500" />
                  2. Affected Population Footprint (25% weight)
                </span>
                <span className="font-mono font-bold text-slate-900">{populationScore} / 25 pts</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${(populationScore / 25) * 100}%` }} />
              </div>
              <p className="text-[11px] text-slate-500">
                Approximately <strong>{(affectedPopulation || 0).toLocaleString()} citizens</strong> directly affected in localized catchment.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                  3. Urgency &amp; Rapid Escalation (20% weight)
                </span>
                <span className="font-mono font-bold text-slate-900">{urgencyScore} / 20 pts</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: `${(urgencyScore / 20) * 100}%` }} />
              </div>
              <p className="text-[11px] text-slate-500">
                Active seasonal risk, structural collapse potential, or health contagion threshold.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ThumbsUp className="w-3.5 h-3.5 text-indigo-500" />
                  4. Community Support &amp; Co-Signatures (15% weight)
                </span>
                <span className="font-mono font-bold text-slate-900">{communityScore} / 15 pts</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${(communityScore / 15) * 100}%` }} />
              </div>
              <p className="text-[11px] text-slate-500">
                Supported by <strong>{supportVotesCount || 0} community members</strong> with anti-spam deduplicated verification.
              </p>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-purple-500" />
                  5. Problem Duration &amp; Persistence (15% weight)
                </span>
                <span className="font-mono font-bold text-slate-900">{durationScore} / 15 pts</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: `${(durationScore / 15) * 100}%` }} />
              </div>
              <p className="text-[11px] text-slate-500">
                Persisting for approximately <strong>{durationMonths || 1} months</strong> without administrative resolution.
              </p>
            </div>
          </div>

          {aiExplanation && (
            <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-blue-900 font-bold">
                <BrainCircuit className="w-4 h-4 text-blue-600" />
                <span>AI Problem Intelligence Rationale</span>
              </div>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                {aiExplanation}
              </p>
            </div>
          )}

          {isCalibratedByGov && governmentNotes && (
            <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 space-y-1 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Government Officer Calibration Note</span>
              </div>
              <p className="text-slate-700 text-[11px] leading-relaxed">
                {governmentNotes}
              </p>
            </div>
          )}

          <div className="flex justify-end pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold"
            >
              Close Breakdown
            </Button>
          </div>
        </div>
      </div>
    );
  };

  if (compact) {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-xs',
            colorTheme.border,
            colorTheme.bg,
            colorTheme.text,
            className
          )}
          title="Click to view 5-factor priority calculation"
        >
          <Flame className="w-3.5 h-3.5 shrink-0" />
          <span className="font-mono">{safeScore}/100</span>
          <span className="text-[10px] uppercase font-semibold text-slate-500">Score</span>
        </button>
        {renderModal()}
      </>
    );
  }

  return (
    <>
      <div
        className={cn(
          'p-3.5 rounded-xl border transition-all duration-200 relative overflow-hidden group',
          colorTheme.border,
          colorTheme.bg,
          className
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Civic Priority Score
              </span>
              {isCalibratedByGov && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.2 rounded-sm bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Gov Verified
                </span>
              )}
            </div>
            <div className="flex items-baseline gap-2">
              <span className={cn('text-2xl font-black font-mono tracking-tight', colorTheme.text)}>
                {safeScore}
              </span>
              <span className="text-xs text-slate-400 font-mono">/ 100</span>
              <Badge className={cn('text-[10px] px-2 py-0 font-bold ml-1', colorTheme.badgeBg)}>
                {colorTheme.label}
              </Badge>
            </div>
          </div>

          {showInspectButton && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(true)}
              className="text-xs font-semibold bg-white/80 hover:bg-white shadow-xs border-slate-200 text-slate-700 hover:text-slate-900 shrink-0"
            >
              <span>Inspect Breakdown</span>
              <ChevronRight className="w-3.5 h-3.5 ml-1 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          )}
        </div>

        <div className="mt-2.5 w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', colorTheme.bar)}
            style={{ width: `${safeScore}%` }}
          />
        </div>
      </div>

      {renderModal()}
    </>
  );
}
