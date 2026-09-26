'use client';

import React from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  ArrowRight,
  ShieldCheck,
  Building2,
  FileCheck,
  BrainCircuit,
  Radio,
  Network,
  Users,
  Wrench,
  BookOpen,
} from 'lucide-react';

export type TraceStageStatus = 'COMPLETED' | 'ACTIVE' | 'AVAILABLE' | 'PENDING' | 'BLOCKED' | 'UNKNOWN';

export interface TraceStage {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  status: TraceStageStatus;
  evidenceSummary?: string;
  completedAt?: string;
  actionLabel?: string;
  onActionClick?: () => void;
}

export interface IntelligenceTraceProps {
  currentStageId?: string;
  activeStage?: string;
  currentProblemId?: string;
  stages?: TraceStage[];
  onStageSelect?: (stageId: string) => void;
  onStageClick?: (stageId: string) => void;
  dominantAction?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  dominantActionLabel?: string;
  compact?: boolean;
}

export const CANONICAL_SICP_STAGES: Omit<TraceStage, 'status'>[] = [
  {
    id: 'problem',
    label: 'Problem Intake',
    shortLabel: 'Report',
    description: 'Civic issue registered with verified geolocation and description.',
  },
  {
    id: 'understood',
    label: 'Intake Understood',
    shortLabel: 'Understood',
    description: 'SICP parsed symptoms, severity, and service area boundary.',
  },
  {
    id: 'connected',
    label: 'Signals Connected',
    shortLabel: 'Connected',
    description: 'Multi-signal relationship discovered across spatial & symptom proximity.',
  },
  {
    id: 'systemic',
    label: 'Systemic Pattern',
    shortLabel: 'Pattern',
    description: 'Heuristic evidence crossed systemic threshold (S_sys >= 0.70).',
  },
  {
    id: 'infrastructure',
    label: 'Infrastructure Lineage',
    shortLabel: 'Topology',
    description: 'Topological traversal traced lineage to common upstream assets.',
  },
  {
    id: 'investigation',
    label: 'Active Investigation',
    shortLabel: 'Investigation',
    description: 'Evidence gathering, physical inspection, and hydraulic logging.',
  },
  {
    id: 'hypotheses',
    label: 'Competing Explanations',
    shortLabel: 'Hypotheses',
    description: 'Richards Heuer AMCH matrix evaluates competing failure modes.',
  },
  {
    id: 'sentinel',
    label: 'Sentinel Probe',
    shortLabel: 'Sentinel',
    description: 'Targeted neutral inquiry dispatched to evaluate Branch Differential.',
  },
  {
    id: 'validation',
    label: 'Human Validation',
    shortLabel: 'Validation',
    description: 'Authoritative Government Officer sign-off boundary.',
  },
  {
    id: 'collaboration',
    label: 'Uni / Industry R&D',
    shortLabel: 'Partnership',
    description: 'Municipal problem converted into accredited R&D and CSR challenge.',
  },
  {
    id: 'intervention',
    label: 'Field Intervention',
    shortLabel: 'Intervention',
    description: 'Engineering remediation and sensor deployment active.',
  },
  {
    id: 'verified',
    label: 'Verified Outcome',
    shortLabel: 'Verified',
    description: 'Ground impact verified by community and government inspection.',
  },
  {
    id: 'memory',
    label: 'Solution Memory',
    shortLabel: 'Memory',
    description: 'Institutional lesson and reusability precedent indexed for future cases.',
  },
];

