'use client';

import React, { useState } from 'react';
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
  ChevronDown,
  ChevronUp,
  Cpu,
  History,
  TrendingDown,
  TrendingUp,
  ArrowRight,
} from 'lucide-react';
import {
  RootCauseHypothesisDto,
  SentinelProbeRequestDto,
  SentinelChoice,
  EvidenceEpistemicClass,
  BranchDifferentialStatus,
  HypothesisStatus,
} from '@sicp/shared';
import { EvidenceChip } from '../ui/EvidenceChip';
import { HypothesisMatrixTable } from '../intelligence/HypothesisMatrixTable';
import { SentinelProbeWidget } from '../intelligence/SentinelProbeWidget';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { NextQuestionBridge } from './NextQuestionBridge';

interface InvestigationLayerProps {
  hypotheses: RootCauseHypothesisDto[];
  selectedHypothesisId?: string;
  onSelectHypothesis?: (hypothesis: RootCauseHypothesisDto) => void;
  sentinelProbes?: SentinelProbeRequestDto[];
  onSendSentinelResponse?: (data: { choice: SentinelChoice; feedbackText?: string }) => Promise<void>;
  isLoadingSentinel?: boolean;
  branchDifferentialDeduction?: string | null;
  onContinueToValidation?: () => void;
}

