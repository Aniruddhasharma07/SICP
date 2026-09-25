'use client';

import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  ArrowRight,
  Clock,
  MapPin,
  Activity,
  FileText,
  Search,
  Check,
  Send,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  Split,
  Eye,
  Vote,
  Sparkles,
  GitBranch,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import {
  GAMHARIA_SYSTEMIC_INCIDENT_SI_204,
  SystemicIncidentScenario,
  EvidenceClass,
} from '../../lib/scenarios/gamharia-incident-scenario';

interface RootCauseDossierDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  scenario?: SystemicIncidentScenario;
  onDispatchValidation?: () => void;
}

export function RootCauseDossierDrawer({
  isOpen,
  onClose,
  scenario = GAMHARIA_SYSTEMIC_INCIDENT_SI_204,
  onDispatchValidation,
}: RootCauseDossierDrawerProps) {
  const [activeTab, setActiveTab] = useState<'TOPOLOGY' | 'EVIDENCE' | 'HYPOTHESES' | 'GAPS' | 'SENTINEL' | 'MEMORY'>('TOPOLOGY');
  const [selectedHypo, setSelectedHypo] = useState<'H1' | 'H2' | 'H3' | 'H4'>('H1');
  const [sentinelVote, setSentinelVote] = useState<string | null>(null);
  const [validationRequested, setValidationRequested] = useState(false);

  if (!isOpen) return null;

  const currentHypo = scenario.hypotheses.find(h => h.hypothesisCode === selectedHypo) || scenario.hypotheses[0];

  const getEvidenceBadge = (evClass: EvidenceClass) => {
    switch (evClass) {
      case 'OBSERVED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-600" />
            OBSERVED
          </span>
        );
      case 'COMPUTED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-600" />
            COMPUTED
          </span>
        );
      case 'HYPOTHESIZED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
            HYPOTHESIZED
          </span>
        );
      case 'VALIDATED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            VALIDATED
          </span>
        );
    }
  };

  const handleRequestValidation = () => {
    setValidationRequested(true);
    if (onDispatchValidation) onDispatchValidation();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white shadow-2xl flex flex-col h-full border-l border-slate-200 overflow-hidden">
        {/* Top Header */}
        <div className="bg-slate-900 text-white p-5 sm:p-6 border-b border-slate-800 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide uppercase bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  POSSIBLE SYSTEMIC INCIDENT {scenario.incidentCode}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {scenario.status.replace('_', ' ')}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  EVIDENCE SCORE: {scenario.metrics.evidenceStrengthScore}/100
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-white">
                {scenario.title}
              </h2>
              <div className="flex flex-wrap items-center gap-y-1 gap-x-3 text-xs text-slate-300 pt-0.5">
                <span className="flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-rose-400" />
                  <strong>{scenario.metrics.totalReports}</strong> Citizen Reports
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-blue-400" />
                  <strong>{scenario.metrics.affectedVillagesCount}</strong> Villages Affected
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  1 Shared Network ({scenario.jurisdiction.schemeName})
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  {scenario.metrics.temporalWindowMinutes}-Minute Window
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 mt-5 border-b border-slate-800 overflow-x-auto text-xs font-semibold -mb-5 pb-0">
            <button
              onClick={() => setActiveTab('TOPOLOGY')}
              className={`px-3 py-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'TOPOLOGY' ? 'border-blue-400 text-blue-300' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              1. Infrastructure &amp; Differential
            </button>
            <button
              onClick={() => setActiveTab('EVIDENCE')}
              className={`px-3 py-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'EVIDENCE' ? 'border-blue-400 text-blue-300' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>2. Evidence Provenance</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-slate-800 text-slate-300">
                {scenario.evidenceList.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('HYPOTHESES')}
              className={`px-3 py-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'HYPOTHESES' ? 'border-blue-400 text-blue-300' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              3. Competing Hypotheses
            </button>
            <button
              onClick={() => setActiveTab('GAPS')}
              className={`px-3 py-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                activeTab === 'GAPS' ? 'border-blue-400 text-blue-300' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>4. Evidence Gaps</span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-amber-500/30 text-amber-300">
                {scenario.metrics.evidenceSignalsAvailable}/{scenario.metrics.evidenceSignalsTotal}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('SENTINEL')}
              className={`px-3 py-2 border-b-2 transition-colors whitespace-nowrap ${
                activeTab === 'SENTINEL' ? 'border-blue-400 text-blue-300' : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              5. Community Sentinels
            </button>
            <button
              onClick={() => setActiveTab('MEMORY')}
              className={`px-3 py-2 border-b-2 transition-colors whitespace-nowrap flex items-center gap-1 text-emerald-400 ${
                activeTab === 'MEMORY' ? 'border-emerald-400' : 'border-transparent opacity-80 hover:opacity-100'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Solution Memory</span>
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6 bg-slate-50/60">
          {/* TAB 1: TOPOLOGY & DIFFERENTIAL */}
          {activeTab === 'TOPOLOGY' && (
            <div className="space-y-6">
              {/* Differential Callout Card */}
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-950 space-y-2">
                <div className="flex items-center gap-2">
                  <Split className="w-4 h-4 text-blue-600" />
                  <h4 className="text-xs font-black uppercase tracking-wider text-blue-900">
                    Branch-Level Differential Evidence
                  </h4>
                </div>
                <p className="text-xs leading-relaxed text-blue-900/90">
                  Villages A, B, and C all report severe service disruptions and share <strong>Feeder Junction X</strong> (downstream of ESR-North).
                  Meanwhile, <strong>Village D (Adityapur Ward 4)</strong> draws from the same Water Treatment Plant via ESR-South and exhibits <strong>zero complaints</strong>, with 14 neutral sentinel responses confirming normal clear water.
                </p>
                <div className="p-2.5 rounded-lg bg-white/80 border border-blue-200 text-[11px] font-semibold text-blue-900">
                  ⚡ <strong>Governance Takeaway:</strong> This provides strong evidence that the disruption is localized to Branch F-3 (Junction X / Valve V-408), substantially weakening the hypothesis of a plant-wide treatment failure at Kandra WTP.
                </div>
              </div>

              {/* Physical Tree Diagram */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <GitBranch className="w-4 h-4 text-indigo-600" />
                    Physical Distribution Topology (JJM Asset Registry)
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">Gamharia Block Subgraph</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs space-y-2 overflow-x-auto leading-relaxed">
                  <div className="text-slate-400 text-[10px]"># Regional Upstream Intake</div>
                  <div>[Subarnarekha River Intake] ──► [Kandra WTP (25 MLD)] ──► [MBR-1 Balancing Tank]</div>
                  <div className="text-slate-500 pl-44">│</div>
                  <div className="text-slate-500 pl-24">┌────────────────────────┴────────────────────────┐</div>
                  <div>
                    <span className="text-rose-400 font-bold">[ESR-North (Affected Branch)]</span>
                    <span className="text-slate-500">                     </span>
                    <span className="text-emerald-400 font-bold">[ESR-South (Clean Baseline)]</span>
                  </div>
                  <div className="text-slate-500 pl-8">│                                                  │</div>
                  <div>
                    <span className="text-rose-400 font-bold">[Junction X / Valve V-408]</span>
                    <span className="text-slate-500">                        </span>
                    <span className="text-emerald-400 font-bold">[Junction Y]</span>
                  </div>
                  <div className="text-slate-500 pl-4">┌───────┼───────┐                                  │</div>
                  <div className="flex gap-4">
                    <span className="text-rose-400">🔴 Vill A (8)</span>
                    <span className="text-rose-400">🔴 Vill B (11)</span>
                    <span className="text-rose-400">🔴 Vill C (6)</span>
                    <span className="text-slate-500">            </span>
                    <span className="text-emerald-400">🟢 Vill D (0 Complaints)</span>
                  </div>
                </div>
              </div>

              {/* Temporal Propagation Window */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-500" />
                    Estimated Network Propagation Window
                  </h4>
                  <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200">
                    {scenario.estimatedPropagationWindow.minMinutes} – {scenario.estimatedPropagationWindow.maxMinutes} Minutes
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {scenario.estimatedPropagationWindow.explanation}
                </p>
                <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-200 flex items-center gap-2">
                  <Info className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>
                    Observed complaints appeared sequentially between <strong>08:15 AM</strong> (Village A) and <strong>08:56 AM</strong> (Village C), adhering closely to the physical pipeline velocity of HDPE PE-100 conduits.
                  </span>
                </div>
              </div>

              {/* Cross-Utility Cascade */}
              {scenario.crossUtilityCascade.detected && (
                <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">⚡</span>
                      <h4 className="text-xs font-black uppercase tracking-wider text-amber-900">
                        Cross-Utility Cascade Hypothesis
                      </h4>
                    </div>
                    <Badge variant="warning" className="text-[10px]">
                      {scenario.crossUtilityCascade.providerUtility}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed text-amber-900/90">
                    {scenario.crossUtilityCascade.hypothesis}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EVIDENCE PROVENANCE (THE 4 CLASSES) */}
          {activeTab === 'EVIDENCE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200 pb-3">
                <span className="font-semibold text-slate-700">Epistemic Provenance Chain</span>
                <span>Classified according to source verification level</span>
              </div>

              <div className="space-y-3">
                {scenario.evidenceList.map(item => (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        {getEvidenceBadge(item.evidenceClass)}
                        <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{item.timestamp}</span>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>

                    <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-100">
                      <span>
                        Source: <strong>{item.source}</strong>
                      </span>
                      {item.confidenceOrStrength && (
                        <span className="font-semibold text-indigo-600">{item.confidenceOrStrength}</span>
                      )}
                      {item.metric && <span className="font-semibold text-slate-700">{item.metric}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: COMPETING HYPOTHESES & FALSIFICATION */}
          {activeTab === 'HYPOTHESES' && (
            <div className="space-y-5">
              {/* Hypothesis Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {scenario.hypotheses.map(hypo => (
                  <button
                    key={hypo.id}
                    onClick={() => setSelectedHypo(hypo.hypothesisCode)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      selectedHypo === hypo.hypothesisCode
                        ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-black">{hypo.hypothesisCode}</span>
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                          hypo.level === 'HIGH'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : hypo.level === 'MODERATE'
                            ? 'bg-amber-500/20 text-amber-300'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {hypo.level}
                      </span>
                    </div>
                    <div className="text-[11px] font-bold line-clamp-1">{hypo.title.split('(')[0]}</div>
                  </button>
                ))}
              </div>

              {/* Selected Hypothesis Card */}
              <Card className="border-slate-200 shadow-2xs">
                <CardHeader className="pb-3 border-b border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        Detailed Hypothesis Examination
                      </div>
                      <CardTitle className="text-sm font-black text-slate-900">
                        {currentHypo.hypothesisCode}: {currentHypo.title}
                      </CardTitle>
                    </div>
                    <Badge
                      variant={
                        currentHypo.level === 'HIGH'
                          ? 'success'
                          : currentHypo.level === 'MODERATE'
                          ? 'warning'
                          : 'outline'
                      }
                      className="text-xs font-bold"
                    >
                      Evidence Strength: {currentHypo.level}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs text-slate-600 mt-1">
                    {currentHypo.summary}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4 space-y-4 text-xs">
                  {/* Supporting vs Contradicting */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-900 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        Supporting Evidence ({currentHypo.supportingEvidence.length})
                      </div>
                      <ul className="space-y-1.5 text-emerald-950/90">
                        {currentHypo.supportingEvidence.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-emerald-600">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3.5 rounded-xl bg-rose-50/60 border border-rose-200 space-y-2">
                      <div className="text-[11px] font-bold uppercase tracking-wide text-rose-900 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                        Contradicting Evidence ({currentHypo.contradictingEvidence.length})
                      </div>
                      <ul className="space-y-1.5 text-rose-950/90">
                        {currentHypo.contradictingEvidence.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <span className="text-rose-600">•</span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* "What Would Change Our Mind?" */}
                  <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                    <div className="text-[11px] font-black uppercase tracking-wider text-blue-300 flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-blue-400" />
                      What Would Change Our Mind? (Scientific Falsification Criteria)
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      <div className="space-y-1">
                        <div className="font-bold text-emerald-300">✓ Would Strengthen Conclusion:</div>
                        <ul className="space-y-1 text-slate-300 pl-3">
                          {currentHypo.whatWouldStrengthen.map((item, idx) => (
                            <li key={idx}>• {item}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-1">
                        <div className="font-bold text-rose-300">✕ Would Weaken / Disprove:</div>
                        <ul className="space-y-1 text-slate-300 pl-3">
                          {currentHypo.whatWouldWeaken.map((item, idx) => (
                            <li key={idx}>• {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* TAB 4: EVIDENCE GAPS & ACTIONS */}
          {activeTab === 'GAPS' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Evidence Signal Completeness
                  </h4>
                  <span className="text-xs font-black text-amber-700">
                    {scenario.metrics.evidenceSignalsAvailable} / {scenario.metrics.evidenceSignalsTotal} Signals Available
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-amber-500 h-2.5 rounded-full transition-all duration-500"
                    style={{
                      width: `${(scenario.metrics.evidenceSignalsAvailable / scenario.metrics.evidenceSignalsTotal) * 100}%`,
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-500">
                  4 critical field observations are required before this hypothesis can be declared a Validated Root Cause.
                </p>
              </div>

              <div className="space-y-3">
                {scenario.evidenceGaps.map(gap => (
                  <div
                    key={gap.id}
                    className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            gap.status === 'AVAILABLE'
                              ? 'success'
                              : gap.status === 'PENDING_DISPATCH'
                              ? 'warning'
                              : 'danger'
                          }
                          className="text-[9px] font-bold"
                        >
                          {gap.status}
                        </Badge>
                        <span className="font-bold text-slate-900">{gap.label}</span>
                      </div>
                      <p className="text-[11px] text-slate-600">{gap.recommendedAction}</p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs shrink-0 self-start sm:self-auto bg-slate-50 hover:bg-slate-100"
                    >
                      Dispatch Action
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: NEUTRAL SENTINEL INQUIRY */}
          {activeTab === 'SENTINEL' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Vote className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Active Community Sentinel Pulse
                    </h4>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Target: {scenario.sentinelInquiry.targetHabitation}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 text-blue-950 space-y-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-blue-700">
                    Neutral Unbiased Citizen Inquiry
                  </div>
                  <div className="text-sm font-extrabold text-blue-950">
                    &quot;{scenario.sentinelInquiry.question}&quot;
                  </div>
                  <p className="text-[11px] text-blue-900/80">
                    Neutral prompt pushed to registered Jal Sahiyas and residents. Zero leading bias (does not mention contamination or complaints).
                  </p>
                </div>

                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold text-slate-700">Simulate Citizen Sentinel Feedback:</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <button
                      onClick={() => setSentinelVote('CLEAR')}
                      className={`p-3 rounded-lg border text-left flex items-center justify-between transition ${
                        sentinelVote === 'CLEAR'
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>🟢 Clear &amp; Normal</span>
                      <span className="text-[10px] text-slate-400">
                        {scenario.sentinelInquiry.responses.normal} votes
                      </span>
                    </button>

                    <button
                      onClick={() => setSentinelVote('UNUSUAL')}
                      className={`p-3 rounded-lg border text-left flex items-center justify-between transition ${
                        sentinelVote === 'UNUSUAL'
                          ? 'border-amber-500 bg-amber-50 text-amber-950 font-bold'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>🟠 Unusual / Cloudy / Odor</span>
                      <span className="text-[10px] text-slate-400">
                        {scenario.sentinelInquiry.responses.unusualCloudyOdor} votes
                      </span>
                    </button>

                    <button
                      onClick={() => setSentinelVote('LOW_PRESSURE')}
                      className={`p-3 rounded-lg border text-left flex items-center justify-between transition ${
                        sentinelVote === 'LOW_PRESSURE'
                          ? 'border-rose-500 bg-rose-50 text-rose-950 font-bold'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>🔴 Low Pressure / No Water</span>
                      <span className="text-[10px] text-slate-400">
                        {scenario.sentinelInquiry.responses.lowPressure + scenario.sentinelInquiry.responses.noWater} votes
                      </span>
                    </button>

                    <button
                      onClick={() => setSentinelVote('NOT_SURE')}
                      className={`p-3 rounded-lg border text-left flex items-center justify-between transition ${
                        sentinelVote === 'NOT_SURE'
                          ? 'border-slate-400 bg-slate-100 text-slate-900 font-bold'
                          : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      <span>⚪ Not Sure</span>
                      <span className="text-[10px] text-slate-400">
                        {scenario.sentinelInquiry.responses.notSure} votes
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SOLUTION MEMORY & PRECEDENT */}
          {activeTab === 'MEMORY' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-950 via-slate-900 to-indigo-950 text-white space-y-3 shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-emerald-300">
                      SICP Remembers: Historical Precedent Available
                    </span>
                  </div>
                  <Badge variant="outline" className="border-emerald-400/40 text-emerald-300 bg-emerald-500/10 text-[10px]">
                    Incident {scenario.solutionMemoryPrecedent.previousIncidentCode} ({scenario.solutionMemoryPrecedent.previousYear})
                  </Badge>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  A structurally identical systemic incident occurred on this exact infrastructure network 18 months ago.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3 text-xs">
                <div>
                  <span className="font-bold text-slate-900 block mb-0.5">Previous Validated Cause:</span>
                  <p className="text-slate-600">{scenario.solutionMemoryPrecedent.validatedCause}</p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-900 block mb-0.5">Intervention Applied:</span>
                  <p className="text-slate-600">{scenario.solutionMemoryPrecedent.interventionApplied}</p>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="font-bold text-slate-900 block mb-0.5">Verified Ground Outcome:</span>
                  <p className="text-emerald-700 font-semibold">{scenario.solutionMemoryPrecedent.verifiedOutcome}</p>
                </div>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="font-bold text-slate-800 block mb-1 text-[11px] uppercase tracking-wide">
                    Institutional Lesson Learned:
                  </span>
                  <p className="text-slate-600 italic leading-relaxed">
                    &quot;{scenario.solutionMemoryPrecedent.institutionalLesson}&quot;
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action Footer */}
        <div className="p-4 sm:p-5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            <span>AI-generated decision support — requires authorized departmental confirmation.</span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs"
            >
              Close Dossier
            </Button>

            <Button
              size="sm"
              onClick={handleRequestValidation}
              disabled={validationRequested}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
            >
              {validationRequested ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Field Team Dispatched</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Authorize Field Investigation</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
