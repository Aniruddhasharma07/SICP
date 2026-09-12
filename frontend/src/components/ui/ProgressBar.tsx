'use client';

import React from 'react';
import { cn } from '../../lib/utils';

export interface ProgressBarProps {
  value: number; // 0 to 100
  label?: string;
  sublabel?: string;
  showPercentage?: boolean;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export function ProgressBar({
  value,
  label,
  sublabel,
  showPercentage = true,
  size = 'md',
  variant = 'default',
  className,
}: ProgressBarProps) {
  const safeVal = Math.min(100, Math.max(0, Math.round(value || 0)));

  const sizeClasses = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4',
  };

  const variantColors = {
    default: 'bg-blue-600',
    success: 'bg-emerald-600',
    warning: 'bg-amber-500',
    danger: 'bg-rose-600',
  };

  return (
    <div className={cn('space-y-1.5 w-full', className)}>
      {(label || showPercentage) && (
        <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
          <span>{label}</span>
          {showPercentage && <span className="font-mono text-slate-900">{safeVal}%</span>}
        </div>
      )}

      <div className={cn('w-full rounded-full bg-slate-100 overflow-hidden', sizeClasses[size])}>
        <div
          className={cn('h-full transition-all duration-300 rounded-full', variantColors[variant])}
          style={{ width: `${safeVal}%` }}
        />
      </div>

      {sublabel && (
        <p className="text-[11px] text-slate-500">{sublabel}</p>
      )}
    </div>
  );
}
