'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../../src/lib/auth-context';
import { apiClient } from '../../../src/lib/api-client';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { ZeroDeadEndNotice } from '../../../src/components/common/ZeroDeadEndNotice';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { PageHeader } from '../../../src/components/ui/PageHeader';
import { Button } from '../../../src/components/ui/Button';
import { Input } from '../../../src/components/ui/Input';
import { Textarea } from '../../../src/components/ui/Textarea';
import { Alert } from '../../../src/components/ui/Alert';
import {
  Rocket,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Users,
  FileText,
  Building,
  Plus,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Activity,
  XCircle,
  FlaskConical,
  Compass,
  Send,
  Award,
  Sparkles,
  ThumbsUp,
  ThumbsDown,
  BrainCircuit,
  BookOpen,
} from 'lucide-react';
import {
  ProjectDto,
  ProjectStatus,
  MilestoneStatus,
  RiskSeverity,
  RiskProbability,
  RiskStatus,
  PrototypeDto,
  PrototypeStatus,
  TestExecutionDto,
  TestStatus,
  TestCaseDto,
  TestCaseStatus,
  PilotDto,
  PilotStatus,
  PilotMetricDto,
  DeploymentDto,
  DeploymentStatus,
  DeploymentReadinessChecklistDto,
  OutcomeVerificationDto,
  OutcomeVerificationStatus,
  CitizenFeedbackDto,
  CitizenProblemStatus,
  InnovationOutcomeDto,
  OutcomeType,
  MetricProvenance,
  UserRole,
  SolutionMemoryDto,
  SolutionMemoryStatus,
  ReusabilityClass,
} from '@sicp/shared';

interface ExtendedProject extends Omit<ProjectDto, 'testExecutions' | 'pilots' | 'citizenVerifications' | 'innovationOutcomes'> {
  cockpit?: {
    overallHealth: 'ON_TRACK' | 'AT_RISK' | 'BLOCKED';
    healthScore: number;
    totalMilestones: number;
    completedMilestones: number;
    overdueMilestones: number;
    blockedMilestones: Array<{ id: string; title: string; blockedReason: string }>;
    criticalRisksCount: number;
    activationChecklist: {
      isChallengeApproved: boolean;
      isUniversityAccepted: boolean;
      hasValidTeam: boolean;
      hasConfirmedLeadFaculty: boolean;
      isProposalApproved: boolean;
      canActivate: boolean;
      missingPrerequisites: string[];
    };
    remedialActions: Array<{ type: string; title: string; description: string; actionUrl: string }>;
  };
  prototypes?: PrototypeDto[];
  testExecutions?: TestExecutionDto[];
  pilots?: PilotDto[];
  deployments?: DeploymentDto[];
  outcomeVerifications?: OutcomeVerificationDto[];
  citizenVerifications?: CitizenFeedbackDto[];
  innovationOutcomes?: InnovationOutcomeDto[];
}