export function InvestigationLayer({
  hypotheses,
  selectedHypothesisId,
  onSelectHypothesis,
  sentinelProbes = [],
  onSendSentinelResponse,
  isLoadingSentinel = false,
  branchDifferentialDeduction,
  onContinueToValidation,
}: InvestigationLayerProps) {
  const [showExpertAMCH, setShowExpertAMCH] = useState(false);
  const [whatChangedView, setWhatChangedView] = useState<'after' | 'before'>('after');
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

      {/* FIRST-CLASS "WHAT CHANGED?" INTERACTIVE BANNER */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-purple-500/30 shadow-xl shadow-purple-950/20 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                  Telemetry Shift &amp; Diagnostic Impact (&quot;What Changed?&quot;)
                </span>
                <Badge className="bg-purple-950 text-purple-300 border border-purple-700/60 text-[10px] font-mono">
                  Invariant: Sentinel Verification
                </Badge>
              </div>
              <p className="text-[11px] text-slate-400">
                Observe how sentinel telemetry dynamically filtered competing engineering hypotheses
              </p>
            </div>
          </div>

          {/* Interactive Before vs After Toggle */}
          <div className="flex items-center p-1 bg-slate-950 rounded-lg border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setWhatChangedView('after')}
              className={`px-3 py-1 rounded font-medium transition ${
                whatChangedView === 'after'
                  ? 'bg-purple-600 text-white font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              After Sentinel Feedback (Current Ground State)
            </button>
            <button
              type="button"
              onClick={() => setWhatChangedView('before')}
              className={`px-3 py-1 rounded font-medium transition ${
                whatChangedView === 'before'
                  ? 'bg-slate-800 text-slate-200 font-bold shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Before Sentinel Probe (Initial State)
            </button>
          </div>
        </div>

        {whatChangedView === 'after' ? (
          <div className="space-y-3 animate-sicp-fade-in text-xs">
            <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-600/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Sentinel Telemetry Received: Sector 3 Parallel Feeder Is Normal (+4.2 bar)</span>
                </div>
                <p className="text-emerald-100 text-[11px] leading-relaxed">
                  Neutral inquiry to downstream parallel branch confirmed zero pressure loss. This mathematically eliminates main pump station failure, isolating the structural fault directly to Branch Feeder 4B.
                </p>
              </div>
              <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-900/60 px-2.5 py-1 rounded border border-emerald-700/60 shrink-0">
                LCA Isolated
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950/70 rounded-xl border border-emerald-800/50 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-300 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    <span>H1: Localized Feeder Structural Leakage</span>
                  </span>
                  <Badge className="bg-emerald-950 text-emerald-300 border border-emerald-700 text-[10px] font-mono">
                    82% Leading
                  </Badge>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Supported by branch differential. Focus repair excavation on Ward 4 feeder cross-connect.
                </p>
                <div className="text-[10px] font-mono text-emerald-400">
                  Shift: +37% diagnostic support score increase post-sentinel.
                </div>
              </div>

              <div className="p-3 bg-slate-950/70 rounded-xl border border-rose-800/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-300 flex items-center gap-1.5">
                    <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                    <span>H2: Central Feeder Pump Station Shutdown</span>
                  </span>
                  <Badge className="bg-rose-950 text-rose-300 border border-rose-700 text-[10px] font-mono">
                    Refuted / 25%
                  </Badge>
                </div>
                <p className="text-slate-300 text-[11px]">
                  Falsified because parallel branch Sector 3 reports continuous nominal water pressure.
                </p>
                <div className="text-[10px] font-mono text-rose-400">
                  Shift: -50% diagnostic support decrease post-sentinel.
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-2 text-xs animate-sicp-fade-in">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>Prior Ground Ambiguity (Before Sentinel Check)</span>
            </div>
            <p className="text-slate-300 text-[11.5px] leading-relaxed">
              Prior to automated sentinel polling, Central Pump Failure was the primary municipal hypothesis (75% confidence). Without parallel branch testing, engineering teams would have shut down the entire municipal pumping grid, disrupting water service to 45,000 unaffected citizens across Ward 3.
            </p>
          </div>
        )}
      </div>

      {/* Progressive Disclosure Controls: Beginner Surface vs Expert AMCH */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-amber-400" />
          <span className="text-slate-300 font-medium">
            {showExpertAMCH ? 'Expert Heuer AMCH Matrix Active' : 'Beginner Friendly Explanations Active'}
          </span>
          <span className="text-[10px] text-slate-500">•</span>
          <span className="text-[11px] text-slate-400">
            {showExpertAMCH
              ? 'Displaying full consistency matrix, E+/E- evidence weights, and falsification criteria.'
              : 'Displaying clear plain-language candidate causes and diagnostic ranking.'}
          </span>
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowExpertAMCH(!showExpertAMCH)}
          className="border-amber-700/60 text-amber-300 hover:bg-amber-950/40 text-xs h-7 px-3 flex items-center gap-1.5"
        >
          {showExpertAMCH ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Hide AMCH Matrix</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Show Richards Heuer AMCH Matrix &amp; Evidence Weights</span>
            </>
          )}
        </Button>
      </div>

      {/* Competing Hypotheses View: Beginner Cards vs Expert Matrix */}
      {!showExpertAMCH ? (
        /* Beginner Surface: Plain-language summary cards */
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200">
              Competing Engineering Explanations ({hypotheses.length})
            </span>
            <span className="text-slate-400 text-[11px]">
              Ranked by empirical evidence consistency
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {hypotheses.map((hyp, idx) => (
              <div
                key={hyp.id || idx}
                className={`p-4 rounded-xl border text-xs space-y-2.5 transition flex flex-col justify-between ${
                  hyp.status === HypothesisStatus.LEADING_HYPOTHESIS
                    ? 'bg-emerald-950/30 border-emerald-600/60 ring-1 ring-emerald-500/30'
                    : hyp.status === HypothesisStatus.REFUTED
                    ? 'bg-rose-950/20 border-rose-800/40 opacity-75'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="font-bold text-slate-100 text-sm">
                      {hyp.title}
                    </span>
                    <Badge
                      className={`text-[9px] font-mono ${
                        hyp.status === HypothesisStatus.LEADING_HYPOTHESIS
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                          : hyp.status === HypothesisStatus.REFUTED
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}
                    >
                      {hyp.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>

                  <p className="text-slate-300 text-[11.5px] leading-relaxed">
                    {hyp.description}
                  </p>
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Diagnostic Support:</span>
                    <span className="font-bold font-mono text-amber-400">
                      {hyp.diagnosticSupportScore}/100
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        hyp.status === HypothesisStatus.LEADING_HYPOTHESIS
                          ? 'bg-emerald-500'
                          : hyp.status === HypothesisStatus.REFUTED
                          ? 'bg-rose-500'
                          : 'bg-amber-500'
                      }`}
                      style={{ width: `${Math.min(100, hyp.diagnosticSupportScore)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Expert Depth: Full Heuer AMCH Matrix Grid & Sentinel Probe */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-sicp-fade-in">
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
      )}

      {/* Next Question Bridge to Validation Layer */}
      {onContinueToValidation && (
        <NextQuestionBridge
          currentStage="Stage 03 • Investigation & AMCH"
          questionAnswered="Why might this be happening?"
          answeredSummary="Richards Heuer AMCH matrix and sentinel branch differential established Localized Feeder Rupture as leading diagnostic explanation (82% support)."
          nextStage="Stage 04 • Human Governance & Validation"
          nextQuestion="The diagnostic evidence is assembled. Who holds the statutory authority to make an accountable determination?"
          ctaLabel="Proceed to Statutory Authority Sign-Off"
          onContinue={onContinueToValidation}
          accentColor="amber"
        />
      )}
    </section>
  );
}
