'use client';

import React from 'react';
import { X, Layers } from 'lucide-react';
import { Button } from '../ui/Button';

interface RootCauseDossierDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scenario?: any;
  onDispatchValidation?: () => void;
}

export function RootCauseDossierDrawer({
  isOpen,
  onClose,
}: RootCauseDossierDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 h-full p-6 shadow-2xl flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Governed Challenge Workspace</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="py-6 text-sm text-slate-600 dark:text-slate-300">
          Systemic intelligence and root cause investigation are now natively unified within individual Governed Challenge Workspaces.
        </div>
        <Button onClick={onClose} className="w-full">Close</Button>
      </div>
    </div>
  );
}
