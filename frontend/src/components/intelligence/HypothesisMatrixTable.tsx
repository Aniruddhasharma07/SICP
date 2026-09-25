'use client';

import React, { useState } from 'react';
import {
  RootCauseHypothesisDto,
  HypothesisStatus,
  EvidenceEpistemicClass,
} from '@sicp/shared';
import {
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Search,
  Scale,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { ExplainWhy } from '../common/ExplainWhy';

interface HypothesisMatrixTableProps {
  hypotheses: RootCauseHypothesisDto[];
  onSelectHypothesis?: (hypothesis: RootCauseHypothesisDto) => void;
  selectedHypothesisId?: string | null;
}

export function HypothesisMatrixTable({
  hypotheses,
  onSelectHypothesis,
  selectedHypothesisId,
}: HypothesisMatrixTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    hypotheses[0]?.id || null
  );

  const getStatusBadge = (status: HypothesisStatus) => {
    switch (status) {
      case HypothesisStatus.HUMAN_VALIDATED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Human Validated
          </span>
        );
      case HypothesisStatus.LEADING_HYPOTHESIS:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800 animate-sicp-pulse-subtle">
            <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Leading Investigation Hypothesis
          </span>
        );
      case HypothesisStatus.REFUTED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
            <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            Weakened by Evidence
          </span>
        );
      case HypothesisStatus.UNDER_EVALUATION:
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
            <Activity className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Under Evaluation
          </span>
        );
    }
  };

  const getEpistemicBadge = (cls: EvidenceEpistemicClass) => {
    switch (cls) {
      case EvidenceEpistemicClass.HUMAN_VALIDATED:
      case EvidenceEpistemicClass.VERIFIED_OUTCOME:
        return <Badge variant="success">Validated</Badge>;
      case EvidenceEpistemicClass.OBSERVED:
        return <Badge variant="default" className="bg-sky-600 text-white">Observed</Badge>;
      case EvidenceEpistemicClass.SOURCE_DERIVED:
        return <Badge variant="secondary">Source-Derived</Badge>;
      case EvidenceEpistemicClass.COMPUTED:
        return <Badge variant="secondary">Computed</Badge>;
      default:
        return <Badge variant="outline">{cls}</Badge>;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm animate-sicp-slide-up">
      {/* Table Header */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Scale className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              COMPETING EXPLANATIONS
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 font-mono">
              AMCH v1.0
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Structured diagnostic evaluation: Supporting (E⁺), Contradicting (E⁻), and Missing (Eˀ) evidence evaluated simultaneously.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <ExplainWhy
            title="Analysis of Competing Hypotheses (AMCH)"
            summary="Developed by CIA analyst Richards Heuer, AMCH prevents premature cognitive closure. Rather than gathering evidence to confirm a single favored explanation, AMCH weighs diagnostic evidence across all plausible hypotheses. The leading explanation is the one with the strongest empirical support and least contradicting evidence."
            evidenceItems={[
              'Simultaneous evaluation of multiple explanations',
              'Explicit tracking of contradicting and missing evidence',
              'Calibrated diagnostic weights (0-100%)',
              'Final validation reserved strictly for authorized human officials',
            ]}
            technicalDetails={{
              algorithm: 'Richards Heuer AMCH Weighted Diagnostics Engine v1.0',
              epistemicClass: 'COMPUTED',
              scoringModel: 'Bayesian Weight Normalization with Falsification Penalties',
              invariants: 'Hypotheses remain labeled HYPOTHESIS until an authorized Government Officer explicitly validates them.',
            }}
            buttonText="How AMCH Works"
            variant="badge"
          />
        </div>
      </div>

      {/* Hypotheses List */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {hypotheses.map(hyp => {
          const isExpanded = expandedId === hyp.id;
          const isSelected = selectedHypothesisId === hyp.id;
          const score = hyp.diagnosticSupportScore;

          return (
            <div
              key={hyp.id}
              className={`transition-colors duration-200 ${
                isSelected
                  ? 'bg-blue-50/40 dark:bg-blue-950/20'
                  : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
              }`}
            >
              {/* Row Summary */}
              <div
                className="p-4 cursor-pointer flex flex-wrap items-center justify-between gap-3"
                onClick={() => setExpandedId(isExpanded ? null : hyp.id)}
              >
                <div className="flex-1 min-w-[280px]">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(hyp.status)}
                    {hyp.targetNodeName && (
                      <span className="text-xs font-mono text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-400" />
                        Target: {hyp.targetNodeName}
                      </span>
                    )}
                  </div>
                  <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {hyp.title}
                  </h5>
                </div>

                {/* Diagnostic Score Gauge with Smooth Transition (Signature #4) */}
                <div className="w-48">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500 dark:text-slate-400">Diagnostic Support:</span>
                    <strong className="text-slate-900 dark:text-slate-100 font-mono text-xs">
                      {score}%
                    </strong>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ease-out ${
                        hyp.status === HypothesisStatus.REFUTED
                          ? 'bg-rose-500'
                          : score >= 70
                          ? 'bg-blue-600'
                          : score >= 40
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                      }`}
                      style={{ width: `${score}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 dark:text-slate-500 text-right mt-0.5">
                    Heuristic score (not probability)
                  </div>
                </div>

                {/* Evidence Counts Summary & Expand Button (Signature #5) */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-xs font-mono">
                    <span
                      className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-semibold border border-emerald-200 dark:border-emerald-800"
                      title="Supporting Evidence items"
                    >
                      +{hyp.supportingEvidence.length} E⁺
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300 font-semibold border border-rose-200 dark:border-rose-800"
                      title="Contradicting Evidence items"
                    >
                      -{hyp.contradictingEvidence.length} E⁻
                    </span>
                    <span
                      className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-semibold border border-amber-200 dark:border-amber-800"
                      title="Missing Evidence gaps"
                    >
                      ?{hyp.missingEvidence.length} Eˀ
                    </span>
                  </div>

                  <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1">
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Expanded Diagnostic Detail */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1 space-y-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/30 dark:bg-slate-900/40 animate-sicp-slide-up">
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    {hyp.description}
                  </p>

                  {/* Weakening / Refutation Reason Banner if Weakened */}
                  {hyp.refutationReason && (
                    <div className="p-3 bg-rose-50/80 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs text-rose-800 dark:text-rose-300 flex items-start gap-2">
                      <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Diagnostic Assessment:</strong> {hyp.refutationReason}
                      </div>
                    </div>
                  )}

                  {/* Human Validation Banner if Validated */}
                  {hyp.validatedByName && (
                    <div className="p-3 bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs text-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <strong>Validated by Officer:</strong> {hyp.validatedByName} on{' '}
                        {hyp.validatedAt ? new Date(hyp.validatedAt).toLocaleDateString() : ''}
                        <div className="mt-1 italic text-emerald-700 dark:text-emerald-400">
                          &quot;{hyp.validationReason}&quot;
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Evidence Matrix Grid (3 Columns) */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {/* Supporting Evidence (E+) */}
                    <div className="bg-white dark:bg-slate-800/70 p-3 rounded-lg border border-slate-200 dark:border-slate-700/80">
                      <h6 className="text-xs font-bold text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Supporting Evidence (E⁺)
                      </h6>
                      {hyp.supportingEvidence.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No supporting evidence recorded.</p>
                      ) : (
                        <ul className="space-y-2 text-xs">
                          {hyp.supportingEvidence.map(ev => (
                            <li key={ev.id} className="border-l-2 border-emerald-500 pl-2">
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {ev.title}
                              </div>
                              <div className="text-[11px] text-slate-500">{ev.description}</div>
                              <div className="mt-1 flex items-center gap-1">
                                {getEpistemicBadge(ev.epistemicClass)}
                                <span className="text-[10px] text-slate-400">{ev.sourceName}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Contradicting Evidence (E-) */}
                    <div className="bg-white dark:bg-slate-800/70 p-3 rounded-lg border border-slate-200 dark:border-slate-700/80">
                      <h6 className="text-xs font-bold text-rose-700 dark:text-rose-400 mb-2 flex items-center gap-1.5">
                        <XCircle className="w-3.5 h-3.5" />
                        Contradicting Evidence (E⁻)
                      </h6>
                      {hyp.contradictingEvidence.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No contradictory evidence identified.</p>
                      ) : (
                        <ul className="space-y-2 text-xs">
                          {hyp.contradictingEvidence.map(ev => (
                            <li key={ev.id} className="border-l-2 border-rose-500 pl-2">
                              <div className="font-medium text-slate-800 dark:text-slate-200">
                                {ev.title}
                              </div>
                              <div className="text-[11px] text-slate-500">{ev.description}</div>
                              <div className="mt-1 flex items-center gap-1">
                                {getEpistemicBadge(ev.epistemicClass)}
                                <span className="text-[10px] text-slate-400">{ev.sourceName}</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    {/* Missing Evidence Gaps (E?) */}
                    <div className="bg-white dark:bg-slate-800/70 p-3 rounded-lg border border-slate-200 dark:border-slate-700/80">
                      <h6 className="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        Missing Evidence Gaps (Eˀ)
                      </h6>
                      {hyp.missingEvidence.length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No open evidence gaps.</p>
                      ) : (
                        <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
                          {hyp.missingEvidence.map((gap, gIdx) => (
                            <li key={gIdx} className="flex items-start gap-1.5">
                              <span className="text-amber-500 mt-0.5">•</span>
                              <span>{gap}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>

                  {/* Falsification Criteria Box: "What Would Change Our Assessment?" */}
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-800 dark:text-amber-300">
                    <strong className="block font-semibold mb-0.5 text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      What Would Change Our Assessment? (Falsification Criteria)
                    </strong>
                    {hyp.falsificationCriteria}
                  </div>

                  {onSelectHypothesis && (
                    <div className="pt-1 flex justify-end">
                      <button
                        onClick={() => onSelectHypothesis(hyp)}
                        className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ Selected for Governance Review' : 'Select for Governance Review'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
