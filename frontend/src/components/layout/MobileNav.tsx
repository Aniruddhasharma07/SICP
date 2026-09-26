'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../lib/auth-context';
import { cn } from '../../lib/utils';
import { Home, Compass, PlusCircle, BrainCircuit, User, ShieldCheck, GraduationCap, Briefcase, LayoutDashboard } from 'lucide-react';

export function MobileNav() {
  const pathname = usePathname();
  const { user } = useAuth();

  const getPortalItem = () => {
    if (!user) return { label: 'Login', href: '/login', icon: User };
    const role = (user.role || '').toUpperCase();
    if (role.includes('GOVERNMENT') || role.includes('MUNICIPAL')) {
      return { label: 'Command', href: '/government', icon: ShieldCheck };
    }
    if (role.includes('UNIVERSITY') || role.includes('FACULTY') || role.includes('STUDENT')) {
      return { label: 'R&D', href: '/university', icon: GraduationCap };
    }
    if (role.includes('INDUSTRY') || role.includes('STARTUP') || role.includes('MSME') || role.includes('CSR')) {
      return { label: 'Industry', href: '/industry', icon: Briefcase };
    }
    if (role.includes('ADMIN')) {
      return { label: 'Admin', href: '/admin', icon: ShieldCheck };
    }
    return { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard };
  };

  const portalItem = getPortalItem();

  const items = [
    { label: 'Home', href: '/', icon: Home },
    { label: 'Explore', href: '/challenges', icon: Compass },
    { label: 'Submit', href: '/challenges/new', icon: PlusCircle, isPrimary: true },
    { label: 'Solutions', href: '/solutions', icon: BrainCircuit },
    portalItem,
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 py-1.5 px-3 shadow-lg select-none">
      <div className="flex items-center justify-around">
        {items.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href + '/'));
          const isPrimary = 'isPrimary' in item && item.isPrimary;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center min-w-[56px] min-h-[48px] px-1 text-[11px] font-semibold transition-colors touch-manipulation',
                isPrimary
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : isActive
                  ? 'text-blue-600 dark:text-blue-400 font-bold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white active:text-blue-600'
              )}
            >
              <div
                className={cn(
                  'flex items-center justify-center transition-all',
                  isPrimary
                    ? 'w-9 h-9 -mt-3 bg-blue-600 text-white rounded-full shadow-md hover:bg-blue-700 ring-4 ring-white dark:ring-slate-900'
                    : 'w-6 h-6'
                )}
              >
                <Icon className={isPrimary ? 'w-5 h-5' : 'w-5 h-5'} />
              </div>
              <span className={cn('truncate max-w-[64px]', isPrimary && 'text-[10px] mt-0.5 font-bold text-blue-700 dark:text-blue-300')}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
