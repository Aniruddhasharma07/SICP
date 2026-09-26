'use client';

import React, { ReactNode, isValidElement } from 'react';
import { cn } from '../../lib/utils';
import { ArrowUpRight, ArrowDownRight, ChevronRight, Minus } from 'lucide-react';

export interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode | React.ComponentType<{ className?: string }>;
  trend?: {
    value?: string | number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };
  badge?:
    | string
    | {
        text: string;
        variant?: 'default' | 'success' | 'warning' | 'destructive' | 'secondary' | 'outline';
      };
  isActive?: boolean;
  active?: boolean;
  onClick?: () => void;
  className?: string;
  variant?: 'default' | 'warning' | 'danger' | 'success' | 'info';
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  badge,
  isActive = false,
  active = false,
  onClick,
  className,
  variant = 'default',
}: MetricCardProps) {
  const isClickable = Boolean(onClick);
  const effectiveActive = isActive || active;

  const variantStyles = {
    default: 'hover:border-slate-300 dark:hover:border-slate-700',
    warning: 'border-amber-200 dark:border-amber-800/60 bg-amber-50/40 dark:bg-amber-950/20 hover:border-amber-300',
    danger: 'border-rose-200 dark:border-rose-800/60 bg-rose-50/40 dark:bg-rose-950/20 hover:border-rose-300',
    success: 'border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-300',
    info: 'border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-950/20 hover:border-blue-300',
  };

  const activeStyles = effectiveActive
    ? 'ring-2 ring-blue-600 border-blue-600 bg-blue-50/40 dark:bg-blue-950/30 shadow-sm'
    : '';

  const badgeStyles = {
    default: 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    destructive: 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    secondary: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
    outline: 'border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200',
  };

  const renderIcon = () => {
    if (!icon) return null;
    if (isValidElement(icon)) return icon;
    if (typeof icon === 'function') {
      const IconComponent = icon as React.ComponentType<{ className?: string }>;
      return <IconComponent className="w-5 h-5 text-slate-600 dark:text-slate-400" />;
    }
    return null;
  };

  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={isClickable ? (e) => (e.key === 'Enter' || e.key === ' ' ? onClick!() : null) : undefined}
      className={cn(
        'relative p-4 md:p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs transition-all flex flex-col justify-between select-none',
        variantStyles[variant],
        activeStyles,
        isClickable && 'cursor-pointer hover:shadow-md hover:-translate-y-0.5',
        className
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 tracking-tight line-clamp-1">
            {title}
          </span>
          {renderIcon()}
        </div>

        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
            {value}
          </span>
          {badge && (
            <span
              className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                typeof badge === 'string'
                  ? 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
                  : badgeStyles[badge.variant || 'default']
              )}
            >
              {typeof badge === 'string' ? badge : badge.text}
            </span>
          )}
        </div>

        {subtitle && (
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {(trend || isClickable) && (
        <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
          {trend ? (
            <div className="flex items-center gap-1 font-medium">
              {trend.direction === 'up' && (
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              )}
              {trend.direction === 'down' && (
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              )}
              {trend.direction === 'neutral' && (
                <Minus className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              )}
              <span
                className={cn(
                  'font-bold',
                  trend.direction === 'up' && 'text-emerald-700 dark:text-emerald-300',
                  trend.direction === 'down' && 'text-rose-700 dark:text-rose-300',
                  trend.direction === 'neutral' && 'text-slate-600 dark:text-slate-400'
                )}
              >
                {trend.value ? `${trend.value} ` : ''}
              </span>
              {trend.label && <span className="text-slate-500 dark:text-slate-400">{trend.label}</span>}
            </div>
          ) : <div />}

          {isClickable && (
            <div className="flex items-center text-blue-600 dark:text-blue-400 font-semibold text-[11px] group">
              <span>Filter</span>
              <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
