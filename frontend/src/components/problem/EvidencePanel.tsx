'use client';

import React from 'react';
import { CheckCircle2, Circle, AlertCircle, FileCheck, Eye, ShieldCheck, Cpu } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { ChallengeIntelligenceDto } from '@sicp/shared';
import { ExtendedChallenge } from './ProblemWorkspace';

interface EvidencePanelProps {
  challenge: ExtendedChallenge;
  intelligence?: ChallengeIntelligenceDto | null;
}

export function EvidencePanel({ challenge, intelligence }: EvidencePanelProps) {
  const availableItems = intelligence?.evidence?.supporting || [];
  const missingItems = intelligence?.evidence?.missing || [];

  const getSourceBadge = (source?: string) => {
    switch (source) {
      case 'OBSERVED':
        return (
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[10px]">
            OBSERVED
          </Badge>
        );
      case 'HUMAN_VALIDATED':
        return (
          <Badge className="bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 text-[10px]">
            HUMAN_VALIDATED
          </Badge>
        );
      case 'COMPUTED':
        return (
          <Badge className="bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 text-[10px]">
            COMPUTED
          </Badge>
        );
      case 'AI_INTERPRETED':
        return (
          <Badge className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-[10px]">
            AI_INTERPRETED
          </Badge>
        );
      default:
        return (
          <Badge className="bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 text-[10px]">
            UNKNOWN
          </Badge>
        );
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-7 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Section 4 • Evidence Ledger
          </h2>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">Available Evidence</p>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {availableItems.length} verified observations
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Available Evidence */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Available Evidence
          </div>

          <div className="space-y-2.5">
            {availableItems.length > 0 ? (
              availableItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      ✓ {item.title}
                    </span>
                    {getSourceBadge(item.epistemicClass)}
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                  {item.sourceName && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-500 block">
                      Source: {item.sourceName}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <div className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 text-xs text-slate-600 dark:text-slate-400">
                ✓ Citizen description available
              </div>
            )}
          </div>
        </div>

        {/* Missing Evidence / Required for next action */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            <Circle className="w-4 h-4 text-amber-500" />
            Missing Evidence
          </div>

          <div className="space-y-2.5">
            {missingItems.length > 0 ? (
              missingItems.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      ○ {item.title}
                    </span>
                    {getSourceBadge('UNKNOWN')}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {item.description}
                  </p>
                  <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 block">
                    Required for: {item.requiredFor}
                  </span>
                </div>
              ))
            ) : (
              <>
                <div className="p-3.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      ○ Field inspection
                    </span>
                    {getSourceBadge('UNKNOWN')}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Required for: Statutory municipal work order
                  </span>
                </div>

                <div className="p-3.5 rounded-lg border border-dashed border-slate-300 dark:border-slate-700/80 bg-white dark:bg-slate-900 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      ○ Official verification
                    </span>
                    {getSourceBadge('UNKNOWN')}
                  </div>
                  <span className="text-[10px] text-slate-500 block">
                    Required for: Institutional solver engagement
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
