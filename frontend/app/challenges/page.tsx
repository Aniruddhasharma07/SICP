'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { PageHeader } from '../../src/components/ui/PageHeader';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { apiClient } from '../../src/lib/api-client';
import { ChallengeDto, SeverityLevel } from '@sicp/shared';
import {
  PlusCircle,
  Search,
  MapPin,
  Heart,
  Users,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Flame,
  ArrowRight,
  RefreshCw,
  Clock,
} from 'lucide-react';

import { SEED_JHARKHAND_CHALLENGES } from '../../src/lib/scenarios/gamharia-incident-scenario';
import { ProblemRelationshipSummary } from '../../src/components/problem/ProblemRelationshipSummary';

export default function ChallengesExplorerPage() {
  const [challenges, setChallenges] = useState<ChallengeDto[]>(SEED_JHARKHAND_CHALLENGES as any);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const query = selectedStatus !== 'ALL' ? `?status=${selectedStatus}` : '';
      const res = await apiClient.request<{ items: ChallengeDto[]; total: number }>(`/api/v1/challenges${query}`);
      if (res.success && res.data && (res.data.items || []).length > 0) {
        setChallenges(res.data.items);
      } else {
        setChallenges(SEED_JHARKHAND_CHALLENGES as any);
      }
    } catch {
      setChallenges(SEED_JHARKHAND_CHALLENGES as any);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, [selectedStatus]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    challenges.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [challenges]);

  const filteredChallenges = useMemo(() => {
    return challenges.filter((c) => {
      const matchesSearch =
        !searchQuery.trim() ||
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.district?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory =
        selectedCategory === 'ALL' || c.category?.toLowerCase() === selectedCategory.toLowerCase();

      const matchesSeverity =
        selectedSeverity === 'ALL' || c.severity === selectedSeverity;

      return matchesSearch && matchesCategory && matchesSeverity;
    });
  }, [challenges, searchQuery, selectedCategory, selectedSeverity]);

  const statuses = [
    { id: 'ALL', label: 'All Challenges' },
    { id: 'SUBMITTED', label: 'Submitted' },
    { id: 'UNDER_GOV_REVIEW', label: 'Under Review' },
    { id: 'APPROVED', label: 'Gov Approved' },
    { id: 'ASSIGNED_TO_UNIVERSITY', label: 'Assigned' },
    { id: 'IN_PILOT', label: 'In Pilot' },
    { id: 'RESOLVED', label: 'Resolved' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Elite Page Header */}
        <PageHeader
          title="Societal Problem Registry"
          subtitle="Explore verified community problems, track civic intervention lifecycles, and discover university research opportunities."
          portalBadge={{ text: 'Civic Discovery', variant: 'civic' }}
          breadcrumbs={[
            { label: 'SICP', href: '/' },
            { label: 'Problem Explorer' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchChallenges}
                className="text-xs flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </Button>
              <Link href="/challenges/new">
                <Button size="sm" className="text-xs flex items-center gap-1.5 shadow-xs">
                  <PlusCircle className="w-4 h-4" />
                  <span>Report Problem</span>
                </Button>
              </Link>
            </div>
          }
        />

        {/* Search & Filter Command Strip */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-3 md:p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search problems by keywords, locality, or district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Domain:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-blue-500 font-medium text-slate-800 dark:text-slate-200"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-blue-500 font-medium text-slate-800 dark:text-slate-200"
              >
                <option value="ALL">All Severities</option>
                <option value={SeverityLevel.CATASTROPHIC}>Catastrophic</option>
                <option value={SeverityLevel.SEVERE}>Severe</option>
                <option value={SeverityLevel.MODERATE}>Moderate</option>
                <option value={SeverityLevel.LOW}>Low</option>
              </select>
            </div>
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100 dark:border-slate-800">
            {statuses.map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedStatus === st.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
                }`}
              >
                {st.label}
              </button>
            ))}
            <span className="text-xs text-slate-600 dark:text-slate-400 font-medium ml-auto pl-2 shrink-0">
              {filteredChallenges.length} problems shown
            </span>
          </div>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-52 rounded-xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200 dark:border-slate-700" />
            ))}
          </div>
        ) : filteredChallenges.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">No Matching Problems Found</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm mx-auto">
              Try adjusting your search keywords, clearing domain filters, or report this community problem to initiate evaluation.
            </p>
            <div className="flex justify-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setSelectedSeverity('ALL');
                  setSelectedStatus('ALL');
                }}
                className="text-xs"
              >
                Clear All Filters
              </Button>
              <Link href="/challenges/new">
                <Button size="sm" className="text-xs">
                  Report Problem
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
            {filteredChallenges.map((c) => {
              const sev = c.severity || SeverityLevel.MODERATE;
              return (
                <div
                  key={c.id}
                  className="group relative bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all duration-150 h-full flex flex-col justify-between overflow-visible p-4.5 space-y-3"
                >
                  <div className="space-y-2.5">
                    {/* Header Row: Status on left, Category & Systemic on right */}
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={c.status} size="sm" />
                      <div className="flex items-center gap-1.5">
                        {c.isSystemic && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-purple-50 dark:bg-purple-950/70 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                            <Layers className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                            <span>Systemic</span>
                          </span>
                        )}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10.5px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          {c.category?.replace(/_/g, ' ') || 'Civic'}
                        </span>
                      </div>
                    </div>

                    {/* LEVEL 1: Problem Title (Dominant Visual Element) */}
                    <Link href={`/challenges/${c.id}`} className="block focus:outline-hidden">
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                        {c.title}
                      </h3>
                    </Link>

                    {/* LEVEL 2: Problem Description (Clearly Secondary) */}
                    <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                      {c.description}
                    </p>

                    {/* LEVEL 3: Location + Priority Score */}
                    <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 min-w-0 truncate">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                        <span className="truncate font-medium">
                          {c.district ? `${c.district}, ${c.state || ''}` : 'Location pending'}
                        </span>
                        {c.affectedPopulation ? (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0 hidden sm:inline">
                            • {c.affectedPopulation.toLocaleString()} affected
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1 shrink-0 font-mono font-bold text-blue-700 dark:text-blue-400 text-xs">
                        <Flame className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>{c.priorityScore !== undefined ? `${c.priorityScore} / 100` : 'Evaluating'}</span>
                        <span className="text-[10px] uppercase font-sans font-semibold text-slate-500 dark:text-slate-400 ml-0.5">
                          Priority
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 space-y-2.5">
                    {/* LEVEL 4: Relationship Intelligence Badges */}
                    <ProblemRelationshipSummary challenge={c} />

                    {/* LEVEL 5: Citizen Endorsements + Workspace CTA */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-slate-600 dark:text-slate-400 font-medium">
                        {c.supportVotesCount || 0} citizen {c.supportVotesCount === 1 ? 'endorsement' : 'endorsements'}
                      </span>

                      <Link
                        href={`/challenges/${c.id}`}
                        className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors group-hover:translate-x-0.5"
                      >
                        <span>Workspace</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
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
