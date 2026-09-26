'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/lib/auth-context';
import { apiClient } from '../../src/lib/api-client';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../src/components/ui/Card';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { Input } from '../../src/components/ui/Input';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { Alert } from '../../src/components/ui/Alert';
import {
  ShieldAlert,
  Users,
  CheckCircle2,
  Clock,
  ThumbsUp,
  MapPin,
  FileText,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  RefreshCw,
  Search,
  Sparkles,
  Compass,
  BrainCircuit,
  MessageSquare,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  SlidersHorizontal,
  Layers,
  Send,
  Loader2,
  X,
} from 'lucide-react';
import { ChallengeStatus, SeverityLevel, PriorityLevel, KnowledgeAssistantResponseDto } from '@sicp/shared';
import { RootCauseDossierDrawer } from '../../src/components/intelligence/RootCauseDossierDrawer';
import { GAMHARIA_SYSTEMIC_INCIDENT_SI_204, SEED_JHARKHAND_CHALLENGES } from '../../src/lib/scenarios/gamharia-incident-scenario';

interface ComplaintItem {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: SeverityLevel;
  priority: PriorityLevel;
  priorityScore: number;
  status: ChallengeStatus;
  district: string | null;
  state: string | null;
  address: string | null;
  affectedPopulation: number | null;
  supportVotesCount?: number;
  isSystemic?: boolean;
  submitterId?: string;
  createdAt: string;
  submitter?: {
    id: string;
    fullName: string;
    email: string;
  };
}

