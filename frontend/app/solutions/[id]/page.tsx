'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { Button } from '../../../src/components/ui/Button';
import { Alert } from '../../../src/components/ui/Alert';
import { apiClient } from '../../../src/lib/api-client';
import {
  SolutionMemoryDto,
  MemoryOutcomeStatus,
} from '@sicp/shared';
import {
  BrainCircuit,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Layers,
  ShieldAlert,
  Calendar,
} from 'lucide-react';

export default function SolutionMemoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();

  const [memory, setMemory] = useState<SolutionMemoryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeProblemId, setActiveProblemId] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('problemId') || '';
    if (pId) {
      setActiveProblemId(pId);
    }
  }, []);

  useEffect(() => {
    const fetchMemory = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.request<SolutionMemoryDto>(`/api/v1/solutions/${resolvedParams.id}`);
        if (res.success && res.data) {
          setMemory(res.data);
        } else {
          setError(res.error?.message || 'Solution Memory record not found.');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to retrieve Solution Memory record.');
      } finally {
        setLoading(false);
      }
    };

    fetchMemory();
  }, [resolvedParams.id]);

  if (loading) {
    return (
      <AppLayout>
        <div className="py-24 text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium text-slate-500">Loading verified solution memory precedent...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !memory) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto py-12 px-4 space-y-4">
          <Alert variant="destructive">{error || 'Solution Memory not found.'}</Alert>
          <Button variant="outline" onClick={() => router.push('/solutions')}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Solution Repository
          </Button>
        </div>
      </AppLayout>
    );
  }

  const verdict = memory.guidanceVerdict || (
    memory.outcomeStatus === MemoryOutcomeStatus.INEFFECTIVE || memory.outcomeStatus === MemoryOutcomeStatus.FAILED
      ? 'WARN'
      : (memory.failureCount && memory.failureCount > 0 && memory.successCount && memory.successCount > 0)
      ? 'CAUTION'
      : 'RECOMMEND'
  );

  const verdictThemes = {
    RECOMMEND: {
      badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      badgeText: 'Worked Before — Recommend',
      icon: CheckCircle2,
      accent: 'border-emerald-500',
    },
    WARN: {
      badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
      badgeText: 'Failed Before — Warn',
      icon: XCircle,
      accent: 'border-rose-500',
    },
    CAUTION: {
      badgeBg: 'bg-amber-50 text-amber-700 border-amber-200',
      badgeText: 'Mixed Results — Use With Caution',
      icon: AlertTriangle,
      accent: 'border-amber-500',
    },
    NO_MEMORY: {
      badgeBg: 'bg-slate-50 text-slate-700 border-slate-200',
      badgeText: 'Novel Problem Precedent',
      icon: ShieldAlert,
      accent: 'border-slate-500',
    },
  };

  const currentTheme = (verdictThemes as any)[verdict] || verdictThemes.RECOMMEND;
  const VerdictIcon = currentTheme.icon;

  const profile = memory.effectivenessProfile;
  const applications = memory.applications || [];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
        {/* Active Problem Context Banner */}
        {activeProblemId && (
          <div
            data-testid="problem-context-banner"
            className="p-4 rounded-xl bg-gradient-to-r from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/50 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-sicp-fade-in text-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                <BrainCircuit className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-900/80 text-indigo-200 border border-indigo-700 font-mono text-[10px]">
                    Active Problem Context
                  </Badge>
                  <span className="font-mono text-slate-300 font-semibold">#{activeProblemId.slice(0, 8)}...</span>
                </div>
                <p className="text-slate-300 text-[11.5px]">
                  Inspecting precedent details for active problem investigation. Return to Problem Intelligence at any time.
                </p>
              </div>
            </div>

            <Link href={`/challenges/${activeProblemId}`}>
              <Button
                size="sm"
                variant="primary"
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-8 shrink-0 flex items-center gap-1.5"
                data-testid="return-to-problem-btn"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Problem Intelligence</span>
              </Button>
            </Link>
          </div>
        )}

        {/* Navigation & Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/solutions"
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Solution Memories
          </Link>
          <span className="text-xs text-slate-400">
            ID: <code className="font-mono text-[11px]">{memory.id.slice(0, 12)}...</code>
          </span>
        </div>

        {/* Header Card */}
        <Card className={`border-t-4 ${currentTheme.accent} shadow-sm bg-white`}>
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {memory.challengeCategory.replace(/_/g, ' ')}
                  </Badge>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${currentTheme.badgeBg}`}
                  >
                    <VerdictIcon className="w-3.5 h-3.5" />
                    {currentTheme.badgeText}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {memory.evidenceLevel} EVIDENCE
                  </Badge>
                </div>
                <CardTitle className="text-xl font-bold text-slate-900 tracking-tight">
                  {memory.title}
                </CardTitle>
              </div>

              {memory.reusabilityScore != null && (
                <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-200 text-center shrink-0">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Reusability Score</div>
                  <div className="text-2xl font-black text-indigo-600">{memory.reusabilityScore}<span className="text-xs font-normal text-slate-400">/100</span></div>
                </div>
              )}
            </div>

            <CardDescription className="text-sm text-slate-600 pt-2 leading-relaxed">
              {memory.summary || memory.problemSummary}
            </CardDescription>
          </CardHeader>

          <CardContent className="border-t border-slate-100 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Domain Domain</span>
              <span className="font-semibold text-slate-800">{memory.challengeCategory}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Reusability Class</span>
              <span className="font-semibold text-slate-800">{memory.reusabilityClass}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Verified Deployments</span>
              <span className="font-semibold text-slate-800">{memory.implementationCount || applications.length || 1}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Publication Status</span>
              <span className="font-semibold text-emerald-600">{memory.status}</span>
            </div>
          </CardContent>
        </Card>

        {/* Effectiveness Profile Card */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BrainCircuit className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-base font-bold text-slate-900">
                Institutional Effectiveness Profile
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Aggregated historical field track record derived strictly from verified project implementations.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 text-xs">
            {/* Counts Metric Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-center">
                <span className="text-[11px] text-slate-500 block">Total Implementations</span>
                <span className="text-lg font-bold text-slate-900">{memory.implementationCount || applications.length || 1}</span>
              </div>
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 text-center">
                <span className="text-[11px] text-emerald-700 block">Verified Successes</span>
                <span className="text-lg font-bold text-emerald-700">{memory.successCount || 0}</span>
              </div>
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-center">
                <span className="text-[11px] text-amber-700 block">Partially Effective</span>
                <span className="text-lg font-bold text-amber-700">{memory.partialCount || 0}</span>
              </div>
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200 text-center">
                <span className="text-[11px] text-rose-700 block">Documented Failures</span>
                <span className="text-lg font-bold text-rose-700">{memory.failureCount || 0}</span>
              </div>
            </div>

            {/* Success & Failure Factors */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-3.5 bg-emerald-50/50 border border-emerald-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Proven Success Conditions</span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  {memory.whatWorked || 'Demonstrated technical compliance in field deployment.'}
                </p>
                {profile?.commonSuccessFactors && profile.commonSuccessFactors.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1">
                    {profile.commonSuccessFactors.map((f, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-emerald-100/80 text-emerald-800 text-[11px]">
                        ✓ {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-lg space-y-2">
                <div className="flex items-center gap-2 font-bold text-rose-800">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>Documented Failure Modes & Risks</span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  {memory.whatFailed || memory.futureWarnings || 'No catastrophic failure modes observed under recommended maintenance conditions.'}
                </p>
                {profile?.failurePatterns && profile.failurePatterns.length > 0 && (
                  <div className="pt-2 flex flex-wrap gap-1">
                    {profile.failurePatterns.map((p, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-rose-100/80 text-rose-800 text-[11px]">
                        ⚠ {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Historical Applications Timeline */}
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <CardTitle className="text-base font-bold text-slate-900">
                Historical Deployment Applications Timeline ({applications.length})
              </CardTitle>
            </div>
            <CardDescription className="text-xs text-slate-500">
              Complete historical record of every project that applied this technical approach. Evidence is cumulative and never overwritten.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3 text-xs">
            {applications.length === 0 ? (
              <div className="p-6 text-center text-slate-500 bg-slate-50 rounded-lg border border-slate-200">
                <Layers className="w-6 h-6 mx-auto mb-2 text-slate-400" />
                <p>Initial solution memory synthesized from source project. Awaiting subsequent replication deployments.</p>
              </div>
            ) : (
              applications.map((app, idx) => {
                const isSuccess = [
                  MemoryOutcomeStatus.EFFECTIVE,
                  MemoryOutcomeStatus.SUCCESSFUL,
                  MemoryOutcomeStatus.SUCCESS,
                ].includes(app.outcomeStatus as any);
                const isFailure = [
                  MemoryOutcomeStatus.INEFFECTIVE,
                  MemoryOutcomeStatus.FAILED,
                ].includes(app.outcomeStatus as any);

                return (
                  <div
                    key={app.id || idx}
                    className="p-3.5 bg-slate-50/70 rounded-lg border border-slate-200 space-y-2 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${
                            isSuccess
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : isFailure
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {isSuccess ? <CheckCircle2 className="w-3 h-3" /> : isFailure ? <XCircle className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                          {app.outcomeStatus}
                        </span>
                        <span className="font-bold text-slate-900">
                          {app.projectTitle || `Project Implementation #${app.projectId.slice(0, 8)}`}
                        </span>
                      </div>

                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(app.verifiedAt || app.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {app.observedImpact && (
                      <div className="text-slate-700">
                        <span className="font-semibold text-slate-800">Observed Impact: </span>
                        {app.observedImpact}
                      </div>
                    )}

                    {app.failureReason && (
                      <div className="text-rose-700 font-medium bg-rose-50 p-2 rounded border border-rose-200">
                        <span>Failure Cause: </span>
                        {app.failureReason}
                      </div>
                    )}

                    {app.maintenanceIssues && (
                      <div className="text-slate-600 italic">
                        <span className="font-medium text-slate-700">Maintenance Constraints: </span>
                        {app.maintenanceIssues}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
