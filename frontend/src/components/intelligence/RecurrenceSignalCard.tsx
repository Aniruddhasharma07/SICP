'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  MapPin,
  Clock,
  ExternalLink,
  ShieldAlert,
  Search,
  CheckCircle2,
  FileText,
  Building,
  ArrowRight,
  Info,
} from 'lucide-react';
import { RecurrenceSignalDto } from '@sicp/shared';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export interface RecurrenceSignalCardProps {
  signal: RecurrenceSignalDto | any;
  onInvestigate?: () => void;
  className?: string;
}

export function RecurrenceSignalCard({
  signal,
  onInvestigate,
  className = '',
}: RecurrenceSignalCardProps) {
  const breakdown = signal.correlationBreakdown || {};
  const prevCase = signal.previousCase || {};
  const status = signal.investigationStatus || 'UNDER_INVESTIGATION';

  const getStatusBadge = () => {
    switch (status) {
      case 'RESOLVED_AS_MAINTENANCE':
        return <Badge variant="warning">Maintenance Backlog (Not Design Failure)</Badge>;
      case 'RESOLVED_AS_EXTERNAL_SHOCK':
        return <Badge variant="secondary">Exogenous Climate Shock</Badge>;
      case 'CONFIRMED_DESIGN_FAILURE':
        return <Badge variant="destructive">Design Failure Confirmed</Badge>;
      case 'UNDER_INVESTIGATION':
      default:
        return <Badge variant="secondary" className="animate-pulse bg-amber-100 text-amber-900 border-amber-300">Under Investigation</Badge>;
    }
  };

  return (
    <div
      className={`rounded-xl border border-amber-300 bg-amber-50/40 p-4 sm:p-5 text-slate-800 shadow-xs space-y-4 ${className}`}
      data-testid="recurrence-signal-card"
    >
      {/* Alert Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-200/80 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-amber-950">
                Recurrence Signal Detected
              </h3>
              {getStatusBadge()}
            </div>
            <p className="text-xs text-amber-900 font-medium mt-0.5">
              Multi-signal spatial and temporal correlation with previous civic intervention
            </p>
          </div>
        </div>

        <div className="text-left sm:text-right shrink-0">
          <span className="text-[10px] uppercase font-bold text-amber-800 block">Correlation Index</span>
          <span className="text-base font-black text-amber-950">
            {Math.round((signal.correlationScore || 0.76) * 100)}%
          </span>
        </div>
      </div>

      {/* Governance Invariant Banner */}
      <div className="p-3 bg-white rounded-lg border border-amber-200 text-xs flex items-start gap-2.5 text-slate-700">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold text-slate-900">SICP Governance Invariant: </span>
          A new complaint at a past intervention site is a <strong className="text-amber-800">Recurrence Signal</strong>, NOT an automatic failure determination.
          Municipal authorities must determine whether this represents a maintenance lapse, extreme climate event, or engineering defect.
        </div>
      </div>

      {/* Multi-Signal Correlation Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
        <div className="bg-white p-2.5 rounded-lg border border-amber-200/80">
          <span className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
            <MapPin className="w-3 h-3 text-amber-600" />
            <span>Proximity</span>
          </span>
          <p className="font-bold text-slate-900 mt-0.5">
            {breakdown.spatialDistanceKm != null
              ? `${breakdown.spatialDistanceKm < 1 ? Math.round(breakdown.spatialDistanceKm * 1000) + ' m' : breakdown.spatialDistanceKm.toFixed(1) + ' km'} away`
              : 'Same Ward / Catchment'}
          </p>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-amber-200/80">
          <span className="text-[10px] font-semibold text-slate-500 uppercase flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Time Elapsed</span>
          </span>
          <p className="font-bold text-slate-900 mt-0.5">
            {breakdown.timeElapsedMonths != null
              ? `${breakdown.timeElapsedMonths} months post-completion`
              : 'Within operational window'}
          </p>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-amber-200/80">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">Semantic Match</span>
          <p className="font-bold text-slate-900 mt-0.5">
            {Math.round((breakdown.semanticSimilarity || 0.82) * 100)}% similarity
          </p>
        </div>

        <div className="bg-white p-2.5 rounded-lg border border-amber-200/80">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">Evidence Tier</span>
          <p className="font-bold text-emerald-800 uppercase mt-0.5">
            {signal.evidenceStrength || 'MODERATE (Tier 2)'}
          </p>
        </div>
      </div>

      {/* Prior Case Dossier Reference */}
      {prevCase.title && (
        <div className="p-3 bg-white rounded-lg border border-amber-200/80 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-slate-600" />
              <span>Prior Completed Intervention: {prevCase.title}</span>
            </span>
            {prevCase.id && (
              <Link href={`/solutions/${prevCase.id}`}>
                <span className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5 text-[11px]">
                  <span>View Case</span>
                  <ExternalLink className="w-3 h-3" />
                </span>
              </Link>
            )}
          </div>
          <p className="text-slate-600 text-[11px]">
            <strong>Approach:</strong> {prevCase.interventionApproach || 'Standard municipal deployment'} • <strong>Initial Outcome:</strong> {String(prevCase.outcomeStatus || 'Verified Effective')}
          </p>
          {prevCase.whatWorked && (
            <p className="text-emerald-800 text-[11px]">
              ✓ <strong>Previous Success:</strong> {prevCase.whatWorked}
            </p>
          )}
        </div>
      )}

      {/* Action Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <span className="text-[11px] text-slate-500 italic">
          Routing to Municipal Engineering & Field Audit Teams for on-site inspection.
        </span>

        <div className="flex items-center gap-2">
          {onInvestigate && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onInvestigate}
              className="text-xs border-amber-300 hover:bg-amber-100/60 text-amber-950 font-bold"
            >
              <Search className="w-3.5 h-3.5 mr-1" />
              <span>Investigate Recurrence</span>
            </Button>
          )}
          {prevCase.id && (
            <Link href={`/solutions/${prevCase.id}`}>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="text-xs bg-amber-700 hover:bg-amber-800 text-white flex items-center gap-1"
              >
                <span>Review Prior Project</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
