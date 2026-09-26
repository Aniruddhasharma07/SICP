'use client';

import React from 'react';
import Link from 'next/link';
import {
  Network,
  Cpu,
  Layers,
  MapPin,
  GitBranch,
  ArrowRight,
  Info,
  ExternalLink,
  ShieldAlert,
  AlertTriangle,
  History,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { RelationshipSummaryData } from '../../services/relationshipIntelligenceService';

export interface ProblemRelationshipPreviewProps {
  summary: RelationshipSummaryData;
  problemTitle: string;
  onOpenWhyConnected: (item?: any) => void;
  onClose?: () => void;
  className?: string;
}

export function ProblemRelationshipPreview({
  summary,
  problemTitle,
  onOpenWhyConnected,
  onClose,
  className = '',
}: ProblemRelationshipPreviewProps) {
  return (
    <div
      role="region"
      aria-label="Problem Relationship Intelligence Preview"
      className={`p-4 bg-slate-900/95 backdrop-blur-md border border-indigo-500/40 rounded-xl shadow-2xl space-y-3.5 text-xs text-slate-200 animate-sicp-scale-in max-w-sm w-full ${className}`}
      onClick={e => e.stopPropagation()}
    >
      {/* Popover Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1 rounded-md bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Network className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-slate-100 text-xs block leading-tight">
              Relationship Intelligence
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Epistemic: {summary.primaryEpistemicClass}
            </span>
          </div>
        </div>

        <Badge
          variant="secondary"
          className="bg-indigo-950 text-indigo-300 border-indigo-800/60 font-mono text-[9.5px] px-1.5 py-0.5"
        >
          {Math.round(summary.confidenceScore * 100)}% Heuristic Score
        </Badge>
      </div>

      {/* Metric Breakdown Grid */}
      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
        <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 space-y-0.5">
          <span className="text-[9.5px] text-slate-400 block font-sans">Connected Reports</span>
          <span className="font-bold text-indigo-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
            {summary.relatedCount} incidents
          </span>
        </div>

        <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 space-y-0.5">
          <span className="text-[9.5px] text-slate-400 block font-sans">Active Hypotheses</span>
          <span className="font-bold text-cyan-300 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            {summary.investigationsCount > 0 ? `${summary.investigationsCount} active AMCH` : 'Isolated intake'}
          </span>
        </div>

        <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 space-y-0.5">
          <span className="text-[9.5px] text-slate-400 block font-sans">Solution Precedents</span>
          <span className="font-bold text-emerald-300 flex items-center gap-1">
            <History className="w-3 h-3 text-emerald-400" />
            {summary.precedentsCount} cases
          </span>
        </div>

        <div className="p-2 rounded-lg bg-slate-950/70 border border-slate-800 space-y-0.5">
          <span className="text-[9.5px] text-slate-400 block font-sans">Failure Precedents</span>
          <span className={`font-bold flex items-center gap-1 ${summary.failureWarningsCount > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            {summary.failureWarningsCount > 0 ? `${summary.failureWarningsCount} warning` : 'None logged'}
          </span>
        </div>
      </div>

      {/* Shared Infrastructure Banner */}
      {summary.sharedInfrastructure && (
        <div className="p-2.5 rounded-lg bg-indigo-950/40 border border-indigo-800/60 text-[11px] space-y-1">
          <div className="flex items-center gap-1.5 font-semibold text-indigo-300">
            <GitBranch className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span>Shared Municipal Feeder Asset</span>
          </div>
          <p className="text-[10.5px] text-slate-300 font-mono pl-5">
            {summary.sharedInfrastructure}
          </p>
        </div>
      )}

      {/* Linked Incident Preview List */}
      {summary.previewItems && summary.previewItems.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Correlated Incidents
          </span>
          <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
            {summary.previewItems.map(item => (
              <div
                key={item.id}
                className="p-2 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 transition text-[11px] space-y-1"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-slate-200 truncate">{item.title}</span>
                  {item.distance && (
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-950/60 px-1 py-0.2 rounded border border-amber-800/40 shrink-0">
                      {item.distance}
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 line-clamp-1">{item.reasoning}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions Strip */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800 gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpenWhyConnected(summary.previewItems?.[0])}
          className="border-indigo-700 text-indigo-300 hover:bg-indigo-950/60 text-[11px] h-7 px-2.5 flex items-center gap-1"
        >
          <Info className="w-3 h-3 text-indigo-400" />
          <span>Why Connected?</span>
        </Button>

        <Link href={`/challenges/${summary.challengeId}`} className="shrink-0">
          <Button
            size="sm"
            variant="primary"
            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] h-7 px-2.5 flex items-center gap-1 shadow-sm"
          >
            <span>Workspace</span>
            <ArrowRight className="w-3 h-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
