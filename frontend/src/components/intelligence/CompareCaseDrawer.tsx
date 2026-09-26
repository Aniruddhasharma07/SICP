'use client';

import React, { useEffect } from 'react';
import {
  X,
  Scale,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  BookOpen,
  MapPin,
  Layers,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import Link from 'next/link';

export interface CompareCaseDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentCase?: {
    id?: string;
    title: string;
    description: string;
    category?: string;
    district?: string;
    state?: string;
    rootCause?: string;
    severity?: string;
  } | null;
  historicalCases: Array<{
    id: string;
    title: string;
    category: string;
    problemSummary: string;
    rootCause: string;
    technicalApproach: string;
    outcomeStatus: string;
    evidenceLevel: string;
    reusabilityClass: string;
    reusabilityScore?: number;
    whatWorked?: string | null;
    whatFailed?: string | null;
    limitations?: string | null;
    lessonsLearned?: string | null;
    district?: string | null;
  }>;
}

export function CompareCaseDrawer({
  isOpen,
  onClose,
  currentCase,
  historicalCases = [],
}: CompareCaseDrawerProps) {
  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
      data-testid="compare-case-drawer"
    >
      <div
        className="w-full max-w-5xl bg-white min-h-screen shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-250"
      >
        {/* Header Bar */}
        <div className="p-4 sm:p-6 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600 text-white">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 id="modal-title" className="text-lg font-bold text-slate-900">
                Side-by-Side Precedent Comparative Analysis
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Compare current problem context against verified historical interventions
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            aria-label="Close comparison"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Comparison Table / Grid Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-x-auto">
          {historicalCases.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs">
              <p className="font-semibold text-slate-700">No historical precedents selected for comparison.</p>
              <p className="mt-1">Select at least one solution memory to begin comparative analysis.</p>
            </div>
          ) : (
            <div className="min-w-[640px] space-y-6">
              {/* Columns Header */}
              <div className={`grid gap-4 ${currentCase ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {currentCase && (
                  <div className="p-4 rounded-xl border-2 border-blue-300 bg-blue-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                        Current Subject Case
                      </span>
                      <Badge variant="default">Active Problem</Badge>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{currentCase.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{currentCase.description}</p>
                    <div className="text-[11px] text-slate-500 pt-1">
                      <MapPin className="w-3 h-3 inline mr-1 text-slate-400" />
                      {currentCase.district || 'Unassigned District'}, {currentCase.state || 'India'}
                    </div>
                  </div>
                )}

                {historicalCases.map((hist, idx) => (
                  <div
                    key={hist.id || idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        Historical Precedent #{idx + 1}
                      </span>
                      <Badge
                        variant={
                          hist.outcomeStatus === 'SUCCESSFUL' || hist.outcomeStatus === 'EFFECTIVE'
                            ? 'success'
                            : hist.outcomeStatus === 'FAILED'
                            ? 'destructive'
                            : 'warning'
                        }
                      >
                        {(hist.outcomeStatus || 'EVALUATED').replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">{hist.title}</h3>
                    <p className="text-xs text-slate-600 line-clamp-2">{hist.problemSummary}</p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[11px] font-bold text-slate-700">
                        Reusability: {hist.reusabilityScore || 75}/100
                      </span>
                      <Link href={`/solutions/${hist.id}`}>
                        <span className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5">
                          <span>Dossier</span>
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Dimension: Problem & Root Cause */}
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  1. Problem Formulation & Root Cause
                </h4>
                <div className={`grid gap-4 text-xs ${currentCase ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {currentCase && (
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Active Root Cause</span>
                      <p className="font-medium text-slate-800 mt-1">{currentCase.rootCause || 'Under municipal diagnosis'}</p>
                    </div>
                  )}
                  {historicalCases.map((hist, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Historical Root Cause</span>
                      <p className="font-medium text-slate-800 mt-1">{hist.rootCause}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dimension: Technical Approach */}
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  2. Technical & Engineering Approach
                </h4>
                <div className={`grid gap-4 text-xs ${currentCase ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {currentCase && (
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Proposed Strategy</span>
                      <p className="font-medium text-slate-800 mt-1">Pending university/industry proposals</p>
                    </div>
                  )}
                  {historicalCases.map((hist, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Deployed Technical Approach</span>
                      <p className="font-medium text-slate-800 mt-1">{hist.technicalApproach}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dimension: What Worked vs What Failed */}
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  3. Real-World Field Outcomes & Failure Modes
                </h4>
                <div className={`grid gap-4 text-xs ${currentCase ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {currentCase && (
                    <div className="p-3 bg-white rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Target Impact</span>
                      <p className="font-medium text-slate-800 mt-1">Awaiting implementation pilot</p>
                    </div>
                  )}
                  {historicalCases.map((hist, idx) => (
                    <div key={idx} className="p-3 bg-white rounded-lg border border-slate-200 space-y-2">
                      <div>
                        <span className="text-[10px] text-emerald-700 uppercase font-bold">What Worked:</span>
                        <p className="text-slate-800 mt-0.5">{hist.whatWorked || 'Demonstrated operational success.'}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-rose-700 uppercase font-bold">What Failed / Warnings:</span>
                        <p className="text-slate-800 mt-0.5">{hist.whatFailed || hist.limitations || 'None documented'}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Dimension: Institutional Lessons */}
              <div className="border-t border-slate-200 pt-4 space-y-2">
                <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">
                  4. Institutional Knowledge & Lessons for Future Decisions
                </h4>
                <div className={`grid gap-4 text-xs ${currentCase ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  {currentCase && (
                    <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-slate-500 italic">
                      Institutional lesson will be compiled upon verified completion of this project.
                    </div>
                  )}
                  {historicalCases.map((hist, idx) => (
                    <div key={idx} className="p-3 bg-slate-900 text-slate-100 rounded-lg space-y-1">
                      <span className="text-[10px] text-indigo-300 font-bold uppercase flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        <span>Institutional Lesson</span>
                      </span>
                      <p className="text-slate-200 leading-relaxed font-medium">
                        &ldquo;{hist.lessonsLearned || 'Prioritize cross-departmental coordination before physical excavation.'}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            SICP Institutional Intelligence • Decisions must be authorized by Municipal Officers
          </span>
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Comparison
          </Button>
        </div>
      </div>
    </div>
  );
}
