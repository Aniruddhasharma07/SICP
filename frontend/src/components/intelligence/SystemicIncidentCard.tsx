'use client';

import React from 'react';
import Link from 'next/link';
import {
  SystemicIncidentSummaryDto,
  SystemicIncidentStatus,
  SeverityLevel,
} from '@sicp/shared';
import {
  Network,
  AlertTriangle,
  ShieldCheck,
  Activity,
  ArrowRight,
  Radio,
  FileSearch,
  Layers,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface SystemicIncidentCardProps {
  incident: SystemicIncidentSummaryDto;
  onExplore?: () => void;
}

export function SystemicIncidentCard({ incident, onExplore }: SystemicIncidentCardProps) {
  const getSeverityBadge = (severity: SeverityLevel | string) => {
    switch (severity?.toString().toUpperCase()) {
      case 'CATASTROPHIC':
        return <Badge variant="destructive">Catastrophic Severity</Badge>;
      case 'SEVERE':
        return <Badge variant="warning">Severe Impact</Badge>;
      case 'MODERATE':
        return <Badge variant="default" className="bg-sky-600 text-white">Moderate Impact</Badge>;
      default:
        return <Badge variant="secondary">Low Impact</Badge>;
    }
  };

  const getStatusBadge = (status: SystemicIncidentStatus | string) => {
    switch (status) {
      case SystemicIncidentStatus.HUMAN_VALIDATED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Government Validated
          </span>
        );
      case SystemicIncidentStatus.INTERVENTION_ACTIVE:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800">
            <Activity className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            Intervention Active
          </span>
        );
      case SystemicIncidentStatus.FIELD_DISPATCHED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800">
            <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Field Dispatched
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
            <FileSearch className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            Under Investigation
          </span>
        );
    }
  };

  const scorePercentage = Math.round(incident.systemicScore * 100);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
      {/* Top Banner if Controlled Demo */}
      {incident.isControlledDemo && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1 -mt-5 -mx-5 mb-4 flex items-center justify-between text-[11px] font-medium text-amber-700 dark:text-amber-400">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-amber-500 animate-pulse" />
            CONTROLLED DEMO SCENARIO — NOT LIVE GOVERNMENT DATA
          </span>
          <span className="uppercase tracking-wider font-mono text-[10px]">VERIFIED TOPOLOGY</span>
        </div>
      )}

      <div>
        {/* Header Row */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded">
              {incident.code}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {incident.district}, {incident.state}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {getSeverityBadge(incident.severity)}
            {getStatusBadge(incident.status)}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 mb-3">
          {incident.title}
        </h3>

        {/* Intelligence Metrics Card */}
        <div className="bg-slate-50 dark:bg-slate-800/60 rounded-lg p-3.5 mb-4 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5 font-medium">
              <Network className="w-3.5 h-3.5 text-blue-500" />
              Systemic Relationship Strength:
            </span>
            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
              {incident.evidenceStrength} ({scorePercentage}%)
            </span>
          </div>
          {/* Progress gauge */}
          <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                scorePercentage >= 70
                  ? 'bg-blue-600'
                  : scorePercentage >= 50
                  ? 'bg-amber-500'
                  : 'bg-slate-400'
              }`}
              style={{ width: `${scorePercentage}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 italic">
            Heuristic assessment score — not a probability of causation.
          </p>
        </div>

        {/* Leading Hypothesis Preview */}
        {incident.leadingHypothesisTitle && (
          <div className="mb-4 text-xs">
            <div className="text-slate-500 dark:text-slate-400 font-medium mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              Leading Investigation Hypothesis:
            </div>
            <div className="text-slate-800 dark:text-slate-200 font-medium bg-slate-100/70 dark:bg-slate-800/80 p-2.5 rounded border border-slate-200/60 dark:border-slate-700/60 line-clamp-2">
              {incident.leadingHypothesisTitle}
            </div>
          </div>
        )}
      </div>

      {/* Footer Controls */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
        <div className="text-slate-500 dark:text-slate-400">
          <strong className="text-slate-900 dark:text-slate-200">{incident.signalCount}</strong> connected problem signals
        </div>

        <Link
          href={`/government/systemic-intelligence/${incident.id}`}
          onClick={onExplore}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-sm transition-colors text-xs"
        >
          Open Dossier
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
