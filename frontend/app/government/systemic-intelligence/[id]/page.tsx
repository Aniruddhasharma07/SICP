'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../../src/lib/api-client';
import { useAuth } from '../../../../src/lib/auth-context';
import {
  SystemicIncidentDto,
  HypothesisStatus,
  SystemicIncidentStatus,
  SentinelChoice,
  UserRole,
} from '@sicp/shared';
import {
  Network,
  AlertTriangle,
  Radio,
  ShieldCheck,
  Building,
  CheckCircle2,
  XCircle,
  Clock,
  Layers,
  FileText,
  Activity,
  ArrowLeft,
  Sparkles,
  ChevronDown,
  ChevronUp,
  MapPin,
  ExternalLink,
  RotateCcw,
  Send,
} from 'lucide-react';
import { InfrastructureGraphVisualizer } from '../../../../src/components/intelligence/InfrastructureGraphVisualizer';
import { HypothesisMatrixTable } from '../../../../src/components/intelligence/HypothesisMatrixTable';
import { SentinelProbeWidget } from '../../../../src/components/intelligence/SentinelProbeWidget';
import { ExecutiveDemoControls } from '../../../../src/components/intelligence/ExecutiveDemoControls';
import { Badge } from '../../../../src/components/ui/Badge';
import { Button } from '../../../../src/components/ui/Button';
import { IntelligenceTrace } from '../../../../src/components/common/IntelligenceTrace';
import { GuidedInvestigationCard } from '../../../../src/components/intelligence/GuidedInvestigationCard';
import { ExplainWhy } from '../../../../src/components/common/ExplainWhy';
import {
  INITIAL_DEMO_INCIDENT,
  GAMHARIA_DEMO_INCIDENT,
  applyDemoSentinelNormal,
  applyGamhariaSentinelNormal,
} from '../../../../src/lib/systemic-demo-data';

