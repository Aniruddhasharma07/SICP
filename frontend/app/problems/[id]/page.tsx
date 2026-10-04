'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../../src/lib/api-client';
import { useAuth } from '../../../src/lib/auth-context';
import { AppLayout } from '../../../src/components/layout/AppLayout';
import { Button } from '../../../src/components/ui/Button';
import { Badge } from '../../../src/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../../src/components/ui/Card';
import { Alert } from '../../../src/components/ui/Alert';
import { StatusBadge } from '../../../src/components/ui/StatusBadge';
import { CanonicalLifecycleTracker } from '../../../src/components/challenge/CanonicalLifecycleTracker';
import {
  FileText,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  Sparkles,
  Layers,
  ArrowRight,
  ArrowLeft,
  Share2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Activity,
  SlidersHorizontal,
  ChevronRight,
  ExternalLink,
  Loader2,
  RefreshCw,
  ImageIcon,
} from 'lucide-react';

interface ProblemDetail {
  id: string;
  code: string;
  title: string;
  description: string;
  originalNarrative?: string;
  category: string;
  status: string;
  aiSeverity: string;
  govSeverity?: string | null;
  aiPriority: string;
  govPriority?: string | null;
  priorityScore: number;
  aiAffectedPopulation?: number | null;
  govAffectedPopulation?: number | null;
  populationStatus?: string;
  populationProvenance?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  district?: string | null;
  state?: string | null;
  wardNumber?: string | null;
  mediaUrls?: string[];
  isAnonymous: boolean;
  submitterId?: string;
  createdAt: string;
  updatedAt: string;
  group?: {
    id: string;
    title: string;
    canonicalCategory: string;
    relationshipStrength: number;
    challengeId?: string | null;
    challenge?: {
      id: string;
      title: string;
      status: string;
      category: string;
      isSystemic: boolean;
      systemicSummary?: string | null;
    } | null;
    members?: Array<{
      id: string;
      problemId: string;
      problem: {
        id: string;
        code: string;
        title: string;
        district?: string | null;
        status: string;
      };
    }>;
  } | null;
  challengeLinks?: Array<{
    id: string;
    challengeId: string;
    challenge: {
      id: string;
      title: string;
      status: string;
      category: string;
      isSystemic: boolean;
      systemicSummary?: string | null;
    };
  }>;
  overrideLogs?: Array<{
    id: string;
    field: string;
    previousValue: string;
    overriddenValue: string;
    reason: string;
    createdAt: string;
  }>;
}

