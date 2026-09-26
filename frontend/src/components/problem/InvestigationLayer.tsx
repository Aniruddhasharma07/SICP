'use client';

import React from 'react';
import {
  FileSearch,
  Radio,
  ShieldCheck,
  AlertTriangle,
  Send,
  Sparkles,
  Info,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import {
  RootCauseHypothesisDto,
  SentinelProbeRequestDto,
  SentinelChoice,
  EvidenceEpistemicClass,
  BranchDifferentialStatus,
} from '@sicp/shared';
import { EvidenceChip } from '../ui/EvidenceChip';
import { HypothesisMatrixTable } from '../intelligence/HypothesisMatrixTable';
import { SentinelProbeWidget } from '../intelligence/SentinelProbeWidget';

interface InvestigationLayerProps {
  hypotheses: RootCauseHypothesisDto[];
  selectedHypothesisId?: string;
  onSelectHypothesis?: (hypothesis: RootCauseHypothesisDto) => void;
  sentinelProbes?: SentinelProbeRequestDto[];
  onSendSentinelResponse?: (data: { choice: SentinelChoice; feedbackText?: string }) => Promise<void>;
  isLoadingSentinel?: boolean;
  branchDifferentialDeduction?: string | null;
}

export function InvestigationLayer({
  hypotheses,
  selectedHypothesisId,
  onSelectHypothesis,
  sentinelProbes = [],
  onSendSentinelResponse,
  isLoadingSentinel = false,
  branchDifferentialDeduction,
}: InvestigationLayerProps) {
  const activeProbe = sentinelProbes.length > 0 ? sentinelProbes[0] : null;

  return (
    <section id="investigation-layer" className="space-y-5">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-600/20 text-amber-400 border border-amber-500/30">
            <FileSearch className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/60">
                Stage 03 • Investigation &amp; AMCH
              </span>
              <span className="text-xs text-slate-500">Question: Why might this be happening?</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              Competing Hypotheses &amp; Branch Differential Sentinel
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <EvidenceChip epistemicClass={EvidenceEpistemicClass.HYPOTHESIZED} label="Heuer AMCH Diagnostic Matrix" />
        </div>
      </div>

      {/* Branch Differential Alert if Active */}
      {branchDifferentialDeduction && (
        <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-600/50 text-emerald-200 text-xs space-y-2 animate-sicp-scale-in">
          <div className="flex items-center justify-between border-b border-emerald-800/60 pb-2">
            <div className="flex items-center gap-2 font-bold text-emerald-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Topological Branch Differential Verified</span>
            </div>
            <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700/60">
              Differential Diagnosis Active
            </span>
          </div>
          <p className="text-xs text-emerald-100 leading-relaxed font-medium">
            {branchDifferentialDeduction}
          </p>
          <div className="text-[10px] text-emerald-400/90 font-mono">
            Invariant: Parallel branch normal state mathematically weakens network-wide upstream failure hypotheses.
          </div>
        </div>
      )}

      {/* AMCH Explanations Grid & Sentinel Probe */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Richards Heuer AMCH Matrix (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">
              Analysis of Competing Hypotheses (Richards Heuer AMCH v1.0)
            </span>
            <span className="text-slate-400 text-[11px]">
              Heuristic scores (not probabilities)
            </span>
          </div>

          {hypotheses && hypotheses.length > 0 ? (
            <HypothesisMatrixTable
              hypotheses={hypotheses}
              onSelectHypothesis={onSelectHypothesis}
              selectedHypothesisId={selectedHypothesisId}
            />
          ) : (
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl text-center text-xs text-slate-400 space-y-1">
              <p className="font-bold text-slate-200">No Hypotheses Generated Yet</p>
              <p className="text-[11px] text-slate-500">
                Awaiting initial field telemetry or AI problem parsing to seed competing failure hypotheses.
              </p>
            </div>
          )}
        </div>

        {/* Right: Proactive Sentinel Inquiry & Evidence Gaps (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {activeProbe && onSendSentinelResponse ? (
            <SentinelProbeWidget
              probe={activeProbe}
              onSendResponse={onSendSentinelResponse}
              isLoading={isLoadingSentinel}
            />
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-blue-400" />
                  Proactive Community Sentinel
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Status: Standby</span>
              </div>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                When an upstream Lowest Common Ancestor is identified, SICP dispatches a neutral, unbiased utility inquiry to a parallel uncomplaining branch to verify whether service is normal, isolating network failure boundaries.
              </p>
            </div>
          )}

          {/* Epistemic Guidance Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-2 text-xs text-slate-400">
            <span className="font-bold text-slate-200 block text-[11px] uppercase tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-indigo-400" />
              Epistemic Rigor Guidelines
            </span>
            <ul className="space-y-1.5 text-[11px] text-slate-300">
              <li className="flex items-start gap-1.5">
                <span className="text-indigo-400 font-bold">•</span>
                <span><strong>E+ (Supports):</strong> Consistent with candidate explanation.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-rose-400 font-bold">•</span>
                <span><strong>E- (Weakens):</strong> Inconsistent with candidate explanation.</span>
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-amber-400 font-bold">•</span>
                <span><strong>Falsification Criteria:</strong> Every hypothesis specifies what ground data would disprove it.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
