'use client';

import React from 'react';
import {
  Compass,
  CheckCircle2,
  Circle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Heart,
  BrainCircuit,
  Network,
  Users,
  Award,
  Layers,
  Sparkles,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  ChallengeDto,
  ChallengeStatus,
  UserRole,
  EvidenceEpistemicClass,
} from '@sicp/shared';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface ContextualActionRailProps {
  challenge: ChallengeDto & {
    version?: number;
    supportVotesCount?: number;
    projects?: { id: string; title: string; status: any }[];
  };
  currentUserRole?: UserRole;
  activeStageIndex?: number;
  onJumpToLayer: (layerId: string) => void;
  hasVoted: boolean;
  voteCount: number;
  isVoting: boolean;
  onToggleVote: () => void;
  onExecuteTransition: (toStatus: ChallengeStatus, reasonReq?: boolean) => void;
  isSubmittingAction: boolean;
  actionReason: string;
  onChangeActionReason: (val: string) => void;
}

export function ContextualActionRail({
  challenge,
  currentUserRole,
  activeStageIndex = 1,
  onJumpToLayer,
  hasVoted,
  voteCount,
  isVoting,
  onToggleVote,
  onExecuteTransition,
  isSubmittingAction,
  actionReason,
  onChangeActionReason,
}: ContextualActionRailProps) {
  const isGovOrAdmin =
    currentUserRole === UserRole.GOVERNMENT_OFFICER ||
    currentUserRole === UserRole.GOVERNMENT_DEPARTMENT ||
    currentUserRole === UserRole.SYSTEM_ADMIN;

  const isApproved =
    challenge.status === 'APPROVED' ||
    challenge.status === 'ASSIGNED_TO_UNIVERSITY' ||
    challenge.status === 'IN_PILOT' ||
    challenge.status === 'DEPLOYED' ||
    challenge.status === 'RESOLVED';

  // 13-stage canonical continuum definition
  const continuumStages = [
    { num: '01', name: 'Citizen Signal', layerId: 'signal-layer', epistemic: 'OBSERVED' },
    { num: '02', name: 'Understood', layerId: 'signal-layer', epistemic: 'AI_INTERPRETED' },
    { num: '03', name: 'Connected', layerId: 'relationship-layer', epistemic: 'COMPUTED' },
    { num: '04', name: 'Pattern', layerId: 'relationship-layer', epistemic: 'COMPUTED' },
    { num: '05', name: 'Topology', layerId: 'relationship-layer', epistemic: 'COMPUTED' },
    { num: '06', name: 'Investigation', layerId: 'investigation-layer', epistemic: 'AI_INTERPRETED' },
    { num: '07', name: 'Hypotheses', layerId: 'investigation-layer', epistemic: 'AI_INTERPRETED' },
    { num: '08', name: 'Sentinel', layerId: 'investigation-layer', epistemic: 'AI_INTERPRETED' },
    { num: '09', name: 'Validation', layerId: 'validation-layer', epistemic: 'HUMAN_VALIDATED' },
    { num: '10', name: 'Partnership', layerId: 'collaboration-layer', epistemic: 'COMPUTED' },
    { num: '11', name: 'Intervention', layerId: 'outcome-layer', epistemic: 'COMPUTED' },
    { num: '12', name: 'Verified Outcome', layerId: 'outcome-layer', epistemic: 'VERIFIED_OUTCOME' },
    { num: '13', name: 'Solution Memory', layerId: 'memory-layer', epistemic: 'SOURCE_DERIVED' },
  ];

  // Determine dominant CTA based on current problem status & role
  const getDominantAction = () => {
    if (challenge.status === 'DRAFT') {
      return {
        title: 'Submit for Statutory Review',
        subtitle: 'Move problem into official municipal evaluation queue',
        action: () => onExecuteTransition(ChallengeStatus.SUBMITTED),
        variant: 'primary' as const,
        icon: ArrowRight,
      };
    }

    if (challenge.status === 'SUBMITTED' && isGovOrAdmin) {
      return {
        title: 'Begin Government Review',
        subtitle: 'Claim problem for formal authority evaluation',
        action: () => onExecuteTransition(ChallengeStatus.UNDER_GOV_REVIEW),
        variant: 'warning' as const,
        icon: ShieldCheck,
      };
    }

    if (challenge.status === 'UNDER_GOV_REVIEW' && isGovOrAdmin) {
      return {
        title: 'Section 25 Statutory Sign-Off',
        subtitle: 'Scroll to validation seal to execute authorized finding',
        action: () => onJumpToLayer('validation-layer'),
        variant: 'success' as const,
        icon: ShieldCheck,
      };
    }

    if (challenge.status === 'APPROVED' && !challenge.projects?.length) {
      return {
        title: 'Explore Academic Lab Routing',
        subtitle: 'Review multidisciplinary R&D and CSR co-funding options',
        action: () => onJumpToLayer('collaboration-layer'),
        variant: 'purple' as const,
        icon: Sparkles,
      };
    }

    if (['IN_PILOT', 'DEPLOYED'].includes(challenge.status)) {
      return {
        title: 'Submit Field Verification',
        subtitle: 'Record empirical citizen ground truth observation',
        action: () => onJumpToLayer('outcome-layer'),
        variant: 'success' as const,
        icon: CheckCircle2,
      };
    }

    if (challenge.status === 'RESOLVED') {
      return {
        title: 'Inspect Solution Memory',
        subtitle: 'View permanent precedent record in SICP repository',
        action: () => onJumpToLayer('memory-layer'),
        variant: 'primary' as const,
        icon: BrainCircuit,
      };
    }

    // Default Citizen Support Action
    return {
      title: hasVoted ? 'Supported Issue' : 'Support this Issue',
      subtitle: `Community votes: ${voteCount} • Boosts priority`,
      action: onToggleVote,
      variant: hasVoted ? ('outline' as const) : ('primary' as const),
      icon: Heart,
    };
  };

  const dominant = getDominantAction();

  // Evidence Checklist Items
  const evidenceItems = [
    { label: 'Citizen Ground Narrative', fulfilled: true, epistemic: 'OBSERVED', layer: 'signal-layer' },
    { label: 'Gemini Syntactic Normalization', fulfilled: !!challenge.impact, epistemic: 'AI_INTERPRETED', layer: 'signal-layer' },
    { label: 'Infrastructure Graph Overlap', fulfilled: (challenge as any).relationships?.length > 0, epistemic: 'COMPUTED', layer: 'relationship-layer' },
    { label: 'AMCH Diagnostic Matrix', fulfilled: true, epistemic: 'AI_INTERPRETED', layer: 'investigation-layer' },
    { label: 'Section 25 Statutory Sign-Off', fulfilled: isApproved, epistemic: 'HUMAN_VALIDATED', layer: 'validation-layer' },
    { label: 'Institutional Solution Memory Match', fulfilled: true, epistemic: 'SOURCE_DERIVED', layer: 'memory-layer' },
    { label: 'Field Ground Truth Telemetry', fulfilled: challenge.status === 'RESOLVED', epistemic: 'VERIFIED_OUTCOME', layer: 'outcome-layer' },
  ];

  return (
    <aside className="w-full lg:w-80 shrink-0 space-y-4">
      {/* 1. DOMINANT HERO PRIMARY ACTION */}
      <div className="p-4 rounded-xl bg-slate-900 border-2 border-blue-500/50 shadow-xl shadow-blue-950/40 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60">
            One Dominant Action
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            v{challenge.version || 1}
          </span>
        </div>

        <div>
          <h3 className="text-sm font-bold text-slate-100">{dominant.title}</h3>
          <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{dominant.subtitle}</p>
        </div>

        <Button
          onClick={dominant.action}
          disabled={dominant.title === 'Supported Issue' && !isGovOrAdmin}
          isLoading={isSubmittingAction || isVoting}
          className={`w-full font-bold text-xs h-9 justify-center ${
            dominant.variant === 'success'
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
              : dominant.variant === 'warning'
              ? 'bg-amber-600 hover:bg-amber-500 text-white'
              : dominant.variant === 'purple'
              ? 'bg-purple-600 hover:bg-purple-500 text-white'
              : dominant.variant === 'outline'
              ? 'border-slate-700 text-slate-300 hover:bg-slate-800'
              : 'bg-blue-600 hover:bg-blue-500 text-white'
          }`}
        >
          <dominant.icon className="w-4 h-4 mr-1.5" />
          <span>{dominant.title}</span>
        </Button>
      </div>

      {/* 2. WHERE AM I? 13-STAGE CONTINUUM PROGRESS */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            <Compass className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Continuum Radar
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">13 Stages</span>
        </div>

        <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
          {continuumStages.map((st, idx) => {
            const isPassed =
              (st.name === 'Citizen Signal' || st.name === 'Understood') ||
              (isApproved && idx <= 8) ||
              (challenge.status === 'RESOLVED');

            return (
              <button
                key={st.num}
                type="button"
                onClick={() => onJumpToLayer(st.layerId)}
                className="w-full flex items-center justify-between p-1.5 rounded text-left transition hover:bg-slate-800/80 group"
              >
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono text-slate-500 group-hover:text-blue-400">
                    {st.num}
                  </span>
                  <span className={`text-[11px] ${isPassed ? 'text-slate-200 font-medium' : 'text-slate-500'}`}>
                    {st.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] font-mono text-slate-500 uppercase">
                    {st.epistemic.slice(0, 4)}
                  </span>
                  {isPassed ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Circle className="w-3.5 h-3.5 text-slate-700" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. EVIDENCE COMPLETENESS AUDIT */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
              Evidence Completeness
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400">
            {evidenceItems.filter(e => e.fulfilled).length}/{evidenceItems.length}
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          {evidenceItems.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => onJumpToLayer(item.layer)}
              className="w-full flex items-center justify-between p-1.5 rounded text-left hover:bg-slate-800/60 transition group"
            >
              <div className="flex items-center gap-2">
                {item.fulfilled ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                )}
                <span className={`text-[11px] ${item.fulfilled ? 'text-slate-300' : 'text-slate-500'}`}>
                  {item.label}
                </span>
              </div>
              <span className="text-[9px] font-mono text-slate-500 bg-slate-950 px-1 py-0.5 rounded border border-slate-800">
                {item.epistemic.slice(0, 4)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 4. EPISTEMIC TAXONOMY REFERENCE */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 text-xs">
        <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2">
          <Info className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-[11px] font-bold text-slate-200 uppercase tracking-wider">
            Epistemic Classification
          </span>
        </div>

        <div className="space-y-1.5 text-[10px] text-slate-400">
          <div className="flex items-start gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 mt-1 shrink-0" />
            <div>
              <strong className="text-slate-200">OBSERVED:</strong> Direct citizen ground reports and sensor telemetry.
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="w-2 h-2 rounded-full bg-indigo-500 mt-1 shrink-0" />
            <div>
              <strong className="text-slate-200">COMPUTED:</strong> Spatial distance, graph traversal, and formulaic math.
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 mt-1 shrink-0" />
            <div>
              <strong className="text-slate-200">AI_INTERPRETED:</strong> Gemini syntactic structuring &amp; hypotheses.
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
            <div>
              <strong className="text-slate-200">HUMAN_VALIDATED:</strong> Official municipal officer statutory sign-off.
            </div>
          </div>
          <div className="flex items-start gap-1.5">
            <span className="w-2 h-2 rounded-full bg-teal-400 mt-1 shrink-0" />
            <div>
              <strong className="text-slate-200">VERIFIED_OUTCOME:</strong> Post-intervention measured field outcome.
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
