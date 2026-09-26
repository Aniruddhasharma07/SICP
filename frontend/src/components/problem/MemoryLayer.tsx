'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  BrainCircuit,
  BookOpen,
  Sparkles,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  History,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Cpu,
} from 'lucide-react';
import { ChallengeDto, HistoricalRecommendationDto, EvidenceEpistemicClass } from '@sicp/shared';
import { EvidenceChip } from '../ui/EvidenceChip';
import { SolutionMemoryCard } from '../intelligence/SolutionMemoryCard';
import { MemoryEvolutionTimeline } from '../intelligence/MemoryEvolutionTimeline';
import { RecurrenceSignalCard } from '../intelligence/RecurrenceSignalCard';
import { Button } from '../ui/Button';
import { NextQuestionBridge } from './NextQuestionBridge';

interface MemoryLayerProps {
  challenge: ChallengeDto;
  historicalSolutions: HistoricalRecommendationDto[];
  historicalEvaluation: any | null;
  loadingHistorical: boolean;
  activeRecurrenceSignal?: any | null;
  onCompareCase: (memoryId: string) => void;
  onInspectMemory?: (memory: any) => void;
  onExploreCollaboration?: () => void;
}

export function MemoryLayer({
  challenge,
  historicalSolutions,
  historicalEvaluation,
  loadingHistorical,
  activeRecurrenceSignal,
  onCompareCase,
  onInspectMemory,
  onExploreCollaboration,
}: MemoryLayerProps) {
  const [showExpertMemory, setShowExpertMemory] = useState(false);
  return (
    <section id="memory-layer" className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                Stage 05 • Institutional Solution Memory
              </span>
              <span className="text-xs text-slate-500">
                Question: Has SICP seen something like this before?
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              Contextual Solution Memory &amp; Historical Precedents
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <EvidenceChip epistemicClass={EvidenceEpistemicClass.SOURCE_DERIVED} label="Institutional Memory Registry" />
        </div>
      </div>

      {/* Recurrence Signal Banner if active */}
      {activeRecurrenceSignal && (
        <RecurrenceSignalCard
          signal={activeRecurrenceSignal}
          onInvestigate={() => {
            if (activeRecurrenceSignal.previousCase?.id) {
              onCompareCase(activeRecurrenceSignal.previousCase.id);
            }
          }}
        />
      )}

      {/* Epistemic Memory Axiom Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/30 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-indigo-300">
            <History className="w-4 h-4 text-indigo-400" />
            <span>SICP Remembers: Precedent Informs — It Does Not Decide</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            SICP Invariant #9
          </span>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          Historical precedent informs, it does not dictate. A past failure warns engineering teams, but does not forbid adaptation under altered hydraulic conditions. Officers and researchers must inspect contextual similarities before adopting any prior methodology.
        </p>
      </div>

      {/* Main Memory Content */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-indigo-400" />
              Retrieved Precedents &amp; Failure Warnings ({historicalSolutions.length})
            </h3>
            <p className="text-[11px] text-slate-400">
              Matched on infrastructure configuration, symptoms, and dynamic root-cause physics.
            </p>
          </div>

          <Link href={`/solutions?problemId=${challenge.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs h-8"
              title="Explore all cross-institutional solution precedents with active problem context"
            >
              <span>Explore Memory Explorer</span>
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>

        {loadingHistorical ? (
          <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
            Scanning institutional solution memory for verified precedents and hydraulic models...
          </div>
        ) : historicalSolutions.length === 0 ? (
          <div className="p-6 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-xs text-slate-400 space-y-1">
            <p className="font-bold text-slate-200">No Direct Precedents Found in Current Catchment</p>
            <p className="text-[11px] text-slate-500 max-w-md mx-auto">
              No previous verified intervention exactly matches this hydraulic problem pattern. University research teams will formulate an original engineering solution.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Executive Precedent Guidance from Gemini */}
            {historicalEvaluation && historicalEvaluation.guidanceVerdict && (
              <div className="p-3.5 bg-slate-950/60 border border-indigo-900/50 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>Precedent Guidance: {historicalEvaluation.guidanceVerdict}</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Evaluation Confidence: {Math.round((historicalEvaluation.confidenceScore || 0.85) * 100)}%
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {historicalEvaluation.executiveSummary}
                </p>
              </div>
            )}

            {/* Progressive Disclosure Controls: Beginner Surface vs Expert Precedents */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-400" />
                <span className="text-slate-300 font-medium">
                  {showExpertMemory ? 'Expert Precedent Depth Active' : 'Beginner Friendly Precedent View Active'}
                </span>
                <span className="text-[10px] text-slate-500">•</span>
                <span className="text-[11px] text-slate-400">
                  {showExpertMemory
                    ? 'Displaying full failure warning matrices, comparison drawers, and evolution timeline.'
                    : 'Displaying high-level lesson learned and precedent warnings.'}
                </span>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowExpertMemory(!showExpertMemory)}
                className="border-purple-700/60 text-purple-300 hover:bg-purple-950/40 text-xs h-7 px-3 flex items-center gap-1.5"
              >
                {showExpertMemory ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>Hide Technical Details</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Show Technical Failure Warnings &amp; Evolution Timeline</span>
                  </>
                )}
              </Button>
            </div>

            {/* List of Solution Memory Cards */}
            <div className="space-y-3">
              {historicalSolutions.map(rec => (
                <SolutionMemoryCard
                  key={rec.memoryId || (rec as any).id}
                  memory={rec}
                  currentProblemContext={{
                    title: challenge.title,
                    description: challenge.description,
                    category: challenge.category,
                    district: challenge.district || undefined,
                  }}
                  onCompare={onCompareCase}
                  onInspect={onInspectMemory}
                />
              ))}
            </div>

            {/* Closed-Loop Learning Evolution Timeline (Progressively Disclosed) */}
            {showExpertMemory && (
              <div className="pt-4 border-t border-slate-800 animate-sicp-fade-in">
                <MemoryEvolutionTimeline
                  initialOutcome={historicalSolutions[0]?.outcomeStatus || 'SUCCESSFUL'}
                  currentOutcome={challenge.status === 'RESOLVED' ? 'VERIFIED_RESOLVED' : 'IN_PROGRESS'}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Next Question Bridge to Collaboration Layer */}
      {onExploreCollaboration && (
        <NextQuestionBridge
          currentStage="Stage 05 • Institutional Solution Memory"
          questionAnswered="Has SICP seen something like this before?"
          answeredSummary="Retrieved 2 verified municipal precedents; evaluated risk factors and failure warnings against surface-only filtration."
          nextStage="Stage 06 • Multi-Sector Partnership & R&D Routing"
          nextQuestion="Who has the engineering expertise to build the solution, and who can co-fund the pilot?"
          ctaLabel="Identify Academic R&D & CSR Partners"
          onContinue={onExploreCollaboration}
          accentColor="purple"
        />
      )}
    </section>
  );
}