export default function ProjectCockpitPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user } = useAuth();

  const [project, setProject] = useState<ExtendedProject | null>(null);
  const [readinessGate, setReadinessGate] = useState<DeploymentReadinessChecklistDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Active Tab
  type CockpitTab =
    | 'overview'
    | 'prototype'
    | 'testing'
    | 'pilot'
    | 'deployment'
    | 'outcomes'
    | 'milestones'
    | 'risks'
    | 'funding'
    | 'knowledge';
  const [activeTab, setActiveTab] = useState<CockpitTab>('overview');

  // Solution Memory State
  const [projectMemory, setProjectMemory] = useState<SolutionMemoryDto | null>(null);
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [draftingMemory, setDraftingMemory] = useState(false);

  // Prototype Modals
  const [showProtoModal, setShowProtoModal] = useState(false);
  const [protoTitle, setProtoTitle] = useState('');
  const [protoDesc, setProtoDesc] = useState('');
  const [protoTech, setProtoTech] = useState('');
  const [protoObjectives, setProtoObjectives] = useState('');
  const [protoType, setProtoType] = useState('SOFTWARE');

  // Prototype Review Modal
  const [reviewProtoTarget, setReviewProtoTarget] = useState<PrototypeDto | null>(null);
  const [protoReviewDecision, setProtoReviewDecision] = useState<'APPROVE' | 'REQUEST_REVISION' | 'REJECT'>('APPROVE');
  const [protoReviewComments, setProtoReviewComments] = useState('');
  const [protoRequiredChanges, setProtoRequiredChanges] = useState('');

  // Testing Modals
  const [showTestExecModal, setShowTestExecModal] = useState(false);
  const [testPlan, setTestPlan] = useState('');

  const [showCaseModal, setShowCaseModal] = useState<string | null>(null); // testExecutionId
  const [caseTitle, setCaseTitle] = useState('');
  const [caseDesc, setCaseDesc] = useState('');
  const [caseExpected, setCaseExpected] = useState('');
  const [caseSeverity, setCaseSeverity] = useState<RiskSeverity>(RiskSeverity.MEDIUM);

  const [executeCaseTarget, setExecuteCaseTarget] = useState<TestCaseDto | null>(null);
  const [execStatus, setExecStatus] = useState<TestCaseStatus>(TestCaseStatus.PASSED);
  const [execActual, setExecActual] = useState('');
  const [execBlockerReason, setExecBlockerReason] = useState('');
  const [execWaiverReason, setExecWaiverReason] = useState('');

  // Pilot Modals
  const [showPilotModal, setShowPilotModal] = useState(false);
  const [pilotLocation, setPilotLocation] = useState('');
  const [pilotDistrict, setPilotDistrict] = useState('');
  const [pilotState, setPilotState] = useState('');
  const [pilotBeneficiaries, setPilotBeneficiaries] = useState('1000');
  const [pilotStartDate, setPilotStartDate] = useState('');

  const [recordMetricTarget, setRecordMetricTarget] = useState<string | null>(null); // pilotId
  const [metricName, setMetricName] = useState('');
  const [metricCategory, setMetricCategory] = useState('WATER_SUPPLY');
  const [metricUnit, setMetricUnit] = useState('Liters/day');
  const [metricBaseline, setMetricBaseline] = useState('0');
  const [metricTarget, setMetricTarget] = useState('100');
  const [metricObserved, setMetricObserved] = useState('90');
  const [metricMethod, setMetricMethod] = useState('Direct Field Measurement');
  const [metricSource, setMetricSource] = useState('Field Sensor Node');

  // Deployment Modals
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [deployTitle, setDeployTitle] = useState('');
  const [deployLocation, setDeployLocation] = useState('');
  const [deployScope, setDeployScope] = useState('Community-wide');
  const [deployBeneficiaries, setDeployBeneficiaries] = useState('5000');
  const [deployInfra, setDeployInfra] = useState('Municipal water distribution hub');
  const [deployTeam, setDeployTeam] = useState('Joint IIT & Municipal Engineering Team');

  // Deployment Status Update Modal
  const [deployStatusTarget, setDeployStatusTarget] = useState<DeploymentDto | null>(null);
  const [deployStatusNext, setDeployStatusNext] = useState<DeploymentStatus>(DeploymentStatus.DEPLOYED);
  const [deployFailureCause, setDeployFailureCause] = useState('');
  const [deployRollbackReason, setDeployRollbackReason] = useState('');
  const [deployOpNotes, setDeployOpNotes] = useState('');

  // Outcome Verification Modal
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [outStatus, setOutStatus] = useState<OutcomeVerificationStatus>(OutcomeVerificationStatus.VERIFIED);
  const [outBaseline, setOutBaseline] = useState('');
  const [outTarget, setOutTarget] = useState('');
  const [outObserved, setOutObserved] = useState('');
  const [outFollowUp, setOutFollowUp] = useState('');
  const [outSuccessFactors, setOutSuccessFactors] = useState('');
  const [outFailureFactors, setOutFailureFactors] = useState('');
  const [outFailureReason, setOutFailureReason] = useState('');
  const [outLessonsLearned, setOutLessonsLearned] = useState('');
  const [outMaintenanceIssues, setOutMaintenanceIssues] = useState('');
  const [outTargetAchieved, setOutTargetAchieved] = useState(true);
  const [outContextRuralUrban, setOutContextRuralUrban] = useState<'RURAL' | 'URBAN' | 'SEMI_URBAN'>('RURAL');
  const [outContextRainfall, setOutContextRainfall] = useState<'HIGH' | 'MODERATE' | 'LOW'>('MODERATE');
  const [outContextMaintenanceCapacity, setOutContextMaintenanceCapacity] = useState<'HIGH' | 'MODERATE' | 'LOW'>('MODERATE');

  // Innovation Outcome Modal
  const [showInnovationModal, setShowInnovationModal] = useState(false);
  const [innType, setInnType] = useState<OutcomeType>(OutcomeType.PATENT_FILED);
  const [innTitle, setInnTitle] = useState('');
  const [innDesc, setInnDesc] = useState('');
  const [innRef, setInnRef] = useState('');
  const [innBeneficiaries, setInnBeneficiaries] = useState('5000');
  const [innImpact, setInnImpact] = useState('');

  // Milestone & Risk Modals
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [msTitle, setMsTitle] = useState('');
  const [msDesc, setMsDesc] = useState('');
  const [msDeadline, setMsDeadline] = useState('');
  const [msBudget, setMsBudget] = useState('');

  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskTitle, setRiskTitle] = useState('');
  const [riskSeverity, setRiskSeverity] = useState<RiskSeverity>(RiskSeverity.MEDIUM);
  const [riskProb, setRiskProb] = useState<RiskProbability>(RiskProbability.MEDIUM);
  const [riskImpact, setRiskImpact] = useState('');
  const [riskMitigation, setRiskMitigation] = useState('');

  const [unblockTarget, setUnblockTarget] = useState<string | null>(null);
  const [unblockNote, setUnblockNote] = useState('');

  const fetchProject = async () => {
    setLoading(true);
    try {
      const res = await apiClient.request<ExtendedProject>(`/api/v1/projects/${resolvedParams.id}`);
      if (res.success && res.data) {
        setProject(res.data);
      }
      const gateRes = await apiClient.request<DeploymentReadinessChecklistDto>(
        `/api/v1/projects/${resolvedParams.id}/deployment-readiness`
      );
      if (gateRes.success && gateRes.data) {
        setReadinessGate(gateRes.data);
      }
      await fetchProjectMemory();
    } catch {
      // Handled
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectMemory = async () => {
    setLoadingMemory(true);
    try {
      const res = await apiClient.request<{ items: SolutionMemoryDto[]; total: number }>(
        `/api/v1/solutions?projectId=${resolvedParams.id}&limit=1`
      );
      if (res.success && res.data && res.data.items.length > 0) {
        setProjectMemory(res.data.items[0]);
      }
    } catch {
      // Ignore
    } finally {
      setLoadingMemory(false);
    }
  };

  const handleDraftMemory = async () => {
    setDraftingMemory(true);
    try {
      const res = await apiClient.request<SolutionMemoryDto>(
        `/api/v1/solutions/draft-from-project/${resolvedParams.id}`,
        { method: 'POST' }
      );
      if (res.success && res.data) {
        setProjectMemory(res.data);
        setStatusMessage({ type: 'success', text: 'Solution memory draft synthesized successfully.' });
      } else {
        setStatusMessage({ type: 'error', text: res.error?.message || 'Failed to synthesize draft.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setDraftingMemory(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [resolvedParams.id]);

  // Helper actions
  const handleActivate = async () => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await apiClient.request<any>(`/api/v1/projects/${resolvedParams.id}/activate`, { method: 'POST' });
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Project officially activated into execution!' });
        fetchProject();
      } else {
        setStatusMessage({ type: 'error', text: res.error?.message || 'Failed to activate project.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Prototype Actions
  const handleCreatePrototype = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!protoTitle || !protoTech) return;
    setActionLoading(true);
    try {
      const res = await apiClient.request<any>(`/api/v1/projects/${resolvedParams.id}/prototypes`, {
        method: 'POST',
        body: JSON.stringify({
          title: protoTitle,
          description: protoDesc,
          prototypeType: protoType,
          technicalApproach: protoTech,
          objectives: protoObjectives.split('\n').filter(Boolean),
        }),
      });
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Draft prototype version created successfully.' });
        setShowProtoModal(false);
        fetchProject();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitPrototype = async (prototypeId: string) => {
    setActionLoading(true);
    try {
      const res = await apiClient.request<any>(`/api/v1/prototypes/${prototypeId}/submit`, { method: 'POST' });
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Prototype version submitted for official review (now immutable).' });
        fetchProject();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReviewPrototype = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewProtoTarget) return;
    setActionLoading(true);
    try {
      const res = await apiClient.request<any>(`/api/v1/prototypes/${reviewProtoTarget.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          decision: protoReviewDecision,
          comments: protoReviewComments,
          requiredChanges: protoRequiredChanges.split('\n').filter(Boolean),
        }),
      });
      if (res.success) {
        setStatusMessage({ type: 'success', text: `Prototype review verdict: ${protoReviewDecision}` });
        setReviewProtoTarget(null);
        fetchProject();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Testing Actions
  const handleCreateTestPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testPlan) return;
    setActionLoading(true);
    try {
      const res = await apiClient.request<any>(`/api/v1/projects/${resolvedParams.id}/tests`, {
        method: 'POST',
        body: JSON.stringify({ testPlan }),
      });
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Testing execution plan established.' });
        setShowTestExecModal(false);
        fetchProject();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCaseModal || !caseTitle) return;
    setActionLoading(true);
    try {
      const res = await apiClient.request<any>(`/api/v1/tests/${showCaseModal}/cases`, {
        method: 'POST',
        body: JSON.stringify({
          title: caseTitle,
          description: caseDesc,
          expectedResult: caseExpected,
          severity: caseSeverity,
        }),
      });
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Test case added.' });
        setShowCaseModal(null);
        fetchProject();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExecuteTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!executeCaseTarget) return;
    setActionLoading(true);
    try {
      const res = await apiClient.request<any>(`/api/v1/test-cases/${executeCaseTarget.id}/execute`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: execStatus,
          actualResult: execActual,
          blockerReason: execBlockerReason,
          waiverJustification: execWaiverReason,
        }),
      });
      if (res.success) {
        setStatusMessage({ type: 'success', text: `Test case updated to ${execStatus}` });
        setExecuteCaseTarget(null);
        fetchProject();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetestCase = async (testCaseId: string) => {
    setActionLoading(true);
    try {
      const res = await apiClient.request<any>(`/api/v1/test-cases/${testCaseId}/retest`, { method: 'POST' });
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Retest case created for defect.' });
        fetchProject();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitTestExec = async (execId: string) => {
    setActionLoading(true);
    try {
      const res = await apiClient.request<any>(`/api/v1/tests/${execId}/submit`, { method: 'POST' });
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Test execution cycle finalized.' });
        fetchProject();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Pilot Actions
  const handleCreatePilot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pilotLocation || !pilotDistrict) return;
    setActionLoading(true);
    try {
      const res = await apiClient.request<any>(`/api/v1/projects/${resolvedParams.id}/pilots`, {
        method: 'POST',
        body: JSON.stringify({
          location: pilotLocation,
          district: pilotDistrict,
          state: pilotState,
          targetBeneficiaries: Number(pilotBeneficiaries),
          startDate: pilotStartDate || new Date().toISOString(),
          baselineMetrics: {},
        }),
      });
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Pilot program configured.' });
        setShowPilotModal(false);
        fetchProject();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRecordMetric = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordMetricTarget || !metricName) return;
    setActionLoading(true);
    try {
      const res = await apiClient.request<any>(`/api/v1/pilots/${recordMetricTarget}/metrics`, {
        method: 'POST',
        body: JSON.stringify({
          name: metricName,
          category: metricCategory,
          unit: metricUnit,
          baselineValue: Number(metricBaseline),
          targetValue: Number(metricTarget),
          observedValue: Number(metricObserved),
          method: metricMethod,
          source: metricSource,
          provenance: MetricProvenance.VERIFIED,
        }),
      });
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Pilot metric recorded with transparent before/after telemetry.' });
        setRecordMetricTarget(null);
        fetchProject();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Deployment Actions
  const handleCreateDeployment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deployTitle || !deployLocation) return;
    setActionLoading(true);
    try {
      const res = await apiClient.request<any>(`/api/v1/projects/${resolvedParams.id}/deployments`, {
        method: 'POST',
        body: JSON.stringify({
          title: deployTitle,
          location: deployLocation,
          scope: deployScope,
          beneficiariesCount: Number(deployBeneficiaries),
          infrastructure: deployInfra,
          responsibleTeam: deployTeam,
          deploymentOrg: project?.leadingOrgName || 'Assigned University & Govt Dept',
          deploymentDate: new Date().toISOString(),
        }),
      });
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Community deployment plan scheduled.' });
        setShowDeployModal(false);
        fetchProject();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateDeployStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deployStatusTarget) return;
    setActionLoading(true);
    try {
      const res = await apiClient.request<any>(`/api/v1/deployments/${deployStatusTarget.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: deployStatusNext,
          failureRootCause: deployFailureCause,
          rollbackReason: deployRollbackReason,
          operationalNotes: deployOpNotes,
        }),
      });
      if (res.success) {
        setStatusMessage({ type: 'success', text: `Deployment status updated to ${deployStatusNext}` });
        setDeployStatusTarget(null);
        fetchProject();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Outcome Verification Action
  const handleVerifyOutcome = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await apiClient.request<any>(`/api/v1/projects/${resolvedParams.id}/outcomes/verify`, {
        method: 'POST',
        body: JSON.stringify({
          status: outStatus,
          baselineSummary: outBaseline,
          targetSummary: outTarget,
          observedSummary: outObserved,
          followUpAction: outFollowUp,
          limitations: outMaintenanceIssues || undefined,
          notes: outLessonsLearned || undefined,
          targetAchieved: outTargetAchieved,
          successFactors: outSuccessFactors ? outSuccessFactors.split(',').map(s => s.trim()).filter(Boolean) : [],
          failureFactors: outFailureFactors ? outFailureFactors.split(',').map(s => s.trim()).filter(Boolean) : [],
          failureReason: outFailureReason || undefined,
          contextConditions: {
            ruralUrban: outContextRuralUrban,
            rainfall: outContextRainfall,
            maintenanceCapacity: outContextMaintenanceCapacity,
          },
        }),
      });
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Official outcome verification recorded (${outStatus}). Outcome recorded as learning for future similar problems.`,
        });
        setShowVerifyModal(false);
        fetchProject();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  // Innovation Outcome Action
  const handleRecordInnovation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!innTitle) return;
    setActionLoading(true);
    try {
      const res = await apiClient.request<any>(`/api/v1/projects/${resolvedParams.id}/innovation-outcomes`, {
        method: 'POST',
        body: JSON.stringify({
          outcomeType: innType,
          title: innTitle,
          description: innDesc,
          referenceIdentifier: innRef,
          verifiedBeneficiaries: Number(innBeneficiaries),
          measurableImpactSummary: innImpact,
          responsibleOrg: project?.leadingOrgName,
        }),
      });
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Innovation outcome logged successfully.' });
        setShowInnovationModal(false);
        fetchProject();
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !project) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="flex flex-col items-center gap-2">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            <p className="text-sm font-semibold text-slate-500">Loading Project Cockpit...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const cockpit = project.cockpit;
  const isGovReviewer = user?.role === UserRole.GOVERNMENT_OFFICER || user?.role === UserRole.SYSTEM_ADMIN;
  const isLeadTeam =
    user?.role === UserRole.FACULTY ||
    user?.role === UserRole.UNIVERSITY_ADMIN ||
    user?.role === UserRole.STUDENT ||
    user?.role === UserRole.SYSTEM_ADMIN;

  // Lifecycle steps calculation
  const lifecycleSteps = [
    { key: 'PROPOSAL', label: 'Solution Proposal', isDone: true },
    {
      key: 'PROTOTYPE',
      label: 'Prototype V' + (project.prototypes?.[0]?.version || 1),
      isDone: project.prototypes?.some(p => p.status === PrototypeStatus.APPROVED),
      isActive: project.status === ProjectStatus.PROTOTYPE,
    },
    {
      key: 'TESTING',
      label: 'Testing & Certification',
      isDone: project.testExecutions?.some(t => t.status === TestStatus.PASSED),
      isActive: project.status === ProjectStatus.TESTING,
    },
    {
      key: 'PILOT',
      label: 'Field Pilot',
      isDone: project.pilots?.some(p => p.status === PilotStatus.COMPLETED || p.status === PilotStatus.COMPLETED_WITH_ISSUES),
      isActive: project.status === ProjectStatus.PILOT,
    },
    {
      key: 'DEPLOYMENT',
      label: 'Community Deployment',
      isDone: project.deployments?.some(d => d.status === DeploymentStatus.DEPLOYED || d.status === DeploymentStatus.OPERATIONAL),
      isActive: project.status === ProjectStatus.DEPLOYMENT,
    },
    {
      key: 'VERIFIED',
      label: 'Outcome Verification',
      isDone: project.outcomeVerifications?.some(o => o.status === OutcomeVerificationStatus.VERIFIED),
      isActive: project.status === ProjectStatus.COMPLETED,
    },
  ];

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6 pb-12">
        {/* Standardized Elite Page Header */}
        <PageHeader
          title={project.title}
          description={project.description}
          portal="UNIVERSITY"
          status={project.status}
          breadcrumbs={[
            { label: 'University Portal', href: '/university' },
            { label: 'Projects', href: '/projects' },
            { label: `PROJECT-${project.id.slice(0, 8)}` },
          ]}
          action={
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  cockpit?.overallHealth === 'ON_TRACK'
                    ? 'success'
                    : cockpit?.overallHealth === 'AT_RISK'
                    ? 'warning'
                    : 'destructive'
                }
                className="px-3 py-1 font-bold text-xs"
              >
                <Activity className="w-3.5 h-3.5 mr-1" />
                HEALTH: {cockpit?.overallHealth || 'EVALUATING'} ({cockpit?.healthScore || 0}/100)
              </Badge>
              {project.status === ProjectStatus.ASSIGNED && (
                <Button
                  onClick={handleActivate}
                  disabled={actionLoading || !cockpit?.activationChecklist.canActivate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4"
                >
                  <Rocket className="w-3.5 h-3.5 mr-1.5" />
                  Activate Execution
                </Button>
              )}
            </div>
          }
        />

        {/* Global Alert Notification */}
        {statusMessage && (
          <Alert variant={statusMessage.type === 'success' ? 'success' : 'destructive'}>
            <span className="text-xs font-semibold">{statusMessage.text}</span>
          </Alert>
        )}

        {/* Project Header Banner */}
        <Card className="border-l-4 border-l-blue-600 shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold text-xs border-blue-200 dark:border-blue-800">
                    {project.leadingOrgName || 'Assigned University'}
                  </Badge>
                  <Link
                    href={`/challenges/${project.challengeId}`}
                    className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    View Root Challenge <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100">{project.title}</h1>
                <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl">{project.description}</p>
              </div>

              {/* Action Button: Activate if not active */}
              {project.status === ProjectStatus.ASSIGNED && (
                <Button
                  onClick={handleActivate}
                  disabled={actionLoading || !cockpit?.activationChecklist.canActivate}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Activate Project Execution
                </Button>
              )}
            </div>

            {/* Visual Lifecycle Stepper */}
            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                Lifecycle Progression Matrix
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
                {lifecycleSteps.map((step, idx) => (
                  <div
                    key={step.key}
                    className={`p-2.5 rounded-lg border text-center transition-all ${
                      step.isDone
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                        : step.isActive
                        ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-400 dark:border-blue-700 text-blue-900 dark:text-blue-200 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-center gap-1 mb-1">
                      {step.isDone ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      ) : step.isActive ? (
                        <Rocket className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 animate-pulse" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      )}
                      <span className="text-[10px] font-bold uppercase">{idx + 1}. Stage</span>
                    </div>
                    <p className="text-xs font-bold truncate">{step.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex flex-wrap items-center gap-1 border-b border-slate-200 dark:border-slate-800 pb-2">
          {[
            { id: 'overview', label: 'Overview & Health', icon: Activity },
            { id: 'prototype', label: 'Prototype Workspace', icon: FlaskConical, badge: project.prototypes?.length },
            { id: 'testing', label: 'Testing & Certification', icon: CheckCircle2, badge: project.testExecutions?.length },
            { id: 'pilot', label: 'Field Pilot & Metrics', icon: Compass, badge: project.pilots?.length },
            {
              id: 'deployment',
              label: 'Community Deployment',
              icon: Rocket,
              badge: readinessGate?.canDeploy ? 'READY' : undefined,
            },
            {
              id: 'outcomes',
              label: 'Citizen Verification & Outcomes',
              icon: Award,
              badge: project.citizenVerifications?.length,
            },
            { id: 'milestones', label: 'Milestones', icon: Clock, badge: cockpit?.totalMilestones },
            { id: 'risks', label: 'Risk Matrix', icon: ShieldAlert, badge: cockpit?.criticalRisksCount },
            { id: 'funding', label: 'Stage Funding', icon: DollarSign },
            { id: 'knowledge', label: 'Solution Memory', icon: BrainCircuit, badge: projectMemory ? 'SAVED' : undefined },
          ].map(tab => {
            const Icon = tab.icon;
            const isCurrent = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as CockpitTab)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isCurrent
                        ? 'bg-blue-500 text-white'
                        : tab.badge === 'READY'
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ========================================================= */}
        {/* TAB 1: OVERVIEW */}
        {/* ========================================================= */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {/* Health Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="w-4 h-4 text-blue-600" />
                    Overall Project Cockpit Health
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg border text-center">
                      <span className="block text-xl font-bold text-slate-800">{cockpit?.totalMilestones || 0}</span>
                      <span className="text-[11px] font-semibold text-slate-500">Total Milestones</span>
                    </div>
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                      <span className="block text-xl font-bold text-emerald-700">{cockpit?.completedMilestones || 0}</span>
                      <span className="text-[11px] font-semibold text-emerald-600">Completed</span>
                    </div>
                    <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
                      <span className="block text-xl font-bold text-amber-700">{cockpit?.blockedMilestones.length || 0}</span>
                      <span className="text-[11px] font-semibold text-amber-600">Blocked</span>
                    </div>
                    <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
                      <span className="block text-xl font-bold text-red-700">{cockpit?.criticalRisksCount || 0}</span>
                      <span className="text-[11px] font-semibold text-red-600">Critical Risks</span>
                    </div>
                  </div>

                  {cockpit?.remedialActions && cockpit.remedialActions.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Required Actions:</p>
                      {cockpit.remedialActions.map((action, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-lg border border-amber-300 bg-amber-50/50 flex items-center justify-between"
                        >
                          <div>
                            <p className="text-xs font-bold text-amber-900">{action.title}</p>
                            <p className="text-[11px] text-amber-700">{action.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Research Team Roster */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" />
                    Multidisciplinary Innovation Team
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg border border-blue-200 bg-blue-50/40 flex items-center justify-between">
                      <div>
                        <Badge variant="default" className="bg-blue-700 text-white font-bold text-[10px] mb-1">
                          LEAD FACULTY
                        </Badge>
                        <p className="text-sm font-bold text-slate-900">
                          {project.team?.leadFacultyName || 'Dr. Ramesh Kumar'}
                        </p>
                        <p className="text-xs text-slate-500">
                          Lead Faculty & Academic Researcher
                        </p>
                      </div>
                      <Badge variant="success" className="text-xs font-bold">
                        CONFIRMED
                      </Badge>
                    </div>

                    {project.team?.members && project.team.members.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {project.team.members.map(member => (
                          <div key={member.id} className="p-2.5 rounded-lg border bg-slate-50 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-800">{member.userName || 'Researcher'}</p>
                              <p className="text-[10px] text-slate-500 font-semibold">{member.roleInTeam}</p>
                            </div>
                            <Badge variant={member.invitationStatus === 'ACCEPTED' ? 'success' : 'secondary'} className="text-[10px]">
                              {member.invitationStatus}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar: Activation Prerequisites */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Rocket className="w-4 h-4 text-emerald-600" />
                    Authoritative Activation Gate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: '1. Officially Approved Challenge', isMet: cockpit?.activationChecklist.isChallengeApproved },
                    { label: '2. University Assignment Accepted', isMet: cockpit?.activationChecklist.isUniversityAccepted },
                    { label: '3. Multidisciplinary Team Formed', isMet: cockpit?.activationChecklist.hasValidTeam },
                    { label: '4. Lead Faculty Confirmed', isMet: cockpit?.activationChecklist.hasConfirmedLeadFaculty },
                    { label: '5. Solution Proposal Approved', isMet: cockpit?.activationChecklist.isProposalApproved },
                  ].map((req, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs p-2 rounded bg-slate-50 border">
                      <span className="font-semibold text-slate-700">{req.label}</span>
                      {req.isMet ? (
                        <span className="font-bold text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> PASSED
                        </span>
                      ) : (
                        <span className="font-bold text-amber-600 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> PENDING
                        </span>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: PROTOTYPE WORKSPACE */}
        {/* ========================================================= */}
        {activeTab === 'prototype' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <FlaskConical className="w-5 h-5 text-blue-600" />
                  Solution Prototypes & Immutable Version History
                </h2>
                <p className="text-xs text-slate-500">
                  Manage engineering prototypes, technical blueprints, and government review revisions.
                </p>
              </div>

              {isLeadTeam && (
                <Button onClick={() => setShowProtoModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs">
                  <Plus className="w-4 h-4 mr-1.5" /> Create Prototype Version
                </Button>
              )}
            </div>

            {(!project.prototypes || project.prototypes.length === 0) ? (
              <Card className="text-center p-8">
                <FlaskConical className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No Prototypes Created Yet</p>
                <p className="text-xs text-slate-500 mb-4">Draft the first prototype version to begin technical testing.</p>
                {isLeadTeam && (
                  <Button onClick={() => setShowProtoModal(true)} className="bg-blue-600 text-white font-bold text-xs mx-auto">
                    Draft Prototype V1
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-4">
                {project.prototypes.map(proto => (
                  <Card key={proto.id} className="border shadow-sm">
                    <CardHeader className="bg-slate-50/60 pb-3 border-b border-slate-100">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="bg-purple-700 text-white font-bold">
                            VERSION {proto.version}
                          </Badge>
                          <span className="text-sm font-bold text-slate-900">{proto.title}</span>
                          <Badge variant="outline" className="text-[10px] font-semibold">
                            {proto.prototypeType}
                          </Badge>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              proto.status === PrototypeStatus.APPROVED
                                ? 'success'
                                : proto.status === PrototypeStatus.REVISION_REQUESTED
                                ? 'warning'
                                : proto.status === PrototypeStatus.REJECTED
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="font-bold text-xs"
                          >
                            {proto.status}
                          </Badge>

                          {/* Submit Action */}
                          {proto.status === PrototypeStatus.DRAFT && isLeadTeam && (
                            <Button
                              onClick={() => handleSubmitPrototype(proto.id)}
                              disabled={actionLoading}
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                            >
                              <Send className="w-3.5 h-3.5 mr-1" /> Submit for Review
                            </Button>
                          )}

                          {/* Gov Review Action */}
                          {proto.status === PrototypeStatus.SUBMITTED && isGovReviewer && (
                            <Button
                              onClick={() => setReviewProtoTarget(proto)}
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                            >
                              Official Review
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3 text-xs">
                      <div>
                        <span className="font-bold text-slate-700 uppercase">Technical Approach:</span>
                        <p className="text-slate-600 mt-0.5">{proto.technicalApproach}</p>
                      </div>

                      {proto.objectives && proto.objectives.length > 0 && (
                        <div>
                          <span className="font-bold text-slate-700 uppercase">Engineering Objectives:</span>
                          <ul className="list-disc list-inside text-slate-600 mt-0.5 space-y-0.5">
                            {proto.objectives.map((obj, i) => (
                              <li key={i}>{obj}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Zero Dead End Notice for Revision / Rejection */}
                      {(proto.status === PrototypeStatus.REVISION_REQUESTED || proto.status === PrototypeStatus.REJECTED) && (
                        <ZeroDeadEndNotice
                          currentStatus={proto.status}
                          whatHappened={`Government review issued ${proto.status}. Feedback: ${proto.reviewComments || 'Revisions required'}`}
                          whyStatus={
                            proto.requiredChanges && proto.requiredChanges.length > 0
                              ? `Required Changes: ${proto.requiredChanges.join(', ')}`
                              : 'Mandatory technical changes identified by review authority.'
                          }
                          whatCanDoNext={[`Revise technical parameters and generate Prototype V${proto.version + 1}`]}
                          whoIsResponsible="University Research Team & Lead Faculty"
                          whatHappensIfIdle="Testing and pilot deployment remain locked until prototype receives approval."
                          variant={proto.status === PrototypeStatus.REJECTED ? 'error' : 'warning'}
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: TESTING WORKSPACE */}
        {/* ========================================================= */}
        {activeTab === 'testing' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Structured Testing & Quality Certification
                </h2>
                <p className="text-xs text-slate-500">
                  Execute test protocols, track failure defects, authorize waivers, and link retests with zero dead ends.
                </p>
              </div>

              {isLeadTeam && (
                <Button onClick={() => setShowTestExecModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                  <Plus className="w-4 h-4 mr-1.5" /> Create Test Execution Plan
                </Button>
              )}
            </div>

            {(!project.testExecutions || project.testExecutions.length === 0) ? (
              <Card className="text-center p-8">
                <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No Test Plans Created Yet</p>
                <p className="text-xs text-slate-500 mb-4">Establish structured test cases to evaluate the solution prototype.</p>
                {isLeadTeam && (
                  <Button onClick={() => setShowTestExecModal(true)} className="bg-emerald-600 text-white font-bold text-xs mx-auto">
                    New Test Plan
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-6">
                {project.testExecutions.map(exec => (
                  <Card key={exec.id} className="border shadow-sm">
                    <CardHeader className="bg-slate-50/60 pb-3 border-b border-slate-100">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="font-bold text-xs">
                              ITERATION #{exec.iterationNumber}
                            </Badge>
                            <span className="text-sm font-bold text-slate-900">{exec.testPlan}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">{exec.resultsSummary}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              exec.status === TestStatus.PASSED
                                ? 'success'
                                : exec.status === TestStatus.FAILED
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="font-bold text-xs"
                          >
                            {exec.status} (Pass Rate: {exec.passRate}%)
                          </Badge>

                          {isLeadTeam && (
                            <>
                              <Button
                                onClick={() => setShowCaseModal(exec.id)}
                                size="sm"
                                variant="outline"
                                className="text-xs font-bold"
                              >
                                <Plus className="w-3.5 h-3.5 mr-1" /> Add Case
                              </Button>

                              {exec.status !== TestStatus.PASSED && (
                                <Button
                                  onClick={() => handleSubmitTestExec(exec.id)}
                                  size="sm"
                                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold"
                                >
                                  Submit Execution
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4">
                      {(!exec.testCasesList || exec.testCasesList.length === 0) ? (
                        <p className="text-xs text-slate-500 italic py-2">No test cases registered for this plan yet.</p>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b text-slate-400 uppercase text-[10px]">
                                <th className="pb-2">Test Case</th>
                                <th className="pb-2">Expected Result</th>
                                <th className="pb-2">Severity</th>
                                <th className="pb-2">Status</th>
                                <th className="pb-2">Defect / Blocker</th>
                                <th className="pb-2 text-right">Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {exec.testCasesList.map(tc => (
                                <tr key={tc.id} className="hover:bg-slate-50/50">
                                  <td className="py-2.5 font-bold text-slate-800">{tc.title}</td>
                                  <td className="py-2.5 text-slate-600">{tc.expectedResult}</td>
                                  <td className="py-2.5">
                                    <Badge variant="outline" className="text-[10px]">
                                      {tc.severity}
                                    </Badge>
                                  </td>
                                  <td className="py-2.5">
                                    <Badge
                                      variant={
                                        tc.status === TestCaseStatus.PASSED
                                          ? 'success'
                                          : tc.status === TestCaseStatus.FAILED
                                          ? 'destructive'
                                          : tc.status === TestCaseStatus.BLOCKED
                                          ? 'warning'
                                          : 'secondary'
                                      }
                                      className="text-[10px] font-bold"
                                    >
                                      {tc.status}
                                    </Badge>
                                  </td>
                                  <td className="py-2.5 text-slate-500 font-mono text-[11px]">
                                    {tc.defectReference || tc.blockerReason || '—'}
                                  </td>
                                  <td className="py-2.5 text-right space-x-2">
                                    <Button
                                      onClick={() => setExecuteCaseTarget(tc)}
                                      size="sm"
                                      variant="outline"
                                      className="text-[10px] h-6 px-2"
                                    >
                                      Execute
                                    </Button>
                                    {tc.status === TestCaseStatus.FAILED && (
                                      <Button
                                        onClick={() => handleRetestCase(tc.id)}
                                        size="sm"
                                        className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] h-6 px-2"
                                      >
                                        Retest Defect
                                      </Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: PILOT WORKSPACE */}
        {/* ========================================================= */}
        {activeTab === 'pilot' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Compass className="w-5 h-5 text-indigo-600" />
                  Field Pilot Deployments & Measurable Impact Indicators
                </h2>
                <p className="text-xs text-slate-500">
                  Track field deployments with honest before/after baseline comparisons and data provenance indicators.
                </p>
              </div>

              {isLeadTeam && (
                <Button onClick={() => setShowPilotModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs">
                  <Plus className="w-4 h-4 mr-1.5" /> Setup Field Pilot
                </Button>
              )}
            </div>

            {(!project.pilots || project.pilots.length === 0) ? (
              <Card className="text-center p-8">
                <Compass className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No Pilot Program Established</p>
                <p className="text-xs text-slate-500 mb-4">Set up a field pilot in a targeted geographic community.</p>
                {isLeadTeam && (
                  <Button onClick={() => setShowPilotModal(true)} className="bg-indigo-600 text-white font-bold text-xs mx-auto">
                    Configure Pilot
                  </Button>
                )}
              </Card>
            ) : (
              <div className="space-y-6">
                {project.pilots.map(pilot => (
                  <Card key={pilot.id} className="border shadow-sm">
                    <CardHeader className="bg-slate-50/60 pb-3 border-b border-slate-100">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default" className="bg-indigo-600 text-white font-bold text-xs">
                              {pilot.district}, {pilot.state}
                            </Badge>
                            <span className="text-sm font-bold text-slate-900">{pilot.location}</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Target Beneficiaries: <strong>{pilot.targetBeneficiaries.toLocaleString()}</strong> | Started:{' '}
                            {new Date(pilot.startDate).toLocaleDateString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-bold text-xs">
                            STATUS: {pilot.status}
                          </Badge>
                          <Button
                            onClick={() => setRecordMetricTarget(pilot.id)}
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                          >
                            <Plus className="w-3.5 h-3.5 mr-1" /> Record Metric
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4">
                      {(!pilot.metricsList || pilot.metricsList.length === 0) ? (
                        <p className="text-xs text-slate-500 italic py-2">
                          No measurable outcome metrics recorded yet for this pilot.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {pilot.metricsList.map(m => (
                            <div key={m.id} className="p-3 rounded-lg border bg-white shadow-xs space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">{m.name}</span>
                                <Badge variant="outline" className="text-[10px] bg-emerald-50 text-emerald-800">
                                  {m.provenance}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-3 gap-2 text-center py-1 bg-slate-50 rounded">
                                <div>
                                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Baseline</span>
                                  <span className="text-xs font-mono font-bold text-slate-600">
                                    {m.baselineValue} {m.unit}
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Target</span>
                                  <span className="text-xs font-mono font-bold text-blue-600">
                                    {m.targetValue} {m.unit}
                                  </span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-slate-400 font-bold uppercase">Observed</span>
                                  <span className="text-xs font-mono font-bold text-emerald-600">
                                    {m.observedValue ?? '—'} {m.unit}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center justify-between text-[11px] pt-1">
                                <span className="text-slate-500">
                                  Abs. Change: <strong>{m.absoluteChange !== null ? `+${m.absoluteChange}` : '—'}</strong>
                                </span>
                                <span className="font-bold text-emerald-700">
                                  {m.percentageChange !== null ? `+${m.percentageChange}%` : 'N/A'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: DEPLOYMENT WORKSPACE */}
        {/* ========================================================= */}
        {activeTab === 'deployment' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Rocket className="w-5 h-5 text-blue-600" />
                  Authoritative Deployment Readiness Gate & Rollout
                </h2>
                <p className="text-xs text-slate-500">
                  Strict 8-point readiness gate verification before community deployment execution.
                </p>
              </div>

              {readinessGate?.canDeploy && (
                <Button onClick={() => setShowDeployModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs">
                  <Rocket className="w-4 h-4 mr-1.5" /> Deploy to Community
                </Button>
              )}
            </div>

            {/* 8-Point Readiness Gate Widget */}
            <Card className={readinessGate?.canDeploy ? 'border-emerald-300 bg-emerald-50/20' : 'border-amber-300 bg-amber-50/20'}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>8-Point Authoritative Readiness Checklist</span>
                  <Badge variant={readinessGate?.canDeploy ? 'success' : 'destructive'} className="font-bold">
                    {readinessGate?.canDeploy ? 'ALL CONDITIONS SATISFIED' : `${readinessGate?.blockingCount} CONDITIONS BLOCKING`}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {readinessGate?.conditions.map((cond, i) => (
                  <div key={i} className="p-2.5 rounded-lg border bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        {cond.isMet ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                        )}
                        <span className="font-bold text-slate-900">{cond.requirement}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {cond.requirementType}
                        </Badge>
                      </div>
                      <p className="text-slate-500 pl-6">Current: {cond.currentValue}</p>
                    </div>

                    {!cond.isMet && (
                      <div className="text-right pl-6 sm:pl-0">
                        <span className="text-[11px] font-bold text-red-700 block">{cond.suggestedAction}</span>
                        <span className="text-[10px] text-slate-400">Owner: {cond.responsibleActor}</span>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Scheduled Deployments */}
            {project.deployments && project.deployments.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Active Community Deployments</h3>
                {project.deployments.map(d => (
                  <Card key={d.id} className="border shadow-sm">
                    <CardHeader className="bg-slate-50/60 pb-3 border-b border-slate-100">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="text-sm font-bold text-slate-900">{d.title}</span>
                          <p className="text-xs text-slate-500">
                            Location: {d.location} | Beneficiaries: <strong>{d.beneficiariesCount.toLocaleString()}</strong>
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="font-bold text-xs">
                            {d.status}
                          </Badge>
                          {isGovReviewer && (
                            <Button
                              onClick={() => setDeployStatusTarget(d)}
                              size="sm"
                              variant="outline"
                              className="text-xs font-bold"
                            >
                              Update Status
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 text-xs space-y-2">
                      <p className="text-slate-600">
                        <strong>Infrastructure:</strong> {d.infrastructure}
                      </p>
                      <p className="text-slate-600">
                        <strong>Responsible Team:</strong> {d.responsibleTeam}
                      </p>

                      {d.status === DeploymentStatus.FAILED && (
                        <ZeroDeadEndNotice
                          currentStatus={d.status}
                          whatHappened={`Deployment failed: ${d.failureRootCause || 'Unresolved failure'}`}
                          whyStatus="Equipment or operational obstacle encountered in the field."
                          whatCanDoNext={['Conduct technical root-cause analysis and retry rollout', 'Request municipal field assistance']}
                          whoIsResponsible={d.responsibleTeam}
                          whatHappensIfIdle="Beneficiaries remain without operational service."
                          variant="error"
                        />
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 6: OUTCOMES & CITIZEN FEEDBACK WORKSPACE */}
        {/* ========================================================= */}
        {activeTab === 'outcomes' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-600" />
                  Citizen Outcome Verification & Innovation Tracking
                </h2>
                <p className="text-xs text-slate-500">
                  Review direct citizen feedback, register patents, and obtain official government outcome verification.
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isLeadTeam && (
                  <Button
                    onClick={() => setShowInnovationModal(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" /> Record Innovation Outcome
                  </Button>
                )}

                {isGovReviewer && (
                  <Button
                    onClick={() => setShowVerifyModal(true)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Official Outcome Verification
                  </Button>
                )}
              </div>
            </div>

            {/* Official Verification Status Card */}
            {project.outcomeVerifications && project.outcomeVerifications.length > 0 && (
              <Card className="border-l-4 border-l-emerald-600 bg-emerald-50/20">
                <CardContent className="p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-emerald-900">
                      Official Verification: {project.outcomeVerifications[0].status}
                    </span>
                    <span className="text-[11px] text-slate-500 font-mono">
                      Verified by {project.outcomeVerifications[0].reviewerName || 'Government Officer'}
                    </span>
                  </div>
                  <p className="text-slate-700">
                    <strong>Observed Outcome:</strong> {project.outcomeVerifications[0].observedSummary}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Recorded Innovation Outcomes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Institutional Innovation Outcomes (Patents, Publications, Startups)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(!project.innovationOutcomes || project.innovationOutcomes.length === 0) ? (
                  <p className="text-xs text-slate-500 italic py-2">
                    No intellectual property or innovation outcomes recorded yet.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project.innovationOutcomes.map(inn => (
                      <div key={inn.id} className="p-3.5 rounded-lg border bg-white shadow-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Badge variant="default" className="bg-amber-600 text-white font-bold text-[10px]">
                            {inn.outcomeType}
                          </Badge>
                          <span className="text-[10px] font-mono text-slate-400">{inn.referenceIdentifier || '—'}</span>
                        </div>
                        <p className="text-sm font-bold text-slate-900">{inn.title}</p>
                        <p className="text-xs text-slate-600">{inn.measurableImpactSummary}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Citizen Feedback Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <ThumbsUp className="w-4 h-4 text-blue-600" />
                  Community & Citizen Feedback Stream
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(!project.citizenVerifications || project.citizenVerifications.length === 0) ? (
                  <p className="text-xs text-slate-500 italic py-2">
                    No citizen feedback has been submitted yet for this deployed solution.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {project.citizenVerifications.map(fb => (
                      <div key={fb.id} className="p-3 rounded-lg border bg-slate-50/50 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-900">{fb.citizenName || 'Citizen'}</span>
                            <Badge variant={fb.verifiedImprovement ? 'success' : 'destructive'} className="text-[10px]">
                              {fb.problemStatus || (fb.verifiedImprovement ? 'IMPROVED' : 'PERSISTS')}
                            </Badge>
                          </div>
                          <span className="font-bold text-amber-600">{'★'.repeat(fb.rating)} ({fb.rating}/5)</span>
                        </div>
                        <p className="text-slate-700">{fb.comments}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 7: MILESTONES */}
        {/* ========================================================= */}
        {activeTab === 'milestones' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Project Milestones & Deliverables</h2>
              {isLeadTeam && (
                <Button onClick={() => setShowMilestoneModal(true)} className="bg-blue-600 text-white font-bold text-xs">
                  <Plus className="w-4 h-4 mr-1" /> Add Milestone
                </Button>
              )}
            </div>

            {project.milestones && project.milestones.length > 0 ? (
              <div className="space-y-3">
                {project.milestones.map(ms => (
                  <div key={ms.id} className="p-4 rounded-lg border bg-white flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-sm text-slate-900">{ms.title}</p>
                      <p className="text-slate-500">{ms.description}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Deadline: {new Date(ms.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant={ms.status === 'APPROVED' ? 'success' : 'secondary'}>{ms.status}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="text-center p-8">
                <p className="text-xs text-slate-500">No milestones recorded.</p>
              </Card>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 8: RISKS */}
        {/* ========================================================= */}
        {activeTab === 'risks' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-900">Project Risk Health Matrix</h2>
              {isLeadTeam && (
                <Button onClick={() => setShowRiskModal(true)} className="bg-blue-600 text-white font-bold text-xs">
                  <Plus className="w-4 h-4 mr-1" /> Log Risk
                </Button>
              )}
            </div>

            {project.risks && project.risks.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {project.risks.map(r => (
                  <div key={r.id} className="p-3.5 rounded-lg border bg-white space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sm text-slate-900">{r.title}</span>
                      <Badge variant={r.severity === RiskSeverity.CRITICAL ? 'destructive' : 'warning'}>
                        {r.severity}
                      </Badge>
                    </div>
                    <p className="text-slate-600">Impact: {r.impact}</p>
                    <p className="text-slate-700 bg-slate-50 p-2 rounded">
                      <strong>Mitigation:</strong> {r.mitigation}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="text-center p-8">
                <p className="text-xs text-slate-500">No risks recorded.</p>
              </Card>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 9: FUNDING */}
        {/* ========================================================= */}
        {activeTab === 'funding' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-slate-900">Stage Funding & Resource Allocations</h2>
            {project.fundingRequests && project.fundingRequests.length > 0 ? (
              <div className="space-y-3">
                {project.fundingRequests.map(fr => (
                  <div key={fr.id} className="p-4 rounded-lg border bg-white flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-sm text-slate-900">Stage: {fr.stage}</p>
                      <p className="text-slate-500">{fr.justification}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-sm text-slate-900">₹{Number(fr.totalAmount).toLocaleString()}</p>
                      <Badge variant="outline">{fr.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card className="text-center p-8">
                <p className="text-xs text-slate-500">No funding requests logged.</p>
              </Card>
            )}
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 10: SOLUTION MEMORY & INSTITUTIONAL LEARNING */}
        {/* ========================================================= */}
        {activeTab === 'knowledge' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-blue-600" />
                  Institutional Solution Memory & Learning Cockpit
                </h2>
                <p className="text-xs text-slate-600">
                  Synthesize and preserve what worked, what failed, operational constraints, and reusability for future statewide deployments.
                </p>
              </div>

              {!projectMemory && ['DEPLOYMENT', 'COMPLETED', 'PILOT'].includes(project.status) && (
                <Button
                  onClick={handleDraftMemory}
                  disabled={draftingMemory}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shrink-0 flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" />
                  {draftingMemory ? 'Synthesizing Draft...' : 'Synthesize Solution Memory Draft'}
                </Button>
              )}
            </div>

            {loadingMemory ? (
              <div className="py-12 text-center text-xs text-slate-500">
                Loading project solution memory record...
              </div>
            ) : projectMemory ? (
              <div className="space-y-4">
                <Card className="border-blue-200 bg-gradient-to-r from-blue-50/40 to-indigo-50/30">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{projectMemory.challengeCategory}</Badge>
                          <Badge variant={projectMemory.status === 'PUBLISHED' ? 'success' : 'warning'}>
                            {projectMemory.status}
                          </Badge>
                          <Badge variant="outline">{projectMemory.reusabilityClass.replace(/_/g, ' ')}</Badge>
                        </div>
                        <CardTitle className="text-base font-bold text-slate-900">{projectMemory.title}</CardTitle>
                      </div>
                      <Link href={`/solutions/${projectMemory.id}`}>
                        <Button size="sm" variant="outline" className="text-xs shrink-0">
                          <span>View Full Case Study</span>
                          <ExternalLink className="w-3.5 h-3.5 ml-1" />
                        </Button>
                      </Link>
                    </div>
                    <CardDescription className="text-xs text-slate-600 mt-1">
                      {projectMemory.summary}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 text-xs">
                    {/* Reusability Index */}
                    <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between">
                      <div>
                        <span className="font-semibold text-slate-500 block text-[11px] uppercase">
                          Reusability Score
                        </span>
                        <span className="font-bold text-slate-900 text-lg">
                          {projectMemory.reusabilityScore || 50} / 100
                        </span>
                      </div>
                      <Badge variant="default">{projectMemory.evidenceLevel}</Badge>
                    </div>

                    {/* What Worked & What Failed */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-1">
                        <span className="font-bold text-emerald-800 uppercase tracking-wider text-[11px]">
                          What Worked
                        </span>
                        <p className="text-slate-700">{projectMemory.whatWorked || 'Documented field success.'}</p>
                      </div>

                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-1">
                        <span className="font-bold text-amber-800 uppercase tracking-wider text-[11px]">
                          What Failed & Precedent Warnings
                        </span>
                        <p className="text-slate-700">
                          {projectMemory.futureWarnings || projectMemory.whatFailed || 'No critical failure modes recorded.'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="text-center p-12 border-dashed border-2">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">No Solution Memory Draft Synthesized Yet</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
                  Once your multidisciplinary team achieves field deployment or outcome verification, you can generate an AI Solution Memory draft that records your engineering approach and failure lessons for future innovators.
                </p>
                {['DEPLOYMENT', 'COMPLETED', 'PILOT'].includes(project.status) ? (
                  <Button
                    onClick={handleDraftMemory}
                    disabled={draftingMemory}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                  >
                    <Sparkles className="w-4 h-4 mr-1.5" />
                    {draftingMemory ? 'Synthesizing...' : 'Synthesize Draft Now'}
                  </Button>
                ) : (
                  <Badge variant="secondary">Available in Pilot / Deployment Stages</Badge>
                )}
              </Card>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* MODALS */}
      {/* ========================================================= */}

      {/* Prototype Modal */}
      {showProtoModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-base">Draft Prototype Version</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePrototype} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Title</label>
                  <Input value={protoTitle} onChange={e => setProtoTitle(e.target.value)} required />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Technical Approach</label>
                  <Textarea value={protoTech} onChange={e => setProtoTech(e.target.value)} required />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Objectives (one per line)</label>
                  <Textarea value={protoObjectives} onChange={e => setProtoObjectives(e.target.value)} />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowProtoModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={actionLoading} className="bg-blue-600 text-white">
                    Create
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Prototype Review Modal */}
      {reviewProtoTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-base">Official Prototype Review</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReviewPrototype} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Decision</label>
                  <select
                    value={protoReviewDecision}
                    onChange={e => setProtoReviewDecision(e.target.value as any)}
                    className="w-full border rounded p-2"
                  >
                    <option value="APPROVE">APPROVE (Advance towards testing)</option>
                    <option value="REQUEST_REVISION">REQUEST_REVISION (Requires specific changes)</option>
                    <option value="REJECT">REJECT (Mandatory justification)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Review Comments</label>
                  <Textarea value={protoReviewComments} onChange={e => setProtoReviewComments(e.target.value)} required />
                </div>
                {protoReviewDecision === 'REQUEST_REVISION' && (
                  <div>
                    <label className="font-semibold block mb-1">Required Changes (one per line)</label>
                    <Textarea value={protoRequiredChanges} onChange={e => setProtoRequiredChanges(e.target.value)} required />
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setReviewProtoTarget(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={actionLoading} className="bg-blue-600 text-white">
                    Submit Verdict
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test Execution Modal */}
      {showTestExecModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-base">Create Test Execution Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateTestPlan} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Test Plan Protocol Name</label>
                  <Input value={testPlan} onChange={e => setTestPlan(e.target.value)} required />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowTestExecModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={actionLoading} className="bg-emerald-600 text-white">
                    Establish Plan
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Test Case Modal */}
      {showCaseModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-base">Add Test Case</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddTestCase} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Title</label>
                  <Input value={caseTitle} onChange={e => setCaseTitle(e.target.value)} required />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Expected Result</label>
                  <Textarea value={caseExpected} onChange={e => setCaseExpected(e.target.value)} required />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowCaseModal(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={actionLoading} className="bg-emerald-600 text-white">
                    Add Case
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Execute Test Case Modal */}
      {executeCaseTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-base">Execute: {executeCaseTarget.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleExecuteTestCase} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Status</label>
                  <select
                    value={execStatus}
                    onChange={e => setExecStatus(e.target.value as any)}
                    className="w-full border rounded p-2"
                  >
                    <option value="PASSED">PASSED</option>
                    <option value="FAILED">FAILED (Defect created)</option>
                    <option value="BLOCKED">BLOCKED (Mandatory reason)</option>
                    <option value="WAIVED">WAIVED (Mandatory waiver justification)</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Observed Result</label>
                  <Textarea value={execActual} onChange={e => setExecActual(e.target.value)} />
                </div>
                {execStatus === 'BLOCKED' && (
                  <div>
                    <label className="font-semibold block mb-1 text-red-600">Blocker Reason</label>
                    <Input value={execBlockerReason} onChange={e => setExecBlockerReason(e.target.value)} required />
                  </div>
                )}
                {execStatus === 'WAIVED' && (
                  <div>
                    <label className="font-semibold block mb-1 text-amber-600">Waiver Justification</label>
                    <Input value={execWaiverReason} onChange={e => setExecWaiverReason(e.target.value)} required />
                  </div>
                )}
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setExecuteCaseTarget(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={actionLoading} className="bg-emerald-600 text-white">
                    Save Verdict
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pilot Modal */}
      {showPilotModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-base">Configure Field Pilot</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreatePilot} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Target Community / Ward</label>
                  <Input value={pilotLocation} onChange={e => setPilotLocation(e.target.value)} required />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold block mb-1">District</label>
                    <Input value={pilotDistrict} onChange={e => setPilotDistrict(e.target.value)} required />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">State</label>
                    <Input value={pilotState} onChange={e => setPilotState(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Target Beneficiaries</label>
                  <Input value={pilotBeneficiaries} onChange={e => setPilotBeneficiaries(e.target.value)} required />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowPilotModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={actionLoading} className="bg-indigo-600 text-white">
                    Setup Pilot
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Record Metric Modal */}
      {recordMetricTarget && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-base">Record Pilot Metric</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRecordMetric} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Metric Indicator Name</label>
                  <Input value={metricName} onChange={e => setMetricName(e.target.value)} required />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="font-semibold block mb-1">Baseline</label>
                    <Input value={metricBaseline} onChange={e => setMetricBaseline(e.target.value)} required />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Target</label>
                    <Input value={metricTarget} onChange={e => setMetricTarget(e.target.value)} required />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Observed</label>
                    <Input value={metricObserved} onChange={e => setMetricObserved(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Unit of Measure</label>
                  <Input value={metricUnit} onChange={e => setMetricUnit(e.target.value)} required />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setRecordMetricTarget(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={actionLoading} className="bg-indigo-600 text-white">
                    Save Telemetry
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Deployment Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-base">Deploy to Community</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateDeployment} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Deployment Initiative Title</label>
                  <Input value={deployTitle} onChange={e => setDeployTitle(e.target.value)} required />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Location Details</label>
                  <Input value={deployLocation} onChange={e => setDeployLocation(e.target.value)} required />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Target Beneficiaries</label>
                  <Input value={deployBeneficiaries} onChange={e => setDeployBeneficiaries(e.target.value)} required />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Infrastructure</label>
                  <Input value={deployInfra} onChange={e => setDeployInfra(e.target.value)} required />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowDeployModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={actionLoading} className="bg-emerald-600 text-white">
                    Schedule Rollout
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Outcome Verification Modal */}
      {showVerifyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <BrainCircuit className="w-5 h-5 text-indigo-600" />
                <div>
                  <CardTitle className="text-base font-bold text-slate-900">
                    Official Government Outcome Verification
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500">
                    Verifies field outcome and stores structured learning into the AI Solution Memory loop.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <form onSubmit={handleVerifyOutcome} className="space-y-4 text-xs">
                <div>
                  <label className="font-semibold block mb-1 text-slate-700">Verdict Status</label>
                  <select
                    value={outStatus}
                    onChange={e => setOutStatus(e.target.value as any)}
                    className="w-full border border-slate-300 rounded-lg p-2 text-xs font-medium"
                  >
                    <option value="VERIFIED">VERIFIED (Resolves challenge, marks project completed, tags Worked Before — Recommend)</option>
                    <option value="VERIFIED_WITH_LIMITATIONS">VERIFIED_WITH_LIMITATIONS (Tags Mixed Results — Caution)</option>
                    <option value="NOT_VERIFIED">NOT_VERIFIED (Tags Failed Before — Warn)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-slate-700">Observed Outcome Summary</label>
                  <Textarea
                    value={outObserved}
                    onChange={e => setOutObserved(e.target.value)}
                    placeholder="Describe field inspection observations, metric changes, and community impact..."
                    className="text-xs min-h-[60px]"
                    required
                  />
                </div>

                {outStatus === 'NOT_VERIFIED' && (
                  <div>
                    <label className="font-semibold block mb-1 text-rose-700">
                      Mandatory Follow-up Action Plan
                    </label>
                    <Input
                      value={outFollowUp}
                      onChange={e => setOutFollowUp(e.target.value)}
                      placeholder="Required remediation steps to prevent zero dead ends..."
                      className="border-rose-300 text-xs"
                      required
                    />
                  </div>
                )}

                {/* Structured Institutional Learning Section */}
                <div className="p-3 bg-indigo-50/50 border border-indigo-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-950 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Structured AI Solution Memory Learning
                    </span>
                    <label className="flex items-center gap-1.5 text-indigo-900 font-semibold cursor-pointer">
                      <input
                        type="checkbox"
                        checked={outTargetAchieved}
                        onChange={e => setOutTargetAchieved(e.target.checked)}
                        className="rounded border-indigo-300 text-indigo-600"
                      />
                      <span>Target Achieved</span>
                    </label>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1 text-slate-700">
                      Success Factors (comma-separated)
                    </label>
                    <Input
                      value={outSuccessFactors}
                      onChange={e => setOutSuccessFactors(e.target.value)}
                      placeholder="e.g. Community buy-in, regular silt clearance, high rainfall"
                      className="text-xs bg-white"
                    />
                  </div>

                  {(outStatus === 'NOT_VERIFIED' || outStatus === 'VERIFIED_WITH_LIMITATIONS') && (
                    <>
                      <div>
                        <label className="font-semibold block mb-1 text-slate-700">
                          Failure / Degradation Factors (comma-separated)
                        </label>
                        <Input
                          value={outFailureFactors}
                          onChange={e => setOutFailureFactors(e.target.value)}
                          placeholder="e.g. Unmonitored runoff, delayed pump servicing, power fluctuation"
                          className="text-xs bg-white"
                        />
                      </div>
                      <div>
                        <label className="font-semibold block mb-1 text-rose-700">
                          Precedent Failure Reason (stored for future WARN alerts)
                        </label>
                        <Input
                          value={outFailureReason}
                          onChange={e => setOutFailureReason(e.target.value)}
                          placeholder="Why did this intervention fail or face severe constraints?"
                          className="text-xs bg-white border-rose-300"
                        />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="font-semibold block mb-1 text-slate-700">
                      Maintenance & Operational Constraints
                    </label>
                    <Input
                      value={outMaintenanceIssues}
                      onChange={e => setOutMaintenanceIssues(e.target.value)}
                      placeholder="e.g. Scheduled quarterly desilting required; unmonitored sites fail"
                      className="text-xs bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1 text-slate-700">
                      Lessons Learned for Future Replications
                    </label>
                    <Textarea
                      value={outLessonsLearned}
                      onChange={e => setOutLessonsLearned(e.target.value)}
                      placeholder="Key guidance for municipal and research teams considering replicating this approach..."
                      className="text-xs min-h-[50px] bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="font-semibold block mb-1 text-[11px] text-slate-700">Environment</label>
                      <select
                        value={outContextRuralUrban}
                        onChange={e => setOutContextRuralUrban(e.target.value as any)}
                        className="w-full border border-slate-300 rounded p-1.5 text-xs bg-white"
                      >
                        <option value="RURAL">Rural</option>
                        <option value="URBAN">Urban</option>
                        <option value="SEMI_URBAN">Semi-Urban</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold block mb-1 text-[11px] text-slate-700">Rainfall</label>
                      <select
                        value={outContextRainfall}
                        onChange={e => setOutContextRainfall(e.target.value as any)}
                        className="w-full border border-slate-300 rounded p-1.5 text-xs bg-white"
                      >
                        <option value="HIGH">High</option>
                        <option value="MODERATE">Moderate</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="font-semibold block mb-1 text-[11px] text-slate-700">Maintenance Cap.</label>
                      <select
                        value={outContextMaintenanceCapacity}
                        onChange={e => setOutContextMaintenanceCapacity(e.target.value as any)}
                        className="w-full border border-slate-300 rounded p-1.5 text-xs bg-white"
                      >
                        <option value="HIGH">High</option>
                        <option value="MODERATE">Moderate</option>
                        <option value="LOW">Low</option>
                      </select>
                    </div>
                  </div>

                  <p className="text-[11px] text-indigo-700/90 italic pt-1">
                    Outcome recorded as learning for future similar problems.
                  </p>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => setShowVerifyModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={actionLoading} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                    Verify & Record Learning
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Innovation Modal */}
      {showInnovationModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle className="text-base">Log Innovation Outcome</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRecordInnovation} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Outcome Classification</label>
                  <select
                    value={innType}
                    onChange={e => setInnType(e.target.value as any)}
                    className="w-full border rounded p-2"
                  >
                    <option value="PATENT_FILED">PATENT_FILED</option>
                    <option value="PATENT_GRANTED">PATENT_GRANTED</option>
                    <option value="RESEARCH_PUBLICATION">RESEARCH_PUBLICATION</option>
                    <option value="STARTUP">STARTUP</option>
                    <option value="TECHNOLOGY_TRANSFER">TECHNOLOGY_TRANSFER</option>
                    <option value="SOCIAL_IMPACT">SOCIAL_IMPACT</option>
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Title</label>
                  <Input value={innTitle} onChange={e => setInnTitle(e.target.value)} required />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Reference Identifier / Patent Application #</label>
                  <Input value={innRef} onChange={e => setInnRef(e.target.value)} />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Measurable Impact</label>
                  <Input value={innImpact} onChange={e => setInnImpact(e.target.value)} required />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowInnovationModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={actionLoading} className="bg-amber-600 text-white">
                    Log Outcome
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </AppLayout>
  );
}
