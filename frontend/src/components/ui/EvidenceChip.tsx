'use client';

import React from 'react';
import { EvidenceEpistemicClass } from '@sicp/shared';
import {
  Eye,
  Cpu,
  Database,
  Compass,
  Sparkles,
  HelpCircle,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileQuestion,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type EpistemicChipType = EvidenceEpistemicClass | 'UNKNOWN' | 'UNOBSERVED';
export type HeuerConsistency = 'SUPPORTING' | 'INCONSISTENT' | 'INCONCLUSIVE';

export interface EvidenceChipProps {
  epistemicClass?: EpistemicChipType | string;
  consistency?: HeuerConsistency;
  label?: string;
  code?: string; // e.g. "E-01"
  size?: 'sm' | 'md';
  showIcon?: boolean;
  className?: string;
  onClick?: () => void;
}

export function EvidenceChip({
  epistemicClass = 'OBSERVED',
  consistency,
  label,
  code,
  size = 'md',
  showIcon = true,
  className = '',
  onClick,
}: EvidenceChipProps) {
  const normClass = (epistemicClass || 'UNKNOWN').toUpperCase();

  // Epistemic Class Styling & Icon
  const getEpistemicMeta = () => {
    switch (normClass) {
      case 'OBSERVED':
        return {
          label: label || 'Observed',
          bg: 'bg-sky-50 dark:bg-sky-950/60',
          border: 'border-sky-300 dark:border-sky-800',
          text: 'text-sky-800 dark:text-sky-300',
          icon: Eye,
          desc: 'Direct ground sensor or citizen observation',
        };
      case 'SOURCE_DERIVED':
      case 'SOURCE-DERIVED':
        return {
          label: label || 'Source-Derived',
          bg: 'bg-indigo-50 dark:bg-indigo-950/60',
          border: 'border-indigo-300 dark:border-indigo-800',
          text: 'text-indigo-800 dark:text-indigo-300',
          icon: Database,
          desc: 'Verified municipal GIS registry or asset lineage',
        };
      case 'COMPUTED':
        return {
          label: label || 'Computed',
          bg: 'bg-purple-50 dark:bg-purple-950/60',
          border: 'border-purple-300 dark:border-purple-800',
          text: 'text-purple-800 dark:text-purple-300',
          icon: Cpu,
          desc: 'Deterministic algorithmic computation',
        };
      case 'INFERRED':
        return {
          label: label || 'Inferred',
          bg: 'bg-amber-50 dark:bg-amber-950/60',
          border: 'border-amber-300 dark:border-amber-800',
          text: 'text-amber-800 dark:text-amber-300',
          icon: Compass,
          desc: 'Inferred from catchment boundary approximations',
        };
      case 'AI_INTERPRETED':
      case 'AI-INTERPRETED':
        return {
          label: label || 'AI-Interpreted',
          bg: 'bg-blue-50 dark:bg-blue-950/60',
          border: 'border-blue-300 dark:border-blue-800',
          text: 'text-blue-800 dark:text-blue-300',
          icon: Sparkles,
          desc: 'Semantic symptom extraction via backend AI',
        };
      case 'HYPOTHESIZED':
        return {
          label: label || 'Hypothesized',
          bg: 'bg-slate-100 dark:bg-slate-800',
          border: 'border-slate-300 dark:border-slate-700',
          text: 'text-slate-800 dark:text-slate-200',
          icon: HelpCircle,
          desc: 'Richards Heuer candidate failure explanation',
        };
      case 'HUMAN_VALIDATED':
      case 'HUMAN-VALIDATED':
        return {
          label: label || 'Human-Validated',
          bg: 'bg-emerald-50 dark:bg-emerald-950/60',
          border: 'border-emerald-300 dark:border-emerald-800',
          text: 'text-emerald-800 dark:text-emerald-300',
          icon: ShieldCheck,
          desc: 'Signed off by statutory government authority',
        };
      case 'VERIFIED_OUTCOME':
      case 'VERIFIED-OUTCOME':
        return {
          label: label || 'Verified Outcome',
          bg: 'bg-teal-50 dark:bg-teal-950/60',
          border: 'border-teal-300 dark:border-teal-800',
          text: 'text-teal-800 dark:text-teal-300',
          icon: CheckCircle2,
          desc: 'Post-intervention field verification confirmed',
        };
      case 'UNKNOWN':
      case 'UNOBSERVED':
      default:
        return {
          label: label || 'Unknown / Unobserved',
          bg: 'bg-slate-50 dark:bg-slate-900',
          border: 'border-slate-300 dark:border-slate-800',
          text: 'text-slate-600 dark:text-slate-400',
          icon: FileQuestion,
          desc: 'No ground telemetry or observation recorded yet',
        };
    }
  };

  const meta = getEpistemicMeta();
  const IconComponent = meta.icon;

  // Heuer Consistency Token ($E^+$, $E^-$, $E^?$)
  const getConsistencyToken = () => {
    if (!consistency) return null;
    switch (consistency) {
      case 'SUPPORTING':
        return (
          <span className="font-mono font-black text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/80 px-1 rounded text-[11px]">
            E⁺
          </span>
        );
      case 'INCONSISTENT':
        return (
          <span className="font-mono font-black text-rose-700 dark:text-rose-400 bg-rose-100 dark:bg-rose-950/80 px-1 rounded text-[11px]">
            E⁻
          </span>
        );
      case 'INCONCLUSIVE':
      default:
        return (
          <span className="font-mono font-black text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-950/80 px-1 rounded text-[11px]">
            Eˀ
          </span>
        );
    }
  };

  const isClickable = Boolean(onClick);

  return (
    <span
      onClick={onClick}
      title={`${meta.label}: ${meta.desc}`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border font-medium select-none transition-colors',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        meta.bg,
        meta.border,
        meta.text,
        isClickable && 'cursor-pointer hover:opacity-85',
        className
      )}
    >
      {code && (
        <span className="font-mono font-bold opacity-75">
          {code}
        </span>
      )}
      {getConsistencyToken()}
      {showIcon && <IconComponent className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />}
      <span>{meta.label}</span>
    </span>
  );
}
