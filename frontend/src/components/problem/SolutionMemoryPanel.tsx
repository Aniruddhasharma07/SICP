'use client';

import React from 'react';
import { BookOpen, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ChallengeIntelligenceDto } from '@sicp/shared';
import { ExtendedChallenge } from './ProblemWorkspace';

interface SolutionMemoryPanelProps {
  challenge: ExtendedChallenge;
  intelligence?: ChallengeIntelligenceDto | null;
  onInspectPrecedent?: (memory: any) => void;
}

export function SolutionMemoryPanel({
  challenge,
  intelligence,
  onInspectPrecedent,
}: SolutionMemoryPanelProps) {
  const matches = intelligence?.memory?.matches || [];
  const explanation =
    intelligence?.memory?.explanation ||
    'No relevant solution precedents available. SICP will record an institutional precedent once this challenge reaches verified outcome.';

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-7 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Institutional Memory
          </h2>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">
            Relevant Solution Precedents
          </p>
        </div>
        <Badge
          className={
            matches.length > 0
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
          }
        >
          {matches.length} {matches.length === 1 ? 'Precedent' : 'Precedents'}
        </Badge>
      </div>

      {matches.length === 0 ? (
        <div className="py-8 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/20">
          <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            No relevant solution precedents available.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-md mx-auto">
            This challenge presents a localized problem configuration without an identical historical match. Once verified and resolved, SICP will record this case into institutional memory.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((item, idx) => (
            <div
              key={item.id || idx}
              className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                    {item.title}
                  </span>
                  <Badge className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-none font-medium">
                    {item.outcome}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                  <span className="text-[11px] text-slate-500 dark:text-slate-500">
                    Domain: <span className="font-medium text-slate-700 dark:text-slate-300">{item.domain}</span>
                  </span>
                  {item.reusableComponents && item.reusableComponents.length > 0 && (
                    <span className="text-[11px] text-slate-500 dark:text-slate-500">
                      • Reusable: {item.reusableComponents.slice(0, 2).join(', ')}
                    </span>
                  )}
                </div>
              </div>

              {onInspectPrecedent && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onInspectPrecedent(item)}
                  className="text-xs text-blue-600 dark:text-blue-400 shrink-0 self-start sm:self-center"
                >
                  Inspect Case
                  <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
