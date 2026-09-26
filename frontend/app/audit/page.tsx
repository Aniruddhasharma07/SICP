'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { apiClient } from '../../src/lib/api-client';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { useAuth } from '../../src/lib/auth-context';
import { Button } from '../../src/components/ui/Button';
import { Badge } from '../../src/components/ui/Badge';
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  ArrowRight,
  Filter,
  RefreshCw,
  FileText,
  User,
  Clock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface AuditLogEntry {
  id: string;
  actorId?: string | null;
  actorRole?: string | null;
  action: string;
  resource: string;
  resourceId: string;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  reason?: string | null;
  requestId: string;
  createdAt: string;
}

export default function AuditTrailPage() {
  const { user, hasPermission } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [resourceFilter, setResourceFilter] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const canViewAudit = hasPermission('audit:view');

  const fetchLogs = async () => {
    if (!canViewAudit) return;
    setLoading(true);
    try {
      const endpoint = `/api/v1/audit${resourceFilter ? `?resource=${encodeURIComponent(resourceFilter)}` : ''}`;
      const res = await apiClient.request<AuditLogEntry[]>(endpoint);
      if (res.success && res.data) {
        setLogs(res.data);
      }
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canViewAudit) {
      fetchLogs();
    } else {
      setLoading(false);
    }
  }, [canViewAudit, resourceFilter]);

  // Access Denied View for Unauthorized Users
  if (!canViewAudit) {
    return (
      <AppLayout>
        <div className="min-h-[60vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full p-8 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-lg text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-amber-50 text-amber-600 border border-amber-200 mx-auto flex items-center justify-center">
              <Lock className="w-7 h-7" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Governance Access Restricted</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                The SICP Audit Trail contains tamper-evident transaction histories, verification reviews, and administrative operations. Access is restricted to authorized Government Officers and System Administrators.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Link href="/dashboard">
                <Button className="w-full text-xs">Return to Dashboard</Button>
              </Link>
              <Link href="/challenges">
                <Button variant="outline" className="w-full text-xs">
                  Explore Public Challenges
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Tamper-Evident Authority Audit Ledger
            </h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
              Privileged Telemetry
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Verifiable audit records tracking state changes, government officer validations, and statutory actions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={resourceFilter}
            onChange={(e) => setResourceFilter(e.target.value)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
          >
            <option value="">All Resources</option>
            <option value="CHALLENGE">Challenges</option>
            <option value="PROJECT">Projects</option>
            <option value="ORGANIZATION">Organizations</option>
            <option value="REPORT">Reports</option>
            <option value="SOLUTION">Solutions</option>
          </select>

          <Button variant="outline" size="sm" onClick={fetchLogs} className="gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Retrieving audit telemetry...</p>
        </div>
      ) : logs.length > 0 ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor</th>
                  <th className="px-4 py-3">Resource</th>
                  <th className="px-4 py-3">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map((log) => {
                  const isExpanded = expandedLogId === log.id;
                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                          {new Date(log.createdAt).toLocaleString([], {
                            dateStyle: 'short',
                            timeStyle: 'medium',
                          })}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-mono text-[11px] border border-slate-200/50 dark:border-slate-700">
                            {log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            {log.actorRole || 'SYSTEM'}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-500 dark:text-slate-400">{log.resource}:</span>
                            <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
                              {log.resourceId}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="text-blue-600 dark:text-blue-400 hover:underline font-medium text-xs cursor-pointer"
                          >
                            {isExpanded ? 'Collapse' : 'Inspect'}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-50 dark:bg-slate-800/80">
                          <td colSpan={5} className="px-4 py-3 space-y-2">
                            <div className="text-[11px] font-mono text-slate-600 dark:text-slate-300 space-y-1">
                              <div>
                                <span className="font-bold text-slate-700 dark:text-slate-200">Request ID:</span> {log.requestId}
                              </div>
                              {log.reason && (
                                <div>
                                  <span className="font-bold text-slate-700 dark:text-slate-200">Reason:</span> {log.reason}
                                </div>
                              )}
                              {log.newState && (
                                <div className="mt-2">
                                  <span className="font-bold text-slate-700 dark:text-slate-200">Payload / Diff:</span>
                                  <pre className="mt-1 p-2 rounded-md bg-slate-900 text-slate-200 text-[10px] overflow-x-auto border border-slate-700">
                                    {JSON.stringify(log.newState, null, 2)}
                                  </pre>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="py-16 px-6 text-center space-y-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
          <ShieldCheck className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">No audit records found</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
            No audit logs currently match this filter criteria. Actions will appear here as governance actions occur.
          </p>
        </div>
      )}
      </div>
    </AppLayout>
  );
}
