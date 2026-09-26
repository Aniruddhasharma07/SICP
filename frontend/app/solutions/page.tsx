'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { PageHeader } from '../../src/components/ui/PageHeader';
import { MetricCard } from '../../src/components/ui/MetricCard';
import { Input } from '../../src/components/ui/Input';
import { Alert } from '../../src/components/ui/Alert';
import { useAuth } from '../../src/lib/auth-context';
import { apiClient } from '../../src/lib/api-client';
import {
  SolutionMemoryDto,
  ReusabilityClass,
  EvidenceLevel,
  MemoryOutcomeStatus,
  SolutionComparisonDto,
  KnowledgeAssistantResponseDto,
  KnowledgeAnalyticsDto,
} from '@sicp/shared';
import {
  Search,
  Filter,
  BrainCircuit,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Layers,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Sparkles,
  Send,
  X,
  HelpCircle,
  BarChart3,
  Award,
  ShieldCheck,
  Compass,
} from 'lucide-react';
import { cn } from '../../src/lib/utils';
import { CompareCaseDrawer } from '../../src/components/intelligence/CompareCaseDrawer';
import { IntelligenceTrace } from '../../src/components/common/IntelligenceTrace';

export default function SolutionsRepositoryPage() {
  const { user } = useAuth();

  // Solution List & Filters State
  const [solutions, setSolutions] = useState<SolutionMemoryDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [reusabilityFilter, setReusabilityFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');

  // Analytics Stats State
  const [analytics, setAnalytics] = useState<KnowledgeAnalyticsDto | null>(null);

  // Comparison State
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [comparisonModalOpen, setComparisonModalOpen] = useState(false);
  const [comparisonData, setComparisonData] = useState<SolutionComparisonDto | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerCases, setDrawerCases] = useState<any[]>([]);

  const handleOpenDrawerComparison = () => {
    const selectedCases = solutions.filter(s => selectedForCompare.includes(s.id));
    if (selectedCases.length === 0) return;
    setDrawerCases(selectedCases);
    setDrawerOpen(true);
  };

  // AI Knowledge Assistant State
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantQuery, setAssistantQuery] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantResponse, setAssistantResponse] = useState<KnowledgeAssistantResponseDto | null>(null);

  // Active Problem Context
  const [activeProblemId, setActiveProblemId] = useState<string>('');

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('problemId') || '';
    if (pId) {
      setActiveProblemId(pId);
    }
  }, []);

  const fetchSolutions = async () => {
    setLoading(true);
    const queryParams = new URLSearchParams();
    if (searchQuery.trim()) queryParams.set('query', searchQuery.trim());
    if (categoryFilter) queryParams.set('category', categoryFilter);
    if (reusabilityFilter) queryParams.set('reusabilityClass', reusabilityFilter);
    if (outcomeFilter) queryParams.set('outcomeStatus', outcomeFilter);

    const res = await apiClient.request<{ items: SolutionMemoryDto[]; total: number }>(
      `/api/v1/solutions?${queryParams.toString()}`
    );

    if (res.success && res.data) {
      setSolutions(res.data.items || []);
      setTotal(res.data.total || 0);
    }
    setLoading(false);
  };

  const fetchAnalytics = async () => {
    const res = await apiClient.request<KnowledgeAnalyticsDto>('/api/v1/knowledge/analytics');
    if (res.success && res.data) {
      setAnalytics(res.data);
    }
  };

  useEffect(() => {
    fetchSolutions();
    fetchAnalytics();
  }, [categoryFilter, reusabilityFilter, outcomeFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSolutions();
  };

  const toggleCompare = (id: string) => {
    if (selectedForCompare.includes(id)) {
      setSelectedForCompare(selectedForCompare.filter(item => item !== id));
    } else {
      if (selectedForCompare.length >= 3) {
        alert('You can compare a maximum of 3 solutions simultaneously.');
        return;
      }
      setSelectedForCompare([...selectedForCompare, id]);
    }
  };

  const handleOpenComparison = async () => {
    if (selectedForCompare.length < 2) {
      alert('Please select at least 2 solutions to compare.');
      return;
    }
    setComparisonLoading(true);
    setComparisonModalOpen(true);
    const res = await apiClient.request<SolutionComparisonDto>('/api/v1/solutions/compare', {
      method: 'POST',
      body: JSON.stringify({ solutionIds: selectedForCompare }),
    });
    if (res.success && res.data) {
      setComparisonData(res.data);
    }
    setComparisonLoading(false);
  };

  const handleAskAssistant = async (queryToAsk?: string) => {
    const q = queryToAsk || assistantQuery;
    if (!q.trim()) return;

    setAssistantLoading(true);
    setAssistantResponse(null);
    const res = await apiClient.request<KnowledgeAssistantResponseDto>('/api/v1/knowledge/assistant', {
      method: 'POST',
      body: JSON.stringify({ query: q.trim() }),
    });

    if (res.success && res.data) {
      setAssistantResponse(res.data);
    }
    setAssistantLoading(false);
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

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
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
                  Browsing cross-institutional solution precedents for problem inquiry. Return to Problem Intelligence at any time.
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

        {/* Standardized Elite Page Header */}
        <PageHeader
          title="AI Solution Memory & Institutional Precedents"
          subtitle="Searchable intelligence vault of verified civic engineering interventions, failure lessons, cross-district reusability scores, and anti-hallucinating AI knowledge synthesis."
          portalBadge={{ text: 'Solution Intelligence', variant: 'university' }}
          breadcrumbs={[
            { label: 'SICP', href: '/' },
            { label: 'Solution Memory' },
          ]}
          actions={
            <Button
              onClick={() => setAssistantOpen(true)}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs flex items-center gap-2 text-xs font-bold"
            >
              <Sparkles className="w-4 h-4 text-cyan-200 animate-pulse" />
              <span>Ask Knowledge Assistant</span>
            </Button>
          }
        />
        {/* 13-Stage Canonical Intelligence Continuum Trace: Stage 13 - Solution Memory */}
        <IntelligenceTrace
          activeStage="memory"
          dominantActionLabel="Synthesize Precedents"
          onStageClick={(stage) => {
            if (stage === 'problem' || stage === 'connected') {
              window.location.href = '/challenges';
            } else if (stage === 'systemic' || stage === 'infrastructure' || stage === 'investigation' || stage === 'sentinel' || stage === 'hypotheses' || stage === 'validation') {
              window.location.href = '/government/systemic-intelligence';
            } else if (stage === 'collaboration' || stage === 'intervention') {
              window.location.href = '/university';
            }
          }}
        />

        {/* Actionable Analytics Metric Cards */}
        {analytics && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <MetricCard
              title="Verified Solutions"
              value={analytics.totalMemories}
              subtitle="Peer-reviewed engineering pilots"
              icon={<BookOpen className="w-4 h-4" />}
              variant="default"
              isActive={reusabilityFilter === '' && outcomeFilter === ''}
              onClick={() => {
                setReusabilityFilter('');
                setOutcomeFilter('');
              }}
            />
            <MetricCard
              title="Highly Reusable"
              value={analytics.memoriesByReusability[ReusabilityClass.HIGHLY_REUSABLE] || 0}
              subtitle="Plug-and-play field blueprints"
              icon={<Award className="w-4 h-4" />}
              variant="success"
              isActive={reusabilityFilter === 'HIGHLY_REUSABLE'}
              onClick={() => setReusabilityFilter('HIGHLY_REUSABLE')}
            />
            <MetricCard
              title="Civic Domains"
              value={Object.keys(analytics.memoriesByDomain || {}).length}
              subtitle="Water, energy, transit, health"
              icon={<Layers className="w-4 h-4" />}
              variant="info"
            />
            <MetricCard
              title="Failure Lessons"
              value={analytics.commonFailureCauses?.length || 0}
              subtitle="Documented operational warnings"
              icon={<AlertTriangle className="w-4 h-4" />}
              variant="warning"
              isActive={outcomeFilter === 'FAILED'}
              onClick={() => setOutcomeFilter('FAILED')}
            />
          </div>
        )}

        {/* Canonical Memory Status Navigation Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs border-b border-slate-200 dark:border-slate-800">
          {[
            { id: '', label: 'All Precedents', count: total },
            { id: 'SUCCESSFUL', label: '🟢 Worked Before', count: analytics?.memoriesByOutcome?.successful ?? 0 },
            { id: 'FAILED', label: '🔴 Failed Before', count: analytics?.memoriesByOutcome?.failed ?? 0 },
            { id: 'PARTIALLY_EFFECTIVE', label: '🟡 Mixed Results', count: analytics?.memoriesByOutcome?.partiallyEffective ?? 0 },
            { id: 'UNDER_EVALUATION', label: '⚪ Under Evaluation', count: analytics?.memoriesByOutcome?.underEvaluation ?? 0 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setOutcomeFilter(tab.id)}
              className={cn(
                'px-3.5 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer',
                outcomeFilter === tab.id
                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700'
              )}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span className={cn(
                  'text-[10px] px-1.5 py-0.2 rounded-full font-bold',
                  outcomeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search & Filter Toolbar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
          <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-500" />
              <Input
                type="text"
                placeholder="Search solutions by keyword, technology, root cause, or location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="primary">
              Search
            </Button>
          </form>

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            <span className="text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Filters:
            </span>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-700 dark:text-slate-200 text-xs"
            >
              <option value="">All Categories</option>
              <option value="WATER_SUPPLY">Water Supply</option>
              <option value="ROAD_INFRASTRUCTURE">Road & Transport</option>
              <option value="ENERGY">Energy & Power</option>
              <option value="HEALTHCARE">Healthcare Services</option>
              <option value="EDUCATION">Education</option>
              <option value="AGRICULTURE">Agriculture</option>
              <option value="SANITATION">Sanitation & Waste</option>
            </select>

            <select
              value={reusabilityFilter}
              onChange={e => setReusabilityFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-700 dark:text-slate-200 text-xs"
            >
              <option value="">All Reusability Classes</option>
              <option value="HIGHLY_REUSABLE">Highly Reusable</option>
              <option value="CONDITIONALLY_REUSABLE">Conditionally Reusable</option>
              <option value="REQUIRES_ADAPTATION">Requires Adaptation</option>
              <option value="NOT_RECOMMENDED">Not Recommended</option>
            </select>

            <select
              value={outcomeFilter}
              onChange={e => setOutcomeFilter(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 text-slate-700 dark:text-slate-200 text-xs"
            >
              <option value="">All Outcomes</option>
              <option value="SUCCESSFUL">Successful</option>
              <option value="PARTIALLY_EFFECTIVE">Partially Effective</option>
              <option value="FAILED">Failed</option>
              <option value="UNDER_EVALUATION">Under Evaluation</option>
            </select>

            {(searchQuery || categoryFilter || reusabilityFilter || outcomeFilter) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setCategoryFilter('');
                  setReusabilityFilter('');
                  setOutcomeFilter('');
                }}
                className="text-xs h-7 py-0"
              >
                Reset Filters
              </Button>
            )}

            {selectedForCompare.length > 0 && (
              <div className="ml-auto flex items-center gap-2">
                <span className="text-blue-700 dark:text-blue-400 font-semibold">{selectedForCompare.length} selected</span>
                <Button
                  size="sm"
                  variant="primary"
                  onClick={handleOpenDrawerComparison}
                  className="text-xs h-7 py-0 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                >
                  Side-by-side Analysis ({selectedForCompare.length})
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedForCompare([])}
                  className="text-xs h-7 py-0"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Solutions Grid / List */}
        {loading ? (
          <div className="py-16 text-center text-slate-500">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Retrieving verified solutions from memory...</p>
          </div>
        ) : solutions.length === 0 ? (
          <Card className="bg-white dark:bg-slate-900 border-dashed border-2 border-slate-200 dark:border-slate-800 text-center py-16">
            <CardContent className="space-y-4 max-w-md mx-auto">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400 dark:text-slate-500">
                <Search className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">No verified solutions found</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  SICP strictly does not hallucinate or fabricate unverified cases. No solution memories matched your specific search criteria.
                </p>
              </div>
              <div className="flex justify-center gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchQuery('');
                    setCategoryFilter('');
                    setReusabilityFilter('');
                    setOutcomeFilter('');
                  }}
                >
                  Clear Filters
                </Button>
                <Link href="/challenges/new">
                  <Button size="sm" variant="primary">
                    Submit as New Civic Problem
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Showing {solutions.length} of {total} verified solution memories
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {solutions.map(sol => {
                const isSelected = selectedForCompare.includes(sol.id);
                return (
                  <Card
                    key={sol.id}
                    className={`transition-all hover:shadow-md border ${
                      isSelected ? 'border-blue-500 ring-1 ring-blue-500 bg-blue-50/20 dark:bg-blue-950/20' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="secondary">{sol.challengeCategory.replace('_', ' ')}</Badge>
                            {getReusabilityBadge(sol.reusabilityClass)}
                            <Badge variant="outline" className="text-[10px]">
                              {sol.evidenceLevel}
                            </Badge>
                          </div>
                          <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <Link href={`/solutions/${sol.id}`}>{sol.title}</Link>
                          </CardTitle>
                        </div>

                        <label className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border border-slate-200 dark:border-slate-700">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleCompare(sol.id)}
                            className="rounded border-slate-300 dark:border-slate-600 text-blue-600 focus:ring-blue-500"
                          />
                          <span>Compare</span>
                        </label>
                      </div>

                      <CardDescription className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 mt-1">
                        {sol.summary || sol.problemSummary}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-3 pt-0 text-xs">
                      {/* Technical Approach Snippet */}
                      <div className="bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
                        <span className="font-semibold text-slate-700 dark:text-slate-200">Approach: </span>
                        <span className="text-slate-600 dark:text-slate-300 line-clamp-2">{sol.technicalApproach}</span>
                      </div>

                      {/* Failure Warning Callout if present */}
                      {(sol.futureWarnings || sol.whatFailed) && (
                        <div className="bg-amber-50/80 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200 p-2.5 rounded-lg flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                          <div className="text-[11px] leading-tight">
                            <span className="font-semibold">Operational Warning: </span>
                            <span className="line-clamp-1">{sol.futureWarnings || sol.whatFailed}</span>
                          </div>
                        </div>
                      )}

                      {/* Reusability Score Bar */}
                      {sol.reusabilityScore != null && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            <span>Reusability Index</span>
                            <span className="font-bold text-slate-800 dark:text-slate-200">{sol.reusabilityScore}/100</span>
                          </div>
                          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                sol.reusabilityScore >= 80
                                  ? 'bg-emerald-500'
                                  : sol.reusabilityScore >= 60
                                    ? 'bg-blue-500'
                                    : sol.reusabilityScore >= 40
                                      ? 'bg-amber-500'
                                      : 'bg-rose-500'
                              }`}
                              style={{ width: `${sol.reusabilityScore}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Card Footer Actions */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-[11px] text-slate-400 dark:text-slate-500">
                          {sol.reuseCount > 0 ? `Reused ${sol.reuseCount} times` : 'Ready for adoption'}
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setDrawerCases([sol]);
                              setDrawerOpen(true);
                            }}
                            className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer"
                          >
                            Inspect Specs
                          </button>
                          <Link href={`/solutions/${sol.id}`}>
                            <Button variant="ghost" size="sm" className="text-xs h-7 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 p-0 flex items-center gap-1 cursor-pointer">
                              <span>Full Case</span>
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Button>
                          </Link>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* Side-by-Side Solution Comparison Modal */}
        {comparisonModalOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-800">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/60">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-lg">Multi-Solution Comparative Evaluation</h3>
                </div>
                <button
                  onClick={() => setComparisonModalOpen(false)}
                  className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {comparisonLoading ? (
                  <div className="py-12 text-center text-slate-500 dark:text-slate-400">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-xs">Computing side-by-side dimensions...</p>
                  </div>
                ) : comparisonData ? (
                  <div className="space-y-6">
                    {/* Header Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
                      {comparisonData.solutions.map(sol => (
                        <div key={sol.id} className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1">
                          <Badge variant="outline" className="text-[10px]">
                            {sol.category}
                          </Badge>
                          <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm line-clamp-2">{sol.title}</h4>
                          <div className="flex items-center gap-2 text-xs">
                            {getReusabilityBadge(sol.reusabilityClass)}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Dimension 1: Problem & Root Cause */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        1. Problem Formulation & Root Cause
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {comparisonData.solutions.map(sol => (
                          <div key={sol.id} className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                            {comparisonData.comparisonDimensions.problemAndRootCause[sol.id]}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dimension 2: Technology & Approach */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        2. Technical Architecture & Methodology
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {comparisonData.solutions.map(sol => (
                          <div key={sol.id} className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700 font-mono text-[11px]">
                            {comparisonData.comparisonDimensions.technologyAndApproach[sol.id]}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dimension 3: Outcomes & Impact */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        3. Field Outcomes & Verified Evidence
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {comparisonData.solutions.map(sol => (
                          <div key={sol.id} className="text-xs text-slate-700 dark:text-slate-300 bg-emerald-50/50 dark:bg-emerald-950/40 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                            {comparisonData.comparisonDimensions.outcomesAndImpact[sol.id]}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Dimension 4: Failure Modes & Limitations */}
                    <div className="space-y-2">
                      <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        4. Known Failure Modes & Operational Warnings
                      </h5>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {comparisonData.solutions.map(sol => (
                          <div key={sol.id} className="text-xs text-slate-700 dark:text-slate-300 bg-amber-50/60 dark:bg-amber-950/40 p-3 rounded-lg border border-amber-200 dark:border-amber-800">
                            {comparisonData.comparisonDimensions.limitationsAndFailureModes[sol.id]}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end bg-slate-50 dark:bg-slate-800/60">
                <Button variant="outline" onClick={() => setComparisonModalOpen(false)}>
                  Close Comparison
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* AI Knowledge Assistant Drawer */}
        {assistantOpen && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex justify-end">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200 border-l border-slate-200 dark:border-slate-800">
              <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-blue-200" />
                  <div>
                    <h3 className="font-bold text-base">SICP Knowledge Assistant</h3>
                    <p className="text-[11px] text-blue-100">Grounded exclusively in verified platform records</p>
                  </div>
                </div>
                <button
                  onClick={() => setAssistantOpen(false)}
                  className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {/* Intro banner */}
                <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-900 dark:text-blue-200 space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Strict Anti-Hallucination Guarantee
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    This assistant does not invent synthetic precedents. Every cited solution, project, and failure warning is backed by actual database records and verified field audits.
                  </p>
                </div>

                {/* Prompt Suggestions */}
                {!assistantResponse && !assistantLoading && (
                  <div className="space-y-2 pt-2">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Sample inquiries:</span>
                    <div className="space-y-1.5">
                      {[
                        'What solutions have worked for fluoride and turbidity in groundwater?',
                        'What are common failure modes in rural solar microgrid projects?',
                        'Which interventions have highest reusability in road repair?',
                      ].map((sample, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setAssistantQuery(sample);
                            handleAskAssistant(sample);
                          }}
                          className="w-full text-left p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-blue-300 dark:hover:border-blue-700 transition-colors flex items-center justify-between cursor-pointer"
                        >
                          <span>{sample}</span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Loading State */}
                {assistantLoading && (
                  <div className="py-12 text-center text-slate-500 dark:text-slate-400 space-y-2">
                    <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-xs font-medium">Scanning verified institutional memory...</p>
                  </div>
                )}

                {/* Assistant Output */}
                {assistantResponse && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    {/* Confidence & Evidence Quality */}
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-500 dark:text-slate-400">Evidence Quality:</span>
                      <Badge
                        variant={
                          assistantResponse.evidenceQuality === 'HIGH_CONFIDENCE'
                            ? 'success'
                            : assistantResponse.evidenceQuality === 'MEDIUM_CONFIDENCE'
                              ? 'default'
                              : 'warning'
                        }
                      >
                        {assistantResponse.evidenceQuality.replace('_', ' ')}
                      </Badge>
                    </div>

                    {/* Synthesized Answer */}
                    <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      {assistantResponse.answer}
                    </div>

                    {/* Historical Warnings */}
                    {assistantResponse.historicalWarnings.length > 0 && (
                      <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs text-amber-900 dark:text-amber-200 space-y-1.5">
                        <div className="font-bold flex items-center gap-1.5 text-amber-800 dark:text-amber-300">
                          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                          Precedent Failure Warnings
                        </div>
                        <ul className="list-disc pl-4 space-y-1 text-[11px]">
                          {assistantResponse.historicalWarnings.map((warn, i) => (
                            <li key={i}>{warn}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Cited Records */}
                    {assistantResponse.citations.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Verified Evidence Sources:</span>
                        <div className="space-y-1.5">
                          {assistantResponse.citations.map((cite, i) => (
                            <Link
                              key={i}
                              href={cite.actionUrl}
                              className="block p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/40 dark:hover:bg-blue-950/40 transition-colors"
                            >
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-bold text-blue-700 dark:text-blue-400">{cite.recordTitle}</span>
                                <Badge variant="outline" className="text-[10px]">
                                  {cite.recordType}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                                {cite.relevanceContext}
                              </p>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Suggested Follow-Ups */}
                    {assistantResponse.suggestedFollowUpQuestions.length > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Related follow-ups:</span>
                        <div className="space-y-1">
                          {assistantResponse.suggestedFollowUpQuestions.map((q, i) => (
                            <button
                              key={i}
                              onClick={() => {
                                setAssistantQuery(q);
                                handleAskAssistant(q);
                              }}
                              className="w-full text-left text-[11px] text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:underline py-1 block cursor-pointer"
                            >
                              • {q}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Chat Input Footer */}
              <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleAskAssistant();
                  }}
                  className="flex gap-2"
                >
                  <Input
                    type="text"
                    placeholder="Ask about solutions, failures, or reusability..."
                    value={assistantQuery}
                    onChange={e => setAssistantQuery(e.target.value)}
                    className="flex-1 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs"
                    disabled={assistantLoading}
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={assistantLoading || !assistantQuery.trim()}
                    className="flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Ask</span>
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Side-by-side Historical Precedent Comparison Drawer */}
        <CompareCaseDrawer
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          historicalCases={drawerCases}
        />
      </div>
    </AppLayout>
  );
}