export function IntelligenceTrace({
  currentStageId,
  activeStage: activeStageProp,
  currentProblemId,
  stages,
  onStageSelect,
  onStageClick,
  dominantAction,
  dominantActionLabel,
  compact = false,
}: IntelligenceTraceProps) {
  const effectiveStageId = currentStageId || activeStageProp || 'problem';
  const handleSelect = onStageSelect || onStageClick;

  // If custom stages are not provided, synthesize from canonical stages using effectiveStageId
  const activeStages: TraceStage[] = stages || CANONICAL_SICP_STAGES.map((s, idx) => {
    const currentIndex = CANONICAL_SICP_STAGES.findIndex(c => c.id === effectiveStageId);
    let status: TraceStageStatus = 'PENDING';
    if (idx < currentIndex) {
      status = 'COMPLETED';
    } else if (idx === currentIndex) {
      status = 'ACTIVE';
    } else if (idx === currentIndex + 1) {
      status = 'AVAILABLE';
    }
    return {
      ...s,
      status,
    };
  });

  const activeStage = activeStages.find(s => s.status === 'ACTIVE') || activeStages[0];

  return (
    <div className="w-full max-w-full overflow-hidden bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-xs mb-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400 animate-sicp-pulse-subtle" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            SICP Intelligence Trace
          </span>
          {currentProblemId && (
            <span className="text-[11px] font-mono font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded border border-blue-200/60 dark:border-blue-900">
              {currentProblemId}
            </span>
          )}
          <span className="text-[11px] text-slate-400 font-mono hidden sm:inline">
            • 13-Stage Canonical Intelligence Continuum
          </span>
        </div>

        {/* Dominant Next Action Button if provided */}
        {(dominantAction || dominantActionLabel) && (
          <button
            type="button"
            onClick={dominantAction?.onClick || (() => handleSelect && handleSelect(effectiveStageId))}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            {dominantAction?.icon}
            <span>{dominantAction?.label || dominantActionLabel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Horizontal Lifecycle Stepper */}
      <div className="overflow-x-auto pb-2 scrollbar-thin">
        <div className="flex items-center min-w-[720px] justify-between relative px-2">
          {activeStages.map((stage, idx) => {
            const isCompleted = stage.status === 'COMPLETED';
            const isActive = stage.status === 'ACTIVE';
            const isAvailable = stage.status === 'AVAILABLE';
            const isLast = idx === activeStages.length - 1;

            return (
              <React.Fragment key={stage.id}>
                {/* Node */}
                <div
                  onClick={() => (isCompleted || isActive) && handleSelect && handleSelect(stage.id)}
                  className={`flex flex-col items-center text-center group ${
                    isCompleted || isActive ? 'cursor-pointer' : 'cursor-default opacity-60'
                  }`}
                  title={`${stage.label}: ${stage.description}`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 text-white shadow-xs'
                        : isActive
                        ? 'bg-blue-600 text-white ring-4 ring-blue-100 dark:ring-blue-900/50 shadow-sm'
                        : isAvailable
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700'
                        : 'bg-slate-50 dark:bg-slate-900 text-slate-400 border border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : isActive ? (
                      <span className="w-2 h-2 rounded-full bg-white animate-sicp-pulse-subtle" />
                    ) : (
                      <span className="text-[10px] font-mono">{idx + 1}</span>
                    )}
                  </div>

                  <span
                    className={`text-[10px] sm:text-[11px] mt-1.5 font-medium whitespace-nowrap transition-colors ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400 font-bold'
                        : isCompleted
                        ? 'text-slate-800 dark:text-slate-200'
                        : 'text-slate-400'
                    }`}
                  >
                    {stage.shortLabel}
                  </span>
                </div>

                {/* Connecting Line between nodes */}
                {!isLast && (
                  <div
                    className={`flex-1 h-0.5 mx-1 transition-colors ${
                      isCompleted
                        ? 'bg-emerald-400 dark:bg-emerald-500'
                        : isActive
                        ? 'bg-gradient-to-r from-blue-500 to-slate-200 dark:to-slate-800'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Active Stage Callout */}
      {!compact && activeStage && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Current Phase:</span>
            <strong className="text-slate-800 dark:text-slate-100">{activeStage.label}</strong>
            <span className="text-slate-500 dark:text-slate-400 text-[11px]">
              — {activeStage.description}
            </span>
          </div>

          <div className="text-[10.5px] text-slate-400 font-mono">
            {activeStages.filter(s => s.status === 'COMPLETED').length} of {activeStages.length} Verified
          </div>
        </div>
      )}
    </div>
  );
}
