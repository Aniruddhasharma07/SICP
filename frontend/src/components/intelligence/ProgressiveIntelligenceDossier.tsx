'use client';

import React, { useState } from 'react';
import {
  ChallengeIntelligenceDto,
  UserRole,
} from '@sicp/shared';
import {
  Sparkles,
  Info,
  ChevronRight,
  ShieldCheck,
  Network,
  Layers,
  FileText,
  AlertCircle,
  CheckCircle2,
  X,
  ExternalLink,
  MapPin,
  Clock,
  Activity,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ChallengeIntelligenceClient } from '../../services/challengeIntelligenceService';

interface ProgressiveIntelligenceDossierProps {
  intelligence: ChallengeIntelligenceDto;
  currentUser?: { id: string; email: string; role: UserRole } | null;
  onRefresh?: () => void;
}

export function ProgressiveIntelligenceDossier({
  intelligence,
  currentUser,
  onRefresh,
}: ProgressiveIntelligenceDossierProps) {
  // Active Progressive Drawer: null | 'WHY' | 'EVIDENCE' | 'TECHNICAL' | 'ACTION'
  const [activeDrawer, setActiveDrawer] = useState<'WHY' | 'EVIDENCE' | 'TECHNICAL' | 'ACTION' | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationSuccess, setValidationSuccess] = useState(false);
  const [validationNotes, setValidationNotes] = useState('');

  const isOfficerOrAdmin =
    currentUser?.role === UserRole.GOVERNMENT_OFFICER ||
    currentUser?.role === UserRole.GOVERNMENT_DEPARTMENT ||
    currentUser?.role === UserRole.SYSTEM_ADMIN;

  const handleExecuteValidation = async () => {
    setIsValidating(true);
    const res = await ChallengeIntelligenceClient.validateInvestigation(
      intelligence.challenge.id,
      validationNotes || 'Investigation findings confirmed by statutory municipal officer.'
    );
    setIsValidating(false);
    if (res.success) {
      setValidationSuccess(true);
      setTimeout(() => {
        setValidationSuccess(false);
        setActiveDrawer(null);
        if (onRefresh) onRefresh();
      }, 1500);
    }
  };

  const getEpistemicBadgeVariant = (epistemicClass: string) => {
    switch (epistemicClass) {
      case 'OBSERVED':
      case 'VERIFIED_OUTCOME':
      case 'HUMAN_VALIDATED':
        return 'bg-emerald-950 text-emerald-300 border-emerald-700';
      case 'COMPUTED':
      case 'SOURCE_DERIVED':
        return 'bg-blue-950 text-blue-300 border-blue-700';
      case 'AI_INTERPRETED':
      case 'INFERRED':
        return 'bg-purple-950 text-purple-300 border-purple-700';
      case 'HYPOTHESIZED':
        return 'bg-amber-950 text-amber-300 border-amber-700';
      default:
        return 'bg-gray-800 text-gray-300 border-gray-700';
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* ========================================================================= */}
      {/* LEVEL 1: SIMPLE HUMAN SUMMARY CARD                                       */}
      {/* ========================================================================= */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900/95 to-slate-900 border border-blue-900/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className="bg-blue-950 text-blue-300 border-blue-800 font-mono text-[11px] py-0.5 px-2">
                <Sparkles className="w-3 h-3 mr-1 text-blue-400" />
                {intelligence.summary.epistemicBadge}
              </Badge>
              {intelligence.topology.status === 'CONTROLLED_DEMO' && (
                <Badge className="bg-amber-950 text-amber-300 border-amber-800 font-mono text-[10px]">
                  CONTROLLED SIH DEMO
                </Badge>
              )}
              {intelligence.governance.validated && (
                <Badge className="bg-emerald-950 text-emerald-300 border-emerald-800 font-mono text-[10px]">
                  <Check className="w-3 h-3 mr-1" /> STATUTORY VALIDATED
                </Badge>
              )}
            </div>

            <h3 className="text-lg md:text-xl font-bold text-white tracking-tight">
              {intelligence.summary.statement}
            </h3>

            <p className="text-xs text-slate-400 max-w-2xl">
              {intelligence.relationships.explanation}
            </p>
          </div>

          {/* Level 1 Progressive CTAs */}
          <div className="flex items-center gap-2 flex-wrap md:flex-nowrap shrink-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveDrawer('WHY')}
              className="text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700"
            >
              <Info className="w-3.5 h-3.5 mr-1 text-blue-400" />
              Why?
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveDrawer('EVIDENCE')}
              className="text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700"
            >
              <FileText className="w-3.5 h-3.5 mr-1 text-emerald-400" />
              Evidence ({intelligence.evidence.supporting.length + intelligence.evidence.unknown.length})
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveDrawer('TECHNICAL')}
              className="text-xs bg-slate-800/80 hover:bg-slate-700 text-slate-200 border-slate-700"
            >
              <Network className="w-3.5 h-3.5 mr-1 text-purple-400" />
              Technical Analysis
            </Button>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* LEVEL 5: DOMINANT PRIMARY ACTION                                         */}
        {/* ========================================================================= */}
        <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950/40 -mx-5 -mb-5 p-4 rounded-b-2xl">
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-white">Recommended Action: </span>
            {intelligence.nextAction.description}
          </div>

          <Button
            size="sm"
            onClick={() => setActiveDrawer('ACTION')}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs px-4 shrink-0 shadow-md shadow-blue-900/30"
          >
            {intelligence.nextAction.label}
            <ChevronRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* LEVEL 2: "WHY?" EXPLANATION DRAWER                                       */}
      {/* ========================================================================= */}
      {activeDrawer === 'WHY' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Info className="w-5 h-5 text-blue-400" />
              <h4 className="font-bold text-base text-white">Why Was This Relationship Detected?</h4>
            </div>
            <button
              onClick={() => setActiveDrawer(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-sm text-slate-300">
            {intelligence.relationships.explanation}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <MapPin className="w-3.5 h-3.5 text-blue-400" /> Spatial Proximity
              </div>
              <div className="text-lg font-bold text-white">
                {intelligence.relationships.spatialDistanceKm ? `${intelligence.relationships.spatialDistanceKm} km` : 'Local Ward'}
              </div>
              <div className="text-[11px] text-slate-500">Distance between adjacent reports</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" /> Temporal Window
              </div>
              <div className="text-lg font-bold text-white">
                {intelligence.relationships.temporalWindowDays ? `${intelligence.relationships.temporalWindowDays} days` : '48 Hours'}
              </div>
              <div className="text-[11px] text-slate-500">Coincident report timeframe</div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1">
                <Network className="w-3.5 h-3.5 text-purple-400" /> Shared Corridor
              </div>
              <div className="text-sm font-bold text-white truncate">
                {intelligence.relationships.sharedCorridor || intelligence.challenge.district || 'Municipal Corridor'}
              </div>
              <div className="text-[11px] text-slate-500">Common municipal service zone</div>
            </div>
          </div>

          {intelligence.relationships.items.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Correlated Incidents ({intelligence.relationships.items.length})
              </h5>
              <div className="space-y-2">
                {intelligence.relationships.items.map((item: any) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/40 border border-slate-800 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-200">{item.title}</span>
                      <span className="text-slate-500 ml-2">({item.category})</span>
                    </div>
                    <Badge variant="outline" className="font-mono text-[10px]">
                      {(item.similarityScore * 100).toFixed(0)}% Match
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 3: EVIDENCE SUMMARY WITH EPISTEMIC PROVENANCE                      */}
      {/* ========================================================================= */}
      {activeDrawer === 'EVIDENCE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              <h4 className="font-bold text-base text-white">Diagnostic Evidence & Provenance Ledger</h4>
            </div>
            <button
              onClick={() => setActiveDrawer(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Every piece of evidence is tagged with its epistemic certainty class. SICP never presents unverified assumptions as proven facts.
          </p>

          {/* Supporting Evidence */}
          <div>
            <h5 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Supporting Evidence ({intelligence.evidence.supporting.length})
            </h5>
            <div className="space-y-2">
              {intelligence.evidence.supporting.map((ev: any) => (
                <div
                  key={ev.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1.5 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">{ev.title}</span>
                    <Badge className={`font-mono text-[10px] border ${getEpistemicBadgeVariant(ev.epistemicClass)}`}>
                      {ev.epistemicClass}
                    </Badge>
                  </div>
                  <p className="text-slate-400">{ev.description}</p>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>Source: {ev.sourceName}</span>
                    {ev.observedAt && <span>Observed: {new Date(ev.observedAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Unknown / Hypothesized Evidence */}
          {intelligence.evidence.unknown.length > 0 && (
            <div>
              <h5 className="text-xs font-semibold text-amber-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Pending Verification ({intelligence.evidence.unknown.length})
              </h5>
              <div className="space-y-2">
                {intelligence.evidence.unknown.map((ev: any) => (
                  <div
                    key={ev.id}
                    className="p-3 rounded-xl bg-slate-950/60 border border-amber-900/30 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{ev.title}</span>
                      <Badge className={`font-mono text-[10px] border ${getEpistemicBadgeVariant(ev.epistemicClass)}`}>
                        {ev.epistemicClass}
                      </Badge>
                    </div>
                    <p className="text-slate-400">{ev.description}</p>
                    <div className="text-[11px] text-slate-500">Source: {ev.sourceName}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 4: TECHNICAL ANALYSIS DRAWER (TOPOLOGY & HYPOTHESES)               */}
      {/* ========================================================================= */}
      {activeDrawer === 'TECHNICAL' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-purple-400" />
              <h4 className="font-bold text-base text-white">Technical Infrastructure Analysis</h4>
            </div>
            <button
              onClick={() => setActiveDrawer(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Infrastructure Topology Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                Infrastructure Network Topology
              </h5>
              <Badge
                className={
                  intelligence.topology.status === 'AVAILABLE' || intelligence.topology.status === 'CONTROLLED_DEMO'
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-800 font-mono text-[10px]'
                    : 'bg-slate-800 text-slate-400 border-slate-700 font-mono text-[10px]'
                }
              >
                {intelligence.topology.status}
              </Badge>
            </div>

            {intelligence.topology.status === 'UNAVAILABLE' ? (
              <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-1">
                <div className="font-semibold text-slate-300">No Municipal Network Schematic Registered</div>
                <p>{intelligence.topology.explanation}</p>
                <div className="text-[11px] text-slate-500 pt-1">
                  Provenance: {intelligence.topology.provenance}
                </div>
              </div>
            ) : (
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">
                    Nodes: <strong className="text-white">{intelligence.topology.nodes.length}</strong> | Edges:{' '}
                    <strong className="text-white">{intelligence.topology.edges.length}</strong>
                  </span>
                  {intelligence.topology.lcaNodeName && (
                    <span className="text-purple-400">
                      LCA: <strong>{intelligence.topology.lcaNodeName}</strong>
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300">{intelligence.topology.explanation}</p>
              </div>
            )}
          </div>

          {/* Competing Hypotheses Table */}
          <div>
            <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Competing Engineering Hypotheses
            </h5>
            <div className="space-y-2">
              {intelligence.hypotheses.map((h: any) => (
                <div
                  key={h.id}
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="font-semibold text-slate-200">{h.title}</div>
                    <div className="text-slate-400 text-[11px]">{h.failureMode}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-xs font-bold text-blue-400">{h.score}/100</span>
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {h.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* LEVEL 5 DRAWER: STATUTORY VALIDATION / PRIMARY ACTION                     */}
      {/* ========================================================================= */}
      {activeDrawer === 'ACTION' && (
        <div className="bg-slate-900 border border-blue-900/60 rounded-2xl p-6 shadow-xl space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <h4 className="font-bold text-base text-white">{intelligence.nextAction.label}</h4>
            </div>
            <button
              onClick={() => setActiveDrawer(null)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {validationSuccess ? (
            <div className="bg-emerald-950/60 border border-emerald-800 text-emerald-200 p-4 rounded-xl text-center space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
              <div className="font-bold text-sm">Action Successfully Authorized</div>
              <div className="text-xs text-emerald-300">
                Statutory audit log recorded. Platform routing updated.
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-300">{intelligence.nextAction.description}</p>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Statutory Officer Review Notes (Optional)
                </label>
                <textarea
                  value={validationNotes}
                  onChange={(e) => setValidationNotes(e.target.value)}
                  placeholder="Record diagnostic findings, field verification observations, or routing authorization instructions..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 placeholder-slate-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setActiveDrawer(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleExecuteValidation}
                  disabled={isValidating}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Authorizing...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Confirm {intelligence.nextAction.label}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
