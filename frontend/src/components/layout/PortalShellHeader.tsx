'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import {
  ShieldCheck,
  Building2,
  GraduationCap,
  Briefcase,
  Layers,
  ChevronRight,
  Sparkles,
  ArrowUpRight,
  Activity,
} from 'lucide-react';
import { cn } from '../../lib/utils';

export type PortalType = 'citizen' | 'government' | 'university' | 'industry' | 'admin';

interface PortalMeta {
  title: string;
  badge: string;
  badgeVariant: 'civic' | 'government' | 'university' | 'industry' | 'admin';
  roleLabel: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  tagline: string;
  quickAction?: {
    label: string;
    href: string;
  };
}

const PORTAL_METAS: Record<PortalType, PortalMeta> = {
  citizen: {
    title: 'Citizen Complaint & Civic Action Portal',
    badge: 'Civic Portal',
    badgeVariant: 'civic',
    roleLabel: 'Citizen / Community Monitor',
    accentBg: 'bg-blue-50/90 dark:bg-blue-950/40',
    accentBorder: 'border-blue-200 dark:border-blue-800',
    accentText: 'text-blue-950 dark:text-blue-200',
    tagline: 'Grievance submission, SLA tracking, upvoting & ground verification',
    quickAction: {
      label: '+ Report New Issue',
      href: '/challenges/new',
    },
  },
  government: {
    title: 'Government & Municipal Command Portal',
    badge: 'Government Portal',
    badgeVariant: 'government',
    roleLabel: 'Municipal Officer / Department Authority',
    accentBg: 'bg-purple-50/90 dark:bg-purple-950/40',
    accentBorder: 'border-purple-200 dark:border-purple-800',
    accentText: 'text-purple-950 dark:text-purple-200',
    tagline: 'SLA triage, university assignment, institutional ratings & pilot approval',
    quickAction: {
      label: 'Triage Priority Queue',
      href: '/government?mode=QUEUE',
    },
  },
  university: {
    title: 'Academic Innovation & R&D Portal',
    badge: 'University Portal',
    badgeVariant: 'university',
    roleLabel: 'Faculty PI / Student Researcher / Dean',
    accentBg: 'bg-indigo-50/90 dark:bg-indigo-950/40',
    accentBorder: 'border-indigo-200 dark:border-indigo-800',
    accentText: 'text-indigo-950 dark:text-indigo-200',
    tagline: 'Applied research, multidisciplinary teams, prototyping & solution memory',
    quickAction: {
      label: 'Browse R&D Calls',
      href: '/university?tab=assigned',
    },
  },
  industry: {
    title: 'Industry & CSR Commercialization Portal',
    badge: 'Industry Portal',
    badgeVariant: 'industry',
    roleLabel: 'Corporate Partner / MSME / CSR Lead',
    accentBg: 'bg-amber-50/90 dark:bg-amber-950/40',
    accentBorder: 'border-amber-200 dark:border-amber-800',
    accentText: 'text-amber-950 dark:text-amber-200',
    tagline: 'CSR co-funding, MSME prototype scaling, licensing & commercialization',
    quickAction: {
      label: 'Partner Self-Registration',
      href: '/industry?tab=REGISTER',
    },
  },
  admin: {
    title: 'System Administration & Security Portal',
    badge: 'System Admin Portal',
    badgeVariant: 'admin',
    roleLabel: 'Superuser / Platform Administrator',
    accentBg: 'bg-slate-900 text-white',
    accentBorder: 'border-slate-800',
    accentText: 'text-slate-100',
    tagline: 'Tamper-evident audit ledger, RBAC directory, service telemetry & system health',
    quickAction: {
      label: 'Audit Ledger',
      href: '/audit',
    },
  },
};

export function PortalShellHeader({ portal }: { portal: PortalType }) {
  const { user } = useAuth();
  const meta = PORTAL_METAS[portal] || PORTAL_METAS.citizen;
  const isDark = portal === 'admin';

  return (
    <div
      className={cn(
        'w-full border-b transition-colors px-4 md:px-8 py-2 select-none shadow-2xs',
        meta.accentBg,
        meta.accentBorder,
        meta.accentText
      )}
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        {/* Left: Portal Identity */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <span
            className={cn(
              'text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border shadow-2xs',
              isDark
                ? 'bg-slate-800 text-emerald-400 border-slate-700'
                : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-700'
            )}
          >
            {meta.badge}
          </span>

          <span className="font-extrabold tracking-tight text-sm flex items-center gap-1.5">
            {meta.title}
          </span>

          <span className={cn('hidden lg:inline text-xs font-medium', isDark ? 'text-slate-300' : 'text-slate-700 dark:text-slate-300')}>
            — {meta.tagline}
          </span>
        </div>

        {/* Right: Quick Action & Switcher */}
        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-auto">
          {meta.quickAction && (
            <Link
              href={meta.quickAction.href}
              className={cn(
                'font-bold px-3 py-1 rounded-md text-[11px] transition-all flex items-center gap-1 shadow-2xs',
                isDark
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              )}
            >
              <span>{meta.quickAction.label}</span>
              <ArrowUpRight className="w-3 h-3" />
            </Link>
          )}

          <div className="flex items-center gap-1 text-[11px] font-semibold pl-2 border-l border-current/30">
            <span className="opacity-80">Role:</span>
            <span className="font-extrabold">{user?.role || 'CITIZEN'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
