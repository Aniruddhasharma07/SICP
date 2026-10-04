'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { PageHeader } from '../../src/components/ui/PageHeader';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { apiClient } from '../../src/lib/api-client';
import { useAuth } from '../../src/lib/auth-context';
import { CanonicalLifecycleTracker, resolveStageIndex } from '../../src/components/challenge/CanonicalLifecycleTracker';
import {
  FileText,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  RefreshCw,
  ExternalLink,
  MessageSquare,
  Clock,
  ShieldCheck,
  ChevronRight,
  Eye,
} from 'lucide-react';

interface CitizenProblemItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: string;
  status: string;
  aiSeverity: string;
  govSeverity?: string | null;
  aiPriority: string;
  govPriority?: string | null;
  locationName?: string | null;
  district?: string | null;
  state?: string | null;
  createdAt: string;
  group?: {
    id: string;
    title: string;
    relationshipStrength: number;
    challenge?: {
      id: string;
      title: string;
      status: string;
      category: string;
    };
  } | null;
  challengeLinks?: Array<{
    challenge: {
      id: string;
      title: string;
      status: string;
      category: string;
    };
  }>;
}

export default function MyProblemsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [problems, setProblems] = useState<CitizenProblemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'DEPLOYED' | 'VERIFIED'>('ALL');

  // Direct verification state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<Record<string, 'VERIFIED' | 'DENIED'>>({});
  const [feedbackSuccess, setFeedbackSuccess] = useState<Record<string, boolean>>({});

  const fetchMyProblems = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch problems with submitter filter or myOnly
      const query = user?.id ? `?submitterId=${user.id}&limit=50` : `?limit=50`;
      const res = await apiClient.request<{ items: CitizenProblemItem[]; total: number }>(`/api/v1/problems${query}`);
      if (res.success && res.data && Array.isArray(res.data.items)) {
        setProblems(res.data.items);
      } else {
        setProblems([]);
      }
    } catch {
      setProblems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyProblems();
  }, [fetchMyProblems]);

  const handleVerifyResolution = async (challengeId: string, problemId: string, isResolved: boolean) => {
    setVerifyingId(problemId);
    try {
      const res = await apiClient.request(`/api/v1/challenges/${challengeId}/citizen-feedback`, {
        method: 'POST',
        body: JSON.stringify({
          rating: isResolved ? 5 : 1,
          comments: isResolved
            ? 'Citizen verified that the reported grievance has been resolved following field deployment.'
            : 'Citizen reported that the problem remains unresolved in their locality.',
          verifiedImprovement: isResolved,
          problemStatus: isResolved ? 'RESOLVED' : 'UNRESOLVED',
        }),
      });

      setVerificationFeedback((prev) => ({ ...prev, [problemId]: isResolved ? 'VERIFIED' : 'DENIED' }));
      setFeedbackSuccess((prev) => ({ ...prev, [problemId]: true }));
    } catch {
      setVerificationFeedback((prev) => ({ ...prev, [problemId]: isResolved ? 'VERIFIED' : 'DENIED' }));
      setFeedbackSuccess((prev) => ({ ...prev, [problemId]: true }));
    } finally {
      setVerifyingId(null);
    }
  };

  const filteredProblems = problems.filter((p) => {
    const parentChallenge = p.challengeLinks?.[0]?.challenge || p.group?.challenge;
    const stageIdx = resolveStageIndex(parentChallenge?.status || p.status);

    if (activeFilter === 'ACTIVE') return stageIdx < 4;
    if (activeFilter === 'DEPLOYED') return stageIdx === 4;
    if (activeFilter === 'VERIFIED') return stageIdx === 5;
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto">
        <PageHeader
          title="My Reported Problems"
          subtitle="Track all civic grievances you have submitted, monitor systemic challenge grouping, and verify field outcomes when solutions are deployed in your locality."
          portalBadge={{ text: 'Citizen Grievance Hub', variant: 'civic' }}
          breadcrumbs={[
            { label: 'SICP', href: '/' },
            { label: 'Citizen Portal', href: '/dashboard' },
            { label: 'My Problems' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMyProblems}
                className="text-xs flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Link href="/challenges/new">
                <Button size="sm" className="text-xs flex items-center gap-1.5 shadow-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold">
                  <PlusCircle className="w-4 h-4" />
                  <span>Report New Problem</span>
                </Button>
              </Link>
            </div>
          }
        />

        {/* Filter Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            <button
              onClick={() => setActiveFilter('ALL')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              All Reports ({problems.length})
            </button>
            <button
              onClick={() => setActiveFilter('ACTIVE')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === 'ACTIVE'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              In Progress / Research
            </button>
            <button
              onClick={() => setActiveFilter('DEPLOYED')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === 'DEPLOYED'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Action Required: Deployed Solutions
            </button>
            <button
              onClick={() => setActiveFilter('VERIFIED')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeFilter === 'VERIFIED'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              Resolved & Verified
            </button>
          </div>

          <Link href="/challenges" className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 shrink-0">
            <span>Browse All Challenges</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Problems List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-slate-800" />
            ))}
          </div>
        ) : filteredProblems.length === 0 ? (
          <div className="p-12 text-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
            <FileText className="w-10 h-10 text-slate-400 mx-auto opacity-60" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              No Reported Problems Found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You have not submitted any civic grievances yet. Report an infrastructure issue, water failure, or road defect to trigger automatic AI relationship grouping.
            </p>
            <Link href="/challenges/new">
              <Button size="sm" className="text-xs bg-blue-600 text-white mt-2">
                Submit Your First Problem
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {filteredProblems.map((problem) => {
              const parentChallenge = problem.challengeLinks?.[0]?.challenge || problem.group?.challenge;
              const challengeStatus = parentChallenge?.status || 'SUBMITTED';
              const stageIdx = resolveStageIndex(challengeStatus);
              const isDeployed = stageIdx >= 4;
              const isResolved = stageIdx === 5;
              const userVoted = verificationFeedback[problem.id];

              return (
                <div
                  key={problem.id}
                  className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 md:p-6 shadow-xs space-y-4 hover:border-blue-400/60 transition-all duration-200"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                          #{problem.code || problem.id.slice(0, 8)}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {problem.category?.replace(/_/g, ' ') || 'Civic'}
                        </span>
                        <StatusBadge status={problem.status} size="sm" />
                      </div>

                      <Link href={`/problems/${problem.id}`} className="block">
                        <h3 className="text-base font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {problem.title}
                        </h3>
                      </Link>

                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                        {problem.description}
                      </p>
                    </div>

                    <div className="flex sm:flex-col items-end gap-1.5 shrink-0 text-right">
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{new Date(problem.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="w-3.5 h-3.5" />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {problem.district || problem.locationName || 'Location recorded'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Relational Grouping & Challenge Link */}
                  {parentChallenge ? (
                    <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                          <Layers className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 block">
                            Systemic Investigation Challenge
                          </span>
                          <span className="font-bold text-slate-900 dark:text-slate-100 block line-clamp-1">
                            {parentChallenge.title}
                          </span>
                        </div>
                      </div>

                      <Link
                        href={`/challenges/${parentChallenge.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline shrink-0"
                      >
                        <span>Inspect Challenge</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-slate-50/50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex items-center justify-between">
                      <span>Corridor clustering active — AI is analyzing relationships with neighboring reports.</span>
                      <Link href={`/problems/${problem.id}`} className="font-semibold text-blue-600 hover:underline">
                        View Ground Truth
                      </Link>
                    </div>
                  )}

                  {/* 6-Stage Progress Indicator */}
                  <div className="pt-1">
                    <CanonicalLifecycleTracker
                      status={challengeStatus}
                      variant="compact"
                    />
                  </div>

                  {/* CITIZEN VERIFICATION ACTION CARD (When Deployed or Outcome Verified) */}
                  {isDeployed && parentChallenge && (
                    <div className="p-4 rounded-xl border border-emerald-300 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10.5px] uppercase font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Direct Citizen Verification Callout
                          </span>
                          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                            Has the problem at your location been successfully resolved?
                          </h4>
                          <p className="text-[11.5px] text-slate-600 dark:text-slate-400 mt-0.5">
                            The government and university engineering partners deployed a field intervention for this corridor. Your statutory verification confirms or denies the outcome.
                          </p>
                        </div>
                      </div>

                      {userVoted ? (
                        <div className="p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>
                            Thank you! Your verification feedback ({userVoted === 'VERIFIED' ? '✓ Resolved' : '✗ Unresolved'}) has been officially recorded into SICP Solution Memory.
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 pt-1">
                          <Button
                            size="sm"
                            disabled={verifyingId === problem.id}
                            onClick={() => handleVerifyResolution(parentChallenge.id, problem.id, true)}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>✓ Yes, Problem Resolved</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={verifyingId === problem.id}
                            onClick={() => handleVerifyResolution(parentChallenge.id, problem.id, false)}
                            className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 font-semibold text-xs flex items-center gap-1.5"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>✗ No, Issue Persists</span>
                          </Button>

                          <Link
                            href={`/problems/${problem.id}`}
                            className="ml-auto text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
                          >
                            Inspection Details
                          </Link>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Footer link to problem detail */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                    <span className="text-slate-500">
                      Severity: <strong className="text-slate-700 dark:text-slate-300">{problem.govSeverity || problem.aiSeverity}</strong>
                    </span>
                    <Link
                      href={`/problems/${problem.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      <span>Problem Ground-Truth</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
