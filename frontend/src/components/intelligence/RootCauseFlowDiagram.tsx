'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';

export interface CausalNode {
  id: string;
  type: 'root_cause' | 'mechanism' | 'symptom' | 'impact' | 'intervention';
  title: string;
  description: string;
  evidenceConfidence?: number;
  tags?: string[];
  department?: string;
}

interface RootCauseFlowDiagramProps {
  nodes?: CausalNode[];
  rootCauseTitle?: string;
  rootCauseSummary?: string;
  confidenceScore?: number;
  interventions?: string[];
  onSelectIntervention?: (intervention: string) => void;
}

export function RootCauseFlowDiagram({
  nodes,
  rootCauseTitle = 'Inadequate Stormwater Drainage Capacity',
  rootCauseSummary = 'Undersized pre-1995 culverts failing under peak 40mm/hr monsoon rainfall, combined with upstream silt accumulation.',
  confidenceScore = 91,
  interventions = [
    'Immediate desilting & high-pressure culvert clearance (Municipal Works)',
    'Sensor-assisted telemetry installation (University Engineering Lab)',
    'Dual-retention basin civil redesign with CSR co-funding',
  ],
  onSelectIntervention,
}: RootCauseFlowDiagramProps) {
  const [activeNode, setActiveNode] = useState<number>(0);

  const defaultNodes: CausalNode[] = nodes && nodes.length > 0 ? nodes : [
    {
      id: 'node-1',
      type: 'root_cause',
      title: rootCauseTitle,
      description: rootCauseSummary,
      evidenceConfidence: confidenceScore,
      tags: ['Civil Infrastructure', 'Hydrology', 'Legacy Assets'],
      department: 'Municipal Public Works',
    },
    {
      id: 'node-2',
      type: 'mechanism',
      title: 'Hydrodynamic Chokepoint & Sedimentation',
      description: 'Runoff velocity decelerates at the junction with Railway Canal, causing 65% sediment settling within 300 meters.',
      evidenceConfidence: 87,
      tags: ['Runoff Modeling', 'Sediment Trapping'],
      department: 'Drainage Division',
    },
    {
      id: 'node-3',
      type: 'symptom',
      title: 'Repetitive Surface Flooding (Wards 14 & 15)',
      description: 'Waterlogging of 45-60cm persisting for 18+ hours after moderate rainfall events, disrupting transit corridor.',
      evidenceConfidence: 96,
      tags: ['Civic Disruption', 'Access Denial'],
      department: 'Disaster Management',
    },
    {
      id: 'node-4',
      type: 'impact',
      title: 'Community & Economic Vulnerability',
      description: '4,200 residents affected; access to Govt Higher Secondary School and primary health dispensary completely cut off.',
      evidenceConfidence: 94,
      tags: ['Public Health', 'School Route', '4.2k Citizens'],
      department: 'Community Affairs',
    },
    {
      id: 'node-5',
      type: 'intervention',
      title: 'Targeted Engineering & Institutional Interventions',
      description: interventions.join(' • '),
      evidenceConfidence: 89,
      tags: ['Multi-stakeholder', 'R&D Pilot', 'CSR Matching'],
      department: 'University-Govt Joint Taskforce',
    },
  ];

  const nodeColorMap = {
    root_cause: {
      border: 'border-red-300',
      bg: 'bg-red-50/70',
      badge: 'bg-red-100 text-red-800 border-red-200',
      iconBg: 'bg-red-600 text-white',
      accentText: 'text-red-700',
    },
    mechanism: {
      border: 'border-amber-300',
      bg: 'bg-amber-50/70',
      badge: 'bg-amber-100 text-amber-800 border-amber-200',
      iconBg: 'bg-amber-600 text-white',
      accentText: 'text-amber-700',
    },
    symptom: {
      border: 'border-blue-300',
      bg: 'bg-blue-50/70',
      badge: 'bg-blue-100 text-blue-800 border-blue-200',
      iconBg: 'bg-blue-600 text-white',
      accentText: 'text-blue-700',
    },
    impact: {
      border: 'border-purple-300',
      bg: 'bg-purple-50/70',
      badge: 'bg-purple-100 text-purple-800 border-purple-200',
      iconBg: 'bg-purple-600 text-white',
      accentText: 'text-purple-700',
    },
    intervention: {
      border: 'border-emerald-300',
      bg: 'bg-emerald-50/70',
      badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      iconBg: 'bg-emerald-600 text-white',
      accentText: 'text-emerald-700',
    },
  };

  const getNodeIcon = (type: CausalNode['type']) => {
    switch (type) {
      case 'root_cause':
        return <AlertTriangle className="w-4 h-4" />;
      case 'mechanism':
        return <Layers className="w-4 h-4" />;
      case 'symptom':
        return <BrainCircuit className="w-4 h-4" />;
      case 'impact':
        return <Users className="w-4 h-4" />;
      case 'intervention':
        return <Wrench className="w-4 h-4" />;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 md:p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-600 text-white shadow-xs">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm md:text-base flex items-center gap-2">
              Deep Root-Cause Causal Flow
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                AI Synthesis
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              Tracing from structural genesis to civic manifestation and cross-sector intervention
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500 font-medium">Model Confidence:</span>
          <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            {confidenceScore}%
          </span>
        </div>
      </div>

      {/* Horizontal Flow on MD+, Vertical on Mobile */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 relative">
        {defaultNodes.map((node, index) => {
          const colors = nodeColorMap[node.type];
          const isSelected = activeNode === index;
          return (
            <div key={node.id} className="relative flex flex-col">
              <button
                type="button"
                onClick={() => setActiveNode(index)}
                className={`w-full text-left p-3 rounded-lg border transition-all duration-150 h-full flex flex-col justify-between ${
                  colors.bg
                } ${
                  isSelected
                    ? `${colors.border} ring-2 ring-indigo-400/50 shadow-sm`
                    : 'border-slate-200 hover:border-slate-300 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded border ${colors.badge}`}
                    >
                      Step 0{index + 1}
                    </span>
                    <div className={`p-1 rounded-full ${colors.iconBg}`}>
                      {getNodeIcon(node.type)}
                    </div>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900 line-clamp-2 leading-tight mb-1">
                    {node.title}
                  </h4>
                  <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                    {node.description}
                  </p>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="truncate">{node.department || 'Analysis'}</span>
                  {node.evidenceConfidence && (
                    <span className="font-semibold text-slate-700 shrink-0">
                      {node.evidenceConfidence}%
                    </span>
                  )}
                </div>
              </button>

              {/* Connecting arrow for larger screens */}
              {index < defaultNodes.length - 1 && (
                <div className="hidden md:flex absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 w-5 h-5 rounded-full bg-white border border-slate-200 shadow-xs items-center justify-center text-slate-400">
                  <ArrowRight className="w-3 h-3" />
                </div>
              )}

              {/* Connecting arrow for mobile */}
              {index < defaultNodes.length - 1 && (
                <div className="flex md:hidden justify-center py-1 text-slate-400">
                  <ArrowDown className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Node Deep Dive Inspector */}
      {defaultNodes[activeNode] && (
        <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                Stage 0{activeNode + 1} Deep Dive:
              </span>
              <span className="text-xs font-semibold text-slate-900">
                {defaultNodes[activeNode].title}
              </span>
            </div>
            {defaultNodes[activeNode].evidenceConfidence && (
              <span className="text-xs text-slate-600">
                Validation Rigor:{' '}
                <strong className="text-emerald-700 font-mono">
                  {defaultNodes[activeNode].evidenceConfidence}% verified
                </strong>
              </span>
            )}
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            {defaultNodes[activeNode].description}
          </p>

          {defaultNodes[activeNode].tags && defaultNodes[activeNode].tags!.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] uppercase font-semibold text-slate-400">
                Domain Vectors:
              </span>
              {defaultNodes[activeNode].tags!.map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-2 py-0.5 bg-white rounded border border-slate-200 text-slate-600 font-medium"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
