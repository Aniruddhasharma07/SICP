'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { cn } from '../../lib/utils';
import { getAuthorizedPortals, PORTAL_DEFINITIONS } from './PortalSwitcher';
import { PortalType } from './PortalShellHeader';
import {
  Compass,
  PlusCircle,
  Building2,
  ShieldAlert,
  CheckSquare,
  GraduationCap,
  BrainCircuit,
  LayoutDashboard,
  Search,
  BarChart3,
  FolderKanban,
  Briefcase,
  ShieldCheck,
  Zap,
  Activity,
  User,
  LogOut,
  Flame,
  Award,
  Users,
  FlaskConical,
  DollarSign,
  Layers,
  FileCheck,
  ChevronRight,
  TrendingUp,
  Cpu,
  Server,
  Lock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface NavSection {
  title: string;
  items: Array<{
    label: string;
    href: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    isPrimary?: boolean;
    color?: string;
  }>;
}

export function Sidebar({ portal = 'citizen' }: { portal?: PortalType }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const role = (user?.role || '').toUpperCase();
  const authorizedPortals = getAuthorizedPortals(user?.role);

  // 1. CITIZEN COMPLAINT PORTAL NAVIGATION
  const citizenSections: NavSection[] = [
    {
      title: 'Civic Grievances & Intake',
      items: [
        { label: 'Grievance Dashboard', href: '/dashboard', icon: LayoutDashboard, badge: 'Active', color: 'text-blue-600' },
        { label: 'Report New Problem', href: '/challenges/new', icon: PlusCircle, isPrimary: true, color: 'text-blue-600' },
        { label: 'Community Heatmap', href: '/map', icon: Compass, color: 'text-blue-600' },
      ],
    },
    {
      title: 'Verification & Impact',
      items: [
        { label: 'Verified Outcomes', href: '/solutions', icon: BrainCircuit, badge: 'Memory', color: 'text-emerald-600' },
        { label: 'Public Records Search', href: '/search?type=challenges', icon: Search, color: 'text-slate-500' },
      ],
    },
  ];

  // 2. GOVERNMENT PORTAL NAVIGATION
  const governmentSections: NavSection[] = [
    {
      title: 'Command & Triage Queue',
      items: [
        { label: 'Government Command', href: '/government', icon: LayoutDashboard, badge: 'SLA Active', color: 'text-purple-600' },
        { label: 'Priority Triage Queue', href: '/government?mode=QUEUE', icon: CheckSquare, isPrimary: true, color: 'text-purple-600' },
        { label: 'Jurisdictional Issues', href: '/challenges', icon: Compass, color: 'text-purple-600' },
      ],
    },
    {
      title: 'Institutional Governance',
      items: [
        { label: 'Accredited Universities', href: '/government?mode=UNIVERSITIES', icon: GraduationCap, badge: 'Ratings', color: 'text-indigo-600' },
        { label: 'Industry CSR Oversight', href: '/government?mode=INDUSTRY', icon: Briefcase, badge: 'Sanctions', color: 'text-amber-600' },
        { label: 'Field Pilot Sanctions', href: '/projects', icon: FolderKanban, color: 'text-blue-600' },
      ],
    },
    {
      title: 'Resolution Telemetry',
      items: [
        { label: 'Platform Analytics', href: '/analytics', icon: BarChart3, badge: 'Live DB', color: 'text-emerald-600' },
        { label: 'Universal Entity Search', href: '/search', icon: Search, color: 'text-slate-500' },
      ],
    },
  ];

  // 3. UNIVERSITY PORTAL NAVIGATION
  const universitySections: NavSection[] = [
    {
      title: 'R&D Calls & Proposals',
      items: [
        { label: 'Academic Dashboard', href: '/university', icon: LayoutDashboard, badge: 'Calls', color: 'text-indigo-600' },
        { label: 'Browse R&D Opportunities', href: '/university?tab=assigned', icon: Compass, isPrimary: true, color: 'text-indigo-600' },
        { label: 'Research Proposals Desk', href: '/university?tab=proposals', icon: FileCheck, color: 'text-indigo-600' },
      ],
    },
    {
      title: 'Applied Research Cockpit',
      items: [
        { label: 'Institutional Projects', href: '/projects', icon: FolderKanban, badge: 'Cockpit', color: 'text-blue-600' },
        { label: 'Multidisciplinary Teams', href: '/university?tab=teams', icon: Users, color: 'text-indigo-600' },
        { label: 'Testing & Prototype Labs', href: '/projects', icon: FlaskConical, color: 'text-cyan-600' },
      ],
    },
    {
      title: 'Intellectual Property',
      items: [
        { label: 'Solution Memory Blueprints', href: '/solutions', icon: BrainCircuit, badge: 'IP', color: 'text-emerald-600' },
        { label: 'Faculty Directory & Skills', href: '/search?type=faculty', icon: Search, color: 'text-slate-500' },
      ],
    },
  ];

  // 4. INDUSTRY PORTAL NAVIGATION
  const industrySections: NavSection[] = [
    {
      title: 'CSR & Sponsorship Matching',
      items: [
        { label: 'Corporate Dashboard', href: '/industry', icon: LayoutDashboard, badge: 'CSR', color: 'text-amber-600' },
        { label: 'Challenge Matching Engine', href: '/industry?tab=MATCHING', icon: Zap, isPrimary: true, color: 'text-amber-600' },
        { label: 'Co-Funding & Grants', href: '/industry?tab=COLLABORATION', icon: DollarSign, color: 'text-amber-600' },
      ],
    },
    {
      title: 'Commercialization & Scaling',
      items: [
        { label: 'Commercial Deployments', href: '/projects', icon: FolderKanban, color: 'text-blue-600' },
        { label: 'Tech Transfer Marketplace', href: '/solutions', icon: BrainCircuit, badge: 'Licensing', color: 'text-emerald-600' },
        { label: 'Active Collaborations', href: '/industry?tab=COLLABORATION', icon: Briefcase, color: 'text-amber-600' },
      ],
    },
    {
      title: 'Accreditation & Registry',
      items: [
        { label: 'Partner Self-Registration', href: '/industry?tab=REGISTER', icon: Building2, badge: 'MSME', color: 'text-purple-600' },
        { label: 'Ecosystem Organizations', href: '/organizations', icon: Search, color: 'text-slate-500' },
      ],
    },
  ];

  // 5. SYSTEM ADMIN PORTAL NAVIGATION
  const adminSections: NavSection[] = [
    {
      title: 'Superuser Command & Audit',
      items: [
        { label: 'Admin Command Center', href: '/admin', icon: LayoutDashboard, badge: 'Superuser', color: 'text-emerald-500' },
        { label: 'Immutable Audit Ledger', href: '/audit', icon: ShieldAlert, isPrimary: true, color: 'text-rose-500' },
        { label: 'Server & DB Diagnostics', href: '/admin?tab=overview', icon: Server, color: 'text-cyan-400' },
      ],
    },
    {
      title: 'Security & Access Directory',
      items: [
        { label: 'RBAC User Management', href: '/admin?tab=users', icon: Users, badge: 'Security', color: 'text-blue-400' },
        { label: 'Organization Verifications', href: '/admin?tab=organizations', icon: Building2, color: 'text-amber-400' },
        { label: 'Platform Challenge Controls', href: '/challenges', icon: Compass, color: 'text-purple-400' },
      ],
    },
    {
      title: 'Platform Analytics',
      items: [
        { label: 'Authoritative Analytics', href: '/analytics', icon: BarChart3, badge: 'Postgres', color: 'text-emerald-400' },
        { label: 'Global Entity Inspector', href: '/search', icon: Search, color: 'text-slate-400' },
      ],
    },
  ];

  // Select navigation based on active portal
  const activeSections: NavSection[] =
    portal === 'government'
      ? governmentSections
      : portal === 'university'
      ? universitySections
      : portal === 'industry'
      ? industrySections
      : portal === 'admin'
      ? adminSections
      : citizenSections;

  const isDark = portal === 'admin';

  return (
    <aside
      className={cn(
        'hidden md:flex w-64 flex-col border-r min-h-[calc(100vh-4rem)] p-3.5 space-y-4 select-none',
        isDark
          ? 'bg-slate-950 border-slate-800 text-slate-200'
          : 'bg-white/95 border-slate-200 text-slate-800 backdrop-blur-xs'
      )}
    >
      {/* Portal Identity Pill */}
      <div
        className={cn(
          'p-3 rounded-xl border flex items-center justify-between',
          portal === 'citizen' && 'bg-blue-50/70 border-blue-200 text-blue-900',
          portal === 'government' && 'bg-purple-50/70 border-purple-200 text-purple-900',
          portal === 'university' && 'bg-indigo-50/70 border-indigo-200 text-indigo-900',
          portal === 'industry' && 'bg-amber-50/70 border-amber-200 text-amber-900',
          portal === 'admin' && 'bg-slate-900 border-slate-800 text-white'
        )}
      >
        <div className="space-y-0.5">
          <div className="text-[10px] font-extrabold uppercase tracking-wider opacity-70">
            Active Portal Shell
          </div>
          <div className="text-xs font-black capitalize tracking-tight flex items-center gap-1.5">
            <span>{portal} Workspace</span>
          </div>
        </div>
        <span
          className={cn(
            'text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-full border',
            isDark ? 'bg-slate-800 text-emerald-400 border-slate-700' : 'bg-white text-slate-700 border-slate-200'
          )}
        >
          {portal.toUpperCase()}
        </span>
      </div>

      {/* Portal-Specific Navigation Sections */}
      <div className="space-y-4 flex-1 overflow-y-auto">
        {activeSections.map((section, sIdx) => (
          <div key={section.title} className="space-y-1">
            <div
              className={cn(
                'px-2 py-1 text-[10px] font-extrabold uppercase tracking-wider',
                isDark ? 'text-slate-400' : 'text-slate-400'
              )}
            >
              {section.title}
            </div>
            {section.items.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    'flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150',
                    isActive
                      ? isDark
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-slate-900 text-white shadow-xs'
                      : isDark
                      ? 'text-slate-300 hover:bg-slate-900 hover:text-white'
                      : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                  )}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Icon className={cn('w-4 h-4 shrink-0', isActive ? (isDark ? 'text-emerald-300' : 'text-white') : item.color)} />
                    <span className="truncate">{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={cn(
                        'text-[9px] px-1.5 py-0.5 rounded font-semibold shrink-0 uppercase tracking-wider',
                        isActive
                          ? isDark
                            ? 'bg-emerald-500/30 text-emerald-200'
                            : 'bg-white/20 text-white'
                          : isDark
                          ? 'bg-slate-800 text-slate-300'
                          : 'bg-slate-100 text-slate-500'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Switch to Other Portals Drawer */}
      <div className={cn('pt-2 border-t space-y-1.5', isDark ? 'border-slate-800' : 'border-slate-100')}>
        <div className="px-2 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
          <span>Switch Portal</span>
          <span className="text-[9px] opacity-70">
            {authorizedPortals.length} Authorized
          </span>
        </div>
        <div className="grid grid-cols-1 gap-1">
          {authorizedPortals
            .filter((p) => {
              const currentPId =
                portal === 'citizen'
                  ? 'complaint'
                  : portal === 'government'
                  ? 'government'
                  : portal === 'university'
                  ? 'university'
                  : portal === 'industry'
                  ? 'industry'
                  : 'admin';
              return p.id !== currentPId;
            })
            .slice(0, 4)
            .map((p) => (
              <Link
                key={p.id}
                href={p.path}
                className={cn(
                  'flex items-center justify-between px-2 py-1.5 rounded-lg text-xs font-medium transition-colors',
                  isDark
                    ? 'hover:bg-slate-900 text-slate-300'
                    : 'hover:bg-slate-100 text-slate-600'
                )}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <span className="text-xs">{p.icon}</span>
                  <span className="truncate">{p.shortName}</span>
                </span>
                <ChevronRight className="w-3 h-3 opacity-40" />
              </Link>
            ))}
        </div>
      </div>

      {/* User Context & Sign Out */}
      <div className={cn('pt-2 border-t space-y-2', isDark ? 'border-slate-800' : 'border-slate-100')}>
        {user ? (
          <div
            className={cn(
              'flex items-center justify-between p-2 rounded-lg border text-xs',
              isDark ? 'bg-slate-900 border-slate-800 text-slate-200' : 'bg-white border-slate-200/80 text-slate-800'
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0',
                  isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-200 text-slate-700'
                )}
              >
                {user.fullName ? user.fullName[0] : 'U'}
              </div>
              <div className="truncate">
                <span className="font-bold text-xs truncate block leading-tight">
                  {user.fullName || user.email}
                </span>
                <span className="text-[9px] text-slate-400 uppercase font-semibold block leading-tight">
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1 rounded text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="block text-center py-2 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700"
          >
            Sign In to Portal
          </Link>
        )}
      </div>
    </aside>
  );
}
