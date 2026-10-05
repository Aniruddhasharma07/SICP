'use client';

import React from 'react';
import { HelpCircle, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { ChallengeIntelligenceDto } from '@sicp/shared';
import { ExtendedChallenge } from './ProblemWorkspace';

interface PossibleCausesProps {
  challenge: ExtendedChallenge;
  intelligence?: ChallengeIntelligenceDto | null;
}

export function PossibleCauses({ challenge, intelligence }: PossibleCausesProps) {
  const causes = (intelligence?.hypotheses && intelligence.hypotheses.length > 0)
    ? intelligence.hypotheses
    : challenge.systemicSummary
    ? [{
        id: 'systemic-cause-hypothesis',
        title: challenge.systemicSummary.replace(/^Possible Root Cause:\s*/i, '').replace(/\s*\(Not Yet Government Verified\)$/i, ''),
        description: challenge.description,
        status: 'Possible Root Cause (Not Yet Government Verified)',
        falsificationCriteria: 'Municipal field verification and engineering audit'
      } as any]
    : [];

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-7 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Possible Root Cause
          </h2>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">Competing Hypotheses</p>
        </div>
        {challenge.validationReason || challenge.validatedByName ? (
          <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[10.5px] font-medium flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-600" />
            <span>Human-validated systemic finding</span>
          </Badge>
        ) : (
          <Badge className="bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 text-[10.5px] font-medium flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-600" />
            <span>Possible Root Cause (Hypothesis — not confirmed)</span>
          </Badge>
        )}
      </div>

      <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
        SICP investigates multiple competing explanations. No explanation is confirmed without empirical field verification.
      </p>

      <div className="space-y-3">
        {causes.length > 0 ? (
          causes.map((cause, idx) => (
            <div
              key={cause.id || idx}
              className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    • {cause.title}
                  </span>
                </div>
                {cause.description && (
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {cause.description}
                  </p>
                )}
                {cause.falsificationCriteria && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-500 italic">
                    How to verify: {cause.falsificationCriteria}
                  </p>
                )}
              </div>

              <div className="shrink-0 self-start sm:self-center">
                <Badge className="bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 text-[10px]">
                  {cause.status || 'Requires field verification'}
                </Badge>
              </div>
            </div>
          ))
        ) : (
          <div className="p-4 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
            Field inquiry underway to formulate domain-specific explanations.
          </div>
        )}
      </div>
    </section>
  );
}
