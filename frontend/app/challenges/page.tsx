'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { PageHeader } from '../../src/components/ui/PageHeader';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { StatusBadge } from '../../src/components/ui/StatusBadge';
import { apiClient } from '../../src/lib/api-client';
import { ChallengeDto, SeverityLevel } from '@sicp/shared';
import { CanonicalLifecycleTracker, resolveStageIndex } from '../../src/components/challenge/CanonicalLifecycleTracker';
import {
  PlusCircle,
  Search,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  SlidersHorizontal,
  Flame,
  ArrowRight,
  RefreshCw,
  Users,
  CheckCircle2,
  XCircle,
  ArrowUpDown,
} from 'lucide-react';

export default function ChallengesExplorerPage() {
  const [challenges, setChallenges] = useState<ChallengeDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('DATE_DESC');

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const res = await apiClient.request<{ items: ChallengeDto[]; total: number }>(`/api/v1/challenges?limit=100`);
      if (res.success && res.data && Array.isArray(res.data.items)) {
        setChallenges(res.data.items);
      } else {
        setChallenges([]);
      }
    } catch {
      setChallenges([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    challenges.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return ['ALL', ...Array.from(set)];
  }, [challenges]);

  const filteredChallenges = useMemo(() => {
    const list = challenges.filter((c) => {
      // Search matches
      const matchesSearch =
        !searchQuery.trim() ||
        c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.district?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.state?.toLowerCase().includes(searchQuery.toLowerCase());

      // Category matches
      const matchesCategory =
        selectedCategory === 'ALL' || c.category?.toLowerCase() === selectedCategory.toLowerCase();

      // Severity matches
      const matchesSeverity =
        selectedSeverity === 'ALL' || c.severity === selectedSeverity;

      // Canonical 6-stage filtering
      let matchesStage = true;
      if (selectedStatus !== 'ALL') {
        const stageIdx = resolveStageIndex(c.status);
        if (selectedStatus === 'SUBMITTED') matchesStage = stageIdx === 0;
        else if (selectedStatus === 'GOVERNMENT_VERIFIED') matchesStage = stageIdx === 1;
        else if (selectedStatus === 'UNIVERSITY_ASSIGNED') matchesStage = stageIdx === 2;
        else if (selectedStatus === 'INDUSTRY_FUNDED') matchesStage = stageIdx === 3;
        else if (selectedStatus === 'DEPLOYED') matchesStage = stageIdx === 4;
        else if (selectedStatus === 'OUTCOME_VERIFIED') matchesStage = stageIdx === 5;
      }

      return matchesSearch && matchesCategory && matchesSeverity && matchesStage;
    });

    // Sort operations
    return list.sort((a, b) => {
      if (sortBy === 'DATE_DESC') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortBy === 'DATE_ASC') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortBy === 'PRIORITY_DESC') {
        return (b.priorityScore || 0) - (a.priorityScore || 0);
      }
      if (sortBy === 'LOCATION_ASC') {
        const locA = (a.district || a.state || '').toLowerCase();
        const locB = (b.district || b.state || '').toLowerCase();
        return locA.localeCompare(locB);
      }
      if (sortBy === 'CATEGORY_ASC') {
        return (a.category || '').localeCompare(b.category || '');
      }
      return 0;
    });
  }, [challenges, searchQuery, selectedCategory, selectedSeverity, selectedStatus, sortBy]);

  const stages = [
    { id: 'ALL', label: 'All Challenges' },
    { id: 'SUBMITTED', label: '1. Submitted' },
    { id: 'GOVERNMENT_VERIFIED', label: '2. Gov Verified' },
    { id: 'UNIVERSITY_ASSIGNED', label: '3. Uni Assigned' },
    { id: 'INDUSTRY_FUNDED', label: '4. Industry Funded' },
    { id: 'DEPLOYED', label: '5. Deployed' },
    { id: 'OUTCOME_VERIFIED', label: '6. People Verified' },
  ];

  return (
    <AppLayout>
      <div className="space-y-6 max-w-7xl mx-auto">
        {/* Apple-grade Header */}
        <PageHeader
          title="Problem-Centric Challenge Registry"
          subtitle="Explore systemic societal challenges grouped from citizen grievance reports, track 6-stage academic-industrial lifecycles, and verify field outcomes."
          portalBadge={{ text: 'Civic Discovery', variant: 'civic' }}
          breadcrumbs={[
            { label: 'SICP', href: '/' },
            { label: 'Challenges' },
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
                <Button size="sm" className="text-xs flex items-center gap-1.5 shadow-xs bg-blue-600 hover:bg-blue-500 text-white font-semibold">
                  <PlusCircle className="w-4 h-4" />
                  <span>Report Problem</span>
                </Button>
              </Link>
            </div>
          }
        />

        {/* Filter, Sort & Search Control Bar */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-xs space-y-3.5">
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search challenges by keyword, location, or Challenge ID (#CHAL)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs h-9 bg-slate-50/70 dark:bg-slate-800/50 rounded-xl"
              />
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
                <ArrowUpDown className="w-3.5 h-3.5" />
                Sort:
              </span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:outline-blue-500"
              >
                <option value="DATE_DESC">Newest Submitted</option>
                <option value="DATE_ASC">Oldest Submitted</option>
                <option value="PRIORITY_DESC">Highest Priority Score</option>
                <option value="LOCATION_ASC">Location (A to Z)</option>
                <option value="CATEGORY_ASC">Domain / Category</option>
              </select>
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Domain:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:outline-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-medium text-slate-800 dark:text-slate-200 focus:outline-blue-500"
              >
                <option value="ALL">All Severities</option>
                <option value={SeverityLevel.CATASTROPHIC}>Catastrophic</option>
                <option value={SeverityLevel.SEVERE}>Severe</option>
                <option value={SeverityLevel.MODERATE}>Moderate</option>
                <option value={SeverityLevel.LOW}>Low</option>
              </select>
            </div>
          </div>

          {/* Canonical 6-Stage Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100 dark:border-slate-800">
            {stages.map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer ${
                  selectedStatus === st.id
                    ? 'bg-blue-600 text-white shadow-xs scale-102'
                    : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700'
                }`}
              >
                {st.label}
              </button>
            ))}
            <span className="text-xs text-slate-500 font-medium ml-auto pl-2 shrink-0">
              {filteredChallenges.length} {filteredChallenges.length === 1 ? 'challenge' : 'challenges'}
            </span>
          </div>
        </div>

        {/* Results Grid with Apple-grade Cards */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800 animate-pulse border border-slate-200/60 dark:border-slate-800" />
            ))}
          </div>
        ) : filteredChallenges.length === 0 ? (
          <div className="p-12 text-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">No Matching Challenges Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Try adjusting your search criteria, clearing domain filters, or report a citizen grievance to initiate AI root-cause grouping.
            </p>
            <div className="flex justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                  setSelectedSeverity('ALL');
                  setSelectedStatus('ALL');
                  setSortBy('DATE_DESC');
                }}
                className="text-xs"
              >
                Clear All Filters
              </Button>
              <Link href="/challenges/new">
                <Button size="sm" className="text-xs bg-blue-600 text-white">
                  Report Problem
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredChallenges.map((c) => {
              const totalProblems = c.totalCitizenProblems || (c.challengeProblems?.length || 1);
              const verified = c.verifiedCount || 0;
              const denied = c.deniedCount || 0;

              return (
                <div
                  key={c.id}
                  className="group relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-400/80 dark:hover:border-blue-500/80 hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 ease-out p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Top Meta Header: Challenge ID + Category + Severity */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[11px] font-bold text-slate-500 dark:text-slate-400">
                          #CHAL-{c.id.slice(0, 6).toUpperCase()}
                        </span>
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                          {c.category?.replace(/_/g, ' ') || 'Civic'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                        <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>{c.priorityScore !== undefined ? `${Math.round(c.priorityScore)}` : '50'}</span>
                        <span className="text-[10px] uppercase font-sans font-semibold text-slate-400">PTS</span>
                      </div>
                    </div>

                    {/* AI Title (Prominent Visual Anchor) */}
                    <Link href={`/challenges/${c.id}`} className="block focus:outline-none">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-2 leading-snug">
                        {c.title}
                      </h3>
                    </Link>

                    {/* Outer Details: Place & Date Submitted */}
                    <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                          {c.district ? `${c.district}, ${c.state || ''}` : 'Location pending'}
                        </span>
                        {c.affectedPopulation ? (
                          <span className="text-[11px] text-slate-400 shrink-0">
                            • {c.affectedPopulation.toLocaleString()} affected
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Submitted {new Date(c.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Compact 6-Stage Lifecycle Bar */}
                    <div className="pt-1">
                      <CanonicalLifecycleTracker
                        status={c.status}
                        variant="compact"
                        verifiedCount={verified}
                        deniedCount={denied}
                      />
                    </div>
                  </div>

                  {/* Bottom Strip: Grouped Problems Count & Workspace Link */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-600 dark:text-slate-400 font-medium flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-slate-400" />
                      {totalProblems} {totalProblems === 1 ? 'citizen problem' : 'citizen problems'}
                    </span>

                    <Link
                      href={`/challenges/${c.id}`}
                      className="inline-flex items-center gap-1 font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-all group-hover:translate-x-1"
                    >
                      <span>Workspace</span>
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