export default function ProblemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const problemId = params?.id as string;

  const [problem, setProblem] = useState<ProblemDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reallocating, setReallocating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const fetchProblem = useCallback(async () => {
    if (!problemId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.request<ProblemDetail>(`/api/v1/problems/${problemId}`);
      if (res.success && res.data) {
        setProblem(res.data);
      } else {
        setError(res.error?.message || 'Problem report not found.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load problem record.');
    } finally {
      setLoading(false);
    }
  }, [problemId]);

  useEffect(() => {
    fetchProblem();
  }, [fetchProblem]);

  const handleRemoveFromGroup = async () => {
    if (!problem?.id) return;
    setReallocating(true);
    try {
      const res = await apiClient.request(`/api/v1/problems/${problem.id}/remove-from-group`, {
        method: 'POST',
        body: JSON.stringify({
          reason: 'Officer manual reallocation from individual problem inspector',
        }),
      });
      if (res.success) {
        setToastMessage('Problem successfully reallocated within challenge.');
        await fetchProblem();
      } else {
        setError(res.error?.message || 'Reallocation failed.');
      }
    } catch (err: any) {
      setError(err?.message || 'Reallocation failed.');
    } finally {
      setReallocating(false);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium text-slate-500">Loading ground truth problem report...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !problem) {
    return (
      <AppLayout>
        <div className="max-w-4xl mx-auto px-4 py-12 space-y-6">
          <Link href="/my-problems" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to My Problems
          </Link>
          <Alert variant="destructive">{error || 'Problem report could not be found.'}</Alert>
          <Button onClick={() => router.push('/my-problems')}>Return to My Problems</Button>
        </div>
      </AppLayout>
    );
  }

  const isOfficer = user?.role === 'GOVERNMENT_OFFICER' || user?.role === 'GOVERNMENT_DEPARTMENT' || user?.role === 'SYSTEM_ADMIN';
  const effectiveSeverity = problem.govSeverity || problem.aiSeverity || 'MODERATE';
  const effectivePriority = problem.govPriority || problem.aiPriority || 'MEDIUM';
  const associatedChallenge = problem.group?.challenge || (problem.challengeLinks && problem.challengeLinks[0]?.challenge);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
            <Link href="/my-problems" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
              My Problems
            </Link>
            <ChevronRight className="w-3.5 h-3.5" />
            <span className="font-mono font-bold text-slate-900 dark:text-slate-200">
              {problem.code || problem.id.slice(0, 8)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchProblem}
              className="h-8 text-xs font-medium gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </Button>
            {associatedChallenge && (
              <Link href={`/challenges/${associatedChallenge.id}`}>
                <Button size="sm" className="h-8 text-xs font-bold gap-1.5 bg-blue-600 hover:bg-blue-500 text-white">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Governed Challenge Workspace</span>
                  <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            )}
          </div>
        </div>

        {toastMessage && (
          <Alert variant="success" className="animate-in fade-in">
            {toastMessage}
          </Alert>
        )}

        {/* HERO: Citizen Ground Truth Header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700">
                {problem.code || 'PROB-RAW'}
              </span>
              <StatusBadge status={problem.status as any} />
              <Badge variant="outline" className="text-xs font-medium">
                {problem.category.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>Submitted {new Date(problem.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {problem.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400 pt-1">
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
              <span>
                {problem.locationName || problem.wardNumber ? `Ward ${problem.wardNumber}, ` : ''}
                {problem.district || 'District'}{problem.state ? `, ${problem.state}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <span>{problem.isAnonymous ? 'Anonymous Citizen Reporter' : 'Verified Community Resident'}</span>
            </div>
          </div>
        </div>

        {/* 6-Stage Intervention Lifecycle Progress Tracker */}
        <CanonicalLifecycleTracker
          status={associatedChallenge?.status || problem.status}
          variant="full"
        />

        {/* 2-COLUMN GRID: Original Narrative vs SICP Interpretation */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* COLUMN 1: Original Citizen Narrative & Media Ground Truth */}
          <div className="space-y-6">
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                      Original Citizen Narrative (Ground Truth)
                    </CardTitle>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                    Verbatim Submission
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-serif italic">
                  &ldquo;{problem.originalNarrative || problem.description}&rdquo;
                </div>

                {problem.mediaUrls && problem.mediaUrls.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-blue-600" />
                      Uploaded Citizen Evidence &amp; Photos ({problem.mediaUrls.length})
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {problem.mediaUrls.map((url, idx) => (
                        <a
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="group relative rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 aspect-video flex items-center justify-center"
                        >
                          <img
                            src={url}
                            alt={`Problem evidence ${idx + 1}`}
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 italic">
                    <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                    No supplementary photos or documents attached with this submission.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Geographical & Coordinate Pinpoint */}
            <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    Spatial Ground Verification
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-3 text-xs text-slate-700 dark:text-slate-300">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Administrative District</span>
                    <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{problem.district || 'Unassigned'}</span>
                  </div>
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">State Jurisdiction</span>
                    <span className="font-bold text-slate-900 dark:text-white mt-0.5 block">{problem.state || 'India'}</span>
                  </div>
                </div>

                {problem.latitude && problem.longitude && (
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span className="font-mono text-slate-600 dark:text-slate-400">
                      GPS: {problem.latitude.toFixed(5)}° N, {problem.longitude.toFixed(5)}° E
                    </span>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${problem.latitude},${problem.longitude}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-bold hover:underline"
                    >
                      <span>Open Satellite Map</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* COLUMN 2: SICP Systemic Intelligence Interpretation */}
          <div className="space-y-6">
            <Card className="border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/40 via-white to-white dark:from-indigo-950/20 dark:via-slate-900 dark:to-slate-900">
              <CardHeader className="pb-3 border-b border-indigo-100 dark:border-indigo-900/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <CardTitle className="text-sm font-bold text-indigo-950 dark:text-indigo-200">
                      SICP AI Interpretation &amp; Normalization
                    </CardTitle>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    Epistemic: AI_INTERPRETED
                  </span>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Assessed Severity</span>
                    <span className="text-sm font-extrabold text-slate-900 dark:text-white mt-1 block">
                      {effectiveSeverity}
                    </span>
                    {problem.govSeverity && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold mt-0.5 block">
                        Government Override Applied
                      </span>
                    )}
                  </div>
                  <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Priority Score</span>
                    <span className="text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-1 block">
                      {problem.priorityScore ? `${Math.round(problem.priorityScore)}/100` : effectivePriority}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                      Weighted Impact Model
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Affected Population Provenance</span>
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {problem.populationStatus || 'UNKNOWN'}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">
                    {problem.govAffectedPopulation || problem.aiAffectedPopulation
                      ? `${(problem.govAffectedPopulation || problem.aiAffectedPopulation)?.toLocaleString()} Citizens Exposed`
                      : 'Population Unconfirmed (Zero Fabrication)'}
                  </div>
                  {problem.populationProvenance && (
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Source: {problem.populationProvenance}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Problem Group & Corridor Context */}
            {problem.group ? (
              <Card className="border-amber-200 dark:border-amber-900/60 bg-amber-50/20 dark:bg-amber-950/10">
                <CardHeader className="pb-3 border-b border-amber-100 dark:border-amber-900/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-amber-600" />
                      <CardTitle className="text-sm font-bold text-amber-950 dark:text-amber-200">
                        Corridor Problem Group Membership
                      </CardTitle>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
                      {Math.round((problem.group.relationshipStrength || 0.75) * 100)}% Match
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {problem.group.title}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Corridor cluster aggregating {problem.group.members?.length || 1} independent citizen reports.
                    </p>
                  </div>

                  {problem.group.members && problem.group.members.length > 1 && (
                    <div className="space-y-1.5 pt-2 border-t border-amber-100 dark:border-amber-900/40">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Sibling Problems in this Group
                      </span>
                      <div className="space-y-1">
                        {problem.group.members
                          .filter((m) => m.problemId !== problem.id)
                          .map((m) => (
                            <Link
                              key={m.id}
                              href={`/problems/${m.problem.id}`}
                              className="p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between hover:border-amber-400 transition-colors"
                            >
                              <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                                {m.problem.title}
                              </span>
                              <span className="font-mono text-[10px] text-slate-500 shrink-0">
                                {m.problem.code || m.problem.id.slice(0, 8)}
                              </span>
                            </Link>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Officer Reallocation Action */}
                  {isOfficer && (
                    <div className="pt-3 border-t border-amber-200/60 dark:border-amber-800/60 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">
                        Misassembled group? Reallocate problem within challenge:
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reallocating}
                        onClick={handleRemoveFromGroup}
                        className="h-7 text-xs font-bold border-amber-400 text-amber-900 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                      >
                        {reallocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Reallocate Problem'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                <CardContent className="p-5 text-center space-y-2">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    This problem is currently evaluated as a standalone incident. As adjacent reports emerge along the corridor, SICP clustering will automatically correlate it into a Problem Group.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Governed Challenge Linkage */}
            {associatedChallenge && (
              <Card className="border-blue-200 dark:border-blue-900/60 bg-blue-50/20 dark:bg-blue-950/10">
                <CardHeader className="pb-3 border-b border-blue-100 dark:border-blue-900/40">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-blue-600" />
                      <CardTitle className="text-sm font-bold text-blue-950 dark:text-blue-200">
                        Participating Challenge Workspace
                      </CardTitle>
                    </div>
                    <StatusBadge status={associatedChallenge.status as any} />
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-xs text-slate-700 dark:text-slate-300">
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white text-sm">
                      {associatedChallenge.title}
                    </h4>
                    {associatedChallenge.systemicSummary && (
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        {associatedChallenge.systemicSummary}
                      </p>
                    )}
                  </div>
                  <Link href={`/challenges/${associatedChallenge.id}`} className="block">
                    <Button className="w-full text-xs font-bold gap-2 bg-blue-600 hover:bg-blue-500 text-white">
                      <span>Open Full Challenge Intelligence Workspace</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
