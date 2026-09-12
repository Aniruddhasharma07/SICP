'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/lib/auth-context';
import { apiClient } from '../../src/lib/api-client';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { ZeroDeadEndNotice } from '../../src/components/common/ZeroDeadEndNotice';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Textarea } from '../../src/components/ui/Textarea';
import { Alert } from '../../src/components/ui/Alert';
import {
  ShieldAlert,
  ShieldCheck,
  Server,
  Database,
  Cpu,
  Users,
  Building2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Activity,
  FileText,
  Layers,
  Lock,
  Clock,
  ArrowRight,
  Sparkles,
  Award,
  BarChart3,
  ExternalLink,
  Sliders,
  Check,
  Eye,
  AlertOctagon,
} from 'lucide-react';
import { UserRole, OrganizationType, VerificationStatus } from '@sicp/shared';

interface AdminOverviewData {
  telemetry: {
    service: string;
    nodeVersion: string;
    platform: string;
    uptimeSeconds: number;
    memoryUsageMb: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
    database: { status: 'CONNECTED' | 'DISCONNECTED'; provider: string };
    redis: { status: 'CONNECTED' | 'UNAVAILABLE' };
    timestamp: string;
  };
  metrics: {
    users: {
      total: number;
      active: number;
      byRole: Record<string, number>;
    };
    organizations: {
      total: number;
      byType: Record<string, number>;
      byVerification: Record<string, number>;
    };
    challenges: {
      total: number;
      systemic: number;
      canonicalClusters: number;
      byStatus: Record<string, number>;
    };
    projects: {
      total: number;
      active: number;
      completed: number;
    };
    solutionMemories: {
      total: number;
      published: number;
    };
    auditLogs: {
      total: number;
    };
  };
}

interface AdminUserItem {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  emailVerified: boolean;
  organizationId: string | null;
  organization: {
    id: string;
    name: string;
    type: string;
    verificationStatus: string;
  } | null;
  createdAt: string;
}

interface AdminOrgItem {
  id: string;
  name: string;
  slug: string;
  type: OrganizationType;
  status: string;
  verificationStatus: VerificationStatus;
  metadata: {
    ratings?: Array<{
      score: number;
      reviewerId: string;
      reason: string;
      dimensions: Record<string, number>;
      evidenceUrl?: string;
      timestamp: string;
    }>;
    lastRatingScore?: number;
    [key: string]: unknown;
  } | null;
  counts: {
    users: number;
    members: number;
    ledProjects: number;
    partnerships: number;
  };
  latestVerification: {
    id: string;
    status: VerificationStatus;
    reviewNotes?: string | null;
    createdAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface AuditLogItem {
  id: string;
  actorId: string | null;
  actorRole: string | null;
  action: string;
  resource: string;
  resourceId: string;
  previousState: Record<string, unknown> | null;
  newState: Record<string, unknown> | null;
  reason: string | null;
  requestId: string;
  ipAddress: string | null;
  createdAt: string;
}

export default function SystemAdminPortalPage() {
  const router = useRouter();
  const { user, hasPermission, isLoading: authLoading } = useAuth();

  // Tabs: overview | organizations | users | audit
  const [activeTab, setActiveTab] = useState<'overview' | 'organizations' | 'users' | 'audit'>('overview');

  // Sync active tab with URL search params and hash
  useEffect(() => {
    const handleUrlSync = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const tabParam = (params.get('tab') || '').toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (tabParam === 'users' || hash === '#users') {
        setActiveTab('users');
      } else if (tabParam === 'organizations' || hash === '#organizations') {
        setActiveTab('organizations');
      } else if (tabParam === 'audit' || hash === '#audit') {
        setActiveTab('audit');
      } else if (tabParam === 'overview' || hash === '#overview' || hash === '#diagnostics') {
        setActiveTab('overview');
      }
    };

    handleUrlSync();
    window.addEventListener('hashchange', handleUrlSync);
    window.addEventListener('popstate', handleUrlSync);
    return () => {
      window.removeEventListener('hashchange', handleUrlSync);
      window.removeEventListener('popstate', handleUrlSync);
    };
  }, []);

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Overview data
  const [overview, setOverview] = useState<AdminOverviewData | null>(null);

  // Organizations data
  const [orgs, setOrgs] = useState<AdminOrgItem[]>([]);
  const [orgTotal, setOrgTotal] = useState(0);
  const [orgFilterType, setOrgFilterType] = useState<string>('');
  const [orgFilterVerif, setOrgFilterVerif] = useState<string>('');
  const [orgSearch, setOrgSearch] = useState('');

  // Users data
  const [users, setUsers] = useState<AdminUserItem[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [userFilterRole, setUserFilterRole] = useState<string>('');
  const [userSearch, setUserSearch] = useState('');

  // Audit logs data
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditResource, setAuditResource] = useState<string>('');

  // Modals state
  const [selectedOrg, setSelectedOrg] = useState<AdminOrgItem | null>(null);
  const [verifModalOpen, setVerifModalOpen] = useState(false);
  const [verifStatus, setVerifStatus] = useState<'APPROVED' | 'REJECTED'>('APPROVED');
  const [verifNotes, setVerifNotes] = useState('');

  // Rating Modal state
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingTargetOrg, setRatingTargetOrg] = useState<AdminOrgItem | null>(null);
  const [dimTechnical, setDimTechnical] = useState(85);
  const [dimTimeliness, setDimTimeliness] = useState(80);
  const [dimCollaboration, setDimCollaboration] = useState(90);
  const [dimOutcome, setDimOutcome] = useState(85);
  const [ratingReason, setRatingReason] = useState('');
  const [ratingEvidence, setRatingEvidence] = useState('');

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch overview
  const fetchOverview = useCallback(async () => {
    try {
      const res = await apiClient.request<AdminOverviewData>('/api/v1/admin/overview');
      if (res.success && res.data) {
        setOverview(res.data);
      }
    } catch {
      // Handled
    }
  }, []);

