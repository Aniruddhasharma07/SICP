'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '../../src/lib/api-client';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { useAuth } from '../../src/lib/auth-context';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { PageHeader } from '../../src/components/ui/PageHeader';
import { MetricCard } from '../../src/components/ui/MetricCard';
import { GeospatialMap } from '../../src/components/common/GeospatialMap';
import {
  BarChart3,
  TrendingUp,
  Download,
  ShieldCheck,
  Building2,
  FolderKanban,
  BrainCircuit,
  Compass,
  Users,
  Lightbulb,
  Award,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface PlatformAnalytics {
  dataAuthenticity: string;
  timestamp: string;
  isSampleEmpty: boolean;
  challenges: {
    total: number;
    systemicCount: number;
    byStatus: Record<string, number>;
    bySeverity: Record<string, number>;
    byPriority: Record<string, number>;
    topCategories: Array<{ category: string; count: number }>;
  };
  projects: {
    total: number;
    byStatus: Record<string, number>;
    totalBudgetAllocated: number;
  };
  innovation: {
    prototypesCount: number;
    testExecutionsCount: number;
    pilotsCount: number;
    deploymentsCount: number;
    verifiedOutcomesCount: number;
    publishedSolutionMemories: number;
    outcomesByType: Record<string, number>;
  };
  institutions: {
    universitiesCount: number;
    industryPartnersCount: number;
    teamsCount: number;
    activePartnershipsCount: number;
  };
  impact: {
    totalAffectedPopulation: number;
    districtsCovered: number;
    statesCovered: number;
  };
}

export default function AnalyticsPage() {
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingType, setExportingType] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const res = await apiClient.request<PlatformAnalytics>('/api/v1/analytics');
        if (res.success && res.data) {
          setData(res.data);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    fetchAnalytics();
  }, []);

  const handleExport = async (type: string) => {
    if (!user) {
      alert('Please sign in to export platform reports.');
      return;
    }
    setExportingType(type);
    try {
      const token = apiClient.getToken();
      const exportUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/reports/export?type=${type}`;
      const res = await fetch(exportUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Export request failed');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sicp-${type}-report-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      alert('Failed to export CSV report. Ensure you have appropriate permissions.');
    } finally {
      setExportingType(null);
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Loading live platform analytics...</p>
        </div>
      </AppLayout>
    );
  }

  const challenges = data?.challenges;
  const projects = data?.projects;
  const innovation = data?.innovation;
  const institutions = data?.institutions;
  const impact = data?.impact;

  return (
    <AppLayout>
      <div className="space-y-8">
      {/* Standardized Elite Page Header */}
      <PageHeader
        title="Platform Intelligence & Impact Analytics"
        description="Real-time telemetry across civic problems, academic R&D projects, prototype deployments, and societal outcomes."
        portal="ADMIN"
        badge="Live Database"
        breadcrumbs={[
          { label: 'Intelligence', href: '/analytics' },
          { label: 'Platform Analytics' },
        ]}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {['challenges', 'projects', 'solutions', 'outcomes'].map((type) => (
              <Button
                key={type}
                variant="outline"
                size="sm"
                onClick={() => handleExport(type)}
                disabled={exportingType === type}
                className="text-xs capitalize gap-1.5 font-medium"
              >
                {exportingType === type ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                )}
                <span>Export {type}</span>
              </Button>
            ))}
          </div>
        }
      />

      {/* Disclosures & Authenticity Banner */}
      <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 flex items-start gap-3 text-xs text-blue-900">
        <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <span className="font-bold">Zero-Fabrication Guarantee:</span> All metrics, counts, and financial totals displayed are computed directly from the authoritative PostgreSQL database via atomic aggregation queries. No synthetic or mock statistics are generated.
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Civic Challenges Card */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Civic Challenges</span>
            <Compass className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">
            {challenges?.total ?? 0}
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Systemic Problems:</span>
            <span className="font-bold text-red-600">{challenges?.systemicCount ?? 0}</span>
          </div>
        </div>

        {/* Active Projects Card */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Academic Projects</span>
            <FolderKanban className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">
            {projects?.total ?? 0}
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Committed Budget:</span>
            <span className="font-bold text-slate-800">
              ₹{(projects?.totalBudgetAllocated ?? 0).toLocaleString()}
            </span>
          </div>
        </div>

        {/* Innovation & Prototypes */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Innovation Assets</span>
            <Lightbulb className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">
            {(innovation?.prototypesCount ?? 0) + (innovation?.pilotsCount ?? 0)}
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Verified Outcomes:</span>
            <span className="font-bold text-emerald-600">
              {innovation?.verifiedOutcomesCount ?? 0}
            </span>
          </div>
        </div>

        {/* Societal Reach */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Estimated Reach</span>
            <Users className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold text-slate-900">
            {(impact?.totalAffectedPopulation ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-500 flex items-center justify-between pt-2 border-t border-slate-100">
            <span>Districts Covered:</span>
            <span className="font-bold text-slate-800">{impact?.districtsCovered ?? 0}</span>
          </div>
        </div>
      </div>

      {/* Geospatial Map Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Regional Problem Distribution</h2>
          <Link href="/search" className="text-xs text-blue-600 font-semibold hover:underline">
            Search with Geographic Filters &rarr;
          </Link>
        </div>
        <GeospatialMap />
      </div>

      {/* Detailed Aggregation Breakdowns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Problem Domains */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-blue-600" />
            Top Challenge Domains
          </h3>

          {challenges?.topCategories && challenges.topCategories.length > 0 ? (
            <div className="space-y-3">
              {challenges.topCategories.map((cat) => {
                const percentage = challenges.total > 0 ? Math.round((cat.count / challenges.total) * 100) : 0;
                return (
                  <div key={cat.category} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium text-slate-700">
                      <span>{cat.category}</span>
                      <span>
                        {cat.count} ({percentage}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(5, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400">
              No categorized challenges currently recorded in database.
            </div>
          )}
        </div>

        {/* Institutional Collaboration */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-600" />
            Institutional Collaboration Ecosystem
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-1">
              <div className="text-2xl font-bold text-slate-900">
                {institutions?.universitiesCount ?? 0}
              </div>
              <div className="text-xs text-slate-500 font-medium">Universities</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-1">
              <div className="text-2xl font-bold text-slate-900">
                {institutions?.industryPartnersCount ?? 0}
              </div>
              <div className="text-xs text-slate-500 font-medium">Industry &amp; CSR</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-1">
              <div className="text-2xl font-bold text-slate-900">
                {institutions?.teamsCount ?? 0}
              </div>
              <div className="text-xs text-slate-500 font-medium">Multidisciplinary Teams</div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-1">
              <div className="text-2xl font-bold text-slate-900">
                {institutions?.activePartnershipsCount ?? 0}
              </div>
              <div className="text-xs text-slate-500 font-medium">Active Partnerships</div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Published Solution Blueprints:</span>
            <span className="font-bold text-emerald-600">
              {innovation?.publishedSolutionMemories ?? 0}
            </span>
          </div>
        </div>
      </div>
      </div>
    </AppLayout>
  );
}
