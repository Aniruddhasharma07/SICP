'use client';

import React, { useState } from 'react';
import {
  BookOpen,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Layers,
  Sparkles,
  Info,
} from 'lucide-react';
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
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'WORKED' | 'NOT_WORKED' | 'MIXED'>('ALL');

  const matches = intelligence?.memory?.matches || [];

  // Categorize matches into 3 AI-grounded buckets
  const workedSolutions = matches.filter(
    (m) =>
      ['PREVIOUSLY_WORKED', 'SUCCESSFUL', 'EFFECTIVE', 'WORKED', 'HIGHLY_EFFECTIVE'].includes(
        (m.outcome || '').toUpperCase()
      )
  );

  const notWorkedSolutions = matches.filter(
    (m) =>
      ['NOT_WORKED', 'FAILED', 'INEFFECTIVE', 'REJECTED'].includes(
        (m.outcome || '').toUpperCase()
      )
  );

  const mixedSolutions = matches.filter(
    (m) =>
      !workedSolutions.includes(m) && !notWorkedSolutions.includes(m)
  );

  const filteredMatches =
    activeFilter === 'WORKED'
      ? workedSolutions
      : activeFilter === 'NOT_WORKED'
      ? notWorkedSolutions
      : activeFilter === 'MIXED'
      ? mixedSolutions
      : matches;

  // Group-level solution memories (symptom level)
  const groupMemories = (challenge.problemGroups || []).flatMap((g: any) =>
    (g.solutionMemories || []).map((sm: any) => ({ ...sm, groupTitle: g.title }))
  );

  return (
    <div className="space-y-6">
      {/* SECTION 1: Systemic Root-Cause Solution Memory (Challenge Level) */}
      <section className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 sm:p-7 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Systemic Solution Memory
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                Challenge Level
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              AI Evaluated Intervention Precedents
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Historical engineering outcomes for this systemic root-cause configuration across municipal deployments.
            </p>
          </div>

          {/* 3-Bucket Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === 'ALL'
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              All ({matches.length})
            </button>
            <button
              onClick={() => setActiveFilter('WORKED')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                activeFilter === 'WORKED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              Worked ({workedSolutions.length})
            </button>
            <button
              onClick={() => setActiveFilter('NOT_WORKED')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                activeFilter === 'NOT_WORKED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
              }`}
            >
              <XCircle className="w-3 h-3" />
              Not Worked ({notWorkedSolutions.length})
            </button>
            <button
              onClick={() => setActiveFilter('MIXED')}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                activeFilter === 'MIXED'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle className="w-3 h-3" />
              Mixed ({mixedSolutions.length})
            </button>
          </div>
        </div>

        {filteredMatches.length === 0 ? (
          <div className="py-8 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-800/20 space-y-2">
            <BookOpen className="w-7 h-7 text-slate-400 mx-auto opacity-70" />
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              No matching solution precedents in this category.
            </p>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Once an engineering pilot reaches verified outcome in this corridor, SICP automatically archives the verified intervention parameters into institutional memory.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredMatches.map((item, idx) => {
              const isWorked = workedSolutions.includes(item);
              const isNotWorked = notWorkedSolutions.includes(item);

              return (
                <div
                  key={item.id || idx}
                  className={`p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between space-y-3 ${
                    isWorked
                      ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10'
                      : isNotWorked
                      ? 'border-rose-200 dark:border-rose-900/60 bg-rose-50/20 dark:bg-rose-950/10'
                      : 'border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                        {item.title}
                      </h4>
                      <Badge
                        className={`text-[10px] font-bold border-none shrink-0 ${
                          isWorked
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300'
                            : isNotWorked
                            ? 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                        }`}
                      >
                        {isWorked ? 'Worked' : isNotWorked ? 'Not Worked' : 'Mixed Outcome'}
                      </Badge>
                    </div>

                    <p className="text-[11.5px] text-slate-600 dark:text-slate-400 leading-relaxed">
                      {(item as any).summary || (item as any).intervention || (item.reusableComponents && item.reusableComponents.length > 0 ? `Components: ${item.reusableComponents.join(', ')}` : 'Recorded engineering intervention protocol.')}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Domain: <strong>{item.domain || challenge.category}</strong></span>
                    {onInspectPrecedent && (
                      <button
                        onClick={() => onInspectPrecedent(item)}
                        className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1"
                      >
                        Details
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* SECTION 2: Problem Group Symptom-Level Solution Memory */}
      <section className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Symptom-Level Solution Memory
              </span>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                Problem Group Level
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mt-1">
              Group Remediations & Immediate Field Mitigations
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Specific remediations recorded for localized symptom clusters (distinct from systemic root-cause interventions).
            </p>
          </div>
        </div>

        {groupMemories.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-50/60 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 text-xs space-y-1">
            <p className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-slate-400" />
              Symptom-level mitigations stored per problem group.
            </p>
            <p className="text-slate-500 text-[11.5px]">
              When individual problem clusters (e.g. surface cold-patching or drain desilting) are carried out, their specific outcomes are archived at the problem-group tier without polluting the systemic root-cause hypothesis.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {groupMemories.map((gm: any, idx: number) => (
              <div
                key={gm.id || idx}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100">{gm.title}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({gm.groupTitle})</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">{gm.intervention}</p>
                </div>
                <Badge className="text-[10px] bg-slate-100 dark:bg-slate-800 border-none font-semibold">
                  {gm.classification?.replace(/_/g, ' ') || 'PREVIOUSLY_WORKED'}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
