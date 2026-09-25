'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '../../../src/lib/api-client';
import {
  SystemicIncidentSummaryDto,
  SeverityLevel,
} from '@sicp/shared';
import {
  Network,
  AlertTriangle,
  Radio,
  ShieldCheck,
  Search,
  Filter,
  ArrowRight,
  Activity,
  Layers,
  Sparkles,
  HelpCircle,
  RefreshCw,
} from 'lucide-react';
import { SystemicIncidentCard } from '../../../src/components/intelligence/SystemicIncidentCard';
import { Button } from '../../../src/components/ui/Button';
import { IntelligenceTrace } from '../../../src/components/common/IntelligenceTrace';
import { DEMO_INCIDENT_SUMMARY, GAMHARIA_INCIDENT_SUMMARY } from '../../../src/lib/systemic-demo-data';

export default function SystemicIntelligenceHubPage() {
  const [incidents, setIncidents] = useState<SystemicIncidentSummaryDto[]>([DEMO_INCIDENT_SUMMARY, GAMHARIA_INCIDENT_SUMMARY]);
  const [loading, setLoading] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const res = await apiClient.request<SystemicIncidentSummaryDto[]>(
        '/api/v1/systemic-incidents'
      );
      if (res.success && res.data && res.data.length > 0) {
        setIncidents(res.data);
      } else {
        setIncidents([DEMO_INCIDENT_SUMMARY, GAMHARIA_INCIDENT_SUMMARY]);
      }
    } catch {
      setIncidents([DEMO_INCIDENT_SUMMARY, GAMHARIA_INCIDENT_SUMMARY]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  const filteredIncidents = incidents.filter(inc => {
    if (categoryFilter !== 'ALL' && inc.category.toUpperCase() !== categoryFilter.toUpperCase()) {
      return false;
    }
    if (statusFilter !== 'ALL' && inc.status !== statusFilter) {
      return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950/50 pb-16">
      {/* Top Header Banner */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-blue-600 dark:text-blue-400 mb-1">
                <Network className="w-4 h-4" />
                SICP INSTITUTIONAL INTELLIGENCE SUBSYSTEM
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
                Systemic Intelligence Command Center
              </h1>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-3xl">
                From scattered signals to systemic understanding: Real-time multi-dimensional relationship scoring, infrastructure graph traversal, and proactive community sentinels.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchIncidents}
                disabled={loading}
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Telemetry
              </Button>

              <Link
                href="/government/systemic-intelligence/SYS-2026-BHP-001"
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Launch 60s Demo Incident
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Metric Cards Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                Active Systemic Incidents
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                {incidents.length}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Under investigation / validation</div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                <Network className="w-3.5 h-3.5 text-blue-500" />
                Monitored Utility Networks
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                4 Grids
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Water supply, drainage, power</div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                <Radio className="w-3.5 h-3.5 text-purple-500" />
                Proactive Sentinel Probes
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                1 Dispatched
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Ward 14 East Sector Parallel Branch</div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                Cascade Failures Averted
              </div>
              <div className="text-2xl font-bold font-mono text-slate-900 dark:text-slate-100">
                12 Zones
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Via branch isolation & intervention</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-6">
        {/* Canonical Intelligence Trace */}
        <IntelligenceTrace
          activeStage="systemic"
          dominantActionLabel="Investigate Leading Case (SYS-2026-BHP-001)"
          onStageClick={() => {}}
        />

        {/* Controlled Demo Highlight Banner */}
        <div className="bg-gradient-to-r from-amber-500/10 via-blue-500/10 to-indigo-500/10 border border-amber-500/20 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-900 border border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
              <Radio className="w-3 h-3 text-amber-600 animate-pulse" />
              VERIFIED DEMONSTRATION SCENARIO AVAILABLE
            </span>
            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Bhopal Kolar Water Supply Network — Trunk Line 4 Rupture & Contamination
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
              Observe how 4 scattered citizen reports across 3 wards trigger graph traversal, dispatch a proactive sentinel inquiry to parallel Ward 14, and formally eliminate treatment plant failure via Branch Differential.
            </p>
          </div>

          <Link
            href="/government/systemic-intelligence/SYS-2026-BHP-001"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm inline-flex items-center gap-1.5 transition-colors"
          >
            Open Incident Dossier
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <div className="flex items-center gap-2 text-xs">
              <label className="text-slate-500 font-medium">Domain:</label>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 text-xs"
              >
                <option value="ALL">All Domains</option>
                <option value="WATER">Water Supply & Distribution</option>
                <option value="ELECTRICITY">Power Grid & Feeders</option>
                <option value="DRAINAGE">Stormwater Drainage</option>
              </select>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <label className="text-slate-500 font-medium">Status:</label>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 text-xs"
              >
                <option value="ALL">All Statuses</option>
                <option value="INVESTIGATING">Under Investigation</option>
                <option value="FIELD_DISPATCHED">Field Dispatched</option>
                <option value="HUMAN_VALIDATED">Government Validated</option>
                <option value="INTERVENTION_ACTIVE">Intervention Active</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500">
            Showing <strong className="text-slate-900 dark:text-slate-100">{filteredIncidents.length}</strong> systemic incidents
          </div>
        </div>

        {/* Incidents Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-64 bg-slate-200 dark:bg-slate-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : filteredIncidents.length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-12 text-center">
            <Network className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h4 className="text-base font-semibold text-slate-800 dark:text-slate-200">
              No systemic incidents found
            </h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              No multi-signal clusters currently meet the systemic relationship threshold in this view.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredIncidents.map(inc => (
              <SystemicIncidentCard key={inc.id} incident={inc} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
