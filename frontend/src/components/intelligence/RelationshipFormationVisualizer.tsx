'use client';

import React, { useState } from 'react';
import { Network, MapPin, Clock, AlertTriangle, Layers, ArrowRight, Eye, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { ExplainWhy } from '../common/ExplainWhy';

export interface ConnectedSignal {
  id: string;
  title: string;
  location: string;
  distanceKm: number;
  timeDeltaHours: number;
  symptomMatchPercent: number;
  sharedZone: string;
  category: string;
  severity: string;
  reportedAt?: string;
}

export interface RelationshipFormationVisualizerProps {
  currentReportTitle?: string;
  currentLocation?: string;
  connectedSignals?: ConnectedSignal[];
  onExploreSignal?: (signalId: string) => void;
  className?: string;
}

const DEFAULT_SIGNALS: ConnectedSignal[] = [
  {
    id: 'sig-01',
    title: 'Severely discolored brown water and zero pressure',
    location: 'Ward 12, Kolar Road',
    distanceKm: 0.8,
    timeDeltaHours: 2.1,
    symptomMatchPercent: 94,
    sharedZone: 'Trunk Line 4 (Zone 4B)',
    category: 'Water Supply',
    severity: 'Severe',
  },
  {
    id: 'sig-02',
    title: 'Muddy water supply during morning supply cycle',
    location: 'Ward 13, Danish Kunj',
    distanceKm: 1.4,
    timeDeltaHours: 4.5,
    symptomMatchPercent: 91,
    sharedZone: 'Trunk Line 4 (Zone 4B)',
    category: 'Water Supply',
    severity: 'Moderate',
  },
  {
    id: 'sig-03',
    title: 'Water pressure dropped suddenly, smelling of clay',
    location: 'Ward 11, Sarvadharma Sector A',
    distanceKm: 1.9,
    timeDeltaHours: 5.8,
    symptomMatchPercent: 88,
    sharedZone: 'Trunk Line 4 / Booster Station 11',
    category: 'Water Supply',
    severity: 'Severe',
  },
];

export function RelationshipFormationVisualizer({
  currentReportTitle = 'Low water pressure & sudden brown discoloration',
  currentLocation = 'Ward 12 (Kolar Road)',
  connectedSignals = DEFAULT_SIGNALS,
  onExploreSignal,
  className = '',
}: RelationshipFormationVisualizerProps) {
  const [selectedSignalId, setSelectedSignalId] = useState<string>(
    connectedSignals[0]?.id || 'sig-01'
  );

  const selectedSignal = connectedSignals.find(s => s.id === selectedSignalId) || connectedSignals[0];

  return (
    <div className={`rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-gradient-to-b from-blue-50/40 via-white to-slate-50/50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 p-5 shadow-sm space-y-5 animate-sicp-slide-up ${className}`}>
      {/* Header with Title and ExplainWhy */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-blue-100 dark:border-slate-800 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-600 text-white shadow-xs">
              <Network className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
              Computed Civic Relationship
            </span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 animate-sicp-pulse-subtle">
              {connectedSignals.length} Connected Signals
            </span>
          </div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Similar Issues Clustered Nearby in the Last 24 Hours
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-xl">
            SICP connects problems that share geographical proximity, matching symptoms, and common municipal infrastructure.
          </p>
        </div>

        <ExplainWhy
          title="Why are these civic reports connected?"
          summary="SICP's multi-factor relationship engine evaluated spatial proximity, symptom descriptors, and municipal distribution zones. These reports exhibit high symptom concordance within a 2 km radius, suggesting an underlying network condition rather than an isolated household defect."
          evidenceItems={[
            `Physical proximity: All reports within 2.0 km radius`,
            `Symptom match: High concordance on pressure drop and discoloration`,
            `Temporal cluster: All signals occurred within 6 hours of each other`,
            `Infrastructure zone: Shared feeder trunk line catchment`,
          ]}
          technicalDetails={{
            algorithm: 'Spatial-Temporal-Symptom Multi-Vector Correlation (AMCH v1.0)',
            epistemicClass: 'COMPUTED',
            provenance: 'Citizen Intake Signal Pipeline + Municipal GIS Topology',
            scoringModel: 'Heuristic Multi-Factor Scoring (Distance 0.35, Symptom 0.35, Temporal 0.30)',
            invariants: 'Correlation / proximity does NOT prove common causation until verified by topological analysis and field telemetry.',
            factors: [
              { label: 'Avg Distance', value: '1.3 km' },
              { label: 'Time Window', value: '< 6 hours' },
              { label: 'Symptom Cosine Match', value: '91.3%' },
              { label: 'Service Zone', value: 'MBR-02 / Trunk 4' },
            ],
          }}
          buttonText="Why Connected?"
          variant="badge"
        />
      </div>

      {/* Interactive Visual Schematic Network */}
      <div className="relative bg-slate-900 rounded-xl p-5 overflow-hidden border border-slate-800 shadow-inner">
        {/* Ambient Grid Background */}
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

        {/* SVG Graphic with Connecting Lines */}
        <div className="relative z-10">
          <div className="text-[11px] font-mono text-cyan-400/80 mb-3 flex items-center justify-between">
            <span>// TOPOLOGICAL SIGNAL FORMATION MAP</span>
            <span className="text-[10px] text-slate-400">Click node to inspect relationship</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            {/* Center / Focal: Current Citizen Report */}
            <div className="md:order-2 bg-gradient-to-br from-blue-900/80 to-indigo-950/80 border-2 border-blue-400/80 rounded-xl p-4 shadow-lg text-white space-y-2 relative">
              <div className="absolute -top-2.5 right-3 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-blue-500 text-white shadow-xs">
                Your Report (Just Submitted)
              </div>
              <div className="flex items-start gap-2.5 pt-1">
                <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-300">
                  <MapPin className="w-4 h-4 text-blue-300 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white line-clamp-1">{currentReportTitle}</h4>
                  <p className="text-[11px] text-blue-200 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3 text-blue-400" />
                    {currentLocation}
                  </p>
                </div>
              </div>
              <div className="pt-2 border-t border-blue-500/30 flex items-center justify-between text-[10px] text-blue-200">
                <span>Status: Ingested</span>
                <span className="font-semibold text-cyan-300">Signal Origin #0</span>
              </div>
            </div>

            {/* Connecting Visual Lines & Connected Signal Cards */}
            <div className="md:order-1 space-y-2.5">
              {connectedSignals.slice(0, 2).map((sig, idx) => {
                const isSelected = sig.id === selectedSignalId;
                return (
                  <button
                    key={sig.id}
                    type="button"
                    onClick={() => setSelectedSignalId(sig.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-400 text-white shadow-md ring-1 ring-cyan-400/50'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/70 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-mono text-cyan-400">Signal #{idx + 1}</span>
                      <span className="font-semibold text-emerald-400">{sig.symptomMatchPercent}% match</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-100 line-clamp-1">{sig.title}</div>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-300">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-slate-400" />
                        {sig.distanceKm} km away
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                        {sig.timeDeltaHours}h ago
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="md:order-3 space-y-2.5">
              {connectedSignals.slice(2, 4).map((sig, idx) => {
                const isSelected = sig.id === selectedSignalId;
                return (
                  <button
                    key={sig.id}
                    type="button"
                    onClick={() => setSelectedSignalId(sig.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                      isSelected
                        ? 'bg-slate-800/90 border-cyan-400 text-white shadow-md ring-1 ring-cyan-400/50'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/70 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                      <span className="font-mono text-cyan-400">Signal #{idx + 3}</span>
                      <span className="font-semibold text-emerald-400">{sig.symptomMatchPercent}% match</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-100 line-clamp-1">{sig.title}</div>
                    <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-300">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5 text-slate-400" />
                        {sig.distanceKm} km away
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                        {sig.timeDeltaHours}h ago
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Relationship Breakdown for Selected Signal */}
      {selectedSignal && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              Relationship Metrics to {selectedSignal.location}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {selectedSignal.symptomMatchPercent}% Symptom Correlation
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Physical Distance</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedSignal.distanceKm} km away</span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Time Interval</span>
              <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedSignal.timeDeltaHours} hours earlier</span>
            </div>
            <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-100 dark:border-slate-800 col-span-2">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Shared Distribution Zone</span>
              <span className="text-sm font-bold text-blue-600 dark:text-blue-400">{selectedSignal.sharedZone}</span>
            </div>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-blue-50/50 dark:bg-blue-950/20 p-2.5 rounded-lg border border-blue-100/60 dark:border-blue-900/40">
            <strong className="text-blue-900 dark:text-blue-300">Observation: </strong>
            Both reports describe water turbidity and sudden loss of pressure. The spatial concentration and synchronized onset are consistent with a distribution trunk failure upstream of Ward 12.
          </div>
        </div>
      )}
    </div>
  );
}