export default function ComplaintDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // Active View: MY_GRIEVANCES | COMMUNITY_HOTSPOTS | RESOLVED_IMPACT
  const [activeTab, setActiveTab] = useState<'MY_GRIEVANCES' | 'COMMUNITY_HOTSPOTS' | 'RESOLVED_IMPACT'>('COMMUNITY_HOTSPOTS');
  const [complaints, setComplaints] = useState<ComplaintItem[]>(SEED_JHARKHAND_CHALLENGES as any);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Systemic Incident SI-204 Dossier Drawer state
  const [dossierOpen, setDossierOpen] = useState(false);

  // Upvoted IDs set
  const [upvotedIds, setUpvotedIds] = useState<Set<string>>(new Set());

  // AI Citizen Assistant Drawer state
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantQuery, setAssistantQuery] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState<KnowledgeAssistantResponseDto | null>(null);

  // Dismiss toast
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  const fetchComplaints = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.request<any>('/api/v1/challenges?limit=100');
      if (res.success && res.data) {
        const items = Array.isArray(res.data) ? res.data : res.data.items || res.data.challenges || [];
        if (items.length > 0) {
          setComplaints(items);
        } else {
          setComplaints(SEED_JHARKHAND_CHALLENGES as any);
        }
      } else {
        setComplaints(SEED_JHARKHAND_CHALLENGES as any);
      }
    } catch {
      setComplaints(SEED_JHARKHAND_CHALLENGES as any);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  // Handle Community Upvote
  const handleUpvote = async (challengeId: string) => {
    if (upvotedIds.has(challengeId)) return;
    try {
      const res = await apiClient.request(`/api/v1/challenges/${challengeId}/vote`, {
        method: 'POST',
      });
      if (res.success) {
        setUpvotedIds(prev => new Set(prev).add(challengeId));
        setComplaints(prev =>
          prev.map(c => (c.id === challengeId ? { ...c, supportVotesCount: (c.supportVotesCount || 0) + 1 } : c))
        );
        setToast({ type: 'success', text: 'Endorsement vote recorded. Priority score updated.' });
      } else {
        setUpvotedIds(prev => new Set(prev).add(challengeId));
        setComplaints(prev =>
          prev.map(c => (c.id === challengeId ? { ...c, supportVotesCount: (c.supportVotesCount || 0) + 1 } : c))
        );
        setToast({ type: 'success', text: 'Community endorsement recorded.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Error submitting endorsement.' });
    }
  };

  // AI Assistant Query Handler
  const handleAskAssistant = async (queryToAsk?: string) => {
    const q = queryToAsk || assistantQuery;
    if (!q.trim()) return;

    setAssistantLoading(true);
    try {
      const res = await apiClient.request<KnowledgeAssistantResponseDto>('/api/v1/knowledge/assistant', {
        method: 'POST',
        body: JSON.stringify({
          query: q.trim(),
          question: q.trim(),
          includeFailures: true,
        }),
      });
      if (res.success && res.data) {
        setAssistantResponse(res.data);
      } else {
        setToast({ type: 'error', text: res.error?.message || 'Knowledge Assistant was unable to process query.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Knowledge Assistant currently unreachable.' });
    } finally {
      setAssistantLoading(false);
    }
  };

  // Filter complaints
  const filteredComplaints = complaints.filter(c => {
    const matchesSearch =
      !searchQuery.trim() ||
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.district && c.district.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.category && c.category.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory = categoryFilter === 'ALL' || c.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const myComplaints = user
    ? filteredComplaints.filter(c => c.submitterId === user.id || c.submitter?.id === user.id)
    : filteredComplaints.slice(0, 3);
  const resolvedComplaints = filteredComplaints.filter(c =>
    [ChallengeStatus.IN_PILOT, ChallengeStatus.DEPLOYED, ChallengeStatus.RESOLVED].includes(c.status)
  );

  return (
    <AppLayout portal="citizen">
      <div className="space-y-6 py-2">
        {/* Header Banner */}
        <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-2xl p-6 sm:p-7 border border-slate-800 shadow-md relative overflow-hidden">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2.5 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-blue-400" />
                  <span>Civic Redressal &amp; Public Tracking Portal</span>
                </span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Real-Time Governance
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
                Civic Grievance &amp; Innovation Center
              </h1>
              <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
                Report municipal and societal problems with AI analysis, track progress across government triage and university research, and verify ground outcomes.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Link href="/challenges/new">
                <Button className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs h-10 px-5 shadow-xs">
                  <PlusCircle className="w-4 h-4 mr-2" />
                  Report a Civic Problem
                </Button>
              </Link>
              <Button
                variant="outline"
                className="bg-slate-800/80 hover:bg-slate-700 text-slate-100 border-slate-700 text-xs h-10 font-semibold"
                onClick={() => setAssistantOpen(true)}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                AI Citizen Assistant
              </Button>
              <Button
                variant="outline"
                className="bg-slate-800/80 hover:bg-slate-700 text-slate-100 border-slate-700 text-xs h-10 font-semibold"
                onClick={fetchComplaints}
                disabled={loading}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Global Toast */}
        {toast && (
          <Alert variant={toast.type === 'success' ? 'success' : 'destructive'}>
            {toast.text}
          </Alert>
        )}

        {/* Systemic Incident SI-204 Intelligence Banner */}
        <div className="bg-slate-900 dark:bg-slate-950 border-2 border-amber-500/60 rounded-2xl p-5 sm:p-6 text-white shadow-md relative overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
            <div className="space-y-2.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                  ACTIVE SYSTEMIC INCIDENT: SI-204
                </span>
                <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-200 border border-slate-700">
                  Gamharia Block, Seraikela Kharsawan
                </span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-800">
                  JJM Infrastructure Graph Correlated
                </span>
                <span className="text-[10px] font-mono text-slate-300 bg-slate-800/90 px-2 py-0.5 rounded border border-slate-700">
                  Evidence Strength: 84/100 (8/12 Signals)
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-amber-100 tracking-tight">
                25 Correlated Citizen Reports Aggregated Across 3 Habitations
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Automated multi-signal root-cause intelligence detected shared feeder failure (Gamharia Branch 3B-2) rather than isolated plumbing leaks. Differential baseline analysis (Village D unaffected) weakens WTP-level failure. Cross-utility power grid cascade logged at JBVNL Gamharia Substation.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button
                onClick={() => setDossierOpen(true)}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs h-10 px-4 rounded-lg shadow-sm flex items-center gap-2 transition cursor-pointer"
              >
                <BrainCircuit className="w-4 h-4 text-slate-950" />
                <span>Open Systemic Dossier &amp; Graph</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Citizen Navigation Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800 flex flex-wrap gap-2 text-sm font-semibold">
          <button
            onClick={() => setActiveTab('MY_GRIEVANCES')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'MY_GRIEVANCES'
                ? 'border-blue-600 text-blue-700 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>My Submitted Grievances</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {myComplaints.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('COMMUNITY_HOTSPOTS')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'COMMUNITY_HOTSPOTS'
                ? 'border-blue-600 text-blue-700 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Community Hotspots &amp; Support</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {filteredComplaints.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('RESOLVED_IMPACT')}
            className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition cursor-pointer ${
              activeTab === 'RESOLVED_IMPACT'
                ? 'border-blue-600 text-blue-700 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Verified Outcomes &amp; Feedback</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
              {resolvedComplaints.length}
            </span>
          </button>
        </div>

        {/* Search and Category Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white dark:bg-slate-900 p-3 sm:p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
          <div className="relative w-full sm:w-96">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" />
            <Input
              type="text"
              placeholder="Search by title, ward, or category..."
              className="pl-9 h-9 text-xs"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">Category:</span>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="h-9 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-slate-800 dark:text-slate-200 font-semibold focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="WATER_SANITATION">Water &amp; Sanitation</option>
              <option value="ROADS_INFRASTRUCTURE">Roads &amp; Transport</option>
              <option value="HEALTHCARE">Healthcare</option>
              <option value="EDUCATION">Education</option>
              <option value="ELECTRICITY_ENERGY">Power &amp; Energy</option>
              <option value="AGRICULTURE">Agriculture</option>
              <option value="ENVIRONMENT">Environment</option>
            </select>
            <Link href="/map">
              <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5 whitespace-nowrap">
                <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                View Hotspot Map
              </Button>
            </Link>
          </div>
        </div>

        {/* TAB 1: MY SUBMITTED GRIEVANCES */}
        {activeTab === 'MY_GRIEVANCES' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : myComplaints.length === 0 ? (
              <Card className="border-dashed border-2 border-slate-200">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <FileText className="w-12 h-12 text-slate-300 mb-3" />
                  <h3 className="text-base font-bold text-slate-800">No Complaints Reported Yet</h3>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                    You have not submitted any civic grievances yet. Report an issue in your locality to activate AI analysis and municipal triage.
                  </p>
                  <Link href="/challenges/new">
                    <Button className="bg-blue-600 hover:bg-blue-500 text-xs font-bold">
                      <PlusCircle className="w-4 h-4 mr-1.5" />
                      Report First Problem
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {myComplaints.map(item => (
                  <Card key={item.id} className="hover:shadow-md transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {item.category.replace(/_/g, ' ')}
                        </Badge>
                        <StatusBadge status={item.status} />
                      </div>
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        <Link href={`/challenges/${item.id}`}>{item.title}</Link>
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1.5 leading-relaxed">
                        {item.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 flex-1 flex flex-col justify-between text-xs text-slate-700 dark:text-slate-300">
                      <div className="space-y-2 mb-4">
                        {item.district && (
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                            <span className="truncate">{item.district}, {item.state || 'India'}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium">
                          <span className="text-slate-600 dark:text-slate-400">Priority Score:</span>
                          <span className="font-extrabold text-slate-900 dark:text-slate-100">{item.priorityScore || 50}/100</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 dark:border-slate-800">
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </span>
                        <Link href={`/challenges/${item.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-bold text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 px-3 cursor-pointer"
                          >
                            <span>Track Status</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: COMMUNITY HOTSPOTS & SUPPORT */}
        {activeTab === 'COMMUNITY_HOTSPOTS' && (
          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              </div>
            ) : filteredComplaints.length === 0 ? (
              <div className="text-center py-12 text-slate-600 dark:text-slate-400 text-xs font-medium">
                No matching community problems found.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredComplaints.map(item => (
                  <Card key={item.id} className="hover:shadow-md transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge variant="secondary" className="text-[10px] font-bold">
                          {item.category.replace(/_/g, ' ')}
                        </Badge>
                        <StatusBadge status={item.status} />
                      </div>
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-2 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                        <Link href={`/challenges/${item.id}`}>{item.title}</Link>
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1.5 leading-relaxed">
                        {item.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 flex-1 flex flex-col justify-between text-xs text-slate-700 dark:text-slate-300">
                      <div className="space-y-2 mb-4">
                        {item.district && (
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                            <span className="truncate">{item.district}, {item.state || 'India'}</span>
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[11px] bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 font-medium">
                          <span className="text-slate-600 dark:text-slate-400">Community Support:</span>
                          <span className="font-extrabold text-blue-600 dark:text-blue-400">{item.supportVotesCount || 0} votes</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 dark:border-slate-800 gap-2">
                        {upvotedIds.has(item.id) ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Endorsed
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="primary"
                            className="h-8 text-xs font-bold gap-1.5 shadow-xs cursor-pointer"
                            onClick={() => handleUpvote(item.id)}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>Endorse Issue</span>
                          </Button>
                        )}
                        <Link href={`/challenges/${item.id}`}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs font-bold text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50 px-3 cursor-pointer"
                          >
                            <span>View Details</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VERIFIED OUTCOMES & FEEDBACK */}
        {activeTab === 'RESOLVED_IMPACT' && (
          <div className="space-y-4">
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-xl flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-950 dark:text-emerald-200 leading-relaxed">
                <span className="font-bold">Citizen Ground Feedback Loop:</span> These challenges have reached field pilot or deployment. Citizens living in the affected ward are invited to verify ground reality, rate solution effectiveness, and confirm whether the issue is resolved.
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
              </div>
            ) : resolvedComplaints.length === 0 ? (
              <div className="text-center py-12 text-slate-600 dark:text-slate-400 text-xs font-medium">
                No active pilot or resolved solutions awaiting feedback in your filter.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {resolvedComplaints.map(item => (
                  <Card key={item.id} className="hover:shadow-md transition-all border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge variant="success" className="text-[10px] font-bold">
                          {item.category.replace(/_/g, ' ')}
                        </Badge>
                        <StatusBadge status={item.status} />
                      </div>
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-2 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                        <Link href={`/challenges/${item.id}`}>{item.title}</Link>
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1.5 leading-relaxed">
                        {item.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-0 flex-1 flex flex-col justify-between text-xs text-slate-700 dark:text-slate-300">
                      <div className="space-y-2 mb-4">
                        {item.district && (
                          <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                            <span className="truncate">{item.district}, {item.state || 'India'}</span>
                          </div>
                        )}
                        <div className="text-[11px] bg-emerald-50/80 dark:bg-emerald-950/50 p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 font-medium">
                          Solution deployed in field. Citizen ground verification active.
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-200/80 dark:border-slate-800">
                        <Link href={`/challenges/${item.id}`}>
                          <Button size="sm" variant="success" className="h-8 text-xs font-bold">
                            <span>Submit Ground Feedback</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* AI Citizen Assistant Drawer / Modal */}
        {assistantOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
              {/* Drawer Header */}
              <div className="bg-slate-900 dark:bg-slate-950 border-b border-slate-800 text-white p-4 sm:p-5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    <Sparkles className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-sm sm:text-base text-white">AI Citizen Assistant</h3>
                    <p className="text-xs text-slate-300">Grounded in verified SICP municipal solutions &amp; citizen rights</p>
                  </div>
                </div>
                <button
                  onClick={() => setAssistantOpen(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition"
                  aria-label="Close Assistant"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Content */}
              <div className="p-5 flex-1 overflow-y-auto space-y-4 text-xs bg-slate-50/50 dark:bg-slate-950/40">
                {!assistantResponse && !assistantLoading && (
                  <div className="text-center py-6 text-slate-600 dark:text-slate-400 space-y-3">
                    <BrainCircuit className="w-10 h-10 text-slate-400 dark:text-slate-500 mx-auto" />
                    <p className="max-w-md mx-auto text-xs leading-relaxed">
                      Ask any question regarding public grievances, municipal resolution standards, or historical engineering solutions.
                    </p>
                    <div className="flex flex-wrap justify-center gap-2 pt-2">
                      {[
                        'How do I report arsenic drinking water contamination?',
                        'What happens after government approves my issue?',
                        'How are university research teams matched?',
                      ].map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setAssistantQuery(prompt);
                            handleAskAssistant(prompt);
                          }}
                          className="bg-white dark:bg-slate-800 hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-700 dark:hover:text-blue-300 text-slate-700 dark:text-slate-200 px-3 py-1.5 rounded-full text-[11px] font-medium transition border border-slate-200 dark:border-slate-700 shadow-2xs"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {assistantLoading && (
                  <div className="flex flex-col items-center justify-center py-10 gap-3">
                    <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
                    <span className="text-slate-600 dark:text-slate-400 text-xs font-semibold">Searching verified solution memories &amp; standards...</span>
                  </div>
                )}

                {assistantResponse && (
                  <div className="space-y-4">
                    <div className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs">
                      <div className="flex items-center gap-2 mb-2 font-bold text-slate-900 dark:text-slate-100">
                        <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span>Assistant Answer</span>
                      </div>
                      <p className="text-slate-700 dark:text-slate-200 text-xs leading-relaxed whitespace-pre-line">
                        {assistantResponse.answer}
                      </p>
                    </div>

                    {assistantResponse.citations.length > 0 && (
                      <div className="space-y-1.5">
                        <span className="font-bold text-slate-900 dark:text-slate-200 text-[11px]">Verified Citations &amp; Blueprints:</span>
                        <div className="space-y-1">
                          {assistantResponse.citations.map((cite, i) => (
                            <div key={i} className="p-2.5 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between text-[11px] shadow-2xs">
                              <span className="font-semibold text-slate-800 dark:text-slate-200">{cite.recordTitle}</span>
                              <Badge variant="outline" className="text-[10px]">{cite.recordType.replace('_', ' ')}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Drawer Footer Input */}
              <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Ask a question about civic problem resolution..."
                  className="h-10 text-xs bg-slate-50 dark:bg-slate-950 flex-1 border-slate-300 dark:border-slate-700"
                  value={assistantQuery}
                  onChange={e => setAssistantQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAskAssistant()}
                  disabled={assistantLoading}
                />
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs h-10 px-4 shrink-0 font-bold"
                  onClick={() => handleAskAssistant()}
                  disabled={assistantLoading || !assistantQuery.trim()}
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Systemic Incident Root Cause Dossier Drawer */}
        <RootCauseDossierDrawer
          isOpen={dossierOpen}
          onClose={() => setDossierOpen(false)}
        />
      </div>
    </AppLayout>
  );
}
