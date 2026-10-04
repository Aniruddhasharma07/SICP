'use client';

import React from 'react';
import {
  FileText,
  ShieldCheck,
  GraduationCap,
  Building2,
  Rocket,
  Users,
  CheckCircle2,
  Clock,
} from 'lucide-react';

export interface StageStep {
  index: number;
  id: string;
  name: string;
  shortName: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export const CANONICAL_STAGES: StageStep[] = [
  {
    index: 0,
    id: 'SUBMITTED',
    name: 'Submitted',
    shortName: 'Submitted',
    icon: FileText,
    description: 'Reported by citizens & prioritized by AI baseline',
  },
  {
    index: 1,
    id: 'GOVERNMENT_VERIFIED',
    name: 'Verified (by government)',
    shortName: 'Gov Verified',
    icon: ShieldCheck,
    description: 'Municipal engineering validation of systemic hypothesis',
  },
  {
    index: 2,
    id: 'UNIVERSITY_ASSIGNED',
    name: 'University Assigned',
    shortName: 'Uni Assigned',
    icon: GraduationCap,
    description: 'Commissioned to accredited academic R&D faculty',
  },
  {
    index: 3,
    id: 'INDUSTRY_FUNDED',
    name: 'Industry Funded',
    shortName: 'Industry Funded',
    icon: Building2,
    description: 'Schedule VII CSR co-funding committed for pilot execution',
  },
  {
    index: 4,
    id: 'DEPLOYED',
    name: 'Deployed',
    shortName: 'Deployed',
    icon: Rocket,
    description: 'Engineering intervention deployed on-site in target corridor',
  },
  {
    index: 5,
    id: 'OUTCOME_VERIFIED',
    name: 'Verified (by people)',
    shortName: 'People Verified',
    icon: Users,
    description: 'Grievance reporters verify resolution & institutional memory stored',
  },
];

export function resolveStageIndex(status: string = ''): number {
  const s = status.toUpperCase();
  if (['OUTCOME_VERIFIED', 'RESOLVED', 'CLOSED'].includes(s)) return 5;
  if (['DEPLOYED', 'IN_PILOT', 'PILOT', 'PILOT_STAGE', 'TESTING'].includes(s)) return 4;
  if (['INDUSTRY_FUNDED', 'FUNDED', 'PARTNER_COMMITTED'].includes(s)) return 3;
  if (['UNIVERSITY_ASSIGNED', 'ASSIGNED_TO_UNIVERSITY', 'IN_RESEARCH', 'SOLUTION_PROPOSED', 'PROPOSAL', 'PROTOTYPE'].includes(s)) return 2;
  if (['APPROVED', 'GOVERNMENT_VERIFIED', 'GOVERNMENT_APPROVED', 'VALIDATED'].includes(s)) return 1;
  return 0; // SUBMITTED, DRAFT, UNDER_GOV_REVIEW, etc.
}

interface CanonicalLifecycleTrackerProps {
  status: string;
  variant?: 'compact' | 'full' | 'pill';
  className?: string;
  verifiedCount?: number;
  deniedCount?: number;
}

export function CanonicalLifecycleTracker({
  status,
  variant = 'compact',
  className = '',
  verifiedCount = 0,
  deniedCount = 0,
}: CanonicalLifecycleTrackerProps) {
  const currentStageIndex = resolveStageIndex(status);

  if (variant === 'pill') {
    const stage = CANONICAL_STAGES[currentStageIndex];
    const Icon = stage.icon;
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-tight backdrop-blur-md border shadow-xs transition-all ${
          currentStageIndex >= 4
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20'
            : currentStageIndex >= 2
            ? 'bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20'
            : 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20'
        } ${className}`}
      >
        <Icon className="w-3.5 h-3.5" />
        <span>Stage {currentStageIndex + 1}/6: {stage.name}</span>
      </span>
    );
  }

  if (variant === 'compact') {
    return (
      <div className={`space-y-1.5 w-full ${className}`}>
        <div className="flex items-center justify-between text-[11px]">
          <span className="font-medium text-slate-500 dark:text-slate-400">
            Lifecycle Progress
          </span>
          <span className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            {CANONICAL_STAGES[currentStageIndex].name}
          </span>
        </div>

        {/* Apple-style segmented progress bar */}
        <div className="grid grid-cols-6 gap-1 w-full">
          {CANONICAL_STAGES.map((st, i) => {
            const isCompleted = i < currentStageIndex;
            const isCurrent = i === currentStageIndex;
            return (
              <div
                key={st.id}
                title={`Stage ${i + 1}: ${st.name}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  isCompleted
                    ? 'bg-blue-600 dark:bg-blue-500 shadow-xs'
                    : isCurrent
                    ? 'bg-blue-600/90 dark:bg-blue-400 ring-2 ring-blue-400/30'
                    : 'bg-slate-200 dark:bg-slate-800'
                }`}
              />
            );
          })}
        </div>

        {/* Verification outcome tally (when in Deployed or People Verified stage) */}
        {currentStageIndex >= 4 && (verifiedCount > 0 || deniedCount > 0) && (
          <div className="flex items-center gap-2 pt-0.5 text-[10.5px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-0.5">
              <CheckCircle2 className="w-3 h-3" />
              {verifiedCount} citizen {verifiedCount === 1 ? 'verification' : 'verifications'}
            </span>
            {deniedCount > 0 && (
              <span className="text-rose-500 dark:text-rose-400 font-medium">
                • {deniedCount} denied
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  // 'full' variant: Executive Apple-grade interactive horizontal rail
  return (
    <div
      className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 md:p-6 shadow-sm space-y-5 ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Canonical Intervention Lifecycle
          </span>
          <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
            <span>Stage {currentStageIndex + 1} of 6:</span>
            <span className="text-blue-600 dark:text-blue-400">
              {CANONICAL_STAGES[currentStageIndex].name}
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {CANONICAL_STAGES[currentStageIndex].description}
          </p>
        </div>

        {currentStageIndex >= 4 && (
          <div className="flex items-center gap-3 shrink-0 bg-slate-50 dark:bg-slate-800/60 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
            <div className="text-center">
              <span className="block text-[10px] uppercase font-bold text-slate-500">Verified</span>
              <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">
                {verifiedCount}
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
            <div className="text-center">
              <span className="block text-[10px] uppercase font-bold text-slate-500">Denied</span>
              <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                {deniedCount}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 6-Stage Visual Stepper */}
      <div className="relative pt-2">
        {/* Connecting track line */}
        <div className="absolute top-6 left-6 right-6 h-0.5 bg-slate-200 dark:bg-slate-800 hidden md:block" />
        <div
          className="absolute top-6 left-6 h-0.5 bg-blue-600 transition-all duration-500 hidden md:block"
          style={{ width: `${(currentStageIndex / (CANONICAL_STAGES.length - 1)) * 90}%` }}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 sm:gap-2 relative z-10">
          {CANONICAL_STAGES.map((st, i) => {
            const isCompleted = i < currentStageIndex;
            const isCurrent = i === currentStageIndex;
            const Icon = st.icon;

            return (
              <div
                key={st.id}
                className={`flex flex-col items-center text-center p-2.5 rounded-xl transition-all duration-200 ${
                  isCurrent
                    ? 'bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 shadow-xs'
                    : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 shadow-xs mb-2 ${
                    isCompleted
                      ? 'bg-blue-600 text-white shadow-blue-500/20'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-500/20 shadow-blue-600/30'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>

                <span
                  className={`text-[11.5px] font-bold leading-tight ${
                    isCurrent
                      ? 'text-blue-600 dark:text-blue-400'
                      : isCompleted
                      ? 'text-slate-900 dark:text-slate-200'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {st.shortName}
                </span>

                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                  {isCompleted ? '✓ Complete' : isCurrent ? '● Active' : 'Upcoming'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
