'use client';

import React, { ReactNode } from 'react';
import Link from 'next/link';
import { cn } from '../../lib/utils';
import { ChevronRight, ArrowLeft } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  description?: string;
  portal?: string;
  portalBadge?: {
    text: string;
    variant?: 'civic' | 'government' | 'university' | 'industry' | 'admin';
  };
  badge?: string;
  statusBadge?: ReactNode;
  status?: string | ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  action?: ReactNode;
  backHref?: string;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  description,
  portal,
  portalBadge,
  badge,
  statusBadge,
  status,
  breadcrumbs,
  actions,
  action,
  backHref,
  className,
}: PageHeaderProps) {
  const badgeStyles: Record<string, string> = {
    civic: 'bg-blue-50 text-blue-700 border-blue-200',
    government: 'bg-purple-50 text-purple-700 border-purple-200',
    university: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    industry: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    admin: 'bg-slate-900 text-white border-slate-800',
  };

  const effectiveSubtitle = subtitle || description;
  const effectiveActions = actions || action;

  // Resolve portal badge from portal prop if portalBadge not provided
  let effectivePortalBadge = portalBadge;
  if (!effectivePortalBadge && portal) {
    const pLower = portal.toLowerCase();
    const variant = (
      pLower.includes('gov') ? 'government' :
      pLower.includes('univ') ? 'university' :
      pLower.includes('ind') ? 'industry' :
      pLower.includes('admin') ? 'admin' : 'civic'
    ) as 'civic' | 'government' | 'university' | 'industry' | 'admin';
    effectivePortalBadge = { text: `${portal} PORTAL`, variant };
  }

  return (
    <div className={cn('space-y-3 pb-6 border-b border-slate-200 dark:border-slate-800', className)}>
      {/* Breadcrumbs or Back Link */}
      <div className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav className="flex items-center gap-1.5 flex-wrap" aria-label="Breadcrumb">
            {breadcrumbs.map((item, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />}
                {item.href ? (
                  <Link href={item.href} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors font-medium">
                    {item.label}
                  </Link>
                ) : (
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{item.label}</span>
                )}
              </React.Fragment>
            ))}
          </nav>
        ) : backHref ? (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1.5 font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </Link>
        ) : <div />}

        <div className="flex items-center gap-2">
          {badge && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
              {badge}
            </span>
          )}
          {effectivePortalBadge && (
            <span
              className={cn(
                'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                badgeStyles[effectivePortalBadge.variant || 'civic']
              )}
            >
              {effectivePortalBadge.text}
            </span>
          )}
        </div>
      </div>

      {/* Main Title Row */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
              {title}
            </h1>
            {statusBadge}
            {status && typeof status === 'string' && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700">
                {status}
              </span>
            )}
            {status && typeof status !== 'string' && status}
          </div>
          {effectiveSubtitle && (
            <p className="text-xs md:text-sm text-slate-600 dark:text-slate-300 max-w-3xl leading-relaxed">
              {effectiveSubtitle}
            </p>
          )}
        </div>

        {effectiveActions && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            {effectiveActions}
          </div>
        )}
      </div>
    </div>
  );
}
