'use client';

import React from 'react';
import {
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileCheck,
  BrainCircuit,
  UserCheck,
  Building,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { Badge } from '../ui/Badge';

export interface TimelineEvent {
  id: string;
  stage: 'PROBLEM_INGEST' | 'AI_UNDERSTANDING' | 'INTERVENTION_PLANNED' | 'DEPLOYMENT' | 'INITIAL_OUTCOME' | 'RECURRENCE_SIGNAL' | 'HUMAN_INVESTIGATION' | 'MEMORY_EVOLVED';
  stageTitle: string;
  timestamp: string;
  provenance: 'OBSERVED_FACT' | 'AI_INTERPRETATION' | 'HUMAN_DECISION';
  description: string;
  actor?: string;
  statusBadge?: {
    text: string;
    variant: 'success' | 'warning' | 'destructive' | 'secondary' | 'default';
  };
  metrics?: Record<string, string | number>;
}

export interface MemoryEvolutionTimelineProps {
  events?: TimelineEvent[];
  initialOutcome?: string;
  currentOutcome?: string;
  className?: string;
}

export function MemoryEvolutionTimeline({
  events = [],
  initialOutcome = 'SUCCESSFUL',
  currentOutcome = 'PARTIALLY_EFFECTIVE',
  className = '',
}: MemoryEvolutionTimelineProps) {
  // Default evidence progression if custom events are not provided
  const defaultEvents: TimelineEvent[] = [
    {
      id: 'ev-1',
      stage: 'PROBLEM_INGEST',
      stageTitle: '1. Citizen Problem Submission',
      timestamp: 'Month 0',
      provenance: 'OBSERVED_FACT',
      description: 'Initial localized societal problem reported with geotagged photographic evidence.',
      actor: 'Verified Citizen Resident',
      statusBadge: { text: 'Verified Submission', variant: 'secondary' },
    },
    {
      id: 'ev-2',
      stage: 'AI_UNDERSTANDING',
      stageTitle: '2. Multimodal AI Analysis & Clustering',
      timestamp: 'Month 0',
      provenance: 'AI_INTERPRETATION',
      description: 'Gemini multimodal pipeline categorized root cause and matched engineering domain.',
      actor: 'SICP AI Knowledge Engine',
      statusBadge: { text: 'Hypothesis Formulated', variant: 'default' },
    },
    {
      id: 'ev-3',
      stage: 'DEPLOYMENT',
      stageTitle: '3. Engineering Pilot Intervention Deployed',
      timestamp: 'Month 2',
      provenance: 'HUMAN_DECISION',
      description: 'University research team partnered with municipal engineers to construct the physical installation.',
      actor: 'Lead Faculty & City Engineer',
      statusBadge: { text: 'Deployed', variant: 'secondary' },
    },
    {
      id: 'ev-4',
      stage: 'INITIAL_OUTCOME',
      stageTitle: '4. Verified Initial Impact',
      timestamp: 'Month 5',
      provenance: 'OBSERVED_FACT',
      description: 'Formal municipal site audit verified full mitigation of visible defect and service disruption.',
      actor: 'Municipal Commissioner Audit',
      statusBadge: { text: '🟢 WORKED BEFORE', variant: 'success' },
    },
    {
      id: 'ev-5',
      stage: 'RECURRENCE_SIGNAL',
      stageTitle: '5. Secondary Recurrence Signal Logged',
      timestamp: 'Month 11',
      provenance: 'OBSERVED_FACT',
      description: 'New citizen report in immediate catchment flagged similar disruption. Tagged as Recurrence Signal, NOT failure.',
      actor: 'Citizen + Spatial Proximity Algorithm',
      statusBadge: { text: '⚠️ RECURRENCE SIGNAL', variant: 'warning' },
    },
    {
      id: 'ev-6',
      stage: 'HUMAN_INVESTIGATION',
      stageTitle: '6. Municipal Field Audit & Root Cause Discovery',
      timestamp: 'Month 12',
      provenance: 'HUMAN_DECISION',
      description: 'Engineers audited site: initial fix worked, but heavy seasonal silt accumulation caused secondary blockage.',
      actor: 'Municipal Quality Control Officer',
      statusBadge: { text: 'Root Cause Confirmed', variant: 'default' },
    },
    {
      id: 'ev-7',
      stage: 'MEMORY_EVOLVED',
      stageTitle: '7. Institutional Memory Evolved & Lesson Preserved',
      timestamp: 'Present',
      provenance: 'HUMAN_DECISION',
      description: 'Solution Memory updated to Mixed / Context-Dependent with mandatory maintenance prerequisite for future projects.',
      actor: 'SICP Institutional Knowledge Board',
      statusBadge: { text: '🟡 MIXED / REQUIRES ADAPTATION', variant: 'warning' },
    },
  ];

  const displayEvents = events.length > 0 ? events : defaultEvents;

  const getProvenanceBadge = (prov: TimelineEvent['provenance']) => {
    switch (prov) {
      case 'OBSERVED_FACT':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
            OBSERVED FACT
          </span>
        );
      case 'AI_INTERPRETATION':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
            AI INTERPRETATION
          </span>
        );
      case 'HUMAN_DECISION':
        return (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
            HUMAN DECISION
          </span>
        );
    }
  };

  return (
    <div className={`space-y-4 ${className}`} data-testid="memory-evolution-timeline">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>Closed-Loop Memory Evolution Timeline</span>
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Chronological audit of intervention, verification, recurrence signals, and institutional lessons
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="text-slate-400">Initial:</span>
          <span className="text-emerald-700">{initialOutcome}</span>
          <span className="text-slate-300">→</span>
          <span className="text-slate-400">Current:</span>
          <span className="text-amber-700">{currentOutcome}</span>
        </div>
      </div>

      <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {displayEvents.map((evt, idx) => (
          <div key={evt.id || idx} className="relative group">
            {/* Timeline Dot */}
            <div className="absolute -left-6 top-1 w-4 h-4 rounded-full bg-white border-2 border-blue-600 group-hover:scale-110 transition-transform" />

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">{evt.stageTitle}</span>
                  {getProvenanceBadge(evt.provenance)}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-medium">{evt.timestamp}</span>
                  {evt.statusBadge && (
                    <Badge variant={evt.statusBadge.variant} className="text-[10px]">
                      {evt.statusBadge.text}
                    </Badge>
                  )}
                </div>
              </div>

              <p className="text-slate-700 leading-relaxed">{evt.description}</p>

              {evt.actor && (
                <div className="text-[11px] text-slate-500 pt-1 flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-slate-400" />
                  <span>Authority / Actor: <strong>{evt.actor}</strong></span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
