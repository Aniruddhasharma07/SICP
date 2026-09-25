'use client';

import React from 'react';
import { ArrowRight, HelpCircle, AlertCircle, Compass, Sparkles, CheckCircle2 } from 'lucide-react';
import { ExplainWhy } from '../common/ExplainWhy';

export interface GuidedInvestigationCardProps {
  currentStage: string;
  stageSubtitle?: string;
  whatHappened: string;
  discovery: string;
  evidencePoints: string[];
  uncertaintyOrUnknown?: string;
  dominantAction: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
    helperText?: string;
  };
  secondaryActions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'outline' | 'ghost';
  }>;
  explainWhy?: {
    title: string;
    summary: string;
    evidenceItems?: string[];
    technicalDetails?: any;
  };
  badgeText?: string;
}

export function GuidedInvestigationCard({
  currentStage,
  stageSubtitle,
  whatHappened,
  discovery,
  evidencePoints,
  uncertaintyOrUnknown,
  dominantAction,
  secondaryActions = [],
  explainWhy,
  badgeText = 'Systemic Investigation',
}: GuidedInvestigationCardProps) {
  return (
    <div className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm mb-6 animate-sicp-slide-up">
      {/* Top Banner: Where am I? */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-200/60 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
            <Compass className="w-4 h-4" />
          </span>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
              {badgeText}
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {currentStage}
            </h2>
          </div>
        </div>

        {explainWhy && (
          <ExplainWhy
            title={explainWhy.title}
            summary={explainWhy.summary}
            evidenceItems={explainWhy.evidenceItems}
            technicalDetails={explainWhy.technicalDetails}
            role="GOVERNMENT"
          />
        )}
      </div>

      {/* Grid: What happened vs What did SICP discover */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-4">
        {/* 1. What Happened? */}
        <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800 space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            What Happened?
          </span>
          <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
            {whatHappened}
          </p>
          {stageSubtitle && (
            <p className="text-[11px] text-slate-500 italic">
              {stageSubtitle}
            </p>
          )}
        </div>

        {/* 2. What did SICP Discover? */}
        <div className="bg-blue-50/50 dark:bg-blue-950/20 p-3.5 rounded-xl border border-blue-100 dark:border-blue-900/40 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
              What did SICP Discover?
            </span>
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          </div>
          <p className="text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
            {discovery}
          </p>
        </div>
      </div>

      {/* Evidence & Unknown / Gaps */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mb-5">
        {/* Empirical Evidence */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
            Supporting Empirical Evidence
          </span>
          <ul className="space-y-1 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300">
            {evidencePoints.map((pt, i) => (
              <li key={i} className="flex items-start gap-1.5">
                <span className="text-emerald-500 font-bold">•</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Uncertainty / Gaps */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-500" />
            What Remains Uncertain?
          </span>
          <div className="bg-amber-50/40 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
            {uncertaintyOrUnknown || 'No critical epistemic gaps identified for this stage.'}
          </div>
        </div>
      </div>

      {/* Action Zone: Exactly ONE dominant action */}
      <div className="pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div className="text-[11px] text-slate-500">
          {dominantAction.helperText || 'Recommended next action based on current evidence state.'}
        </div>

        <div className="flex items-center gap-2">
          {secondaryActions.map((sec, i) => (
            <button
              key={i}
              type="button"
              onClick={sec.onClick}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              {sec.label}
            </button>
          ))}

          {/* Single Dominant Action */}
          <button
            type="button"
            onClick={dominantAction.onClick}
            disabled={dominantAction.disabled}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer ${
              dominantAction.disabled
                ? 'bg-slate-400 cursor-not-allowed opacity-60'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg active:scale-[0.98]'
            }`}
          >
            {dominantAction.icon}
            <span>{dominantAction.label}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
