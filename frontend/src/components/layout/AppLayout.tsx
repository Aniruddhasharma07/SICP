'use client';

import React, { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppHeader } from './AppHeader';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { PortalShellHeader, PortalType } from './PortalShellHeader';

export interface AppLayoutProps {
  children: ReactNode;
  portal?: PortalType;
}

export function AppLayout({ children, portal }: AppLayoutProps) {
  const pathname = usePathname();

  // Infer portal from pathname if not explicitly passed
  const effectivePortal: PortalType =
    portal ||
    (pathname.startsWith('/government')
      ? 'government'
      : pathname.startsWith('/university')
      ? 'university'
      : pathname.startsWith('/industry')
      ? 'industry'
      : pathname.startsWith('/admin') || pathname.startsWith('/audit')
      ? 'admin'
      : 'citizen');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col overflow-x-hidden w-full relative">
      <AppHeader />
      <PortalShellHeader portal={effectivePortal} />
      <div className="flex flex-1 min-w-0 w-full overflow-x-hidden">
        <Sidebar portal={effectivePortal} />
        <main className="flex-1 min-w-0 p-4 md:p-8 pb-20 md:pb-8 max-w-7xl mx-auto w-full overflow-x-hidden">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
