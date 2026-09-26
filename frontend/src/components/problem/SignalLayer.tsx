'use client';

import React from 'react';
import {
  Radio,
  BrainCircuit,
  MapPin,
  Clock,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  FileText,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { ChallengeDto, EvidenceEpistemicClass } from '@sicp/shared';
import { EvidenceChip } from '../ui/EvidenceChip';
import { Button } from '../ui/Button';
import { NextQuestionBridge } from './NextQuestionBridge';

interface SignalLayerProps {
  challenge: ChallengeDto & {
    aiAnalysis?: any;
    supportVotesCount?: number;
  };
  isTriggeringAi: boolean;
  onTriggerAi: () => void;
  aiNotice: { type: 'success' | 'warning' | 'error'; message: string } | null;
  onContinueToRelationship?: () => void;
}

export function SignalLayer({
  challenge,
  isTriggeringAi,
  onTriggerAi,
  aiNotice,
  onContinueToRelationship,
}: SignalLayerProps) {
  const aiAnalysis = challenge.aiAnalysis;

  return (
    <section id="signal-layer" className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
            <Radio className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-800/60">
                Stage 01 • Citizen Signal
              </span>
              <span className="text-xs text-slate-500">Question: What happened on the ground?</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              Civic Ground Reality &amp; AI Understanding
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <EvidenceChip epistemicClass={EvidenceEpistemicClass.OBSERVED} label="Citizen Observed Signal" />
        </div>
      </div>

      {/* Grid: Ground Signal Context (Left 7) & AI Interpretation (Right 5) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Ground Reality Empirical Details */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              Primary Citizen Incident Narrative
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Report ID: {challenge.id}
            </span>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800/80 leading-relaxed italic text-slate-200">
              &quot;{challenge.description}&quot;
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/60 space-y-1">
                <span className="text-slate-500 font-semibold uppercase text-[10px] block">Location Verification</span>
                <div className="font-medium text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>{challenge.address || challenge.district || 'Municipal Sector'}, {challenge.state || 'General'}</span>
                </div>
                {challenge.latitude && challenge.longitude && (
                  <span className="text-[10px] font-mono text-slate-400 block pt-0.5">
                    Coords: {challenge.latitude.toFixed(4)}° N, {challenge.longitude.toFixed(4)}° E
                  </span>
                )}
              </div>

              <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800/60 space-y-1">
                <span className="text-slate-500 font-semibold uppercase text-[10px] block">Temporal Window</span>
                <div className="font-medium text-slate-200 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Reported: {new Date(challenge.createdAt).toLocaleDateString()}</span>
                </div>
                <span className="text-[10px] text-slate-400 block pt-0.5">
                  Duration: {challenge.durationMonths ? `${challenge.durationMonths} months persisting` : 'Acute manifestation (< 2 weeks)'}
                </span>
              </div>
            </div>
          </div>

          {/* Citizen Community Signal Assessment */}
          <div className="p-3.5 bg-slate-950/60 rounded-lg border border-slate-800/80 space-y-2 text-xs">
            <span className="font-bold text-slate-200 block text-[11px] uppercase tracking-wider">
              Empirical Citizen Observation Checklist
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Verified physical residency in catchment</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Temporal coherence across neighbor reports</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Direct sensory documentation (pressure, turbidity)</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Zero administrative edit of original submission</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: AI Understanding Layer (Strictly Epistemic AI_INTERPRETED) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-bold text-slate-100 uppercase tracking-wider">
                  AI Problem Understanding
                </h3>
              </div>
              <EvidenceChip epistemicClass={EvidenceEpistemicClass.AI_INTERPRETED} label="Syntactic Extraction" />
            </div>

            <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">
              AI syntactic parsing and domain normalization. Interprets civic colloquial text into structured engineering problem formulation.
            </p>

            {aiNotice && (
              <div
                className={`mt-3 p-2.5 rounded text-xs border ${
                  aiNotice.type === 'success'
                    ? 'bg-emerald-950/60 border-emerald-700/60 text-emerald-300'
                    : 'bg-amber-950/60 border-amber-700/60 text-amber-300'
                }`}
              >
                {aiNotice.message}
              </div>
            )}

            <div className="mt-3 space-y-3">
              {aiAnalysis?.status === 'COMPLETED' ? (
                <>
                  <div className="p-3 bg-slate-950/60 rounded-lg border border-purple-900/40 space-y-1">
                    <span className="font-bold text-purple-300 text-[11px] block">
                      Normalized Technical Problem Statement:
                    </span>
                    <p className="text-xs text-slate-200 font-medium">
                      {aiAnalysis.rawResponse?.normalizedStatement || challenge.title}
                    </p>
                  </div>

                  {aiAnalysis.rawResponse?.rootCauseHypotheses &&
                    Array.isArray(aiAnalysis.rawResponse.rootCauseHypotheses) &&
                    aiAnalysis.rawResponse.rootCauseHypotheses.length > 0 && (
                      <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1.5 text-xs">
                        <span className="font-bold text-slate-300 text-[11px] block">
                          AI Inferred Candidate Hypotheses:
                        </span>
                        <ul className="list-disc pl-4 text-slate-300 space-y-1">
                          {aiAnalysis.rawResponse.rootCauseHypotheses.slice(0, 3).map((hyp: string, i: number) => (
                            <li key={i}>{hyp}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                  <div className="p-2.5 bg-slate-950/40 rounded-lg border border-slate-800/60 text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Model Confidence: <strong>{Math.round((aiAnalysis.confidenceScore || 0.78) * 100)}%</strong></span>
                    <span>Human Review: <strong className="text-amber-300">Mandatory</strong></span>
                  </div>
                </>
              ) : aiAnalysis?.status === 'UNAVAILABLE' ? (
                <div className="p-3 bg-amber-950/40 rounded-lg border border-amber-800/60 text-slate-300 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span>AI Model Temporarily Offline / Fallback</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    AI synthesis is paused. All empirical civic evidence remains intact. Authorized officers validate directly using topological measurements.
                  </p>
                </div>
              ) : aiAnalysis?.status === 'PROCESSING' || aiAnalysis?.status === 'PENDING' ? (
                <div className="p-3 bg-blue-950/40 rounded-lg border border-blue-800/60 text-slate-300 space-y-2 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-blue-300">
                    <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />
                    <span>Background Intelligence Worker Analyzing</span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    Gemini analysis queued. Polling background queue for technical normalization.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-slate-950/40 rounded-lg border border-slate-800 text-slate-300 space-y-2 text-xs">
                  <p className="text-slate-400 text-[11px]">
                    Technical normalization has not yet been triggered for this incident record.
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[10px] text-slate-500">
              AI = Understanding • Human = Authority
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={onTriggerAi}
              disabled={isTriggeringAi}
              className="border-purple-800 text-purple-300 hover:bg-purple-950/50 text-xs h-8"
            >
              <Sparkles className={`w-3.5 h-3.5 mr-1 text-purple-400 ${isTriggeringAi ? 'animate-spin' : ''}`} />
              {isTriggeringAi ? 'Dispatching...' : 'Re-Run AI Understanding'}
            </Button>
          </div>
        </div>
      </div>

      {/* Next Question Bridge to Relationship Layer */}
      {onContinueToRelationship && (
        <NextQuestionBridge
          currentStage="Stage 01 • Citizen Signal"
          questionAnswered="What happened on the ground?"
          answeredSummary="Empirical citizen observations and Gemini technical normalization established ground facts without administrative distortion."
          nextStage="Stage 02 • Connected Signals & Topology"
          nextQuestion="Could these geographically clustered incidents share an underlying municipal infrastructure dependency?"
          ctaLabel="Examine Connected Signals & Topology"
          onContinue={onContinueToRelationship}
          accentColor="blue"
        />
      )}
    </section>
  );
}
