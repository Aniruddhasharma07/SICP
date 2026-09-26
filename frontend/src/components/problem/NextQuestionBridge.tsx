'use client';

import React from 'react';
import { ArrowDown, HelpCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';

interface NextQuestionBridgeProps {
  currentStage: string;
  questionAnswered: string;
  answeredSummary: string;
  nextStage: string;
  nextQuestion: string;
  ctaLabel: string;
  onContinue: () => void;
  accentColor?: 'blue' | 'indigo' | 'amber' | 'emerald' | 'purple';
}

export function NextQuestionBridge({
  currentStage,
  questionAnswered,
  answeredSummary,
  nextStage,
  nextQuestion,
  ctaLabel,
  onContinue,
  accentColor = 'blue',
}: NextQuestionBridgeProps) {
  const colorStyles = {
    blue: {
      border: 'border-blue-500/30 hover:border-blue-500/50',
      glow: 'shadow-blue-950/30',
      badge: 'bg-blue-950/80 text-blue-300 border-blue-800/60',
      btn: 'bg-blue-600 hover:bg-blue-500 text-white',
      arrow: 'text-blue-400',
      nextBadge: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
    },
    indigo: {
      border: 'border-indigo-500/30 hover:border-indigo-500/50',
      glow: 'shadow-indigo-950/30',
      badge: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
      btn: 'bg-indigo-600 hover:bg-indigo-500 text-white',
      arrow: 'text-indigo-400',
      nextBadge: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
    },
    amber: {
      border: 'border-amber-500/30 hover:border-amber-500/50',
      glow: 'shadow-amber-950/30',
      badge: 'bg-amber-950/80 text-amber-300 border-amber-800/60',
      btn: 'bg-amber-600 hover:bg-amber-500 text-white',
      arrow: 'text-amber-400',
      nextBadge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
    },
    emerald: {
      border: 'border-emerald-500/30 hover:border-emerald-500/50',
      glow: 'shadow-emerald-950/30',
      badge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
      btn: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      arrow: 'text-emerald-400',
      nextBadge: 'bg-indigo-950/80 text-indigo-300 border-indigo-800/60',
    },
    purple: {
      border: 'border-purple-500/30 hover:border-purple-500/50',
      glow: 'shadow-purple-950/30',
      badge: 'bg-purple-950/80 text-purple-300 border-purple-800/60',
      btn: 'bg-purple-600 hover:bg-purple-500 text-white',
      arrow: 'text-purple-400',
      nextBadge: 'bg-emerald-950/80 text-emerald-300 border-emerald-800/60',
    },
  }[accentColor];

  return (
    <div
      className={`mt-6 p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border ${colorStyles.border} shadow-lg ${colorStyles.glow} space-y-3 transition-all`}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80 text-xs">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${colorStyles.badge}`}>
            ✓ {currentStage} Answered
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
          <span className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${colorStyles.nextBadge}`}>
            Next: {nextStage}
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium">
          Self-Revealing Intelligence Journey
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Left: What Was Answered */}
        <div className="md:col-span-5 space-y-1 text-xs">
          <div className="flex items-center gap-1.5 text-slate-400 font-semibold text-[11px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Resolved: {questionAnswered}</span>
          </div>
          <p className="text-slate-300 text-[11.5px] leading-relaxed">
            {answeredSummary}
          </p>
        </div>

        {/* Center: Arrow Divider */}
        <div className="hidden md:flex md:col-span-1 justify-center">
          <div className="p-1.5 rounded-full bg-slate-800 border border-slate-700">
            <ArrowDown className={`w-4 h-4 ${colorStyles.arrow}`} />
          </div>
        </div>

        {/* Right: The Next Logical Question & Direct Action CTA */}
        <div className="md:col-span-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold text-[11px]">
              <HelpCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Next Arising Question:</span>
            </div>
            <p className="text-slate-200 text-xs font-medium leading-snug">
              &quot;{nextQuestion}&quot;
            </p>
          </div>

          <Button
            size="sm"
            onClick={onContinue}
            className={`${colorStyles.btn} shrink-0 text-xs font-bold h-8 px-3.5 shadow-md flex items-center gap-1.5`}
          >
            <span>{ctaLabel}</span>
            <ArrowDown className="w-3.5 h-3.5 animate-bounce" />
          </Button>
        </div>
      </div>
    </div>
  );
}
