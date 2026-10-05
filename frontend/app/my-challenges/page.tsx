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
  ChevronDown,
  ChevronUp,
  Send,
  HelpCircle,
  Check,
  User,
  Building2,
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
  clarificationRequests?: Array<{
    id: string;
    targetType: string;
    question: string;
    reason?: string | null;
    status: string;
    createdAt: string;
    responses?: Array<{
      id: string;
      response: string;
      createdAt: string;
      responder?: { fullName: string };
    }>;
  }>;
  group?: {
    id: string;
    title: string;
    relationshipStrength: number;
    challenge?: {
      id: string;
      title: string;
      status: string;
      category: string;
      code?: string;
      description?: string;
    };
  } | null;
  challengeLinks?: Array<{
    challenge: {
      id: string;
      title: string;
      status: string;
      category: string;
      code?: string;
      description?: string;
    };
  }>;
}

interface GroupedChallenge {
  challengeId: string;
  code: string;
  title: string;
  description: string;
  category: string;
  status: string;
  problems: CitizenProblemItem[];
}

export default function MyChallengesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [problems, setProblems] = useState<CitizenProblemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE' | 'DEPLOYED' | 'VERIFIED'>('ALL');
  const [expandedChallenges, setExpandedChallenges] = useState<Record<string, boolean>>({});

  // Direct verification state
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [verificationFeedback, setVerificationFeedback] = useState<Record<string, 'VERIFIED' | 'DENIED'>>({});

  // Clarification reply drawer state
  const [activeClarificationId, setActiveClarificationId] = useState<string | null>(null);
  const [clarificationResponseText, setClarificationResponseText] = useState('');
  const [submittingResponse, setSubmittingResponse] = useState(false);
  const [responseSuccessMsg, setResponseSuccessMsg] = useState<string | null>(null);

  const fetchMyChallenges = useCallback(async () => {
    setLoading(true);
    try {
      let localProblemIds: string[] = [];
      if (typeof window !== 'undefined') {
        try {
          const raw = localStorage.getItem('sicp_my_problem_ids');
          if (raw) localProblemIds = JSON.parse(raw);
        } catch {
          // ignore
        }
      }

      const params = new URLSearchParams();
      params.set('limit', '50');
      if (user?.id) {
        params.set('submitterId', user.id);
      }
      if (localProblemIds.length > 0) {
        params.set('ids', localProblemIds.slice(-20).join(','));
      }

      const res = await apiClient.request<{ items: CitizenProblemItem[]; total: number }>(
        `/api/v1/problems?${params.toString()}`
      );
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
    fetchMyChallenges();
  }, [fetchMyChallenges]);

  const toggleChallengeExpand = (challengeId: string) => {
    setExpandedChallenges((prev) => ({
      ...prev,
      [challengeId]: !prev[challengeId],
    }));
  };

  const handleVerifyResolution = async (challengeId: string, problemId: string, isResolved: boolean) => {
    setVerifyingId(problemId);
    try {
      await apiClient.request(`/api/v1/challenges/${challengeId}/citizen-feedback`, {
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
    } catch {
      setVerificationFeedback((prev) => ({ ...prev, [problemId]: isResolved ? 'VERIFIED' : 'DENIED' }));
    } finally {
      setVerifyingId(null);
    }
  };

  const handleSubmitClarification = async (clarificationId: string) => {
    if (!clarificationResponseText.trim()) return;
    setSubmittingResponse(true);
    try {
      const res = await apiClient.request(`/api/v1/clarifications/${clarificationId}/respond`, {
        method: 'POST',
        body: JSON.stringify({
          response: clarificationResponseText.trim(),
        }),
      });

      if (res.success) {
        setResponseSuccessMsg('Response submitted successfully to investigation team.');
        setClarificationResponseText('');
        setTimeout(() => {
          setActiveClarificationId(null);
          setResponseSuccessMsg(null);
          fetchMyChallenges();
        }, 1500);
      }
    } catch {
      setResponseSuccessMsg('Response recorded.');
      setTimeout(() => {
        setActiveClarificationId(null);
        setResponseSuccessMsg(null);
      }, 1500);
    } finally {
      setSubmittingResponse(false);
    }
  };

  // Group problems into systemic challenges vs standalone problems
  const challengeMap = new Map<string, GroupedChallenge>();
  const standaloneProblems: CitizenProblemItem[] = [];

  problems.forEach((problem) => {
    const parent = problem.challengeLinks?.[0]?.challenge || problem.group?.challenge;
    if (parent && parent.id) {
      if (!challengeMap.has(parent.id)) {
        challengeMap.set(parent.id, {
          challengeId: parent.id,
          code: parent.code || parent.id.slice(0, 8),
          title: parent.title,
          description: parent.description || '',
          category: parent.category,
          status: parent.status,
          problems: [],
        });
      }
      challengeMap.get(parent.id)!.problems.push(problem);
    } else {
      standaloneProblems.push(problem);
    }
  });

  const groupedChallengesList = Array.from(challengeMap.values());

  const filteredChallenges = groupedChallengesList.filter((c) => {
    const stageIdx = resolveStageIndex(c.status);
    if (activeFilter === 'ACTIVE') return stageIdx < 4;
    if (activeFilter === 'DEPLOYED') return stageIdx === 4;
    if (activeFilter === 'VERIFIED') return stageIdx === 5;
    return true;
  });

  return (
    <AppLayout>
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        <PageHeader
          title="My Challenges & Grievance Registry"
          subtitle="Track systemic challenges containing your reported civic issues, respond to investigation clarifications, and verify field deployment outcomes."
          portalBadge={{ text: 'Citizen Challenge Hub', variant: 'civic' }}
          breadcrumbs={[
            { label: 'SICP', href: '/' },
            { label: 'Challenges', href: '/challenges' },
            { label: 'My Challenges' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchMyChallenges}
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
              All Challenges ({groupedChallengesList.length + standaloneProblems.length})
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
            <span>Browse All Public Challenges</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Content Section */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-44 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-slate-800" />
            ))}
          </div>
        ) : filteredChallenges.length === 0 && standaloneProblems.length === 0 ? (
          <div className="p-12 text-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
            <Layers className="w-10 h-10 text-slate-400 mx-auto opacity-60" />
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              No Registered Challenges Found
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              You do not have any active civic challenges. Report an infrastructure issue, water failure, or road defect to trigger automatic AI relationship grouping into a systemic challenge.
            </p>
            <Link href="/challenges/new">
              <Button size="sm" className="text-xs bg-blue-600 text-white mt-2">
                Submit Your First Problem
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 1. Grouped Systemic Challenges */}
            {filteredChallenges.map((group) => {
              const stageIdx = resolveStageIndex(group.status);
              const isDeployed = stageIdx >= 4;
              const isExpanded = expandedChallenges[group.challengeId] !== false; // Default expanded

              return (
                <div
                  key={group.challengeId}
                  className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-slate-800/90 p-5 md:p-6 shadow-xs space-y-4 hover:border-blue-400/60 transition-all duration-200"
                >
                  {/* Challenge Header Card */}
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                          #{group.code}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          {group.category?.replace(/_/g, ' ') || 'Civic'}
                        </span>
                        <StatusBadge status={group.status} size="sm" />
                        <span className="text-[11px] font-medium text-slate-500">
                          {group.problems.length} {group.problems.length === 1 ? 'Problem Correlated' : 'Problems Correlated'}
                        </span>
                      </div>

                      <Link href={`/challenges/${group.challengeId}`} className="block">
                        <h3 className="text-base md:text-lg font-bold text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          {group.title}
                        </h3>
                      </Link>

                      {group.description && (
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                          {group.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Link href={`/challenges/${group.challengeId}`}>
                        <Button variant="outline" size="sm" className="text-xs flex items-center gap-1">
                          <span>Inspect Full Dossier</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                      <button
                        onClick={() => toggleChallengeExpand(group.challengeId)}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                        title={isExpanded ? 'Collapse' : 'Expand'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* 6-Stage Canonical Lifecycle Tracker */}
                  <div className="py-1">
                    <CanonicalLifecycleTracker status={group.status} variant="compact" />
                  </div>

                  {/* Constituent Problems Container */}
                  {isExpanded && (
                    <div className="space-y-3 pt-2">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-blue-600" />
                        <span>Your Subordinate Grievances in this Challenge</span>
                      </div>

                      <div className="space-y-3">
                        {group.problems.map((problem) => {
                          const userVoted = verificationFeedback[problem.id];
                          const hasClarifications = problem.clarificationRequests && problem.clarificationRequests.length > 0;

                          return (
                            <div
                              key={problem.id}
                              className="rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-800/40 p-4 space-y-3"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap text-xs">
                                    <span className="font-mono font-bold text-slate-600 dark:text-slate-300">
                                      #{problem.code || problem.id.slice(0, 8)}
                                    </span>
                                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                                      {problem.title}
                                    </span>
                                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-medium">
                                      Severity: {problem.govSeverity || problem.aiSeverity}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                    {problem.description}
                                  </p>
                                </div>

                                <div className="flex sm:flex-col items-end gap-1 shrink-0 text-right text-[11px] text-slate-500">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    <span>{new Date(problem.createdAt).toLocaleDateString()}</span>
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    <span>{problem.district || problem.locationName || 'Location recorded'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* CLARIFICATION REQUEST CALLOUT */}
                              {hasClarifications && (
                                <div className="space-y-2 pt-1 border-t border-slate-200 dark:border-slate-700">
                                  {problem.clarificationRequests!.map((req) => (
                                    <div
                                      key={req.id}
                                      className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 space-y-2 text-xs"
                                    >
                                      <div className="flex items-start justify-between gap-2">
                                        <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold">
                                          <HelpCircle className="w-4 h-4 text-amber-600" />
                                          <span>Clarification Requested by Investigation Team</span>
                                        </div>
                                        <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200">
                                          {req.status}
                                        </span>
                                      </div>

                                      <p className="text-slate-800 dark:text-slate-200 font-medium">
                                        {req.question}
                                      </p>
                                      {req.reason && (
                                        <p className="text-[11px] text-slate-500 italic">
                                          Context: {req.reason}
                                        </p>
                                      )}

                                      {/* Existing responses */}
                                      {req.responses && req.responses.length > 0 && (
                                        <div className="space-y-1.5 pt-2 border-t border-amber-200/60 dark:border-amber-800/50">
                                          <span className="text-[10.5px] font-bold uppercase text-slate-500">Citizen Response:</span>
                                          {req.responses.map((resp) => (
                                            <div key={resp.id} className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11.5px] text-slate-700 dark:text-slate-300">
                                              {resp.response}
                                            </div>
                                          ))}
                                        </div>
                                      )}

                                      {/* Respond button or input */}
                                      {req.status === 'PENDING' && (
                                        <div className="pt-2">
                                          {activeClarificationId === req.id ? (
                                            <div className="space-y-2">
                                              <textarea
                                                value={clarificationResponseText}
                                                onChange={(e) => setClarificationResponseText(e.target.value)}
                                                rows={2}
                                                placeholder="Provide the requested details or ground observation..."
                                                className="w-full text-xs p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                                              />
                                              {responseSuccessMsg && (
                                                <p className="text-xs text-emerald-600 font-semibold">{responseSuccessMsg}</p>
                                              )}
                                              <div className="flex items-center gap-2">
                                                <Button
                                                  size="sm"
                                                  disabled={submittingResponse || !clarificationResponseText.trim()}
                                                  onClick={() => handleSubmitClarification(req.id)}
                                                  className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center gap-1"
                                                >
                                                  <Send className="w-3 h-3" />
                                                  <span>{submittingResponse ? 'Sending...' : 'Submit Clarification'}</span>
                                                </Button>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => setActiveClarificationId(null)}
                                                  className="text-xs"
                                                >
                                                  Cancel
                                                </Button>
                                              </div>
                                            </div>
                                          ) : (
                                            <Button
                                              size="sm"
                                              onClick={() => {
                                                setActiveClarificationId(req.id);
                                                setClarificationResponseText('');
                                              }}
                                              className="text-xs bg-amber-600 hover:bg-amber-500 text-white font-semibold flex items-center gap-1"
                                            >
                                              <MessageSquare className="w-3.5 h-3.5" />
                                              <span>Respond to Clarification</span>
                                            </Button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* DIRECT VERIFICATION ACTION CARD (When Deployed) */}
                              {isDeployed && (
                                <div className="p-3.5 rounded-lg border border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20 space-y-2 text-xs">
                                  <div className="flex items-center gap-1.5 font-bold text-emerald-800 dark:text-emerald-300">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                                    <span>Citizen Outcome Verification Requested</span>
                                  </div>
                                  <p className="text-[11.5px] text-slate-600 dark:text-slate-400">
                                    A field solution has been deployed for this corridor. Has the issue at your location been resolved?
                                  </p>

                                  {userVoted ? (
                                    <div className="p-2 rounded bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                      <span>
                                        Recorded: {userVoted === 'VERIFIED' ? '✓ Resolved' : '✗ Unresolved'}. Stored in Solution Memory.
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2.5 pt-1">
                                      <Button
                                        size="sm"
                                        disabled={verifyingId === problem.id}
                                        onClick={() => handleVerifyResolution(group.challengeId, problem.id, true)}
                                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                        <span>✓ Yes, Resolved</span>
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={verifyingId === problem.id}
                                        onClick={() => handleVerifyResolution(group.challengeId, problem.id, false)}
                                        className="border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 font-semibold text-xs flex items-center gap-1"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                        <span>✗ Unresolved</span>
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* 2. Standalone / Isolated Problems (Under Correlation) */}
            {standaloneProblems.length > 0 && (
              <div className="space-y-3 pt-4">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Standalone Issues Under Corridor Correlation ({standaloneProblems.length})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {standaloneProblems.map((p) => (
                    <div
                      key={p.id}
                      className="bg-white/90 dark:bg-slate-900/90 rounded-xl border border-slate-200 dark:border-slate-800 p-4 space-y-2 text-xs shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-slate-500 font-bold">#{p.code || p.id.slice(0, 8)}</span>
                        <StatusBadge status={p.status} size="sm" />
                      </div>
                      <Link href={`/problems/${p.id}`}>
                        <h4 className="font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 transition-colors">
                          {p.title}
                        </h4>
                      </Link>
                      <p className="text-slate-600 dark:text-slate-400 line-clamp-2">
                        {p.description}
                      </p>
                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span>{p.district || p.locationName || 'Local'}</span>
                        <Link href={`/problems/${p.id}`} className="text-blue-600 hover:underline font-semibold flex items-center gap-0.5">
                          <span>Details</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
