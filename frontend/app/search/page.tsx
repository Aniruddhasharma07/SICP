'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { apiClient } from '../../src/lib/api-client';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { useAuth } from '../../src/lib/auth-context';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { PageHeader } from '../../src/components/ui/PageHeader';
import {
  Search,
  Filter,
  X,
  Compass,
  FolderKanban,
  BrainCircuit,
  Building2,
  GraduationCap,
  Download,
  ArrowRight,
  RotateCcw,
  Loader2,
  SlidersHorizontal,
} from 'lucide-react';

interface SearchResultItem {
  id: string;
  type: 'challenge' | 'project' | 'solution' | 'organization' | 'faculty';
  title: string;
  subtitle: string;
  snippet: string;
  url: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface SearchResponse {
  query: string;
  total: number;
  counts: {
    challenges: number;
    projects: number;
    solutions: number;
    organizations: number;
    faculty: number;
  };
  results: SearchResultItem[];
}

const CATEGORIES = [
  'Water Supply',
  'Sanitation & Waste',
  'Roads & Infrastructure',
  'Healthcare',
  'Education',
  'Electricity & Energy',
  'Agriculture & Irrigation',
  'Flood & Disaster',
  'Public Safety',
];

const SEVERITIES = ['LOW', 'MODERATE', 'SEVERE', 'CATASTROPHIC'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  // Search filter states from URL
  const queryParam = searchParams.get('q') || '';
  const typeParam = searchParams.get('type') || 'all';
  const categoryParam = searchParams.get('category') || '';
  const severityParam = searchParams.get('severity') || '';
  const priorityParam = searchParams.get('priority') || '';
  const statusParam = searchParams.get('status') || '';
  const districtParam = searchParams.get('district') || '';
  const stateParam = searchParams.get('state') || '';

  const [inputQuery, setInputQuery] = useState(queryParam);
  const [data, setData] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Sync state if URL query changes
  useEffect(() => {
    setInputQuery(queryParam);
  }, [queryParam]);

  // Update URL params
  const updateParams = useCallback(
    (newParams: Record<string, string | null>) => {
      const current = new URLSearchParams(Array.from(searchParams.entries()));
      for (const [key, value] of Object.entries(newParams)) {
        if (!value) {
          current.delete(key);
        } else {
          current.set(key, value);
        }
      }
      const search = current.toString();
      const query = search ? `?${search}` : '';
      router.push(`${pathname}${query}`);
    },
    [searchParams, pathname, router]
  );

  // Perform search fetch
  useEffect(() => {
    let isCancelled = false;
    async function executeSearch() {
      setLoading(true);
      try {
        const queryStr = searchParams.toString();
        const endpoint = `/api/v1/search${queryStr ? `?${queryStr}` : ''}`;
        const res = await apiClient.request<SearchResponse>(endpoint);
        if (!isCancelled && res.success && res.data) {
          setData(res.data);
        }
      } catch {
        if (!isCancelled) {
          setData({
            query: queryParam,
            total: 0,
            counts: { challenges: 0, projects: 0, solutions: 0, organizations: 0, faculty: 0 },
            results: [],
          });
        }
      } finally {
        if (!isCancelled) setLoading(false);
      }
    }

    executeSearch();
    return () => {
      isCancelled = true;
    };
  }, [searchParams]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParams({ q: inputQuery.trim() || null });
  };

  const clearAllFilters = () => {
    router.push(pathname);
    setInputQuery('');
  };

  const handleExportCsv = async () => {
    if (!user) {
      router.push('/login?redirect=/search');
      return;
    }
    setIsExporting(true);
    try {
      const exportType =
        typeParam === 'projects'
          ? 'projects'
          : typeParam === 'solutions'
          ? 'solutions'
          : 'challenges';

      const token = apiClient.getToken();
      const exportUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/reports/export?type=${exportType}${
        categoryParam ? `&category=${encodeURIComponent(categoryParam)}` : ''
      }${statusParam ? `&status=${encodeURIComponent(statusParam)}` : ''}`;

      const res = await fetch(exportUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error('Export failed');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sicp-${exportType}-export-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Could not export report. Please ensure you are logged in with valid permissions.');
    } finally {
      setIsExporting(false);
    }
  };

  const activeFilterCount = [
    categoryParam,
    severityParam,
    priorityParam,
    statusParam,
    districtParam,
    stateParam,
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* Standardized Elite Page Header */}
      <PageHeader
        title="Global Platform Search"
        description="Faceted exploration across civic challenges, institutional projects, solution blueprints, organizations, and faculty expertise."
        portal="CIVIC"
        breadcrumbs={[
          { label: 'Discovery', href: '/search' },
          { label: 'Search Explorer' },
        ]}
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="gap-2 text-xs font-semibold"
              title="Export filtered records as CSV"
            >
              {isExporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-slate-500" />}
              <span>Export CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="sm:hidden gap-2 text-xs"
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters {activeFilterCount > 0 && `(${activeFilterCount})`}</span>
            </Button>
          </div>
        }
      />

      <div className="space-y-3">

        {/* Search Input Box */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by keywords, problems, technologies, institutions, districts..."
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              className="w-full pl-11 pr-10 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-xs"
            />
            {inputQuery && (
              <button
                type="button"
                onClick={() => {
                  setInputQuery('');
                  updateParams({ q: null });
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button type="submit" size="md" className="shadow-xs">
            Search
          </Button>
        </form>

        {/* Active Filter Pills */}
        {(queryParam || activeFilterCount > 0 || typeParam !== 'all') && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-medium">Active filters:</span>
            {queryParam && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
                Query: &ldquo;{queryParam}&rdquo;
                <button onClick={() => updateParams({ q: null })}>
                  <X className="w-3 h-3 hover:text-slate-900" />
                </button>
              </span>
            )}
            {typeParam !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                Type: {typeParam}
                <button onClick={() => updateParams({ type: null })}>
                  <X className="w-3 h-3 hover:text-blue-900" />
                </button>
              </span>
            )}
            {categoryParam && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 font-medium border border-emerald-200">
                {categoryParam}
                <button onClick={() => updateParams({ category: null })}>
                  <X className="w-3 h-3 hover:text-emerald-900" />
                </button>
              </span>
            )}
            {severityParam && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 font-medium border border-amber-200">
                Severity: {severityParam}
                <button onClick={() => updateParams({ severity: null })}>
                  <X className="w-3 h-3 hover:text-amber-900" />
                </button>
              </span>
            )}
            {priorityParam && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-50 text-purple-700 font-medium border border-purple-200">
                Priority: {priorityParam}
                <button onClick={() => updateParams({ priority: null })}>
                  <X className="w-3 h-3 hover:text-purple-900" />
                </button>
              </span>
            )}
            {districtParam && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-medium">
                District: {districtParam}
                <button onClick={() => updateParams({ district: null })}>
                  <X className="w-3 h-3 hover:text-slate-900" />
                </button>
              </span>
            )}
            <button
              onClick={clearAllFilters}
              className="inline-flex items-center gap-1 px-2 py-1 text-slate-500 hover:text-red-600 font-medium"
            >
              <RotateCcw className="w-3 h-3" />
              Reset all
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Filters Sidebar + Results List */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filter Sidebar */}
        <div
          className={`${
            mobileFilterOpen ? 'block' : 'hidden lg:block'
          } lg:col-span-1 space-y-6 bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-200 h-fit`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              Faceted Filters
            </span>
            {activeFilterCount > 0 && (
              <button
                onClick={clearAllFilters}
                className="text-[11px] text-blue-600 hover:underline font-medium"
              >
                Clear all
              </button>
            )}
          </div>

          {/* Entity Type Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800">Entity Type</label>
            <div className="space-y-1">
              {[
                { id: 'all', label: 'All Entities', count: data?.total ?? 0 },
                { id: 'challenges', label: 'Challenges', count: data?.counts.challenges ?? 0 },
                { id: 'projects', label: 'Projects', count: data?.counts.projects ?? 0 },
                { id: 'solutions', label: 'Solutions', count: data?.counts.solutions ?? 0 },
                { id: 'organizations', label: 'Organizations', count: data?.counts.organizations ?? 0 },
                { id: 'faculty', label: 'Faculty', count: data?.counts.faculty ?? 0 },
              ].map((item) => (
                <button
                  key={item.id}
                  onClick={() => updateParams({ type: item.id === 'all' ? null : item.id })}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    typeParam === item.id || (item.id === 'all' && typeParam === 'all')
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-200/60'
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md ${
                      typeParam === item.id || (item.id === 'all' && typeParam === 'all')
                        ? 'bg-blue-700 text-blue-100'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {item.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Category Facet */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800">Category</label>
            <select
              value={categoryParam}
              onChange={(e) => updateParams({ category: e.target.value || null })}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Severity Facet */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800">Severity</label>
            <select
              value={severityParam}
              onChange={(e) => updateParams({ severity: e.target.value || null })}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Severities</option>
              {SEVERITIES.map((sev) => (
                <option key={sev} value={sev}>
                  {sev}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Facet */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800">Priority Level</label>
            <select
              value={priorityParam}
              onChange={(e) => updateParams({ priority: e.target.value || null })}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Priorities</option>
              {PRIORITIES.map((pri) => (
                <option key={pri} value={pri}>
                  {pri}
                </option>
              ))}
            </select>
          </div>

          {/* District Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-800">District / Region</label>
            <input
              type="text"
              placeholder="e.g. Pune, Nagaur..."
              value={districtParam}
              onChange={(e) => updateParams({ district: e.target.value || null })}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Results List Area */}
        <div className="lg:col-span-3 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {loading ? (
                'Searching records...'
              ) : (
                `Found ${data?.total ?? 0} results ${queryParam ? `for "${queryParam}"` : ''}`
              )}
            </span>
            <span className="text-xs text-slate-400">
              Page 1 of {Math.ceil((data?.total ?? 1) / 20) || 1}
            </span>
          </div>

          {loading ? (
            <div className="py-24 text-center space-y-3">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-sm font-medium text-slate-600">Executing faceted database search...</p>
            </div>
          ) : data && data.results.length > 0 ? (
            <div className="space-y-3">
              {data.results.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  className="p-4 rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-xs transition-all space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={item.url}
                          className="font-bold text-base text-slate-900 hover:text-blue-600 transition-colors"
                        >
                          {item.title}
                        </Link>
                        <span
                          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                            item.type === 'challenge'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : item.type === 'project'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : item.type === 'solution'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : item.type === 'organization'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-purple-50 text-purple-700 border-purple-200'
                          }`}
                        >
                          {item.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-medium">{item.subtitle}</p>
                    </div>

                    <Link href={item.url}>
                      <Button variant="outline" size="sm" className="gap-1 text-xs shrink-0">
                        <span>View</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {item.snippet}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    <span>
                      {new Date(item.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    {item.metadata?.category ? (
                      <span className="font-medium text-slate-600">{String(item.metadata.category)}</span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Zero Dead-End Empty State */
            <div className="py-16 px-6 text-center space-y-4 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-12 h-12 rounded-full bg-slate-200/80 text-slate-500 mx-auto flex items-center justify-center">
                <Search className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-800">
                  No matching records found
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  {queryParam || activeFilterCount > 0
                    ? 'No items matched your current filter criteria. You can clear your filters or submit a new problem.'
                    : 'The platform directory currently has no active records matching this view.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                {(queryParam || activeFilterCount > 0) && (
                  <Button variant="outline" size="sm" onClick={clearAllFilters} className="gap-1.5">
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Clear All Filters</span>
                  </Button>
                )}
                <Link href="/challenges/new">
                  <Button size="sm" className="gap-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    <span>Submit New Problem</span>
                  </Button>
                </Link>
                <Link href="/solutions">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <BrainCircuit className="w-3.5 h-3.5" />
                    <span>Browse Solution Blueprints</span>
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <AppLayout>
      <React.Suspense
        fallback={
          <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-medium text-slate-600">Initializing search engine...</p>
          </div>
        }
      >
        <SearchContent />
      </React.Suspense>
    </AppLayout>
  );
}

