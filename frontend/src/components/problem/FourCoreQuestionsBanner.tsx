'use client';

import React from 'react';
import {
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  History,
  ArrowRight,
  Sparkles,
  MapPin,
  Clock,
  Layers,
  Radio,
  FileSearch,
  ShieldCheck,
} from 'lucide-react';
import { ChallengeDto } from '@sicp/shared';

interface FourCoreQuestionsBannerProps {
  challenge: ChallengeDto & {
    validatedByName?: string;
    supportVotesCount?: number;
    projects?: { id: string; title: string; status: any }[];
  };
  onJumpToLayer: (layerId: string) => void;
  branchDifferentialDeduction?: string | null;
}

export function FourCoreQuestionsBanner({
  challenge,
  onJumpToLayer,
  branchDifferentialDeduction,
}: FourCoreQuestionsBannerProps) {
  const isApproved = ['APPROVED', 'ASSIGNED_TO_UNIVERSITY', 'IN_PILOT', 'DEPLOYED', 'RESOLVED'].includes(challenge.status);
  const isResolved = challenge.status === 'RESOLVED';
  const hasProjects = challenge.projects && challenge.projects.length > 0;

  return (
    <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Core Problem Intelligence Summary</span>
              <span className="text-[10px] font-mono font-normal uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                Plain-Language Living Overview
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Clear answers to the essential operational questions before technical deep-dive
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 text-[11px]">Continuum Phase:</span>
          <span className="font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700/60 text-xs">
            {challenge.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* 5 Cards Grid: 1. Current State, 2. What We Know, 3. What Remains Uncertain, 4. What Changed, 5. What Matters Next */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
        {/* Card 1: CURRENT STATE */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                01 • Current State
              </span>
              <span className="w-2 h-2 rounded-full bg-blue-400" />
            </div>
            <div className="font-bold text-slate-200 text-xs">
              {isResolved
                ? 'Empirically Resolved'
                : hasProjects
                ? 'Active Engineering Pilot'
                : isApproved
                ? 'Statutory Validated'
                : challenge.status === 'UNDER_GOV_REVIEW'
                ? 'In Authority Assessment'
                : 'Queued for Review'}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isResolved
                ? 'Citizen field telemetry confirms full remediation; indexed in Solution Memory.'
                : hasProjects
                ? `Operational intervention deployed under Project ${challenge.projects![0].id.slice(0, 8)}.`
                : isApproved
                ? 'Validated under Section 25 Statutory Sign-Off. Ready for university/CSR matching.'
                : 'Citizen complaint verified. Awaiting municipal jurisdiction determination.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onJumpToLayer(isApproved ? 'validation-layer' : 'signal-layer')}
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-blue-400 hover:text-blue-300 transition pt-1 border-t border-slate-800/80"
          >
            <span>Inspect Status</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 2: WHAT WE KNOW */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                02 • What We Know
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="font-bold text-slate-200 text-xs">
              Empirical Ground Truth
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
              {challenge.district ? `${challenge.district}, ${challenge.state || ''}` : 'Local area'}: {challenge.description.slice(0, 95)}...
            </p>
          </div>

          <button
            type="button"
            onClick={() => onJumpToLayer('signal-layer')}
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-400 hover:text-emerald-300 transition pt-1 border-t border-slate-800/80"
          >
            <span>View Citizen Signal</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 3: WHAT REMAINS UNCERTAIN */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                03 • What Is Uncertain
              </span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="font-bold text-slate-200 text-xs">
              Telemetry &amp; Evidence Gaps
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Subsurface acoustic leak logs pending; non-return valve physical seal inspection awaiting field team access.
            </p>
          </div>

          <button
            type="button"
            onClick={() => onJumpToLayer('investigation-layer')}
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-400 hover:text-amber-300 transition pt-1 border-t border-slate-800/80"
          >
            <span>Review AMCH Gaps</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 4: WHAT CHANGED */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                04 • What Changed
              </span>
              <History className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="font-bold text-slate-200 text-xs">
              Sentinel Telemetry Shift
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {branchDifferentialDeduction ? (
                <span>Parallel branch Sector 3 confirmed normal supply, reducing upstream pump failure support (-50%).</span>
              ) : (
                <span>Field observations updated; candidate hypotheses re-ranked via Heuer AMCH matrix.</span>
              )}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onJumpToLayer('investigation-layer')}
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-purple-400 hover:text-purple-300 transition pt-1 border-t border-slate-800/80"
          >
            <span>Compare Shifts</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 5: WHAT MATTERS NEXT */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                05 • What Matters Next
              </span>
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="font-bold text-slate-200 text-xs">
              Immediate Critical Gate
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isResolved
                ? 'Preserve verified telemetry in Institutional Solution Memory for 700+ districts.'
                : hasProjects
                ? 'Collect citizen outcome telemetry to verify 48-hour pressure stability.'
                : isApproved
                ? 'Mobilize university engineering lab and Schedule VII CSR co-funding.'
                : 'Authorized Officer must inspect evidence and execute Section 25 Statutory Sign-Off.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              onJumpToLayer(
                isResolved
                  ? 'memory-layer'
                  : hasProjects
                  ? 'outcome-layer'
                  : isApproved
                  ? 'collaboration-layer'
                  : 'validation-layer'
              )
            }
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-rose-400 hover:text-rose-300 transition pt-1 border-t border-slate-800/80"
          >
            <span>Advance Gate</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </section>
  );
}
