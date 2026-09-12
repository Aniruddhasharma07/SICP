'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../src/components/ui/Card';
import { Badge } from '../../../src/components/ui/Badge';
import { PageHeader } from '../../../src/components/ui/PageHeader';
import { Button } from '../../../src/components/ui/Button';
import { Alert } from '../../../src/components/ui/Alert';
import { useAuth } from '../../../src/lib/auth-context';
import { apiClient } from '../../../src/lib/api-client';
import {
  SolutionMemoryDto,
  SolutionMemoryStatus,
  ReusabilityClass,
  EvidenceLevel,
  MemoryOutcomeStatus,
} from '@sicp/shared';
import {
  ArrowLeft,
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  MapPin,
  Calendar,
  Layers,
  Award,
  ShieldCheck,
  ShieldAlert,
  FileText,
  Clock,
  Compass,
  Check,
} from 'lucide-react';

export default function SolutionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const { user, hasPermission } = useAuth();

  const [solution, setSolution] = useState<SolutionMemoryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review Form State (for privileged reviewers)
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);

  const fetchSolution = async () => {
    setLoading(true);
    const res = await apiClient.request<SolutionMemoryDto>(`/api/v1/solutions/${resolvedParams.id}`);
    if (res.success && res.data) {
      setSolution(res.data);
    } else {
      setError(res.error?.message || 'Failed to retrieve solution case study');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSolution();
  }, [resolvedParams.id]);

  const handleReviewAction = async (newStatus: SolutionMemoryStatus) => {
    if (!reviewNotes.trim()) {
      alert('Please provide review notes before updating the publication status.');
      return;
    }
    setReviewSubmitting(true);
    setReviewSuccess(null);

    const res = await apiClient.request<SolutionMemoryDto>(`/api/v1/solutions/${resolvedParams.id}/review`, {
      method: 'POST',
      body: JSON.stringify({
        status: newStatus,
        reviewNotes: reviewNotes.trim(),
      }),
    });

    if (res.success && res.data) {
      setSolution(res.data);
      setReviewSuccess(`Solution status updated to ${newStatus}`);
      setReviewNotes('');
    } else {
      alert(res.error?.message || 'Failed to update review status');
    }
    setReviewSubmitting(false);
  };

  const getReusabilityBadge = (rClass: ReusabilityClass) => {
    switch (rClass) {
      case ReusabilityClass.HIGHLY_REUSABLE:
        return <Badge variant="success">Highly Reusable</Badge>;
      case ReusabilityClass.CONDITIONALLY_REUSABLE:
        return <Badge variant="default">Conditionally Reusable</Badge>;
      case ReusabilityClass.REQUIRES_ADAPTATION:
        return <Badge variant="warning">Requires Adaptation</Badge>;
      case ReusabilityClass.NOT_RECOMMENDED:
        return <Badge variant="destructive">Not Recommended</Badge>;
      default:
        return <Badge variant="secondary">Under Evaluation</Badge>;
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 py-16 text-center text-slate-500">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium">Loading institutional solution memory...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !solution) {
    return (
      <AppLayout>
        <div className="max-w-3xl mx-auto px-4 py-16 space-y-4 text-center">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Solution Not Found or Access Restricted</h2>
          <p className="text-sm text-slate-600">
            {error || 'This solution memory does not exist or has not yet been approved for public release.'}
          </p>
          <div className="pt-2">
            <Link href="/solutions">
              <Button variant="outline" size="sm">
                Return to Solution Repository
              </Button>
            </Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Standardized Elite Page Header */}
        <PageHeader
          title={solution.title}
          description={solution.summary}
          portal="CIVIC"
          status={solution.status}
          breadcrumbs={[
            { label: 'Solution Memory', href: '/solutions' },
            { label: solution.title },
          ]}
          action={
            <div className="flex items-center gap-2">
              <Link href="/solutions">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>All Solutions</span>
                </Button>
              </Link>
            </div>
          }
        />

        {/* Metadata Pill Strip */}
        <div className="flex flex-wrap items-center gap-2 pb-2">
          <Badge variant="secondary" className="font-semibold text-xs">{solution.challengeCategory.replace('_', ' ')}</Badge>
          {getReusabilityBadge(solution.reusabilityClass)}
          <Badge variant="outline" className="text-xs">{solution.evidenceLevel}</Badge>
          <div className="flex items-center gap-3 text-xs text-slate-500 ml-auto">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Published: {new Date(solution.createdAt).toLocaleDateString()}
            </span>
            {solution.lastReviewedAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                Reviewed: {new Date(solution.lastReviewedAt).toLocaleDateString()}
              </span>
            )}
            <span className="flex items-center gap-1 font-semibold text-slate-700">
              <Compass className="w-3.5 h-3.5 text-blue-600" />
              Reused: {solution.reuseCount} times
            </span>
          </div>
        </div>

        {/* Reusability Index Card */}
        {solution.reusabilityScore != null && (
          <Card className="bg-gradient-to-r from-slate-50 to-blue-50/40 border-slate-200">
            <CardContent className="p-5 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="text-xs uppercase tracking-wider font-bold text-slate-400">
                  Institutional Reusability Index
                </div>
                <div className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <span>{solution.reusabilityScore} / 100</span>
                  <span className="text-sm font-semibold text-slate-600">
                    ({solution.reusabilityClass.replace('_', ' ')})
                  </span>
                </div>
                <p className="text-xs text-slate-600 max-w-xl">
                  {solution.reusabilityExplanation ||
                    'Evaluated based on verified field outcome metrics, robustness under stress, and absence of systemic failure modes.'}
                </p>
              </div>

              <div className="w-full md:w-48 space-y-1">
                <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      solution.reusabilityScore >= 80
                        ? 'bg-emerald-500'
                        : solution.reusabilityScore >= 60
                          ? 'bg-blue-500'
                          : solution.reusabilityScore >= 40
                            ? 'bg-amber-500'
                            : 'bg-rose-500'
                    }`}
                    style={{ width: `${solution.reusabilityScore}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Section 1: The Civic Problem & Root Causes */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="p-1 rounded bg-slate-100 text-slate-700">1</span>
            Civic Problem & Root Cause Dynamics
          </h2>
          <Card>
            <CardContent className="p-5 space-y-4 text-sm text-slate-700">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Problem Formulation
                </h4>
                <p className="leading-relaxed">{solution.problemSummary}</p>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Verified Root Cause
                </h4>
                <p className="leading-relaxed">{solution.rootCause}</p>
              </div>

              {solution.locationContext && (
                <div className="pt-3 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span>
                    Field Location Context:{' '}
                    {Object.entries(solution.locationContext)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(', ')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section 2: Technical Approach & Architecture */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="p-1 rounded bg-blue-100 text-blue-700">2</span>
            Technological Intervention Architecture
          </h2>
          <Card>
            <CardContent className="p-5 space-y-4 text-sm text-slate-700">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                  Technical Methodology
                </h4>
                <p className="leading-relaxed font-mono text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {solution.technicalApproach}
                </p>
              </div>

              {solution.implementationSummary && (
                <div className="pt-3 border-t border-slate-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                    Implementation Execution Details
                  </h4>
                  <p className="leading-relaxed">{solution.implementationSummary}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section 3: Field Outcomes & What Worked */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span className="p-1 rounded bg-emerald-100 text-emerald-700">3</span>
            Verified Field Outcomes & Success Drivers
          </h2>
          <Card className="border-emerald-200 bg-emerald-50/20">
            <CardContent className="p-5 space-y-4 text-sm text-slate-700">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
                  What Worked in Operation
                </h4>
                <p className="leading-relaxed">{solution.whatWorked || solution.lessonsLearned}</p>
              </div>

              {solution.impactSummary && (
                <div className="pt-3 border-t border-emerald-100">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 mb-1">
                    Measured Societal Impact
                  </h4>
                  <p className="leading-relaxed">{solution.impactSummary}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Section 4: What Failed & Precedent Failure Warnings (Prominent Caution) */}
        {(solution.futureWarnings || solution.whatFailed || solution.limitations) && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-amber-900 flex items-center gap-2">
              <span className="p-1 rounded bg-amber-100 text-amber-800">4</span>
              Failure Lessons & Operational Hazard Alerts
            </h2>
            <Card className="border-amber-300 bg-amber-50/60 shadow-sm">
              <CardContent className="p-5 space-y-4 text-sm text-amber-950">
                {solution.futureWarnings && (
                  <div className="bg-amber-100/70 border border-amber-300 rounded-xl p-4 flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-900 text-xs uppercase tracking-wider mb-1">
                        Actionable Precedent Warning for Future Teams
                      </h4>
                      <p className="leading-relaxed font-semibold">{solution.futureWarnings}</p>
                    </div>
                  </div>
                )}

                {solution.whatFailed && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
                      Documented Operational Breakdowns / What Failed
                    </h4>
                    <p className="leading-relaxed">{solution.whatFailed}</p>
                  </div>
                )}

                {solution.limitations && (
                  <div className="pt-3 border-t border-amber-200/60">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-800 mb-1">
                      Boundary Conditions & Known Constraints
                    </h4>
                    <p className="leading-relaxed">{solution.limitations}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Section 5: Implementation Prerequisites & Traceability */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                Technical Prerequisites
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-2">
              {solution.constraints ? (
                <p>{solution.constraints}</p>
              ) : (
                <ul className="list-disc pl-4 space-y-1">
                  <li>Standard environmental safety clearance and field testing audit</li>
                  <li>Local community training for periodic preventive maintenance</li>
                  <li>Monitoring telemetry connectivity where automated sensing is deployed</li>
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ExternalLink className="w-4 h-4 text-purple-600" />
                Traceability & Institutional Source
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-slate-600 space-y-2">
              {solution.projectId && (
                <div>
                  <span className="font-semibold text-slate-700">Source Project: </span>
                  <Link
                    href={`/projects/${solution.projectId}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {solution.projectTitle || `Project #${solution.projectId}`}
                  </Link>
                </div>
              )}

              {solution.challengeId && (
                <div>
                  <span className="font-semibold text-slate-700">Civic Challenge: </span>
                  <Link
                    href={`/challenges/${solution.challengeId}`}
                    className="text-blue-600 hover:underline font-medium"
                  >
                    {solution.challengeTitle || `Challenge #${solution.challengeId}`}
                  </Link>
                </div>
              )}

              {solution.reviewerName && (
                <div>
                  <span className="font-semibold text-slate-700">Reviewed By: </span>
                  <span>{solution.reviewerName}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Privileged Governance Review Controls */}
        {(hasPermission('solution:review') || hasPermission('solution:publish')) && (
          <Card className="border-blue-200 bg-blue-50/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" />
                Government / Institutional Review Panel
              </CardTitle>
              <CardDescription className="text-xs text-slate-600">
                Authorized officers may evaluate and transition the publication status of this solution memory.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-3 text-xs">
              {reviewSuccess && (
                <Alert variant="success" title="Review Updated">
                  {reviewSuccess}
                </Alert>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reviewer Evaluation Notes:
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Document review findings, audit verification checks, and publication rationale..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {hasPermission('solution:publish') && solution.status !== SolutionMemoryStatus.PUBLISHED && (
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={reviewSubmitting}
                    onClick={() => handleReviewAction(SolutionMemoryStatus.PUBLISHED)}
                  >
                    Approve & Publish Solution Memory
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={reviewSubmitting}
                  onClick={() => handleReviewAction(SolutionMemoryStatus.REQUIRES_REVIEW)}
                >
                  Flag for Re-Review
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={reviewSubmitting}
                  onClick={() => handleReviewAction(SolutionMemoryStatus.ARCHIVED)}
                >
                  Archive Memory
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
