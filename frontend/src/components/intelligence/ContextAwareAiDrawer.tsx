'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ExternalLink,
  Info,
  Layers,
  MapPin,
  Radio,
  Share2,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { RootCauseFlowDiagram } from './RootCauseFlowDiagram';
import { SimilarProblemItem } from './AiIntelligenceAccordion';

interface ContextAwareAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  challengeTitle?: string;
  challengeDescription?: string;
  rootCauseTitle?: string;
  rootCauseSummary?: string;
  confidenceScore?: number;
  similarProblems?: SimilarProblemItem[];
  canonicalCandidate?: {
    id: string;
    title: string;
    similarity: number;
    distanceMeters?: number;
    description?: string;
  };
  onExecuteMerge?: (targetId: string, reason: string) => Promise<void>;
  isGovOrAdmin?: boolean;
}

export function ContextAwareAiDrawer({
  isOpen,
  onClose,
  challengeTitle = 'Current Problem Under Inspection',
  challengeDescription,
  rootCauseTitle,
  rootCauseSummary,
  confidenceScore = 93,
  similarProblems = [],
  canonicalCandidate,
  onExecuteMerge,
  isGovOrAdmin = false,
}: ContextAwareAiDrawerProps) {
  const [activeTab, setActiveTab] = useState<'flow' | 'comparator'>('flow');
  const [isMerging, setIsMerging] = useState(false);
  const [mergeSuccess, setMergeSuccess] = useState(false);
  const [customReason, setCustomReason] = useState(
    'Identified as direct structural duplicate and same root cause during deep AI context-aware inspection.'
  );

  if (!isOpen) return null;

  const handleMerge = async () => {
    if (!canonicalCandidate || !onExecuteMerge) return;
    try {
      setIsMerging(true);
      await onExecuteMerge(canonicalCandidate.id, customReason);
      setMergeSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch {
      // Handled by parent
    } finally {
      setIsMerging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden border-l border-slate-200 animate-in slide-in-from-right duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
              <Sparkles className="w-5 h-5 text-indigo-300 animate-pulse" />
            </div>
            <div>
              <h2 className="font-bold text-sm md:text-base text-white flex items-center gap-2">
                Context-Aware Intelligence Inspector
              </h2>
              <p className="text-xs text-slate-300 truncate max-w-md">
                {challengeTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-4 pt-2 gap-2 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('flow')}
            className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'flow'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5" />
            Root-Cause Flow Synthesis
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('comparator')}
            className={`pb-2 px-3 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'comparator'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Duplicate & Master Comparator
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeTab === 'flow' ? (
            <div className="space-y-4">
              <RootCauseFlowDiagram
                rootCauseTitle={rootCauseTitle}
                rootCauseSummary={rootCauseSummary}
                confidenceScore={confidenceScore}
              />

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex items-center gap-2 text-slate-800 font-bold">
                  <Info className="w-4 h-4 text-blue-600 shrink-0" />
                  <span>How Context-Aware Intelligence Operates</span>
                </div>
                <p className="text-slate-600 leading-relaxed">
                  SICP continuously balances <strong>geographical proximity</strong> (via PostGIS spatial indexing) with <strong>structural root causes</strong> (via Gemini semantic embeddings). This prevents treating symptoms in isolation and directs municipal infrastructure funding toward long-term civil resolutions.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {canonicalCandidate ? (
                <div className="space-y-3">
                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl space-y-1">
                    <span className="text-[10px] uppercase font-bold tracking-wide text-purple-700 block">
                      Canonical Cluster Match
                    </span>
                    <h3 className="font-bold text-sm text-purple-950">
                      {canonicalCandidate.title}
                    </h3>
                    <div className="flex items-center gap-2 pt-1">
                      <Badge variant="destructive" className="text-[10px]">
                        {Math.round(canonicalCandidate.similarity * 100)}% Semantic Match
                      </Badge>
                      {canonicalCandidate.distanceMeters !== undefined && (
                        <span className="text-xs text-slate-600 font-mono">
                          📍 {canonicalCandidate.distanceMeters}m proximity
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Side-by-side comparison */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
                      <span className="font-bold text-slate-500 uppercase text-[10px] block">
                        Current Report
                      </span>
                      <h4 className="font-bold text-slate-900">{challengeTitle}</h4>
                      <p className="text-slate-600 leading-relaxed line-clamp-4">
                        {challengeDescription || 'No description provided.'}
                      </p>
                    </div>

                    <div className="p-3 bg-white rounded-lg border border-purple-200 space-y-1.5">
                      <span className="font-bold text-purple-600 uppercase text-[10px] block">
                        Existing Master Problem
                      </span>
                      <h4 className="font-bold text-purple-950">{canonicalCandidate.title}</h4>
                      <p className="text-slate-600 leading-relaxed line-clamp-4">
                        {canonicalCandidate.description ||
                          'Master systemic cluster aggregating verified civic reports for structural remediation.'}
                      </p>
                      <Link
                        href={`/challenges/${canonicalCandidate.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1 text-xs text-purple-700 font-medium hover:underline pt-1"
                      >
                        Inspect Master Problem <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Citizen Credit Guarantee */}
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-900">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      <strong>Zero Loss Guarantee:</strong> Upon consolidation, the citizen reporter remains credited in the master challenge timeline. All citizen votes, photographic evidence, and location coordinates are aggregated to elevate priority.
                    </p>
                  </div>

                  {/* Merge Action for Gov/Admin */}
                  {isGovOrAdmin && (
                    <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                      <label className="block text-xs font-bold text-slate-700">
                        Governance Consolidation Justification
                      </label>
                      <textarea
                        rows={2}
                        value={customReason}
                        onChange={(e) => setCustomReason(e.target.value)}
                        className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg focus:outline-indigo-500"
                        placeholder="State official reason for consolidating into master record..."
                      />

                      <Button
                        onClick={handleMerge}
                        disabled={isMerging || mergeSuccess}
                        className="w-full bg-purple-700 hover:bg-purple-800 text-white text-xs py-2"
                      >
                        {isMerging
                          ? 'Executing Consolidation Merge...'
                          : mergeSuccess
                          ? 'Merged Successfully!'
                          : 'Confirm & Consolidate into Master Record'}
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <Layers className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-semibold text-slate-700 text-sm">
                    No Direct Canonical Master Candidate
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    This challenge has unique root-cause attributes or insufficient overlap with existing clusters to warrant an automatic merge.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
