import React from 'react';
import Link from 'next/link';
import { LucideIcon, Inbox } from 'lucide-react';
import { cn } from '../../lib/utils';
import { Button } from './Button';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40',
        className
      )}
    >
      <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 mb-4">
        <Icon className="w-7 h-7" />
      </div>
      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">{title}</h3>
      <p className="text-sm text-slate-600 dark:text-slate-300 max-w-md mb-6 leading-relaxed">{description}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {actionLabel && actionHref && (
          <Link href={actionHref}>
            <Button size="sm" className="font-semibold">{actionLabel}</Button>
          </Link>
        )}
        {actionLabel && !actionHref && onAction && (
          <Button size="sm" onClick={onAction} className="font-semibold">
            {actionLabel}
          </Button>
        )}
        {secondaryActionLabel && onSecondaryAction && (
          <Button size="sm" variant="outline" onClick={onSecondaryAction} className="font-semibold">
            {secondaryActionLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