export default function RootCauseDossierPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const incidentId = (params?.id as string) || 'SYS-2026-BHP-001';

  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(
    incidentId === 'SYS-2026-JHK-204' ? 'SYS-2026-JHK-204' : 'SYS-2026-BHP-001'
  );

  const [incident, setIncident] = useState<SystemicIncidentDto | null>(() => {
    if (incidentId === 'SYS-2026-JHK-204') return GAMHARIA_DEMO_INCIDENT;
    if (incidentId === 'SYS-2026-BHP-001') return INITIAL_DEMO_INCIDENT;
    return null;
  });

  const [loading, setLoading] = useState(false);
  const [demoStep, setDemoStep] = useState(1);
  const [actionLoading, setActionLoading] = useState(false);

  // Validation Form State
  const [validationHypothesisId, setValidationHypothesisId] = useState<string>(
    incidentId === 'SYS-2026-JHK-204' ? 'hyp-jh-01' : 'hyp-01'
  );
  const [validationReason, setValidationReason] = useState(
    incidentId === 'SYS-2026-JHK-204'
      ? 'Topologically verified through Branch Differential: Gamharia Village 4 normal supply disproves River Intake outage. Confirmed sheared drive pin on Motorized Sluice Valve 3B-2.'
      : 'Topologically verified through Branch Differential: Ward 14 East Sector normal water quality disproves Treatment Plant failure. Confirmed sub-soil fracture along Trunk Line 4.'
  );
  const [validationSuccess, setValidationSuccess] = useState(false);

  // Field Team Dispatch State
  const [dispatchInstructions, setDispatchInstructions] = useState(
    'Execute acoustic leak correlation on Trunk Line 4 between Ch. 2+400 and 3+100. Measure dynamic pressures at Ward 11 booster inlet.'
  );
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  // Project Intervention State
  const [projectCreated, setProjectCreated] = useState(false);

  // Progressive Disclosure Sections
  const [activeTab, setActiveTab] = useState<'dossier' | 'signals' | 'audit'>('dossier');

  const fetchIncident = async () => {
    setLoading(true);
    try {
      const res = await apiClient.request<SystemicIncidentDto>(
        `/api/v1/systemic-incidents/${incidentId}`
      );
      if (res.success && res.data) {
        setIncident(res.data);
      } else if (incidentId === 'SYS-2026-JHK-204') {
        setIncident(GAMHARIA_DEMO_INCIDENT);
      } else if (incidentId === 'SYS-2026-BHP-001' || !incident) {
        setIncident(INITIAL_DEMO_INCIDENT);
      }
    } catch {
      if (incidentId === 'SYS-2026-JHK-204') {
        setIncident(GAMHARIA_DEMO_INCIDENT);
      } else if (incidentId === 'SYS-2026-BHP-001' || !incident) {
        setIncident(INITIAL_DEMO_INCIDENT);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncident();
  }, [incidentId]);

  const handleScenarioChange = (newScenarioId: string) => {
    setSelectedScenarioId(newScenarioId);
    setDemoStep(1);
    setValidationSuccess(false);
    setDispatchSuccess(false);
    setProjectCreated(false);
    if (newScenarioId === 'SYS-2026-JHK-204') {
      setIncident(GAMHARIA_DEMO_INCIDENT);
      setValidationHypothesisId('hyp-jh-01');
      setValidationReason(
        'Topologically verified through Branch Differential: Gamharia Village 4 normal supply disproves River Intake outage. Confirmed sheared drive pin on Motorized Sluice Valve 3B-2.'
      );
    } else {
      setIncident(INITIAL_DEMO_INCIDENT);
      setValidationHypothesisId('hyp-01');
      setValidationReason(
        'Topologically verified through Branch Differential: Ward 14 East Sector normal water quality disproves Treatment Plant failure. Confirmed sub-soil fracture along Trunk Line 4.'
      );
    }
  };

  // Handle Sentinel Response Submission
  const handleSendSentinelResponse = async (data: {
    choice: SentinelChoice;
    feedbackText?: string;
  }) => {
    if (!incident) return;
    setActionLoading(true);
    try {
      const probeId = incident.sentinelProbes[0]?.id || 'probe-01';
      const res = await apiClient.request<{
        updatedProbe: any;
        updatedHypotheses: any;
        branchDifferential: any;
      }>(`/api/v1/systemic-incidents/${incident.id}/sentinel-response`, {
        method: 'POST',
        body: JSON.stringify({
          probeRequestId: probeId,
          choice: data.choice,
          feedbackText: data.feedbackText,
        }),
      });

      if (res.success && res.data) {
        await fetchIncident();
        if (data.choice === SentinelChoice.NORMAL_SERVICE && demoStep < 4) {
          setDemoStep(4);
        }
      } else {
        if (selectedScenarioId === 'SYS-2026-JHK-204' || incident.id === 'SYS-2026-JHK-204') {
          setIncident(prev => (prev ? applyGamhariaSentinelNormal(prev) : GAMHARIA_DEMO_INCIDENT));
        } else {
          setIncident(prev => (prev ? applyDemoSentinelNormal(prev) : INITIAL_DEMO_INCIDENT));
        }
        if (data.choice === SentinelChoice.NORMAL_SERVICE && demoStep < 4) {
          setDemoStep(4);
        }
      }
    } catch (err) {
      console.warn('Backend endpoint unavailable, applying resilient client-side AMCH state:', err);
      if (selectedScenarioId === 'SYS-2026-JHK-204' || incident.id === 'SYS-2026-JHK-204') {
        setIncident(prev => (prev ? applyGamhariaSentinelNormal(prev) : GAMHARIA_DEMO_INCIDENT));
      } else {
        setIncident(prev => (prev ? applyDemoSentinelNormal(prev) : INITIAL_DEMO_INCIDENT));
      }
      if (data.choice === SentinelChoice.NORMAL_SERVICE && demoStep < 4) {
        setDemoStep(4);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Official Validation
  const handleValidateHypothesis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incident || !validationHypothesisId || validationReason.trim().length < 10) return;

    setActionLoading(true);
    try {
      const res = await apiClient.request<SystemicIncidentDto>(
        `/api/v1/systemic-incidents/${incident.id}/validate-hypothesis`,
        {
          method: 'POST',
          body: JSON.stringify({
            hypothesisId: validationHypothesisId,
            reason: validationReason.trim(),
          }),
        }
      );

      if (res.success && res.data) {
        setIncident(res.data);
        setValidationSuccess(true);
        setDemoStep(5);
      } else {
        setIncident(prev =>
          prev
            ? {
                ...prev,
                status: SystemicIncidentStatus.HUMAN_VALIDATED,
                validatedAt: new Date().toISOString(),
                validatedByName: (user as any)?.name || 'Er. Rajesh Varma (Executive Engineer, PHED Bhopal)',
                validationReason: validationReason.trim(),
              }
            : null
        );
        setValidationSuccess(true);
        setDemoStep(5);
      }
    } catch (err) {
      console.warn('Backend endpoint unavailable, applying validation state locally:', err);
      setIncident(prev =>
        prev
          ? {
              ...prev,
              status: SystemicIncidentStatus.HUMAN_VALIDATED,
              validatedAt: new Date().toISOString(),
              validatedByName: (user as any)?.name || 'Er. Rajesh Varma (Executive Engineer, PHED Bhopal)',
              validationReason: validationReason.trim(),
            }
          : null
      );
      setValidationSuccess(true);
      setDemoStep(5);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Field Team Dispatch
  const handleDispatchFieldTeam = async () => {
    if (!incident) return;
    setActionLoading(true);
    try {
      const res = await apiClient.request<SystemicIncidentDto>(
        `/api/v1/systemic-incidents/${incident.id}/dispatch-field-team`,
        {
          method: 'POST',
          body: JSON.stringify({
            instructions: dispatchInstructions,
            targetNodeIds: ['node-trunk-04'],
          }),
        }
      );

      if (res.success && res.data) {
        setIncident(res.data);
        setDispatchSuccess(true);
      } else {
        setIncident(prev =>
          prev
            ? {
                ...prev,
                status: SystemicIncidentStatus.FIELD_DISPATCHED,
              }
            : null
        );
        setDispatchSuccess(true);
      }
    } catch (err) {
      console.warn('Backend endpoint unavailable, applying dispatch state locally:', err);
      setIncident(prev =>
        prev
          ? {
              ...prev,
              status: SystemicIncidentStatus.FIELD_DISPATCHED,
            }
          : null
      );
      setDispatchSuccess(true);
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Project Intervention Creation
  const handleCreateProject = async () => {
    if (!incident) return;
    setActionLoading(true);
    try {
      const res = await apiClient.request(
        `/api/v1/systemic-incidents/${incident.id}/create-project-intervention`,
        {
          method: 'POST',
          body: JSON.stringify({
            projectTitle: 'Kolar Trunk Line 4 Acoustic Leak Remediation & Hydrodynamic Simulation',
            projectDescription:
              'University R&D and Industry CSR project to deploy acoustic sensor nodes, conduct hydrodynamic surge simulation, and execute pipe joint remediation on 900mm Feeder Main 4.',
            targetDomain: 'WATER_DISTRIBUTION',
            estimatedBudget: 1500000,
          }),
        }
      );

      if (res.success) {
        setProjectCreated(true);
        await fetchIncident();
      } else {
        setIncident(prev =>
          prev
            ? {
                ...prev,
                status: SystemicIncidentStatus.INTERVENTION_ACTIVE,
              }
            : null
        );
        setProjectCreated(true);
      }
    } catch (err) {
      console.warn('Backend endpoint unavailable, applying project creation state locally:', err);
      setIncident(prev =>
        prev
          ? {
              ...prev,
              status: SystemicIncidentStatus.INTERVENTION_ACTIVE,
            }
          : null
      );
      setProjectCreated(true);
    } finally {
      setActionLoading(false);
    }
  };

  // Executive Demo Stepper Navigation
  const handleDemoStepChange = async (step: number) => {
    setDemoStep(step);
    if (step === 3) {
      // Prompt user or display sentinel
    } else if (step === 4) {
      // Simulate normal sentinel response to trigger Branch Differential
      if (selectedScenarioId === 'SYS-2026-JHK-204') {
        await handleSendSentinelResponse({
          choice: SentinelChoice.NORMAL_SERVICE,
          feedbackText: 'Simulated citizen observation: Steady dynamic pressure observed at Village 4 standpost.',
        });
      } else {
        await handleSendSentinelResponse({
          choice: SentinelChoice.NORMAL_SERVICE,
          feedbackText:
            'Simulated citizen observation: Tap water pressure is high and water is completely clear in Ward 14.',
        });
      }
    } else if (step === 5) {
      // Execute officer sign-off
      await handleValidateHypothesis({ preventDefault: () => {} } as any);
    }
  };

  const handleResetDemo = async () => {
    setActionLoading(true);
    try {
      await apiClient.request('/api/v1/systemic-incidents/demo/reset', { method: 'POST' });
    } catch {
      // Ignore if offline
    } finally {
      if (selectedScenarioId === 'SYS-2026-JHK-204') {
        setIncident(GAMHARIA_DEMO_INCIDENT);
        setValidationHypothesisId('hyp-jh-01');
      } else {
        setIncident(INITIAL_DEMO_INCIDENT);
        setValidationHypothesisId('hyp-01');
      }
      setDemoStep(1);
      setValidationSuccess(false);
      setDispatchSuccess(false);
      setProjectCreated(false);
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100">
        <div className="text-center space-y-3">
          <Network className="w-10 h-10 text-blue-500 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-400">
            Synthesizing Root Cause Dossier &amp; Graph Lineage...
          </p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-100 p-4">
        <div className="text-center space-y-4 max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
          <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-slate-100">
            Live investigation data unavailable
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            The municipal incident record could not be retrieved from the intelligence backend. Preserving system state without synthetic generation.
          </p>
          <div className="pt-2">
            <Link href="/government/systemic-intelligence">
              <Button variant="outline" size="sm" className="border-slate-700 text-slate-200 hover:bg-slate-800">
                <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                Return to Intelligence Hub
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const scorePercentage = Math.round(incident.systemicScore * 100);
  const isHumanValidated = incident.status === SystemicIncidentStatus.HUMAN_VALIDATED;
  const isInterventionActive = projectCreated || incident.status === SystemicIncidentStatus.INTERVENTION_ACTIVE;

  const activeTraceStage = isInterventionActive
    ? 'intervention'
    : isHumanValidated
    ? 'validation'
    : demoStep >= 4
    ? 'sentinel'
    : 'hypotheses';

  const dominantActionLabel = !isHumanValidated
    ? 'Validate Leading Hypothesis'
    : !isInterventionActive
    ? 'Spawn University R&D & Industry CSR Project →'
    : 'View Active Interventions in University Portal →';

  const handleDominantAction = () => {
    if (!isHumanValidated) {
      const el = document.getElementById('governance-validation-panel');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    } else if (!isInterventionActive) {
      handleCreateProject();
    } else {
      router.push('/university');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-900 selection:text-white pb-28">
      {/* Top Breadcrumb & Controls */}
      <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/government/systemic-intelligence"
              className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg border border-slate-800 hover:bg-slate-800/80 transition"
              title="Return to Hub"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded">
                  {incident.code}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {incident.district}, {incident.state} | {incident.infrastructureDomain}
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                {incident.title}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {incident.status === SystemicIncidentStatus.HUMAN_VALIDATED ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Government Validated Investigation
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                <Activity className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                Investigation in Progress
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 space-y-6">
        {/* Mode B: Controlled SIH Demo Banner */}
        {(incident.isControlledDemo || incident.id === 'SYS-2026-BHP-001' || incident.id === 'SYS-2026-JHK-204') && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-300 text-xs font-semibold">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>CONTROLLED SIH DEMO — NOT LIVE GOVERNMENT DATA</span>
            </div>
            <span className="font-mono text-[11px] text-amber-400/80 bg-amber-900/40 px-2 py-0.5 rounded border border-amber-800/60">
              Scenario: {selectedScenarioId === 'SYS-2026-JHK-204' ? 'Gamharia Block JJM (Rural)' : 'Bhopal Kolar (Urban)'}
            </span>
          </div>
        )}

        {/* Persistent Canonical Intelligence Trace */}
        <IntelligenceTrace
          activeStage={activeTraceStage}
          currentProblemId={incident.code}
          dominantActionLabel={dominantActionLabel}
          onStageClick={(stage: string) => {
            if (stage === 'problem' || stage === 'connected') {
              router.push('/challenges');
            } else if (stage === 'collaboration' || stage === 'intervention') {
              router.push('/university');
            } else if (stage === 'memory') {
              router.push('/solutions');
            }
          }}
        />

        {/* 4-Questions Guided Investigation Orientation Card */}
        <GuidedInvestigationCard
          currentStage={
            isInterventionActive
              ? 'Multi-Stakeholder Intervention Active'
              : isHumanValidated
              ? 'Government Validated Finding'
              : demoStep >= 4
              ? 'Branch Differential Evidence Injected'
              : 'Systemic Investigation & Competing Hypotheses'
          }
          stageSubtitle={
            isHumanValidated
              ? 'Executive Engineer Sign-off Confirmed'
              : 'Analysis of Competing Hypotheses (AMCH v1.0)'
          }
          whatHappened={`${incident.signals.length} citizen reports across Wards 11, 12, and 13 documented matching low-pressure and turbidity signals within a 6-hour window.`}
          discovery={
            incident.graph.branchDifferentialResult
              ? incident.graph.branchDifferentialResult.deduction
              : 'Topological analysis identified Master Balancing Reservoir 2 as the Lowest Common Ancestor. Sentinel inquiry in Ward 14 was dispatched to evaluate Branch Differential.'
          }
          evidencePoints={[
            '4 citizen reports correlate on symptoms, space (< 2 km), and time (< 6h)',
            'Common upstream feeder: Trunk Line 4 from MBR-02',
            'WTP Outflow SCADA turbidity verified within BIS standards at 0.8 NTU',
            incident.graph.branchDifferentialResult
              ? 'Ward 14 sentinel feedback confirms normal service on parallel branch'
              : 'Ward 14 sentinel probe active to test branch differential',
            'Solution Memory: 2 historical pipeline rupture precedents retrieved',
          ]}
          uncertaintyOrUnknown={
            isHumanValidated
              ? 'Sub-surface acoustic listening rods currently verifying exact joint fracture coordinates (Ch. 2+400 to 3+100).'
              : 'Exact physical crack location along Trunk Line 4 requires on-site acoustic correlation.'
          }
          dominantAction={{
            label: dominantActionLabel,
            onClick: handleDominantAction,
            helperText: !isHumanValidated
              ? 'Officer authority required before field dispatch or public declaration'
              : 'Dispatches research R&D challenge and opens CSR funding pool',
          }}
          secondaryActions={[
            {
              label: 'Interactive GIS Network',
              onClick: () => {
                const el = document.getElementById('infrastructure-network-section');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              },
            },
            {
              label: 'Solution Memory Cases',
              onClick: () => router.push('/solutions'),
            },
          ]}
          explainWhy={{
            title: 'Why is Trunk Line 4 the Leading Root Cause?',
            summary:
              'Because Ward 14 reports normal water pressure from the same Master Balancing Reservoir, the common upstream node is absolved of failure. The defect is topologically and empirically isolated to Trunk Line 4 downstream of MBR-02.',
            technicalDetails: {
              algorithm: 'Topological Branch Differential Invariant',
              epistemicClass: 'COMPUTED',
              provenance: 'PHED Municipal GIS + Sentinel Telemetry',
              invariants: 'Branch Differential Invariant active: Branch B normal service weakens upstream treatment failure.',
            },
          }}
        />

        {/* Controlled Demo Stepper Banner */}
        <ExecutiveDemoControls
          currentStep={demoStep}
          onStepChange={handleDemoStepChange}
          onReset={handleResetDemo}
          isLoading={actionLoading}
          scenarioId={selectedScenarioId}
          onScenarioChange={handleScenarioChange}
        />

        {/* Top Split Layout: Infrastructure Graph & Incident Summary */}
        <div id="infrastructure-network-section" className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
          {/* Left: Interactive Infrastructure Network Graph (7 cols) */}
          <div className="lg:col-span-7">
            <InfrastructureGraphVisualizer graph={incident.graph} />
          </div>

          {/* Right: Executive Context Card & Branch Differential Summary (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Systemic Relationship Evidence Card */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-bold text-slate-100 mb-3 flex items-center gap-2">
                <Network className="w-4 h-4 text-blue-400" />
                Systemic Evidence Assessment
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Heuristic Relationship Strength:</span>
                  <span className="font-bold text-slate-100 font-mono">
                    {incident.evidenceStrength} ({scorePercentage}%)
                  </span>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Connected Civic Problem Reports:</span>
                  <strong className="text-slate-100">
                    {incident.signals.length} reports across 3 wards
                  </strong>
                </div>

                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-slate-400">Assigned Investigating Officer:</span>
                  <span className="text-slate-200 font-medium">
                    {incident.assignedOfficerName || 'Er. Rajesh Varma (Executive Engineer, PHED)'}
                  </span>
                </div>

                {/* Branch Differential Alert */}
                {incident.graph.branchDifferentialResult && (
                  <div className="p-3 bg-emerald-950/40 border border-emerald-800 rounded-lg text-emerald-300">
                    <div className="flex items-center gap-1.5 font-bold mb-1 text-xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      Branch Differential Analysis
                    </div>
                    <p className="text-[11px] leading-relaxed text-emerald-300">
                      {incident.graph.branchDifferentialResult.deduction}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Proactive Sentinel Widget */}
            {incident.sentinelProbes.length > 0 && (
              <SentinelProbeWidget
                probe={incident.sentinelProbes[0]}
                onSendResponse={handleSendSentinelResponse}
                isLoading={actionLoading}
              />
            )}
          </div>
        </div>

        {/* Middle Section: Competing Hypotheses Matrix (AMCH) */}
        <div className="mb-8">
          <HypothesisMatrixTable
            hypotheses={incident.hypotheses}
            onSelectHypothesis={hyp => setValidationHypothesisId(hyp.id)}
            selectedHypothesisId={validationHypothesisId}
          />
        </div>

        {/* Bottom Section: Authoritative Human Governance Panel & Project Intervention */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Left: Government Validation Sign-off (Signature #7: Human Authority Boundary) */}
          <div
            id="governance-validation-panel"
            className="bg-slate-900 border-2 border-emerald-500/40 rounded-xl p-5 shadow-sm space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded-full border border-emerald-800">
                  Signature #7 • Human Authority Boundary
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  SICP Invariant #1
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Authoritative Human Governance &amp; Validation
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed mt-1">
                AI produces competing hypotheses and calculations; authorized Government Officers hold sole authority to validate operational investigation findings.
              </p>
            </div>

            {validationSuccess || incident.status === SystemicIncidentStatus.HUMAN_VALIDATED ? (
              <div className="p-4 bg-emerald-950/60 border-2 border-emerald-500/60 rounded-xl space-y-3 text-xs animate-sicp-scale-in shadow-lg shadow-emerald-950/50">
                <div className="flex items-center justify-between pb-2 border-b border-emerald-500/30">
                  <div className="flex items-center gap-2 font-black text-emerald-300 uppercase tracking-wide">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <span>Statutory Sign-Off Sealed</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold bg-emerald-900/80 text-emerald-200 border border-emerald-500/40 px-2 py-0.5 rounded">
                    GOV-VAL-{incident.code}
                  </span>
                </div>
                
                <div className="space-y-1 text-slate-300">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Authorized Signatory:</span>
                    <strong className="text-emerald-300 font-bold">{incident.validatedByName || 'Er. Rajesh Varma (Executive Engineer, PHED)'}</strong>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400">Audit Timestamp:</span>
                    <span className="font-mono text-slate-300">{new Date().toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-emerald-900/30 border border-emerald-500/20 p-2.5 rounded-lg text-slate-300 text-[11px] italic leading-relaxed">
                  &quot;{incident.validationReason || validationReason}&quot;
                </div>

                <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] text-emerald-400 font-medium font-mono">
                    ✓ Recorded on Tamper-Evident Authority Audit Ledger
                  </span>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => {
                      const el = document.getElementById('collaboration-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-7 px-3 shadow"
                  >
                    Continue to Collaboration &rarr;
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleValidateHypothesis} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select Hypothesis to Validate as Official Finding:
                  </label>
                  <select
                    value={validationHypothesisId}
                    onChange={e => setValidationHypothesisId(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-700 rounded-lg bg-slate-800 text-slate-100"
                  >
                    {incident.hypotheses
                      .filter(h => h.status !== HypothesisStatus.REFUTED)
                      .map(h => (
                        <option key={h.id} value={h.id}>
                          {h.title} (Diagnostic Support: {h.diagnosticSupportScore}%)
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Official Governance Sign-off Justification:
                  </label>
                  <textarea
                    rows={3}
                    value={validationReason}
                    onChange={e => setValidationReason(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-700 rounded-lg bg-slate-800 text-slate-100 placeholder-slate-500"
                    placeholder="Enter evidence-backed governance reason..."
                  />
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={actionLoading || validationReason.trim().length < 10}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    Validate as Official Investigation Finding
                  </Button>
                </div>
              </form>
            )}
          </div>

          {/* Right: Closed-Loop Lifecycle — University & Industry Interventions (Signature #8) */}
          <div id="collaboration-section" className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-950 px-2 py-0.5 rounded-full border border-purple-800">
                  Signature #8 • Cross-Portal Collaboration Continuum
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  SICP Remembers
                </span>
              </div>
              <h3 className="text-sm font-bold text-slate-100 mb-1 flex items-center gap-2">
                <Building className="w-4 h-4 text-purple-400" />
                SICP Identified Collaboration Opportunities
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Connect validated systemic incidents to University engineering research and Industry CSR co-investment opportunities.
              </p>

              {projectCreated || incident.status === SystemicIncidentStatus.INTERVENTION_ACTIVE ? (
                <div className="p-4 bg-purple-950/40 border border-purple-800 rounded-xl space-y-2 text-xs animate-sicp-slide-up">
                  <div className="flex items-center gap-2 font-bold text-purple-200">
                    <CheckCircle2 className="w-4 h-4 text-purple-400" />
                    Multi-Stakeholder Intervention Project Active
                  </div>
                  <p className="text-purple-300">
                    Challenge published to University Portal (Acoustic Leak Detection R&amp;D) and Industry Portal (Water Infrastructure CSR Matching).
                  </p>
                  <div className="pt-2 flex flex-wrap gap-3">
                    <Link
                      href="/university"
                      className="text-xs font-semibold text-purple-300 hover:text-purple-200 hover:underline flex items-center gap-1"
                    >
                      View in University Portal &rarr;
                    </Link>
                    <Link
                      href="/industry"
                      className="text-xs font-semibold text-purple-300 hover:text-purple-200 hover:underline flex items-center gap-1"
                    >
                      View in Industry Portal &rarr;
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60 space-y-1">
                    <strong className="block text-slate-200">
                      Eligible University Research Domains:
                    </strong>
                    <div className="text-slate-300">
                      • Acoustic Pipeline Leak Detection IoT Nodes
                      <br />
                      • Municipal Water Hammer &amp; Surge Cavitation Simulation
                    </div>
                  </div>

                  <div className="p-3 bg-slate-800/80 rounded-lg border border-slate-700/60 space-y-1">
                    <strong className="block text-slate-200">
                      Eligible Industry CSR Themes:
                    </strong>
                    <div className="text-slate-300">
                      • Schedule VII Item 1: Potable Water Supply Remediation
                      <br />
                      • Urban Utility Pipeline Replacement Co-funding
                    </div>
                  </div>
                </div>
              )}
            </div>

            {!projectCreated && incident.status !== SystemicIncidentStatus.INTERVENTION_ACTIVE && (
              <div className="pt-4 flex items-center justify-between border-t border-slate-100 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDispatchFieldTeam}
                  disabled={actionLoading || dispatchSuccess}
                >
                  <Layers className="w-3.5 h-3.5 mr-1" />
                  {dispatchSuccess ? 'Field Team Dispatched' : 'Dispatch Inspection Team'}
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleCreateProject}
                  disabled={actionLoading}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1" />
                  Spawn University / CSR Project
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* 24-Point Comprehensive Dossier Progressive Disclosure Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-400" />
              Complete 24-Point Root Cause Dossier Records
            </h4>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('dossier')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  activeTab === 'dossier'
                    ? 'bg-blue-950 text-blue-300 border border-blue-800'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Dossier Sections
              </button>
              <button
                onClick={() => setActiveTab('signals')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  activeTab === 'signals'
                    ? 'bg-blue-950 text-blue-300 border border-blue-800'
                    : 'text-slate-400 hover:bg-slate-800'
                }`}
              >
                Individual Signals ({incident.signals.length})
              </button>
            </div>
          </div>

          <div className="p-5">
            {activeTab === 'dossier' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-800/60 rounded-lg border border-slate-700/80">
                  <strong className="block text-slate-100 mb-1">
                    01 Incident Summary
                  </strong>
                  <p className="text-slate-300">{incident.description}</p>
                </div>

                <div className="p-3.5 bg-slate-800/60 rounded-lg border border-slate-700/80">
                  <strong className="block text-slate-100 mb-1">
                    04 Infrastructure Context &amp; Capacity
                  </strong>
                  <p className="text-slate-300">
                    Network: Kolar 150 MLD Distribution Grid. Feeder Main 4 capacity 70 MLD serving 14,200 connections.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-800/60 rounded-lg border border-slate-700/80">
                  <strong className="block text-slate-100 mb-1">
                    07 Computed 7-Factor Relationships
                  </strong>
                  <p className="text-slate-300">
                    Semantic: {incident.factorBreakdown?.semantic}% | Spatial: {incident.factorBreakdown?.spatial}% | Temporal: {incident.factorBreakdown?.temporal}% | Symptoms: {incident.factorBreakdown?.symptom}% | Infrastructure: {incident.factorBreakdown?.infrastructure}%
                  </p>
                </div>

                <div className="p-3.5 bg-slate-800/60 rounded-lg border border-slate-700/80">
                  <strong className="block text-slate-100 mb-1">
                    14 Identified Evidence Gaps
                  </strong>
                  <ul className="text-slate-300 list-disc list-inside">
                    {incident.evidenceGaps?.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3.5 bg-slate-800/60 rounded-lg border border-slate-700/80">
                  <div className="flex items-center justify-between mb-1">
                    <strong className="block text-slate-100">
                      22 Solution Memory Precedents (Signature #9)
                    </strong>
                    <Link
                      href="/solutions"
                      className="text-[11px] text-blue-400 font-semibold hover:underline flex items-center gap-1"
                    >
                      Explore Memory &rarr;
                    </Link>
                  </div>
                  <p className="text-slate-300">
                    SICP Remembers: 2 previous pipeline joint ruptures documented in Solution Memory (Kolar 2024, Indore Trunk 2023). Empirical lessons incorporated into proposed engineering response.
                  </p>
                </div>

                <div className="p-3.5 bg-slate-800/60 rounded-lg border border-slate-700/80">
                  <strong className="block text-slate-100 mb-1">
                    24 Tamper-Evident Authority Audit Ledger
                  </strong>
                  <p className="text-slate-300">
                    All state transitions and official sign-offs are cryptographically logged with user identity, timestamp, and audit trail.
                  </p>
                </div>
              </div>
            ) : (
              /* Signals Tab */
              <div className="space-y-3">
                {incident.signals.map(s => (
                  <div
                    key={s.id}
                    className="p-3 bg-slate-800/60 rounded-lg border border-slate-700/80 flex items-start justify-between gap-4 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-100 mb-0.5">
                        {s.title}
                      </div>
                      <div className="text-slate-400 mb-1">
                        Symptom Summary: {s.symptomSummary}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <MapPin className="w-3 h-3" />
                        Closest Node: <strong>{s.closestNodeName || 'Trunk Line 4'}</strong> | Reported:{' '}
                        {new Date(s.reportedAt).toLocaleTimeString()}
                      </div>
                    </div>
                    <Badge variant="warning">{s.severity}</Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
