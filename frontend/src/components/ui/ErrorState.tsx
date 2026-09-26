import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred while loading this data. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 md:p-10 text-center rounded-2xl border border-rose-300 dark:border-rose-900/50 bg-rose-50/60 dark:bg-rose-950/20',
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-400 flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <h4 className="text-base font-bold text-rose-950 dark:text-rose-100 mb-1">{title}</h4>
      <p className="text-sm text-rose-800 dark:text-rose-300 max-w-md mb-5 leading-relaxed">{message}</p>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          className="border-rose-400 dark:border-rose-800 text-rose-800 dark:text-rose-200 bg-white dark:bg-slate-900 hover:bg-rose-50 dark:hover:bg-rose-950/40 gap-2 font-semibold shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Try Again</span>
        </Button>
      )}
    </div>
  );
}
