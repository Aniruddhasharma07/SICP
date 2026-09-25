'use client';

import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, ShieldCheck, Cpu, Database, Network } from 'lucide-react';

export interface ExplainWhyFactor {
  label: string;
  value: string;
}

export interface ExplainWhyTechnicalDetails {
  algorithm?: string;
  factors?: ExplainWhyFactor[];
  epistemicClass?: 'OBSERVED' | 'COMPUTED' | 'SOURCE_DERIVED' | 'INFERRED' | 'HUMAN_VALIDATED' | string;
  provenance?: string;
  invariants?: string;
  scoringModel?: string;
}

export interface ExplainWhyProps {
  title: string;
  summary: string;
  evidenceItems?: string[];
  technicalDetails?: ExplainWhyTechnicalDetails;
  buttonText?: string;
  variant?: 'inline' | 'badge' | 'card';
  role?: string;
}

export function ExplainWhy({
  title,
  summary,
  evidenceItems = [],
  technicalDetails,
  buttonText = 'Why?',
  variant = 'badge',
  role = 'CITIZEN',
}: ExplainWhyProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showTechnical, setShowTechnical] = useState(role === 'GOVERNMENT' || role === 'ADMIN');

  return (
    <div className="inline-block text-left">
      {/* Trigger Button */}
      {variant === 'badge' && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 border border-blue-200/80 dark:border-blue-800 transition-colors"
          title="Click to view why SICP reached this state"
          aria-expanded={isOpen}
        >
          <HelpCircle className="w-3 h-3 text-blue-600 dark:text-blue-400" />
          <span>{buttonText}</span>
          {isOpen ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5" />}
        </button>
      )}

      {variant === 'inline' && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 underline font-medium"
          aria-expanded={isOpen}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          <span>{title}</span>
        </button>
      )}

      {variant === 'card' && (
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors"
          aria-expanded={isOpen}
        >
          <span className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
            <HelpCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            {title}
          </span>
          {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-slate-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
        </button>
      )}

      {/* Expandable Explanation Panel */}
      {isOpen && (
        <div className="mt-2 p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-blue-100 dark:border-blue-900/60 shadow-lg text-xs space-y-2.5 max-w-lg z-30 animate-sicp-slide-up">
          {/* Plain English Institutional Summary */}
          <div>
            <div className="font-semibold text-slate-900 dark:text-slate-100 mb-1 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              {title}
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed text-[11px] sm:text-xs">
              {summary}
            </p>
          </div>

          {/* Direct Evidence Points if present */}
          {evidenceItems.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-lg border border-slate-200/60 dark:border-slate-700/60 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1">
                Empirical Evidence Base
              </span>
              <ul className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
                {evidenceItems.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-blue-500 font-bold">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Progressive Disclosure: Technical Methodology */}
          {technicalDetails && (
            <div>
              <button
                type="button"
                onClick={() => setShowTechnical(!showTechnical)}
                className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              >
                <span>Technical Proof & Methodology</span>
                {showTechnical ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>

              {showTechnical && (
                <div className="mt-1.5 pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/40 p-2 rounded-lg">
                  {technicalDetails.algorithm && (
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-3 h-3 text-indigo-500 flex-shrink-0" />
                      <span>Method: <strong className="text-slate-800 dark:text-slate-200">{technicalDetails.algorithm}</strong></span>
                    </div>
                  )}

                  {technicalDetails.epistemicClass && (
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="w-3 h-3 text-emerald-500 flex-shrink-0" />
                      <span>Epistemic Class: <span className="px-1.5 py-0.2 bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded text-[10px] font-bold">{technicalDetails.epistemicClass}</span></span>
                    </div>
                  )}

                  {technicalDetails.provenance && (
                    <div className="flex items-center gap-1.5">
                      <Database className="w-3 h-3 text-amber-500 flex-shrink-0" />
                      <span>Provenance: {technicalDetails.provenance}</span>
                    </div>
                  )}

                  {technicalDetails.invariants && (
                    <div className="flex items-start gap-1.5 text-[10.5px] leading-tight text-slate-500 dark:text-slate-400 mt-1 font-sans">
                      <Network className="w-3 h-3 text-blue-500 flex-shrink-0 mt-0.5" />
                      <span>Invariant: {technicalDetails.invariants}</span>
                    </div>
                  )}

                  {technicalDetails.factors && technicalDetails.factors.length > 0 && (
                    <div className="grid grid-cols-2 gap-1 pt-1 mt-1 border-t border-slate-200/50 dark:border-slate-800 text-[10px]">
                      {technicalDetails.factors.map((f, i) => (
                        <div key={i} className="flex justify-between pr-2">
                          <span className="text-slate-500">{f.label}:</span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{f.value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
