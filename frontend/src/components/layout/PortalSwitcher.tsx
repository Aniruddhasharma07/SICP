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

  if (!role) return authorized;

  const r = role.toUpperCase();

  // Government Portal access
  if (['GOVERNMENT_OFFICER', 'GOVERNMENT_DEPARTMENT', 'SYSTEM_ADMIN'].includes(r)) {
    authorized.push(PORTAL_DEFINITIONS[1]);
  }

  // University Portal access
  if (['UNIVERSITY_ADMIN', 'FACULTY', 'STUDENT', 'RESEARCH_ASSISTANT', 'SYSTEM_ADMIN'].includes(r)) {
    authorized.push(PORTAL_DEFINITIONS[2]);
  }

  // Industry Portal access (Industry, MSME, CSR)
  if (['INDUSTRY_PARTNER', 'MSME', 'CSR_ORGANIZATION', 'STARTUP', 'SYSTEM_ADMIN'].includes(r)) {
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
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/80 hover:bg-slate-100 transition-colors text-xs font-semibold text-slate-800"
        title="Switch SICP Portal Experience"
      >
        <span className="text-sm">{activePortal.icon}</span>
        <span className="hidden sm:inline font-bold text-slate-900">{activePortal.shortName}</span>
        <span className="text-[10px] text-slate-400 font-normal hidden lg:inline">Portal</span>
        <ChevronDown className={cn('w-3.5 h-3.5 text-slate-400 transition-transform duration-200', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 sm:w-80 rounded-xl bg-white border border-slate-200 shadow-xl z-50 p-2 space-y-1 animate-in fade-in-50 zoom-in-95">
          <div className="px-3 py-2 border-b border-slate-100">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>SICP 5-Portal Architecture</span>
              <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                {authorizedPortals.length} Accessible
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
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
                      ? 'bg-blue-50/80 border border-blue-200/80 text-blue-950'
                      : 'hover:bg-slate-50 text-slate-700 hover:text-slate-900'
                  )}
                >
                  <div className="text-xl pt-0.5 flex-shrink-0">{portal.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold truncate">{portal.name}</span>
                      {isCurrent ? (
                        <Check className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                      ) : (
                        <span className="text-[9px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-500">
                          {portal.badge}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-snug">
                      {portal.description}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {authorizedPortals.length < PORTAL_DEFINITIONS.length && (
            <div className="px-3 py-2 bg-slate-50 rounded-lg text-[10px] text-slate-500 flex items-center justify-between">
              <span>Additional portals require role verification</span>
              <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
