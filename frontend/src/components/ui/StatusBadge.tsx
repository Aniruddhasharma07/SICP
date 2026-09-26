import React from 'react';
import { cn } from '../../lib/utils';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Sparkles,
  GitMerge,
  Layers,
  ShieldCheck,
  Ban,
  HelpCircle,
  Activity,
  LucideIcon,
} from 'lucide-react';

export type StatusVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'purple'
  | 'neutral';

interface StatusConfig {
  label: string;
  variant: StatusVariant;
  icon: LucideIcon;
}

const STATUS_MAP: Record<string, StatusConfig> = {
  // Challenge statuses
  DRAFT: { label: 'Draft', variant: 'neutral', icon: Clock },
  SUBMITTED: { label: 'Submitted', variant: 'info', icon: Clock },
  UNDER_GOV_REVIEW: { label: 'Government Review', variant: 'warning', icon: Clock },
  GOVERNMENT_REVIEW: { label: 'Government Review', variant: 'warning', icon: Clock },
  NEEDS_MORE_INFO: { label: 'Needs More Info', variant: 'warning', icon: AlertTriangle },
  APPROVED: { label: 'Approved', variant: 'success', icon: CheckCircle2 },
  GOVERNMENT_APPROVED: { label: 'Government Approved', variant: 'success', icon: CheckCircle2 },
  VALIDATED: { label: 'Validated', variant: 'success', icon: CheckCircle2 },
  CLUSTER_ROOT: { label: 'Systemic Root', variant: 'purple', icon: Layers },
  MERGED_INTO_CLUSTER: { label: 'Merged', variant: 'neutral', icon: GitMerge },
  MERGED_INTO_SYSTEMIC: { label: 'Merged into Systemic', variant: 'neutral', icon: GitMerge },
  ASSIGNED_TO_UNIVERSITY: { label: 'Assigned to University', variant: 'purple', icon: Sparkles },
  IN_RESEARCH: { label: 'In Research', variant: 'purple', icon: Sparkles },
  SOLUTION_PROPOSED: { label: 'Solution Proposed', variant: 'info', icon: Activity },
  IN_PILOT: { label: 'In Pilot', variant: 'warning', icon: Activity },
  PILOT_STAGE: { label: 'Pilot Stage', variant: 'warning', icon: Activity },
  DEPLOYED: { label: 'Deployed', variant: 'success', icon: CheckCircle2 },
  RESOLVED: { label: 'Resolved', variant: 'success', icon: CheckCircle2 },
  REJECTED: { label: 'Rejected', variant: 'error', icon: XCircle },
  CLOSED: { label: 'Closed', variant: 'neutral', icon: Ban },

  // Project stages
  PROPOSAL: { label: 'Proposal', variant: 'info', icon: Clock },
  PROTOTYPE: { label: 'Prototype', variant: 'purple', icon: Sparkles },
  TESTING: { label: 'Testing', variant: 'warning', icon: Activity },
  PILOT: { label: 'Pilot Active', variant: 'purple', icon: Activity },
  ARCHIVED: { label: 'Archived', variant: 'neutral', icon: Ban },

  // Intent statuses
  VALID_PROBLEM: { label: 'Valid Societal Problem', variant: 'success', icon: CheckCircle2 },
  UNCLEAR_PROBLEM: { label: 'Needs More Context', variant: 'warning', icon: AlertTriangle },
  GIBBERISH: { label: 'Unintelligible Input', variant: 'error', icon: Ban },
  NON_PROBLEM: { label: 'Not a Societal Problem', variant: 'neutral', icon: HelpCircle },
  TEST_INPUT: { label: 'Test Input Blocked', variant: 'neutral', icon: Ban },
  SPAM: { label: 'Spam Detected', variant: 'error', icon: Ban },
  ABUSIVE_OR_UNSAFE: { label: 'Unsafe Content', variant: 'error', icon: Ban },

  // Verification
  VERIFIED: { label: 'Verified', variant: 'success', icon: ShieldCheck },
  UNVERIFIED: { label: 'Unverified', variant: 'warning', icon: Clock },
  PENDING: { label: 'Pending Review', variant: 'info', icon: Clock },

  // Priorities
  CRITICAL: { label: 'Critical', variant: 'error', icon: AlertTriangle },
  HIGH: { label: 'High', variant: 'warning', icon: AlertTriangle },
  MEDIUM: { label: 'Medium', variant: 'info', icon: Clock },
  LOW: { label: 'Low', variant: 'neutral', icon: Clock },
};

const VARIANT_STYLES: Record<StatusVariant, { badge: string; dot: string }> = {
  default: {
    badge: 'bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    dot: 'bg-slate-500',
  },
  success: {
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    dot: 'bg-emerald-600 dark:bg-emerald-400',
  },
  warning: {
    badge: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    dot: 'bg-amber-600 dark:bg-amber-400',
  },
  error: {
    badge: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    dot: 'bg-rose-600 dark:bg-rose-400',
  },
  info: {
    badge: 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    dot: 'bg-blue-600 dark:bg-blue-400',
  },
  purple: {
    badge: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    dot: 'bg-purple-600 dark:bg-purple-400',
  },
  neutral: {
    badge: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    dot: 'bg-slate-500',
  },
};

export interface StatusBadgeProps {
  status: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showDot?: boolean;
  className?: string;
}

export function StatusBadge({
  status,
  label,
  size = 'md',
  showIcon = true,
  showDot = false,
  className,
}: StatusBadgeProps) {
  const norm = (status || '').toUpperCase().replace(/\s+/g, '_');
  const humanized = (status || 'Unknown')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const config = STATUS_MAP[norm] || {
    label: label || humanized,
    variant: 'neutral' as StatusVariant,
    icon: HelpCircle,
  };

  const displayLabel = label || config.label;
  const style = VARIANT_STYLES[config.variant] || VARIANT_STYLES.neutral;
  const IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }[size];

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }[size];

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-full border transition-colors select-none',
        sizeClasses,
        style.badge,
        className
      )}
    >
      {showDot && (
        <span className={cn('rounded-full shrink-0', style.dot, size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2')} />
      )}
      {showIcon && <IconComponent className={cn('shrink-0', iconSizes)} />}
      <span>{displayLabel}</span>
    </span>
  );
}
