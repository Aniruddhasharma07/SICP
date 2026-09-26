'use client';

import React, { useEffect, useRef } from 'react';
import {
  X,
  Info,
  Layers,
  MapPin,
  Clock,
  Activity,
  GitBranch,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Cpu,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { EvidenceChip } from '../ui/EvidenceChip';
import { EvidenceEpistemicClass } from '@sicp/shared';
import Link from 'next/link';

export interface WhyConnectedModalProps {
  isOpen: boolean;
  onClose: () => void;
  problemId: string;
  problemTitle: string;
  targetProblemTitle?: string;
  targetProblemId?: string;
  relationType?: string;
  confidenceScore?: number;
  sharedInfrastructure?: string | null;
  distance?: string;
  reasoning?: string;
  factorBreakdown?: {
    problemSimilarity?: number;
    locationSimilarity?: number;
    categoryCompatibility?: number;
    infrastructureOverlap?: number;
    rootCauseSimilarity?: number;
    evidenceConsistency?: number;
    temporalRelationship?: number;
  };
}

export function WhyConnectedModal({
  isOpen,
  onClose,
  problemId,
  problemTitle,
  targetProblemTitle = 'Connected Municipal Incident',
  targetProblemId,
  relationType = 'SYSTEMIC_ROOT_CAUSE',
  confidenceScore = 0.88,
  sharedInfrastructure = 'Feeder Junction X & Sluice Valve Chamber V-408',
  distance = '1.4 km apart',
  reasoning = 'Shared distribution branch path downstream of Lowest Common Ancestor. Co-temporal signal emergence (41-minute window) coincides with morning pumping cycle.',
  factorBreakdown = {
    problemSimilarity: 88,
    locationSimilarity: 94,
    categoryCompatibility: 90,
    infrastructureOverlap: 96,
    rootCauseSimilarity: 85,
    evidenceConsistency: 92,
    temporalRelationship: 95,
  },
}: WhyConnectedModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Keyboard accessibility: Escape key dismisses modal
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="why-connected-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-sicp-fade"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-slate-900 border border-indigo-500/40 rounded-2xl shadow-2xl overflow-hidden animate-sicp-scale-in flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/60">
                  Relationship Intelligence
                </span>
                <span className="text-xs text-slate-400">Heuristic Explanation Basis</span>
              </div>
              <h2 id="why-connected-title" className="text-base sm:text-lg font-bold text-slate-100">
                Why Are These Problems Connected?
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {/* Foundational Invariant Banner */}
          <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-indigo-300 text-xs">
                <Info className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>Foundational Invariant: RELATIONSHIP ≠ CAUSALITY</span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                SICP Invariant #3
              </span>
            </div>
            <p className="text-slate-300 text-[11.5px] leading-relaxed">
              Mathematical overlap in hydraulic, geographic, or temporal domains isolates where affected service branches converge. It mathematically bounds the dependency domain, but does <strong>NOT</strong> prove that upstream infrastructure has failed.
            </p>
          </div>

          {/* Connected Entities Pair */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
              Evaluated Incident Pair
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-blue-400 font-bold block">Current Problem</span>
                <p className="font-semibold text-slate-200 line-clamp-2">{problemTitle}</p>
              </div>
              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                <span className="text-[10px] font-mono text-purple-400 font-bold block">Linked Incident</span>
                <p className="font-semibold text-slate-200 line-clamp-2">{targetProblemTitle}</p>
              </div>
            </div>
          </div>

          {/* Explainable Deduction Narrative */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Deterministic Deduction
              </span>
              <Badge className="bg-indigo-950 text-indigo-300 border-indigo-800/60 font-mono text-[10px]">
                {Math.round(confidenceScore * 100)}% Heuristic Score
              </Badge>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-200 leading-relaxed text-xs">
              {reasoning}
            </div>
          </div>

          {/* 7-Factor Heuristic Breakdown Matrix */}
          <div className="space-y-2.5">
            <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400 block">
              7-Factor Heuristic Match Breakdown
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                  <GitBranch className="w-3.5 h-3.5 text-indigo-400" />
                  Infrastructure Overlap:
                </span>
                <span className="font-bold text-indigo-300">{factorBreakdown.infrastructureOverlap || 96}%</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                  Spatial Proximity ({distance}):
                </span>
                <span className="font-bold text-emerald-300">{factorBreakdown.locationSimilarity || 94}%</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Temporal Co-occurrence:
                </span>
                <span className="font-bold text-amber-300">{factorBreakdown.temporalRelationship || 95}%</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  Symptom Vector Overlap:
                </span>
                <span className="font-bold text-blue-300">{factorBreakdown.problemSimilarity || 88}%</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                  <Layers className="w-3.5 h-3.5 text-purple-400" />
                  Root Cause Pattern:
                </span>
                <span className="font-bold text-purple-300">{factorBreakdown.rootCauseSimilarity || 85}%</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800">
                <span className="text-slate-400 flex items-center gap-1.5 font-sans">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  Evidence Consistency:
                </span>
                <span className="font-bold text-cyan-300">{factorBreakdown.evidenceConsistency || 92}%</span>
              </div>
            </div>
          </div>

          {/* Shared Assets Strip */}
          {sharedInfrastructure && (
            <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/50 flex items-center justify-between text-xs">
              <span className="text-slate-400 flex items-center gap-1.5">
                <GitBranch className="w-4 h-4 text-indigo-400" />
                Shared Physical Feeder Asset:
              </span>
              <strong className="text-indigo-200 font-mono text-[11.5px]">{sharedInfrastructure}</strong>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5 border-t border-slate-800 bg-slate-950/90">
          <div className="flex items-center gap-2">
            <EvidenceChip epistemicClass={EvidenceEpistemicClass.COMPUTED} label="Deterministic Lineage Traversal" />
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
            >
              Close
            </Button>
            <Link href={`/challenges/${problemId}`}>
              <Button
                variant="primary"
                size="sm"
                className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <span>Open Problem Intelligence</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
