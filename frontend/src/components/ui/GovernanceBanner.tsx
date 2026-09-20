'use client';

import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { ShieldCheck, Cpu, GitBranch, Scale, UserCheck, ChevronDown, ChevronUp } from 'lucide-react';

export interface GovernanceBannerProps {
  className?: string;
  variant?: 'compact' | 'full' | 'pill';
  collapsible?: boolean;
}

export function GovernanceBanner({
  className,
  variant = 'compact',
  collapsible = false,
}: GovernanceBannerProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (variant === 'pill') {
    return (
      <div
        className={cn(
          'inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-medium',
          'bg-slate-900 text-slate-200 border border-slate-700/80 shadow-2xs',
          className
        )}
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
        <span className="text-slate-400">Governance:</span>
        <span className="text-sky-300 font-mono">AI=Understand</span>
        <span className="text-slate-500">•</span>
        <span className="text-indigo-300 font-mono">Algo=Compute</span>
        <span className="text-slate-500">•</span>
        <span className="text-amber-300 font-mono">Rules=Govern</span>
        <span className="text-slate-500">•</span>
        <span className="text-emerald-300 font-semibold font-mono">Human=Authority</span>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'rounded-xl border border-slate-200/80 bg-linear-to-r from-slate-50 via-white to-slate-50 p-3 text-xs shadow-2xs',
          className
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-semibold text-slate-900">
            <span className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-900 text-white">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            </span>
            <span>Architectural Guarantee</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
              CONSTITUTIONAL
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <div className="flex items-center gap-1 text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              <Cpu className="w-3 h-3 text-sky-500" />
              <span className="font-semibold text-slate-900">AI</span>
              <span className="text-slate-400">=</span>
              <span>Understanding</span>
            </div>
            <div className="flex items-center gap-1 text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              <GitBranch className="w-3 h-3 text-indigo-500" />
              <span className="font-semibold text-slate-900">Algorithms</span>
              <span className="text-slate-400">=</span>
              <span>Computation</span>
            </div>
            <div className="flex items-center gap-1 text-slate-700 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              <Scale className="w-3 h-3 text-amber-500" />
              <span className="font-semibold text-slate-900">Rules</span>
              <span className="text-slate-400">=</span>
              <span>Governance</span>
            </div>
            <div className="flex items-center gap-1 text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-semibold">
              <UserCheck className="w-3 h-3 text-emerald-600" />
              <span className="font-bold">Humans</span>
              <span className="text-emerald-400">=</span>
              <span>Final Authority</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Full detailed variant
  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-linear-to-b from-white to-slate-50 p-4 md:p-5 shadow-xs',
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 leading-tight">
              SICP Public Governance Framework
            </h4>
            <p className="text-[11px] text-slate-500">
              Constitutional separation of comprehension, routing, and executive power
            </p>
          </div>
        </div>

        {collapsible && (
          <button
            type="button"
            onClick={() => setIsOpen(!isOpen)}
            className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-slate-100"
          >
            <span>{isOpen ? 'Less' : 'Learn more'}</span>
            {isOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        <div className="p-2.5 rounded-xl bg-sky-50/50 border border-sky-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900 mb-1">
            <Cpu className="w-3.5 h-3.5 text-sky-600" />
            <span>AI = Understanding</span>
          </div>
          <p className="text-[11px] text-sky-800/80 leading-relaxed">
            Gemini parses unstructured multilingual civic text, transcripts, and photos into structured problem taxonomy.
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-indigo-50/50 border border-indigo-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 mb-1">
            <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
            <span>Algorithms = Computation</span>
          </div>
          <p className="text-[11px] text-indigo-800/80 leading-relaxed">
            Deterministic pgvector cosine similarity, Haversine geospatial proximity, and priority scoring formulas.
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-50/50 border border-amber-100">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
            <Scale className="w-3.5 h-3.5 text-amber-600" />
            <span>Rules = Governance</span>
          </div>
          <p className="text-[11px] text-amber-800/80 leading-relaxed">
            State machine enforces SLA clock, eligibility gates, procurement policy, and immutable audit logs.
          </p>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200">
          <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950 mb-1">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Humans = Final Authority</span>
          </div>
          <p className="text-[11px] text-emerald-900/80 leading-relaxed">
            Every transition, allocation, and closure requires verified officer or citizen authorization.
          </p>
        </div>
      </div>
    </div>
  );
}
