'use client';

import React from 'react';
import Link from 'next/link';
import {
  Network,
  Layers,
  MapPin,
  ExternalLink,
  ShieldAlert,
  Info,
  GitBranch,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import {
  ChallengeDto,
  ChallengeRelationshipDto,
  EvidenceEpistemicClass,
  InfrastructureGraphDto,
} from '@sicp/shared';
import { EvidenceChip } from '../ui/EvidenceChip';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { InfrastructureGraphVisualizer } from '../intelligence/InfrastructureGraphVisualizer';

interface RelationshipLayerProps {
  challenge: ChallengeDto & {
    relationships?: ChallengeRelationshipDto[];
    isSystemic?: boolean;
    systemicSummary?: string | null;
  };
  linkedGraph?: InfrastructureGraphDto | null;
  onOpenSystemicMerge?: () => void;
  isGovOrAdmin?: boolean;
}

export function RelationshipLayer({
  challenge,
  linkedGraph,
  onOpenSystemicMerge,
  isGovOrAdmin,
}: RelationshipLayerProps) {
  const relationships = challenge.relationships || [];
  const hasRelationships = relationships.length > 0;

  return (
    <section id="relationship-layer" className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-800/60">
                Stage 02 • Connected Signals &amp; Topology
              </span>
              <span className="text-xs text-slate-500">Question: What is connected?</span>
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              Relationship Discovery &amp; Infrastructure Lineage
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <EvidenceChip epistemicClass={EvidenceEpistemicClass.COMPUTED} label="Deterministic Lineage Traversal" />
        </div>
      </div>

      {/* Mandatory Axiomatic Invariant Banner: RELATIONSHIP != CAUSE */}
      <div className="p-4 rounded-xl bg-slate-900 border border-indigo-500/30 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-indigo-300">
            <Info className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>Foundational Invariant: RELATIONSHIP ≠ CAUSALITY</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            SICP Invariant #3
          </span>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          A Lowest Common Ancestor (LCA) or shared upstream infrastructure path indicates where affected service branches converge. It mathematically isolates the shared dependency boundary, but does <strong>NOT</strong> prove that the upstream asset itself has failed. The defect may be localized to an individual downstream feeder.
        </p>
      </div>

      {/* Interactive Infrastructure Topology Graph if available */}
      {linkedGraph && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5 text-blue-400" />
              Connected Infrastructure Physical Lineage (880×480 Graph)
            </span>
            <span className="text-slate-400 text-[11px]">
              Provenance: Municipal GIS Schematic + SCADA Telemetry
            </span>
          </div>
          <InfrastructureGraphVisualizer graph={linkedGraph} />
        </div>
      )}

      {/* Multi-Signal Relationship Cockpit */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-400" />
              Connected Civic Incident Reports ({relationships.length})
            </h3>
            <p className="text-[11px] text-slate-400">
              Evaluated across 7-factor explainable heuristic matrix (spatial, temporal, symptoms, and network path).
            </p>
          </div>

          {isGovOrAdmin && !challenge.isSystemic && onOpenSystemicMerge && (
            <Button
              size="sm"
              variant="outline"
              onClick={onOpenSystemicMerge}
              className="border-purple-700 text-purple-300 hover:bg-purple-950/60 text-xs h-8"
            >
              <Layers className="w-3.5 h-3.5 mr-1" />
              Group as Systemic Issue
            </Button>
          )}
        </div>

        {hasRelationships ? (
          <div className="space-y-3">
            {relationships.map((rel, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 space-y-2.5 text-xs transition hover:border-slate-700"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200 text-sm">
                        {rel.sourceChallengeTitle || rel.targetChallengeTitle || 'Linked Civic Incident'}
                      </span>
                      <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]">
                        {rel.relationType}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      {rel.distanceMeters != null && (
                        <span className="text-amber-400 bg-amber-950/40 border border-amber-800/60 px-1.5 py-0.5 rounded font-mono">
                          📍 {rel.distanceMeters < 1000 ? `${rel.distanceMeters}m` : `${(rel.distanceMeters / 1000).toFixed(1)}km apart`}
                        </span>
                      )}
                      {rel.sharedInfrastructure && (
                        <span className="text-indigo-300 bg-indigo-950/40 border border-indigo-800/60 px-1.5 py-0.5 rounded font-mono">
                          🔗 Feeder: {rel.sharedInfrastructure}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/60 px-2 py-1 rounded border border-indigo-800/60">
                      {Math.round(rel.confidenceScore * 100)}% Heuristic Match
                    </span>
                    <Link
                      href={`/challenges/${rel.sourceChallengeId === challenge.id ? rel.targetChallengeId : rel.sourceChallengeId}`}
                      target="_blank"
                      className="p-1.5 rounded-lg text-blue-400 hover:text-blue-300 hover:bg-slate-800 border border-slate-700/60"
                      title="Open linked report in new tab"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                <div className="p-2.5 rounded bg-slate-900 border border-slate-800/80 text-slate-300 text-[11px] leading-relaxed">
                  <strong className="text-slate-200">Explainable Deduction:</strong> {rel.reasoning}
                </div>

                {rel.factorBreakdown && (
                  <div className="flex flex-wrap gap-1.5 pt-1 text-[10.5px] font-mono">
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-blue-300 border border-blue-900/60">
                      Problem: {rel.factorBreakdown.problemSimilarity}%
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-emerald-300 border border-emerald-900/60">
                      Location: {rel.factorBreakdown.locationSimilarity}%
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 border border-amber-900/60">
                      Category: {rel.factorBreakdown.categoryCompatibility}%
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-indigo-300 border border-indigo-900/60">
                      Infra: {rel.factorBreakdown.infrastructureOverlap}%
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-purple-300 border border-purple-900/60">
                      Root Cause: {rel.factorBreakdown.rootCauseSimilarity}%
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-slate-950/40 rounded-xl border border-slate-800 text-center text-xs text-slate-400 space-y-1">
            <p className="font-bold text-slate-200">No Multi-Signal Cluster Currently Connected</p>
            <p className="text-[11px] max-w-md mx-auto text-slate-500">
              This report is currently being tracked as an isolated municipal event. As adjacent citizens file observations within the 6-hour temporal window, SICP will dynamically register topological correlation.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
