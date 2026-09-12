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

export default function ChallengesExplorerPage() {
  const [challenges, setChallenges] = useState<ChallengeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('ALL');

  const fetchChallenges = async () => {
    setLoading(true);
    try {
      const query = selectedStatus !== 'ALL' ? `?status=${selectedStatus}` : '';
      const res = await apiClient.request<{ items: ChallengeDto[]; total: number }>(`/api/v1/challenges${query}`);
      if (res.success && res.data) {
        setChallenges(res.data.items || []);
      }
    } catch {
      setChallenges([]);
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
        <div className="bg-white rounded-xl border border-slate-200 p-3 md:p-4 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Search problems by keywords, locality, or district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-slate-500 font-medium">Domain:</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-blue-500 font-medium text-slate-700"
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
              <span className="text-xs text-slate-500 font-medium">Severity:</span>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value)}
                className="text-xs px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-blue-500 font-medium text-slate-700"
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
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
            {statuses.map((st) => (
              <button
                key={st.id}
                onClick={() => setSelectedStatus(st.id)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedStatus === st.id
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
            <span className="text-xs text-slate-400 font-medium ml-auto pl-2 shrink-0">
              {filteredChallenges.length} problems shown
            </span>
          </div>
        </div>

        {/* Results Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-52 rounded-xl bg-slate-100 animate-pulse border border-slate-200" />
            ))}
          </div>
        ) : filteredChallenges.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-300 space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-sm">No Matching Problems Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredChallenges.map((c) => {
              const sev = c.severity || SeverityLevel.MODERATE;
              return (
                <Link key={c.id} href={`/challenges/${c.id}`} className="group">
                  <Card className="hover:border-blue-400 hover:shadow-md transition-all h-full flex flex-col justify-between overflow-hidden">
                    <CardHeader className="p-4 pb-2 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <StatusBadge status={c.status} className="text-[10px]" />
                        <div className="flex items-center gap-1.5">
                          {c.isSystemic && (
                            <Badge className="bg-purple-100 text-purple-800 border-purple-200 text-[10px]">
                              <Layers className="w-3 h-3 mr-1" />
                              Systemic
                            </Badge>
                          )}
                          <Badge
                            variant={
                              sev === SeverityLevel.CATASTROPHIC
                                ? 'destructive'
                                : sev === SeverityLevel.SEVERE
                                ? 'warning'
                                : 'secondary'
                            }
                            className="text-[10px]"
                          >
                            {sev}
                          </Badge>
                        </div>
                      </div>

                      <CardTitle className="text-sm md:text-base group-hover:text-blue-600 transition-colors line-clamp-2 leading-snug">
                        {c.title}
                      </CardTitle>

                      <CardDescription className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                        {c.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="p-4 pt-2 space-y-3">
                      <div className="grid grid-cols-2 gap-2 text-xs py-2 border-t border-b border-slate-100">
                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            Priority Score
                          </span>
                          <span className="font-bold text-blue-600 font-mono text-sm flex items-center gap-1">
                            <Flame className="w-3.5 h-3.5 text-amber-500" />
                            {c.priorityScore !== undefined ? `${c.priorityScore}/100` : 'Evaluating'}
                          </span>
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">
                            Reach Footprint
                          </span>
                          <span className="font-semibold text-slate-800 text-xs flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-slate-400" />
                            {c.affectedPopulation
                              ? `${c.affectedPopulation.toLocaleString()} citizens`
                              : 'Calculating'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                        <div className="flex items-center gap-1 truncate max-w-[180px]">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {c.district ? `${c.district}, ${c.state || ''}` : 'Location pending'}
                          </span>
                        </div>

                        <span className="text-blue-600 font-semibold text-xs group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                          <span>Workspace</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