  // Fetch organizations
  const fetchOrganizations = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (orgFilterType) params.set('type', orgFilterType);
      if (orgFilterVerif) params.set('verificationStatus', orgFilterVerif);
      if (orgSearch.trim()) params.set('search', orgSearch.trim());
      params.set('limit', '50');

      const res = await apiClient.request<{ organizations: AdminOrgItem[]; total: number }>(
        `/api/v1/admin/organizations?${params.toString()}`
      );
      if (res.success && res.data) {
        setOrgs(res.data.organizations);
        setOrgTotal(res.data.total);
      }
    } catch {
      // Handled
    }
  }, [orgFilterType, orgFilterVerif, orgSearch]);

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (userFilterRole) params.set('role', userFilterRole);
      if (userSearch.trim()) params.set('search', userSearch.trim());
      params.set('limit', '50');

      const res = await apiClient.request<{ users: AdminUserItem[]; total: number }>(
        `/api/v1/admin/users?${params.toString()}`
      );
      if (res.success && res.data) {
        setUsers(res.data.users);
        setUserTotal(res.data.total);
      }
    } catch {
      // Handled
    }
  }, [userFilterRole, userSearch]);

  // Fetch audit logs
  const fetchAuditLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (auditResource) params.set('resource', auditResource);
      params.set('limit', '40');

      const res = await apiClient.request<AuditLogItem[]>(`/api/v1/audit?${params.toString()}`);
      if (res.success && res.data) {
        setAuditLogs(res.data);
      }
    } catch {
      // Handled
    }
  }, [auditResource]);

  // Load active tab data
  const refreshAll = useCallback(async () => {
    setLoading(true);
    if (activeTab === 'overview') await fetchOverview();
    else if (activeTab === 'organizations') await fetchOrganizations();
    else if (activeTab === 'users') await fetchUsers();
    else if (activeTab === 'audit') await fetchAuditLogs();
    setLoading(false);
  }, [activeTab, fetchOverview, fetchOrganizations, fetchUsers, fetchAuditLogs]);

  useEffect(() => {
    if (!authLoading && user?.role === UserRole.SYSTEM_ADMIN) {
      refreshAll();
    }
  }, [authLoading, user, activeTab, refreshAll]);

  // Handle Organization Verification Review
  const handleReviewVerification = async () => {
    if (!selectedOrg) return;
    setActionLoading(true);
    try {
      const res = await apiClient.request(`/api/v1/organizations/${selectedOrg.id}/verify/review`, {
        method: 'POST',
        body: JSON.stringify({
          status: verifStatus,
          reviewNotes: verifNotes || `Administrative decision: marked as ${verifStatus}`,
        }),
      });

      if (res.success) {
        setToast({ type: 'success', text: `Organization ${selectedOrg.name} verified as ${verifStatus}.` });
        setVerifModalOpen(false);
        fetchOrganizations();
      } else {
        setToast({ type: 'error', text: res.error?.message || 'Verification update failed.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Error submitting verification review.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Organization Status Toggle (ACTIVE / SUSPENDED)
  const handleToggleOrgStatus = async (org: AdminOrgItem) => {
    const nextStatus = org.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    setActionLoading(true);
    try {
      const res = await apiClient.request(`/api/v1/admin/organizations/${org.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({
          status: nextStatus,
          notes: `Administrative status change to ${nextStatus}`,
        }),
      });

      if (res.success) {
        setToast({ type: 'success', text: `Organization status updated to ${nextStatus}.` });
        fetchOrganizations();
      } else {
        setToast({ type: 'error', text: res.error?.message || 'Failed to update organization status.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Error toggling organization status.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle User Status Toggle (Active / Inactive)
  const handleToggleUserStatus = async (targetUser: AdminUserItem) => {
    const nextActive = !targetUser.isActive;
    setActionLoading(true);
    try {
      const res = await apiClient.request(`/api/v1/admin/users/${targetUser.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: nextActive }),
      });

      if (res.success) {
        setToast({
          type: 'success',
          text: `User ${targetUser.email} account ${nextActive ? 'activated' : 'deactivated'} successfully.`,
        });
        fetchUsers();
      } else {
        setToast({ type: 'error', text: res.error?.message || 'Failed to update user status.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Error updating user status.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Structured Organization Rating Submission
  const handleSubmitRating = async () => {
    if (!ratingTargetOrg) return;
    if (!ratingReason.trim()) {
      setToast({ type: 'error', text: 'Evaluation justification is required for institutional rating.' });
      return;
    }

    const calculatedScore = Math.round((dimTechnical + dimTimeliness + dimCollaboration + dimOutcome) / 4);
    setActionLoading(true);

    try {
      const res = await apiClient.request(`/api/v1/organizations/${ratingTargetOrg.id}/rate`, {
        method: 'POST',
        body: JSON.stringify({
          score: calculatedScore,
          dimensions: [
            { dimensionName: 'Technical Competence', score: dimTechnical, weight: 0.25 },
            { dimensionName: 'Timeliness & SLA', score: dimTimeliness, weight: 0.25 },
            { dimensionName: 'Stakeholder Collaboration', score: dimCollaboration, weight: 0.25 },
            { dimensionName: 'Civic Outcome Quality', score: dimOutcome, weight: 0.25 },
          ],
          reason: ratingReason.trim(),
          evidenceUrl: ratingEvidence.trim() || undefined,
        }),
      });

      if (res.success) {
        setToast({
          type: 'success',
          text: `Official rating of ${calculatedScore}/100 recorded with audit history for ${ratingTargetOrg.name}.`,
        });
        setRatingModalOpen(false);
        setRatingReason('');
        setRatingEvidence('');
        fetchOrganizations();
      } else {
        setToast({ type: 'error', text: res.error?.message || 'Failed to submit organization rating.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Error executing rating request.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Server-Side Authorization Guard Check
  if (!authLoading && (!user || user.role !== UserRole.SYSTEM_ADMIN)) {
    return (
      <AppLayout portal="admin">
        <div className="max-w-4xl mx-auto py-16 px-4">
          <ZeroDeadEndNotice
            variant="error"
            currentStatus="HTTP_403_FORBIDDEN"
            whatHappened="You attempted to access the System Administration Console without authorized SYSTEM_ADMIN credentials."
            whyStatus="The Admin Portal controls critical platform infrastructure, institutional verification, RBAC permissions, and immutable audit trails. Hiding UI links is insufficient; access is strictly enforced server-side."
            whoIsResponsible="System Administrator & Security Operations Officer"
            whatHappensIfIdle="Unauthorized access attempts are audited with actor ID and IP address."
            whatCanDoNext={[
              'Sign in with an authorized System Administrator account',
              'Return to Civic Portal (Community Problems & Solutions)',
              'Return to Government Command Center',
            ]}
            onActionClick={action => {
              if (action.includes('Sign in')) router.push('/login');
              else if (action.includes('Government')) router.push('/government');
              else router.push('/');
            }}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout portal="admin">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Console Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-purple-950 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-purple-800/30">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold tracking-wider uppercase mb-2">
                <ShieldCheck className="h-4 w-4 text-purple-400" />
                Portal 5 &bull; Server-Protected Enterprise Console
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                System Administration & Governance Portal
                <Badge className="bg-purple-600/80 text-white text-xs border-purple-400/30">
                  SYSTEM_ADMIN ONLY
                </Badge>
              </h1>
              <p className="mt-2 text-slate-300 text-sm max-w-3xl leading-relaxed">
                Authoritative platform operations: server telemetry, AI pipeline & queue health, organization verification lifecycle, granular RBAC user management, and immutable audit trail verification.
              </p>
            </div>

            {/* Quick Live Health Pill */}
            <div className="flex flex-wrap items-center gap-3 bg-black/40 p-3 rounded-xl border border-white/10 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-slate-300 font-mono">
                  {overview ? `Uptime: ${Math.floor(overview.telemetry.uptimeSeconds / 60)}m` : 'Telemetry: Live'}
                </span>
              </div>
              <span className="text-slate-600">&bull;</span>
              <div className="flex items-center gap-1.5 text-slate-300">
                <Database className="h-3.5 w-3.5 text-blue-400" />
                <span>PostGIS / pgvector: Connected</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 h-7 text-xs ml-2"
                onClick={refreshAll}
                disabled={loading}
              >
                <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Global Feedback Notifications */}
        {toast && (
          <Alert
            variant={toast.type === 'success' ? 'success' : 'destructive'}
            className={toast.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : ''}
          >
            {toast.text}
          </Alert>
        )}

        {/* Defined Operational Rules: Platform Administration & Superuser Governance */}
        <div className="rounded-2xl border border-purple-200/80 bg-gradient-to-r from-purple-50/90 via-indigo-50/50 to-white p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-purple-900 font-bold text-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-600 text-white text-xs font-black">
                5
              </span>
              <span>Defined Operational Rules: Platform Administration &amp; Superuser Governance</span>
            </div>
            <span className="text-[11px] font-semibold bg-purple-100 text-purple-800 px-2.5 py-0.5 rounded-full border border-purple-200">
              System Admin Mandate
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white/90 rounded-xl border border-purple-100 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                1. Server-Side Enforcement
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                All admin APIs enforce strict cryptographic JWT validation. Hiding the portal in the UI is never sufficient.
              </p>
            </div>
            <div className="p-3 bg-white/90 rounded-xl border border-purple-100 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                2. Organization Governance
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Superuser oversight of institution status (ACTIVE / SUSPENDED), university accreditations, and corporate partnerships.
              </p>
            </div>
            <div className="p-3 bg-white/90 rounded-xl border border-purple-100 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                3. Immutable Forensic Ledger
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Every cluster merge, unmerge, status override, and rating is archived in the tamper-evident audit ledger.
              </p>
            </div>
            <div className="p-3 bg-white/90 rounded-xl border border-purple-100 space-y-1">
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-600" />
                4. Microservice Telemetry
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Real-time health monitoring of PostgreSQL, PostGIS, pgvector, Redis BullMQ, and FastAPI AI pipelines.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex flex-wrap gap-4 text-sm font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'overview'
                ? 'border-purple-600 text-purple-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="h-4 w-4" />
            Platform Telemetry & Metrics
          </button>
          <button
            onClick={() => setActiveTab('organizations')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'organizations'
                ? 'border-purple-600 text-purple-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Organization Governance ({orgTotal || orgs.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'users'
                ? 'border-purple-600 text-purple-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4" />
            User RBAC Directory ({userTotal || users.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'audit'
                ? 'border-purple-600 text-purple-700 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-4 w-4" />
            Immutable Audit Trail
          </button>
        </div>

        {/* TAB 1: Platform Telemetry & Metrics */}
        {activeTab === 'overview' && overview && (
          <div className="space-y-6">
            {/* System Status KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              <Card className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="text-xs text-slate-500 font-medium">Registered Users</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{overview.metrics.users.total}</div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-1">
                    {overview.metrics.users.active} active accounts
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="text-xs text-slate-500 font-medium">Organizations</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{overview.metrics.organizations.total}</div>
                  <div className="text-[11px] text-blue-600 font-medium mt-1">
                    {overview.metrics.organizations.byVerification['VERIFIED'] || 0} verified
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="text-xs text-slate-500 font-medium">Civic Challenges</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{overview.metrics.challenges.total}</div>
                  <div className="text-[11px] text-purple-600 font-medium mt-1">
                    {overview.metrics.challenges.systemic} systemic clusters
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="text-xs text-slate-500 font-medium">Active Projects</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{overview.metrics.projects.active}</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">
                    {overview.metrics.projects.completed} completed
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="text-xs text-slate-500 font-medium">Solution Memories</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{overview.metrics.solutionMemories.published}</div>
                  <div className="text-[11px] text-emerald-600 font-medium mt-1">
                    Published & reusable
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white border-slate-200">
                <CardContent className="p-4">
                  <div className="text-xs text-slate-500 font-medium">Audit Records</div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">{overview.metrics.auditLogs.total}</div>
                  <div className="text-[11px] text-slate-500 font-medium mt-1">
                    Tamper-evident logs
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Telemetry Architecture Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Server className="h-5 w-5 text-indigo-600" />
                    Core Infrastructure & Process Telemetry
                  </CardTitle>
                  <CardDescription>Live Node.js and container telemetry</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Service Identifier:</span>
                    <span className="font-mono font-semibold text-slate-900">{overview.telemetry.service}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Node Runtime / Platform:</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {overview.telemetry.nodeVersion} ({overview.telemetry.platform})
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Memory Allocation (RSS):</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {overview.telemetry.memoryUsageMb.rss} MB
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">V8 Heap (Used / Total):</span>
                    <span className="font-mono font-semibold text-slate-900">
                      {overview.telemetry.memoryUsageMb.heapUsed} MB / {overview.telemetry.memoryUsageMb.heapTotal} MB
                    </span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">PostgreSQL Engine:</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      <CheckCircle2 className="h-3 w-3" />
                      {overview.telemetry.database.provider}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500">Queue & Redis State:</span>
                    <span className={`inline-flex items-center gap-1.5 font-semibold px-2 py-0.5 rounded ${
                      overview.telemetry.redis.status === 'CONNECTED'
                        ? 'text-emerald-700 bg-emerald-50'
                        : 'text-amber-700 bg-amber-50'
                    }`}>
                      {overview.telemetry.redis.status === 'CONNECTED' ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <AlertTriangle className="h-3 w-3" />
                      )}
                      {overview.telemetry.redis.status} (Resilient Fallback Mode)
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* RBAC Breakdown Panel */}
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-5 w-5 text-purple-600" />
                    Granular User Roles Distribution (15 Roles)
                  </CardTitle>
                  <CardDescription>Multi-portal role breakdown across all institutional participants</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-xs">
                  {Object.entries(overview.metrics.users.byRole).map(([role, count]) => (
                    <div key={role} className="flex justify-between items-center py-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-slate-800">{role}</span>
                        {role === 'SYSTEM_ADMIN' && <Badge className="bg-purple-100 text-purple-800 text-[10px]">Superuser</Badge>}
                        {['GOVERNMENT_OFFICER', 'GOVERNMENT_DEPARTMENT'].includes(role) && (
                          <Badge className="bg-blue-100 text-blue-800 text-[10px]">Government</Badge>
                        )}
                        {['UNIVERSITY_ADMIN', 'FACULTY', 'STUDENT'].includes(role) && (
                          <Badge className="bg-amber-100 text-amber-800 text-[10px]">Academia</Badge>
                        )}
                        {['INDUSTRY_PARTNER', 'MSME', 'CSR_ORGANIZATION', 'STARTUP'].includes(role) && (
                          <Badge className="bg-emerald-100 text-emerald-800 text-[10px]">Industry</Badge>
                        )}
                      </div>
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded font-mono">{count}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: Organization Governance */}
        {activeTab === 'organizations' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search organization name or slug..."
                    value={orgSearch}
                    onChange={e => setOrgSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <select
                  value={orgFilterType}
                  onChange={e => setOrgFilterType(e.target.value)}
                  className="h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">All Types (University, Industry, CSR...)</option>
                  <option value="UNIVERSITY">University</option>
                  <option value="GOVERNMENT">Government</option>
                  <option value="INDUSTRY">Industry</option>
                  <option value="MSME">MSME</option>
                  <option value="CSR">CSR</option>
                  <option value="STARTUP">Startup</option>
                </select>
                <select
                  value={orgFilterVerif}
                  onChange={e => setOrgFilterVerif(e.target.value)}
                  className="h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">All Verification Statuses</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="UNVERIFIED">Unverified</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>

              <Button size="sm" variant="outline" onClick={fetchOrganizations} disabled={loading} className="text-xs h-9">
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Filter ({orgs.length} shown)
              </Button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Organization</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Verification</th>
                      <th className="p-3">Rating Score</th>
                      <th className="p-3">Activity</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Governance Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orgs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No organizations found matching your search criteria.
                        </td>
                      </tr>
                    ) : (
                      orgs.map(o => {
                        const lastRating = o.metadata?.lastRatingScore ?? null;
                        return (
                          <tr key={o.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3">
                              <div className="font-semibold text-slate-900">{o.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">slug: {o.slug}</div>
                            </td>
                            <td className="p-3">
                              <Badge variant="outline" className="text-[10px] font-semibold">
                                {o.type}
                              </Badge>
                            </td>
                            <td className="p-3">
                              <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded text-[11px] ${
                                o.verificationStatus === 'VERIFIED'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : o.verificationStatus === 'PENDING_REVIEW'
                                  ? 'bg-amber-50 text-amber-700 animate-pulse'
                                  : o.verificationStatus === 'REJECTED'
                                  ? 'bg-rose-50 text-rose-700'
                                  : 'bg-slate-100 text-slate-600'
                              }`}>
                                {o.verificationStatus === 'VERIFIED' && <CheckCircle2 className="h-3 w-3" />}
                                {o.verificationStatus === 'PENDING_REVIEW' && <Clock className="h-3 w-3" />}
                                {o.verificationStatus}
                              </span>
                            </td>
                            <td className="p-3">
                              {lastRating !== null ? (
                                <div className="flex items-center gap-1.5">
                                  <Award className="h-3.5 w-3.5 text-amber-500" />
                                  <span className="font-bold text-slate-900 font-mono">{lastRating}/100</span>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Not rated</span>
                              )}
                            </td>
                            <td className="p-3 text-[11px] text-slate-600">
                              <div>{o.counts.users} users &bull; {o.counts.ledProjects} projects</div>
                              <div>{o.counts.partnerships} partnerships</div>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                o.status === 'ACTIVE'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {o.status}
                              </span>
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[11px] px-2"
                                  onClick={() => {
                                    setSelectedOrg(o);
                                    setVerifStatus(o.verificationStatus === 'VERIFIED' ? 'REJECTED' : 'APPROVED');
                                    setVerifNotes('');
                                    setVerifModalOpen(true);
                                  }}
                                >
                                  Review Verif
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-[11px] px-2 border-amber-300 text-amber-800 hover:bg-amber-50"
                                  onClick={() => {
                                    setRatingTargetOrg(o);
                                    setDimTechnical(85);
                                    setDimTimeliness(80);
                                    setDimCollaboration(90);
                                    setDimOutcome(85);
                                    setRatingReason('');
                                    setRatingEvidence('');
                                    setRatingModalOpen(true);
                                  }}
                                >
                                  <Award className="h-3 w-3 mr-1 text-amber-600" />
                                  Rate
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className={`h-7 text-[11px] px-2 ${
                                    o.status === 'ACTIVE'
                                      ? 'text-rose-600 hover:bg-rose-50'
                                      : 'text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                  onClick={() => handleToggleOrgStatus(o)}
                                  disabled={actionLoading}
                                >
                                  {o.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: User Directory & RBAC Status Management */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={e => setUserSearch(e.target.value)}
                    className="pl-9 h-9 text-xs"
                  />
                </div>
                <select
                  value={userFilterRole}
                  onChange={e => setUserFilterRole(e.target.value)}
                  className="h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">All 15 RBAC Roles</option>
                  <option value="CITIZEN">Citizen</option>
                  <option value="GOVERNMENT_OFFICER">Government Officer</option>
                  <option value="UNIVERSITY_ADMIN">University Admin</option>
                  <option value="FACULTY">Faculty</option>
                  <option value="STUDENT">Student</option>
                  <option value="INDUSTRY_PARTNER">Industry Partner</option>
                  <option value="MSME">MSME</option>
                  <option value="CSR_ORGANIZATION">CSR Organization</option>
                  <option value="SYSTEM_ADMIN">System Admin</option>
                </select>
              </div>

              <Button size="sm" variant="outline" onClick={fetchUsers} disabled={loading} className="text-xs h-9">
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Filter Users ({users.length} shown)
              </Button>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">User & Email</th>
                      <th className="p-3">RBAC Role</th>
                      <th className="p-3">Affiliation</th>
                      <th className="p-3">Email Verified</th>
                      <th className="p-3">Account State</th>
                      <th className="p-3">Joined Date</th>
                      <th className="p-3 text-right">Access Control</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          No users found matching query.
                        </td>
                      </tr>
                    ) : (
                      users.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3">
                            <div className="font-semibold text-slate-900">{u.fullName}</div>
                            <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={`text-[10px] font-mono ${
                              u.role === 'SYSTEM_ADMIN'
                                ? 'border-purple-300 text-purple-800 bg-purple-50'
                                : u.role.startsWith('GOV')
                                ? 'border-blue-300 text-blue-800 bg-blue-50'
                                : 'border-slate-300 text-slate-800'
                            }`}>
                              {u.role}
                            </Badge>
                          </td>
                          <td className="p-3 text-slate-600">
                            {u.organization ? (
                              <div>
                                <span className="font-medium text-slate-900">{u.organization.name}</span>
                                <span className="text-[10px] text-slate-400 block">({u.organization.type})</span>
                              </div>
                            ) : (
                              <span className="text-slate-400 italic">Independent Citizen</span>
                            )}
                          </td>
                          <td className="p-3">
                            {u.emailVerified ? (
                              <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                                <CheckCircle2 className="h-3 w-3" /> Yes
                              </span>
                            ) : (
                              <span className="text-slate-400">Pending</span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              u.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {u.isActive ? 'ACTIVE' : 'DEACTIVATED'}
                            </span>
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-right">
                            {u.role === 'SYSTEM_ADMIN' ? (
                              <span className="text-[10px] text-slate-400 italic">Protected Superuser</span>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                className={`h-7 text-[11px] px-2 ${
                                  u.isActive ? 'text-rose-600 hover:bg-rose-50' : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                                onClick={() => handleToggleUserStatus(u)}
                                disabled={actionLoading}
                              >
                                {u.isActive ? 'Deactivate' : 'Activate'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Immutable Audit Trail */}
        {activeTab === 'audit' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center gap-3">
                <select
                  value={auditResource}
                  onChange={e => setAuditResource(e.target.value)}
                  className="h-9 px-3 text-xs rounded-lg border border-slate-300 bg-white"
                >
                  <option value="">All Audited Resources</option>
                  <option value="Challenge">Challenge</option>
                  <option value="Organization">Organization</option>
                  <option value="User">User</option>
                  <option value="Project">Project</option>
                  <option value="Proposal">Proposal</option>
                  <option value="ProblemCluster">ProblemCluster</option>
                </select>
                <Button size="sm" variant="outline" onClick={fetchAuditLogs} disabled={loading} className="text-xs h-9">
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                  Query Trail
                </Button>
              </div>
              <div className="text-xs text-slate-500">
                Displaying latest {auditLogs.length} cryptographically sequenced ledger events
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Timestamp</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Resource & ID</th>
                      <th className="p-3">Actor / Role</th>
                      <th className="p-3">Justification / Reason</th>
                      <th className="p-3">State Mutation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {auditLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-500 font-sans">
                          No audit entries recorded for selected resource.
                        </td>
                      </tr>
                    ) : (
                      auditLogs.map(log => (
                        <tr key={log.id} className="hover:bg-slate-50/80 transition">
                          <td className="p-3 text-slate-500 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded">
                              {log.action}
                            </span>
                          </td>
                          <td className="p-3 text-slate-800">
                            <div><span className="font-sans font-semibold">{log.resource}</span></div>
                            <div className="text-[10px] text-slate-400">{log.resourceId}</div>
                          </td>
                          <td className="p-3">
                            <div className="text-slate-800">{log.actorRole || 'SYSTEM'}</div>
                            <div className="text-[10px] text-slate-400">{log.actorId ? `${log.actorId.slice(0, 8)}...` : 'Automated'}</div>
                          </td>
                          <td className="p-3 font-sans text-slate-600 max-w-xs truncate">
                            {log.reason || <span className="text-slate-400 italic">No notes</span>}
                          </td>
                          <td className="p-3">
                            <details className="cursor-pointer text-blue-600 hover:underline">
                              <summary className="font-sans text-[10px]">View Diff</summary>
                              <div className="mt-1 p-2 bg-slate-900 text-slate-100 rounded text-[10px] max-w-xs overflow-x-auto whitespace-pre">
                                {JSON.stringify({ prev: log.previousState, next: log.newState }, null, 2)}
                              </div>
                            </details>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 1: Organization Verification Review */}
        {verifModalOpen && selectedOrg && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                  <ShieldCheck className="w-5 h-5 text-purple-600" />
                  <h3>Review Organization Verification</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Authoritatively verify or reject institutional accreditation for {selectedOrg.name}.
                </p>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Decision Outcome</label>
                  <select
                    value={verifStatus}
                    onChange={e => setVerifStatus(e.target.value as 'APPROVED' | 'REJECTED')}
                    className="w-full h-9 rounded-lg border border-slate-300 px-2 font-medium"
                  >
                    <option value="APPROVED">APPROVED &bull; Verify Institution</option>
                    <option value="REJECTED">REJECTED &bull; Reject Accreditation</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Administrative Review Notes (Recorded in Audit Ledger)
                  </label>
                  <textarea
                    rows={3}
                    value={verifNotes}
                    onChange={e => setVerifNotes(e.target.value)}
                    placeholder="e.g. Verified official university charter & NAAC accreditation documents."
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setVerifModalOpen(false)} disabled={actionLoading}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className={verifStatus === 'APPROVED' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-rose-600 hover:bg-rose-700 text-white'}
                  onClick={handleReviewVerification}
                  isLoading={actionLoading}
                >
                  Commit Decision
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: Structured Organization Rating Modal */}
        {ratingModalOpen && ratingTargetOrg && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                  <Award className="w-5 h-5 text-amber-500" />
                  <h3>Official Institutional Evaluation & Rating</h3>
                </div>
                <p className="text-xs text-slate-500">
                  Rate {ratingTargetOrg.name} across 4 standardized performance dimensions with immutable audit preservation.
                </p>
              </div>

              {/* Calculated Score Display */}
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-amber-900">Composite Rating Score</div>
                  <div className="text-[11px] text-amber-700">Weighted average across dimensions</div>
                </div>
                <div className="text-2xl font-bold text-amber-900 font-mono">
                  {Math.round((dimTechnical + dimTimeliness + dimCollaboration + dimOutcome) / 4)}/100
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-3 text-xs">
                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Technical Competence (25%)</span>
                    <span className="font-mono text-purple-700">{dimTechnical}/100</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={dimTechnical}
                    onChange={e => setDimTechnical(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Timeliness & SLA Delivery (25%)</span>
                    <span className="font-mono text-blue-700">{dimTimeliness}/100</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={dimTimeliness}
                    onChange={e => setDimTimeliness(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Stakeholder Collaboration (25%)</span>
                    <span className="font-mono text-emerald-700">{dimCollaboration}/100</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={dimCollaboration}
                    onChange={e => setDimCollaboration(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between font-semibold text-slate-700 mb-1">
                    <span>Civic Outcome Quality (25%)</span>
                    <span className="font-mono text-indigo-700">{dimOutcome}/100</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={dimOutcome}
                    onChange={e => setDimOutcome(Number(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Evidence Citation URL (Optional)
                  </label>
                  <input
                    type="url"
                    value={ratingEvidence}
                    onChange={e => setRatingEvidence(e.target.value)}
                    placeholder="https://sicp.gov.in/evaluations/report-2026.pdf"
                    className="w-full h-8 rounded-lg border border-slate-300 px-2.5 text-xs focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Rating Justification & Notes (Mandatory)
                  </label>
                  <textarea
                    rows={2}
                    value={ratingReason}
                    onChange={e => setRatingReason(e.target.value)}
                    placeholder="e.g. Consistently delivers sensor calibration milestones ahead of schedule with strong community engagement."
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* History Preview if available */}
              {ratingTargetOrg.metadata?.ratings && ratingTargetOrg.metadata.ratings.length > 0 && (
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600">
                  <span className="font-semibold text-slate-800">Preserved History: </span>
                  {ratingTargetOrg.metadata.ratings.length} prior evaluation(s) on record.
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setRatingModalOpen(false)} disabled={actionLoading}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  onClick={handleSubmitRating}
                  isLoading={actionLoading}
                >
                  <Award className="h-4 w-4 mr-1.5" />
                  Commit Official Rating
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
