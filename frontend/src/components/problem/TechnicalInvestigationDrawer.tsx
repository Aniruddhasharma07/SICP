'use client';

import React, { useState } from 'react';
import { X, Network, Cpu, ShieldCheck, AlertCircle, FileSearch, Layers, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ChallengeIntelligenceDto } from '@sicp/shared';
import { ExtendedChallenge } from './ProblemWorkspace';

interface TechnicalInvestigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: ExtendedChallenge;
  intelligence?: ChallengeIntelligenceDto | null;
}

export function TechnicalInvestigationDrawer({
  isOpen,
  onClose,
  challenge,
  intelligence,
}: TechnicalInvestigationDrawerProps) {
  const [activeTab, setActiveTab] = useState<'topology' | 'amch' | 'lca' | 'audit'>('topology');

  if (!isOpen) return null;

  const topology = intelligence?.topology;
  const isTopologyAvailable = topology && topology.status !== 'UNAVAILABLE' && (topology.nodes?.length || 0) > 0;
  const techDetails = intelligence?.technicalAnalysis;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/70 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 h-full flex flex-col shadow-2xl text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-500">
                Diagnostic Analysis
              </span>
              <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-none text-[10px]">
                Technical Investigation
              </Badge>
            </div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-50 mt-1">
              {challenge.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('topology')}
            className={`py-3 px-3 border-b-2 transition ${
              activeTab === 'topology'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Infrastructure Topology
          </button>
          <button
            onClick={() => setActiveTab('lca')}
            className={`py-3 px-3 border-b-2 transition ${
              activeTab === 'lca'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Corridor & LCA
          </button>
          <button
            onClick={() => setActiveTab('amch')}
            className={`py-3 px-3 border-b-2 transition ${
              activeTab === 'amch'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            Analysis of Competing Hypotheses
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'topology' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/40 rounded-lg text-xs text-blue-900 dark:text-blue-200">
                <span className="font-semibold block mb-0.5">Authoritative Topology Standard:</span>
                Topological graphs are only rendered when authoritative GIS municipal utility layers exist. No synthetic nodes or edges are fabricated.
              </div>

              {isTopologyAvailable ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      Network Status: {topology?.provenance || 'GIS_IMPORT'}
                    </span>
                    <Badge className="bg-emerald-50 text-emerald-800 border-emerald-300 text-[10px]">
                      {topology?.nodes.length} Nodes • {topology?.edges.length} Edges
                    </Badge>
                  </div>

                  <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 font-mono text-xs space-y-2">
                    {topology?.nodes.map((node) => (
                      <div key={node.id} className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50 last:border-none">
                        <span className="font-bold text-slate-800 dark:text-slate-200">{node.code || node.name}</span>
                        <span className="text-slate-500">{node.type} ({node.zone || 'Ward'})</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-slate-300 dark:border-slate-700 rounded-lg space-y-2">
                  <Network className="w-8 h-8 text-slate-400 mx-auto opacity-60" />
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    No infrastructure topology available for this area.
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {topology?.explanation ||
                      'No municipal utility GIS corridor network is registered for this district. SICP uses spatial and civic symptom clustering.'}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'lca' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Concept Definition
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  LCA: "Shared upstream dependency analysis."
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {techDetails?.lcaExplanation ||
                    'Lowest Common Ancestor (LCA) analysis identifies whether geographically separated citizen complaints originate from a shared municipal corridor, distribution feeder, or road subgrade.'}
                </p>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Corridor Assessment:
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {intelligence?.relationships?.explanation || 'Awaiting additional correlated signals in this sector.'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'amch' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
                  Methodology
                </span>
                <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  AMCH: "Comparison of competing explanations."
                </p>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {techDetails?.amchExplanation ||
                    'Based on Richards Heuer’s Analysis of Competing Hypotheses. Prevents confirmation bias by evaluating which diagnostic explanations are refuted rather than selecting a premature conclusion.'}
                </p>
              </div>

              <div className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
                  Sentinel Probing:
                </span>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {techDetails?.sentinelExplanation ||
                    'Additional observation used to update hypotheses. Dispatched to unaffected parallel segments to disprove upstream widespread failures.'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <Button
            onClick={onClose}
            className="text-xs bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
          >
            Close Investigation View
          </Button>
        </div>
      </div>
    </div>
  );
}
