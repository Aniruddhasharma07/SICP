'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiClient } from '../../src/lib/api-client';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { useAuth } from '../../src/lib/auth-context';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import { PageHeader } from '../../src/components/ui/PageHeader';
import { MetricCard } from '../../src/components/ui/MetricCard';
import {
  Building2,
  GraduationCap,
  Briefcase,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Search,
  PlusCircle,
  ExternalLink,
  Loader2,
  RotateCcw,
  Star,
  Users,
  Award,
  Sparkles,
  Layers,
} from 'lucide-react';

interface OrganizationItem {
  id: string;
  name: string;
  slug: string;
  type: string;
  verificationStatus: string;
  createdAt: string;
  rating?: number;
  accreditationGrade?: string;
  _count?: {
    members?: number;
    ledProjects?: number;
  };
}

const ORG_TYPES = [
  { id: 'ALL', label: 'All Organizations' },
  { id: 'UNIVERSITY', label: 'Universities' },
  { id: 'GOVERNMENT', label: 'Government' },
  { id: 'INDUSTRY', label: 'Industry & Corporate' },
  { id: 'STARTUP', label: 'Startups & MSMEs' },
  { id: 'CSR', label: 'CSR Foundations' },
];

export default function OrganizationsPage() {
  const [orgs, setOrgs] = useState<OrganizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    async function fetchOrgs() {
      setLoading(true);
      try {
        const res = await apiClient.request<OrganizationItem[]>('/api/v1/organizations');
        if (res.success && res.data) {
          setOrgs(res.data);
        }
      } catch {
        setOrgs([]);
      } finally {
        setLoading(false);
      }
    }
    fetchOrgs();
  }, []);

  const stats = useMemo(() => {
    const total = orgs.length;
    const universities = orgs.filter((o) => o.type === 'UNIVERSITY').length;
    const government = orgs.filter((o) => o.type === 'GOVERNMENT').length;
    const industry = orgs.filter((o) => ['INDUSTRY', 'STARTUP', 'MSME', 'CSR'].includes(o.type)).length;
    const verified = orgs.filter((o) => o.verificationStatus === 'VERIFIED').length;
    return { total, universities, government, industry, verified };
  }, [orgs]);

  const filteredOrgs = useMemo(() => {
    return orgs.filter((org) => {
      const matchesType =
        selectedType === 'ALL' ||
        org.type === selectedType ||
        (selectedType === 'STARTUP' && ['STARTUP', 'MSME'].includes(org.type)) ||
        (selectedType === 'INDUSTRY' && ['INDUSTRY', 'CORPORATE'].includes(org.type));
      const matchesQuery =
        !searchQuery.trim() ||
        org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        org.slug.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesType && matchesQuery;
    });
  }, [orgs, selectedType, searchQuery]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'UNIVERSITY':
        return <GraduationCap className="w-5 h-5 text-indigo-600" />;
      case 'GOVERNMENT':
        return <ShieldCheck className="w-5 h-5 text-blue-600" />;
      default:
        return <Briefcase className="w-5 h-5 text-amber-600" />;
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Standardized Elite Page Header */}
        <PageHeader
          title="Partner Organizations Directory"
          description="Verified academic institutions, government departments, and industry innovation partners collaborating on SICP."
          portal="CIVIC"
          breadcrumbs={[
            { label: 'Ecosystem', href: '/organizations' },
            { label: 'Organizations' },
          ]}
          action={
            <div className="flex items-center gap-2">
              <Link href="/search?type=organizations">
                <Button variant="outline" size="sm" className="gap-1.5 text-xs font-semibold">
                  <Search className="w-3.5 h-3.5" />
                  <span>Search in Explorer</span>
                </Button>
              </Link>
            </div>
          }
        />

        {/* Live Ecosystem KPI Strip with Drill-Down Filtering */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            title="All Partners"
            value={stats.total}
            icon={Building2}
            badge={`${stats.verified} Verified`}
            trend={{ label: 'Registered entities', direction: 'neutral' }}
            active={selectedType === 'ALL'}
            onClick={() => setSelectedType('ALL')}
          />
          <MetricCard
            title="Universities & R&D"
            value={stats.universities}
            icon={GraduationCap}
            badge="Academia"
            trend={{ label: 'Research hubs', direction: 'up' }}
            active={selectedType === 'UNIVERSITY'}
            onClick={() => setSelectedType('UNIVERSITY')}
          />
          <MetricCard
            title="Government Agencies"
            value={stats.government}
            icon={ShieldCheck}
            badge="Triage"
            trend={{ label: 'Public authorities', direction: 'neutral' }}
            active={selectedType === 'GOVERNMENT'}
            onClick={() => setSelectedType('GOVERNMENT')}
          />
          <MetricCard
            title="Industry & MSMEs"
            value={stats.industry}
            icon={Briefcase}
            badge="Sponsors"
            trend={{ label: 'Commercial partners', direction: 'up' }}
            active={selectedType === 'INDUSTRY'}
            onClick={() => setSelectedType('INDUSTRY')}
          />
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          {/* Type Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 text-xs">
            {ORG_TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setSelectedType(t.id)}
                className={`px-3 py-1.5 rounded-lg font-medium whitespace-nowrap transition-colors ${
                  selectedType === t.id
                    ? 'bg-blue-600 text-white font-semibold shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by name or slug..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Organization Grid */}
        {loading ? (
          <div className="py-24 text-center space-y-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-medium text-slate-600">Loading partner directory...</p>
          </div>
        ) : filteredOrgs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredOrgs.map((org) => (
              <div
                key={org.id}
                className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-blue-300 hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      {getTypeIcon(org.type)}
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                        org.verificationStatus === 'VERIFIED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : org.verificationStatus === 'PENDING_REVIEW'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}
                    >
                      {org.verificationStatus}
                    </span>
                  </div>

                  <div>
                    <h3 className="font-bold text-base text-slate-900 line-clamp-1">{org.name}</h3>
                    <span className="text-xs text-slate-400 font-mono">@{org.slug}</span>
                  </div>

                  <div className="flex items-center gap-2 pt-1 text-xs text-slate-500 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">
                      {org.type}
                    </Badge>
                    {org.accreditationGrade && (
                      <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Grade {org.accreditationGrade}
                      </Badge>
                    )}
                    <span>•</span>
                    <span>Joined {new Date(org.createdAt).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs text-slate-500 font-medium">Partner Profile</span>
                  <Link
                    href={
                      org.type === 'UNIVERSITY'
                        ? `/university?orgId=${org.id}`
                        : `/dashboard`
                    }
                    className="text-xs text-blue-600 font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Explore Portal</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Zero Dead-End Empty State */
          <div className="py-16 px-6 text-center space-y-4 bg-slate-50 rounded-xl border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-slate-200/80 text-slate-500 mx-auto flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-slate-800">
                No organizations found
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {searchQuery || selectedType !== 'ALL'
                  ? 'No organization matches your search criteria. Try resetting your search filters.'
                  : 'No partner organizations are registered in this view yet.'}
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              {(searchQuery || selectedType !== 'ALL') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedType('ALL');
                    setSearchQuery('');
                  }}
                  className="gap-1.5 text-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Filters</span>
                </Button>
              )}
              <Link href="/challenges">
                <Button size="sm" className="text-xs">
                  Explore Civic Challenges
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
