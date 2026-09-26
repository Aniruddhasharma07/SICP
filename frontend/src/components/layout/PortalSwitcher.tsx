'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { UserRole } from '@sicp/shared';
import { ChevronDown, Check, ShieldCheck, ExternalLink, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface PortalDef {
  id: string;
  name: string;
  shortName: string;
  path: string;
  icon: string;
  description: string;
  accentColor: string;
  badge: string;
}

export const PORTAL_DEFINITIONS: PortalDef[] = [
  {
    id: 'complaint',
    name: 'Complaint Dashboard',
    shortName: 'Complaints',
    path: '/dashboard',
    icon: '📋',
    description: 'Citizens, Community Organizations & Government Agencies: triage, ground verification & tracking',
    accentColor: 'blue',
    badge: 'Civic',
  },
  {
    id: 'government',
    name: 'Government Dashboard',
    shortName: 'Government',
    path: '/government',
    icon: '🏛️',
    description: 'Review SLA escalations, add or approve universities & industries, structured performance rating',
    accentColor: 'slate',
    badge: 'Gov Only',
  },
  {
    id: 'university',
    name: 'University Dashboard',
    shortName: 'University',
    path: '/university',
    icon: '🎓',
    description: 'Self-register universities, accreditation status, official government ratings & R&D projects',
    accentColor: 'indigo',
    badge: 'Academia',
  },
  {
    id: 'industry',
    name: 'Industry Dashboard',
    shortName: 'Industry',
    path: '/industry',
    icon: '🏭',
    description: 'Industry Partners, MSMEs & CSR Organizations: self-registration, accreditation & ratings',
    accentColor: 'amber',
    badge: 'Partner',
  },
  {
    id: 'admin',
    name: 'System Admin Dashboard',
    shortName: 'Admin',
    path: '/admin',
    icon: '🛡️',
    description: 'Superuser administration, platform telemetry, user directory & immutable audit ledger',
    accentColor: 'emerald',
    badge: 'Admin Only',
  },
];

export function getAuthorizedPortals(role?: string | null): PortalDef[] {
  // Public & Citizens always have Civic Portal
  const authorized: PortalDef[] = [PORTAL_DEFINITIONS[0]];

  // For unauthenticated/public visitors, allow Civic, University, and Industry discovery
  if (!role) {
    authorized.push(PORTAL_DEFINITIONS[2]); // University
    authorized.push(PORTAL_DEFINITIONS[3]); // Industry
    return authorized;
  }

  const r = role.toUpperCase();

  // Government Portal access
  if (['GOVERNMENT_OFFICER', 'GOVERNMENT_DEPARTMENT', 'SYSTEM_ADMIN'].includes(r)) {
    authorized.push(PORTAL_DEFINITIONS[1]);
  }

  // University Portal access (Academic, Industry collaborator, Government oversight, Admin, or Citizen discovery)
  if ([
    'UNIVERSITY_ADMIN', 'FACULTY', 'STUDENT', 'RESEARCH_ASSISTANT',
    'INDUSTRY_PARTNER', 'MSME', 'CSR_ORGANIZATION', 'STARTUP',
    'GOVERNMENT_OFFICER', 'GOVERNMENT_DEPARTMENT',
    'CITIZEN', 'COMMUNITY_GROUP', 'PRI', 'ULB',
    'SYSTEM_ADMIN',
  ].includes(r)) {
    authorized.push(PORTAL_DEFINITIONS[2]);
  }

  // Industry Portal access (Corporate partner, University collaborator, Government oversight, Admin, or Citizen discovery)
  if ([
    'INDUSTRY_PARTNER', 'MSME', 'CSR_ORGANIZATION', 'STARTUP',
    'UNIVERSITY_ADMIN', 'FACULTY', 'STUDENT', 'RESEARCH_ASSISTANT',
    'GOVERNMENT_OFFICER', 'GOVERNMENT_DEPARTMENT',
    'CITIZEN', 'COMMUNITY_GROUP', 'PRI', 'ULB',
    'SYSTEM_ADMIN',
  ].includes(r)) {
    authorized.push(PORTAL_DEFINITIONS[3]);
  }

  // System Admin Portal access (Strictly System Admin)
  if (r === 'SYSTEM_ADMIN') {
    authorized.push(PORTAL_DEFINITIONS[4]);
  }

  return authorized;
}

export function PortalSwitcher() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const authorizedPortals = getAuthorizedPortals(user?.role);

  // Determine current active portal
  let activePortal = PORTAL_DEFINITIONS[0];
  if (pathname.startsWith('/government')) {
    activePortal = PORTAL_DEFINITIONS[1];
  } else if (pathname.startsWith('/university')) {
    activePortal = PORTAL_DEFINITIONS[2];
  } else if (pathname.startsWith('/industry') || pathname.startsWith('/organizations')) {
    activePortal = PORTAL_DEFINITIONS[3];
  } else if (pathname.startsWith('/admin') || pathname.startsWith('/audit')) {
    activePortal = PORTAL_DEFINITIONS[4];
  }

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:border-slate-400 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 transition-colors text-xs font-bold text-slate-900 dark:text-slate-100 cursor-pointer shadow-2xs"
        title="Switch SICP Portal Experience"
      >
        <span className="text-sm">{activePortal.icon}</span>
        <span className="hidden sm:inline font-extrabold text-slate-900 dark:text-white">{activePortal.shortName}</span>
        <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden lg:inline">Portal</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-slate-500 dark:text-slate-400 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl z-50 p-2 space-y-1 animate-in fade-in-50 zoom-in-95">
          <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 rounded-t-lg">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>SICP 5-Portal Architecture</span>
              <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/60 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded">
                {authorizedPortals.length} Accessible
              </span>
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
              Switch between authorized SICP domain environments.
            </p>
          </div>

          <div className="py-1 space-y-1 max-h-80 overflow-y-auto">
            {authorizedPortals.map((portal) => {
              const isCurrent = portal.id === activePortal.id;
              return (
                <Link
                  key={portal.id}
                  href={portal.path}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    'flex items-start gap-3 p-2.5 rounded-lg transition-colors text-left group',
                    isCurrent
                      ? 'bg-blue-50/90 dark:bg-blue-950/60 border border-blue-300 dark:border-blue-700 text-blue-950 dark:text-blue-100 shadow-2xs'
                      : 'hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-800 dark:text-slate-200'
                  )}
                >
                  <div className="text-xl pt-0.5 flex-shrink-0">{portal.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate text-slate-900 dark:text-slate-100">{portal.name}</span>
                      {isCurrent ? (
                        <Check className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {portal.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 mt-0.5 leading-snug">
                      {portal.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {authorizedPortals.length < PORTAL_DEFINITIONS.length && (
            <div className="px-3 py-2 bg-slate-50 dark:bg-slate-800/60 rounded-lg text-[10px] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <span>Additional portals require role verification</span>
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
