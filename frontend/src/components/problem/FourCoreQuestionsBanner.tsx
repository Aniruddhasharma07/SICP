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
    validationReason?: string;
    supportVotesCount?: number;
    projects?: { id: string; title: string; status: any }[];
  };
  onJumpToTab: (tabId: string) => void;
  branchDifferentialDeduction?: string | null;
  leadingHypothesisTitle?: string | null;
}

export function FourCoreQuestionsBanner({
  challenge,
  onJumpToTab,
  branchDifferentialDeduction,
  leadingHypothesisTitle,
}: FourCoreQuestionsBannerProps) {
  const isApproved = ['APPROVED', 'ASSIGNED_TO_UNIVERSITY', 'IN_RESEARCH', 'SOLUTION_PROPOSED', 'IN_PILOT', 'DEPLOYED', 'RESOLVED'].includes(challenge.status);
  const isResolved = challenge.status === 'RESOLVED';
  const hasProjects = challenge.projects && challenge.projects.length > 0;
  const isHumanValidated = Boolean(challenge.validationReason || challenge.validatedByName);

  const category = (challenge.category || '').toUpperCase();
  const isRoad = category.includes('ROAD') || category.includes('TRANSPORT') || category.includes('POTHOLE');
  const isWater = category.includes('WATER') || category.includes('SANITATION') || category.includes('DRAINAGE');

  return (
    <section className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      {/* Banner Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <span>Executive Problem Intelligence Hierarchy</span>
              <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60">
                Viewport 1 Brief
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Living ground truth and epistemic state across five core operational dimensions
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 text-[11px]">Phase:</span>
          <span className="font-bold text-emerald-400 bg-emerald-950/80 px-2.5 py-0.5 rounded-full border border-emerald-700/60 text-xs">
            {challenge.status.replace(/_/g, ' ')}
          </span>
        </div>
      </div>

      {/* 5 Cards Grid: 1. What Happened?, 2. What Is Known?, 3. What Is Uncertain?, 4. Possible Root Cause, 5. Next Action */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
        {/* Card 1: WHAT HAPPENED? */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">
                01 • What Happened?
              </span>
              <span className="w-2 h-2 rounded-full bg-blue-400" />
            </div>
            <div className="font-bold text-slate-200 text-xs line-clamp-1">
              {challenge.title}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3">
              {challenge.description || 'Citizen reported municipal disruption along the corridor.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onJumpToTab('ground-truth')}
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-blue-400 hover:text-blue-300 transition pt-1 border-t border-slate-800/80 cursor-pointer"
          >
            <span>Inspect Ground Truth</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 2: WHAT IS KNOWN? */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                02 • What Is Known?
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="font-bold text-slate-200 text-xs">
              Verified Spatial Anchor
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              <span className="font-medium text-slate-300 block mb-0.5">
                {challenge.district ? `${challenge.district}, ${challenge.state || 'India'}` : 'Corridor location assigned'}
              </span>
              {challenge.affectedPopulation
                ? `${challenge.affectedPopulation.toLocaleString()} citizens in impact zone.`
                : 'Corridor grouping active; population estimate pending.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onJumpToTab('ground-truth')}
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-400 hover:text-emerald-300 transition pt-1 border-t border-slate-800/80 cursor-pointer"
          >
            <span>Review Location</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 3: WHAT IS UNCERTAIN? */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">
                03 • What Is Uncertain?
              </span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="font-bold text-slate-200 text-xs">
              Evidence &amp; Falsification Gaps
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isRoad
                ? 'Core drilling & subgrade moisture readings required to falsify subgrade cavitation.'
                : isWater
                ? 'Pressure transducer readings & physical valve seal checks pending on-site access.'
                : 'On-site technical measurements and field team inspection required to rule out alternative failure modes.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onJumpToTab('investigation')}
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-amber-400 hover:text-amber-300 transition pt-1 border-t border-slate-800/80 cursor-pointer"
          >
            <span>Review Falsification</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 4: POSSIBLE ROOT CAUSE */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">
                04 • Possible Root Cause
              </span>
              {isHumanValidated ? (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <History className="w-3.5 h-3.5 text-purple-400" />
              )}
            </div>
            <div className="font-bold text-slate-200 text-xs">
              {isHumanValidated ? 'Human-Validated Finding' : 'Hypothesis (Not Confirmed)'}
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {leadingHypothesisTitle || challenge.systemicSummary || 'Analysis of Competing Hypotheses evaluating corridor failure mechanisms.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onJumpToTab('investigation')}
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-purple-400 hover:text-purple-300 transition pt-1 border-t border-slate-800/80 cursor-pointer"
          >
            <span>Inspect Hypotheses</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* Card 5: NEXT ACTION */}
        <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col justify-between space-y-3">
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                05 • Next Action
              </span>
              <Sparkles className="w-3.5 h-3.5 text-rose-400" />
            </div>
            <div className="font-bold text-slate-200 text-xs">
              Immediate Critical Gate
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              {isResolved
                ? 'Preserve verified intervention in Institutional Solution Memory.'
                : hasProjects
                ? 'Review ongoing engineering pilot metrics & field milestones.'
                : isHumanValidated
                ? 'Route validated challenge to University & Industry consortia.'
                : 'Authorized Officer must inspect competing evidence and validate root cause.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onJumpToTab(isHumanValidated ? 'collaboration' : 'governance')}
            className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-rose-400 hover:text-rose-300 transition pt-1 border-t border-slate-800/80 cursor-pointer"
          >
            <span>Take Action</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </section>
  );
}
