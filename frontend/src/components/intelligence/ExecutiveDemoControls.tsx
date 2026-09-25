'use client';

import React from 'react';
import {
  Sparkles,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  Radio,
  Network,
  Scale,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { Button } from '../ui/Button';

interface ExecutiveDemoControlsProps {
  currentStep: number; // 1 to 5
  onStepChange: (step: number) => void;
  onReset: () => void;
  isLoading?: boolean;
  scenarioId?: string;
  onScenarioChange?: (scenarioId: string) => void;
}

export function ExecutiveDemoControls({
  currentStep,
  onStepChange,
  onReset,
  isLoading,
  scenarioId = 'SYS-2026-BHP-001',
  onScenarioChange,
}: ExecutiveDemoControlsProps) {
  const steps = [
    {
      num: 1,
      title: 'Scattered Signals',
      desc: scenarioId.includes('JHK') ? '25 rural citizen reports across 3 villages' : '4 citizen reports across Wards 11-13',
      icon: <Radio className="w-3.5 h-3.5" />,
    },
    {
      num: 2,
      title: 'Graph Traversal',
      desc: scenarioId.includes('JHK') ? 'Upstream lineage traces to Feeder 3B-2' : 'Upstream lineage traces to Trunk Line 4',
      icon: <Network className="w-3.5 h-3.5" />,
    },
    {
      num: 3,
      title: 'Sentinel Inquiry',
      desc: scenarioId.includes('JHK') ? 'Neutral probe dispatched to Village 4' : 'Neutral probe dispatched to Ward 14',
      icon: <Scale className="w-3.5 h-3.5" />,
    },
    {
      num: 4,
      title: 'Branch Differential',
      desc: scenarioId.includes('JHK') ? 'Village 4 normal refutes intake, isolates valve' : 'Ward 14 normal refutes WTP, confirms Trunk 4',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
    },
    {
      num: 5,
      title: 'Government Sign-off',
      desc: 'Officer validates & opens Uni/CSR R&D',
      icon: <Building className="w-3.5 h-3.5" />,
    },
  ];

  return (
    <div className="bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 border border-blue-500/40 rounded-xl p-4 shadow-xl text-white mb-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-amber-500/20 text-amber-300 rounded-lg border border-amber-400/30">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-bold tracking-tight text-white">
                SIH Executive Demonstration Controls
              </h4>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-400/20 text-amber-300 border border-amber-400/40 tracking-wide">
                CONTROLLED SIH DEMO — NOT LIVE GOVERNMENT DATA
              </span>
            </div>
            <p className="text-xs text-blue-200/80 mt-0.5">
              Curated demonstration records: Evaluate topological LCA, Heuer AMCH hypothesis differential, and statutory sign-off.
            </p>
          </div>
        </div>

        {/* Action Controls & Scenario Selector */}
        <div className="flex flex-wrap items-center gap-2.5">
          {onScenarioChange && (
            <div className="flex items-center gap-1.5 bg-black/30 border border-white/15 rounded-lg px-2.5 py-1">
              <span className="text-[11px] text-slate-300 font-medium">Scenario:</span>
              <select
                value={scenarioId}
                onChange={e => onScenarioChange(e.target.value)}
                className="bg-transparent text-white text-xs font-semibold focus:outline-none cursor-pointer"
              >
                <option value="SYS-2026-BHP-001" className="bg-slate-900 text-white">
                  Scenario A: Bhopal Kolar (Urban Distribution)
                </option>
                <option value="SYS-2026-JHK-204" className="bg-slate-900 text-white">
                  Scenario B: Gamharia Block JJM (Rural Water-Grid)
                </option>
              </select>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={onReset}
            disabled={isLoading}
            className="text-xs border-white/20 text-blue-100 hover:bg-white/10"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset Scenario
          </Button>

          {currentStep < 5 && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => onStepChange(currentStep + 1)}
              disabled={isLoading}
              className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-md"
            >
              Advance to Next Demonstration Step →
            </Button>
          )}
        </div>
      </div>

      {/* Stepper Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {steps.map(s => {
          const isDone = s.num < currentStep;
          const isCurrent = s.num === currentStep;

          return (
            <button
              key={s.num}
              onClick={() => onStepChange(s.num)}
              disabled={isLoading}
              className={`p-2.5 rounded-lg text-left transition-all relative overflow-hidden border ${
                isCurrent
                  ? 'bg-blue-600/30 border-blue-400 shadow-md ring-1 ring-blue-400'
                  : isDone
                  ? 'bg-white/5 border-emerald-500/40 hover:bg-white/10'
                  : 'bg-white/5 border-white/10 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono uppercase tracking-wider font-semibold text-blue-300 flex items-center gap-1">
                  {s.icon}
                  Step {s.num}
                </span>
                {isDone && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              </div>
              <div className="text-xs font-bold text-white mb-0.5 line-clamp-1">{s.title}</div>
              <div className="text-[11px] text-blue-200/70 line-clamp-1">{s.desc}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
