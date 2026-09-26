'use client';

import React, { useState, useEffect, useId } from 'react';
import Link from 'next/link';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { useAuth } from '../../src/lib/auth-context';
import { apiClient } from '../../src/lib/api-client';
import { Button } from '../../src/components/ui/Button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Modal } from '../../src/components/ui/Modal';
import { Input } from '../../src/components/ui/Input';
import { Textarea } from '../../src/components/ui/Textarea';
import {
  Briefcase,
  Building2,
  Handshake,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Send,
  PlusCircle,
  Coins,
  Cpu,
  Layers,
  MapPin,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Award,
  GraduationCap,
  AlertTriangle,
  BookOpen,
  Network,
} from 'lucide-react';
import { SolutionMemoryCard } from '../../src/components/intelligence/SolutionMemoryCard';
import { HistoricalFailureWarning } from '../../src/components/intelligence/HistoricalFailureWarning';
import { CompareCaseDrawer } from '../../src/components/intelligence/CompareCaseDrawer';

interface Opportunity {
  id: string;
  challengeId: string;
  projectId: string | null;
  title: string;
  description: string;
  category: string;
  priority: string;
  district?: string;
  state?: string;
  currentStage: string;
  universityName: string | null;
  matchScore: number;
  matchedCapabilities: string[];
  isInvitedByGovernment: boolean;
  hasExpressedInterest: boolean;
  interestStatus: string | null;
  partnershipId: string | null;
}

interface InterestItem {
  id: string;
  partnershipId: string;
  projectId: string;
  projectTitle: string;
  challengeId: string;
  challengeTitle: string;
  category: string;
  location: string;
  universityName: string;
  status: string;
  rawStatus: string;
  partnershipType: string;
  fundingOffered: number | null;
  message: string | null;
  createdAt: string;
}

interface ActiveCollaboration {
  id: string;
  partnershipId: string;
  projectId: string;
  projectTitle: string;
  challengeTitle: string;
  category: string;
  universityName: string;
  collaborationType: string;
  fundingOffered: number;
  supportBeingProvided: string;
  projectStage: string;
  milestonesCount: number;
  deliverablesCount: number;
  createdAt: string;
  updatedAt: string;
}

interface RegisteredIndustry {
  id: string;
  name: string;
  slug: string;
  type: string;
  verificationStatus: string;
  metadata?: any;
  industryProfile?: {
    sector?: string;
    capabilities?: string[];
    technologies?: string[];
    fundingCapacity?: number;
  };
  adminUser?: {
    id: string;
    email: string;
    fullName: string;
    role: string;
  };
}

export default function IndustryPortalPage() {
  const { user, login, demoSwitch } = useAuth();
  const titleId = useId();
  const descId = useId();

  const isIndustryPersona = Boolean(
    user &&
    [
      'INDUSTRY_PARTNER',
      'MSME',
      'CSR_ORGANIZATION',
      'STARTUP',
      'SYSTEM_ADMIN',
    ].includes((user.role || '').toUpperCase())
  );

  const isUniversityPersona = Boolean(
    user &&
    [
      'UNIVERSITY_ADMIN',
      'FACULTY',
      'STUDENT',
      'RESEARCH_ASSISTANT',
    ].includes((user.role || '').toUpperCase())
  );

  const isGovernmentPersona = Boolean(
    user &&
    [
      'GOVERNMENT_OFFICER',
      'GOVERNMENT_DEPARTMENT',
    ].includes((user.role || '').toUpperCase())
  );

  // Navigation tabs: OPPORTUNITIES | MY_INTERESTS | COLLABORATIONS
  const [activeTab, setActiveTab] = useState<'OPPORTUNITIES' | 'MY_INTERESTS' | 'COLLABORATIONS'>('OPPORTUNITIES');

  // Data states
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [myInterests, setMyInterests] = useState<InterestItem[]>([]);
  const [collaborations, setCollaborations] = useState<ActiveCollaboration[]>([]);
  const [registeredIndustries, setRegisteredIndustries] = useState<RegisteredIndustry[]>([]);

  // Modals
  const [switcherModalOpen, setSwitcherModalOpen] = useState<boolean>(false);
  const [detailModalOpen, setDetailModalOpen] = useState<boolean>(false);
  const [selectedOpp, setSelectedOpp] = useState<Opportunity | null>(null);

  const [interestModalOpen, setInterestModalOpen] = useState<boolean>(false);
  const [submittingInterest, setSubmittingInterest] = useState<boolean>(false);
  const [interestForm, setInterestForm] = useState({
    partnershipType: 'TECHNICAL_SUPPORT',
    fundingOffered: '',
    message: '',
  });

  const [supportModalOpen, setSupportModalOpen] = useState<boolean>(false);
  const [submittingSupport, setSubmittingSupport] = useState<boolean>(false);
  const [selectedCollab, setSelectedCollab] = useState<ActiveCollaboration | null>(null);
  const [supportForm, setSupportForm] = useState({
    fundingOffered: '',
    equipmentOffered: '',
  });

  // Institutional Precedents & Deployment Track Records for Industry
  const [indPrecedents, setIndPrecedents] = useState<any[]>([]);
  const [indLoadingPrecedents, setIndLoadingPrecedents] = useState<boolean>(false);
  const [indComparingMemory, setIndComparingMemory] = useState<any | null>(null);
  const [indCompareDrawerOpen, setIndCompareDrawerOpen] = useState<boolean>(false);

  const fetchOpportunityPrecedents = async (challengeId: string, category?: string) => {
    setIndLoadingPrecedents(true);
    setIndPrecedents([]);
    try {
      const evalRes = await apiClient.request<any>(
        `/api/v1/solutions/historical/challenge/${challengeId}/evaluated`
      );
      if (evalRes.success && evalRes.data && evalRes.data.retrievedMemories?.length > 0) {
        setIndPrecedents(evalRes.data.retrievedMemories);
      } else {
        const catRes = await apiClient.request<any>(
          `/api/v1/solutions?category=${encodeURIComponent(category || '')}&limit=3`
        );
        if (catRes.success && catRes.data) {
          const items = Array.isArray(catRes.data) ? catRes.data : catRes.data.items || [];
          setIndPrecedents(items);
        }
      }
    } catch {
      // non-blocking
    } finally {
      setIndLoadingPrecedents(false);
    }
  };

  const [notificationBanner, setNotificationBanner] = useState<string | null>(null);
  const [activeProblemId, setActiveProblemId] = useState<string>('');

  // Sync tab with URL search parameter if present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('problemId') || '';
    if (pId) {
      setActiveProblemId(pId);
    }
    const tabParam = (params.get('tab') || '').toUpperCase();
    if (tabParam === 'COLLABORATION' || tabParam === 'COLLABORATIONS') {
      setActiveTab('COLLABORATIONS');
    } else if (tabParam === 'MY_INTERESTS' || tabParam === 'INTERESTS') {
      setActiveTab('MY_INTERESTS');
    } else if (tabParam === 'OPPORTUNITIES') {
      setActiveTab('OPPORTUNITIES');
    }
  }, []);

  // Fetch all industry data
  const fetchData = async () => {
    try {
      setRefreshing(true);
      const [oppRes, intRes, colRes, regRes] = await Promise.allSettled([
        apiClient.request<Opportunity[]>('/api/v1/industry/opportunities'),
        apiClient.request<InterestItem[]>('/api/v1/industry/my-interests'),
        apiClient.request<ActiveCollaboration[]>('/api/v1/industry/collaborations'),
        apiClient.request<RegisteredIndustry[]>('/api/v1/industry/registered'),
      ]);

      let opps: Opportunity[] = [];
      if (oppRes.status === 'fulfilled' && oppRes.value?.success && Array.isArray(oppRes.value.data) && oppRes.value.data.length > 0) {
        opps = oppRes.value.data;
      } else {
        // Fallback for collaborative/observer view (e.g. University Admin, Government, Citizen, or Industry without direct allocations)
        try {
          const chRes = await apiClient.request<any>('/api/v1/challenges');
          if (chRes.success) {
            const rawChallenges = Array.isArray(chRes.data)
              ? chRes.data
              : (chRes.data?.items || []);
            opps = rawChallenges.map((ch: any) => ({
              id: ch.id,
              challengeId: ch.id,
              projectId: ch.projects?.[0]?.id || null,
              title: ch.title,
              description: ch.description,
              category: ch.category,
              priority: ch.priority || 'HIGH',
              district: ch.district,
              state: ch.state,
              currentStage: ch.status,
              universityName: ch.assignedUniversity?.name || null,
              matchScore: typeof ch.priorityScore === 'number' ? Math.round(ch.priorityScore) : 85,
              matchedCapabilities: ['CSR Co-funding', 'Field Pilot Testing', 'Technology Transfer'],
              isInvitedByGovernment: true,
              hasExpressedInterest: false,
              interestStatus: null,
              partnershipId: null,
            }));
          }
        } catch {
          // Handled
        }
      }
      setOpportunities(opps);

      if (intRes.status === 'fulfilled' && intRes.value?.success && Array.isArray(intRes.value.data)) {
        setMyInterests(intRes.value.data);
      } else {
        setMyInterests([]);
      }
      if (colRes.status === 'fulfilled' && colRes.value?.success && Array.isArray(colRes.value.data)) {
        setCollaborations(colRes.value.data);
      } else {
        setCollaborations([]);
      }
      if (regRes.status === 'fulfilled' && regRes.value?.success && Array.isArray(regRes.value.data)) {
        setRegisteredIndustries(regRes.value.data);
      }
    } catch (err) {
      console.error('Failed loading industry dashboard data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.organizationId]);

  // Express Interest Submission
  const handleExpressInterest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOpp) return;

    try {
      setSubmittingInterest(true);
      const payload: any = {
        partnershipType: interestForm.partnershipType,
        message: interestForm.message,
      };
      if (interestForm.fundingOffered && !isNaN(Number(interestForm.fundingOffered))) {
        payload.fundingOffered = Number(interestForm.fundingOffered);
      }

      await apiClient.request(`/api/v1/industry/opportunities/${selectedOpp.id}/interest`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setNotificationBanner(`Successfully expressed interest in "${selectedOpp.title}". Government and university leaders have been notified.`);
      setInterestModalOpen(false);
      setInterestForm({ partnershipType: 'TECHNICAL_SUPPORT', fundingOffered: '', message: '' });
      await fetchData();
      setActiveTab('MY_INTERESTS');
    } catch (err: any) {
      console.error('Express interest error:', err);
      alert(err.message || 'Failed to express interest. Please try again.');
    } finally {
      setSubmittingInterest(false);
    }
  };

  // Provide Support Submission
  const handleProvideSupport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCollab) return;

    try {
      setSubmittingSupport(true);
      const payload: any = {};
      if (supportForm.fundingOffered && !isNaN(Number(supportForm.fundingOffered))) {
        payload.fundingOffered = Number(supportForm.fundingOffered);
      }
      if (supportForm.equipmentOffered) {
        payload.equipmentOffered = supportForm.equipmentOffered;
      }

      await apiClient.request(`/api/v1/industry/collaborations/${selectedCollab.partnershipId}/support`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setNotificationBanner(`Support commitment updated for "${selectedCollab.projectTitle}".`);
      setSupportModalOpen(false);
      setSupportForm({ fundingOffered: '', equipmentOffered: '' });
      await fetchData();
    } catch (err: any) {
      console.error('Provide support error:', err);
      alert(err.message || 'Failed to update support commitment.');
    } finally {
      setSubmittingSupport(false);
    }
  };

  // Institutional Switcher
  const handleSwitchIndustry = async (orgId: string) => {
    try {
      setLoading(true);
      const res = await demoSwitch(orgId);
      if (res.success && res.user) {
        setSwitcherModalOpen(false);
        setNotificationBanner(`Switched active partner session to ${res.user.organization?.name || 'organization'}!`);
        await fetchData();
      } else {
        alert(res.error || 'Failed to switch industry partner');
      }
    } catch (err: any) {
      console.error('Failed to switch industry partner:', err);
      alert('Institutional switch failed: ' + (err.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  };

  const orgName = user?.organization?.name || (isIndustryPersona ? 'CleanGrid Tech Innovations' : 'Industry & CSR Commercialization Network');

  const orgType = user?.organization?.type || (isIndustryPersona ? 'CSR / Industry' : isUniversityPersona ? 'Academic Collaborator' : 'Partner Discovery');

  const userFullName = user?.fullName || (isIndustryPersona ? 'Industry Administrator' : 'Guest / Collaborator');
  const userEmail = user?.email || (isIndustryPersona ? 'industry@sicp.gov.in' : 'guest@sicp.gov.in');

  return (
    <AppLayout portal="industry">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Active Problem Context Banner */}
        {activeProblemId && (
          <div
            data-testid="problem-context-banner"
            className="p-4 rounded-xl bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border border-emerald-500/50 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-sicp-fade-in text-slate-100"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <Building2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-900/80 text-emerald-200 border border-emerald-700 font-mono text-[10px]">
                    Active Problem Context
                  </Badge>
                  <span className="font-mono text-slate-300 font-semibold">#{activeProblemId.slice(0, 8)}...</span>
                </div>
                <p className="text-slate-300 text-[11.5px]">
                  Viewing Corporate CSR Co-Funding and Pilot Partnerships for problem inquiry. Return to Problem Intelligence at any time.
                </p>
              </div>
            </div>

            <Link href={`/challenges/${activeProblemId}`}>
              <Button
                size="sm"
                variant="primary"
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 shrink-0 flex items-center gap-1.5"
                data-testid="return-to-problem-btn"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Problem Intelligence</span>
              </Button>
            </Link>
          </div>
        )}

        {/* Notification Banner */}
        {notificationBanner && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-4 py-3 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span className="text-sm font-medium">{notificationBanner}</span>
            </div>
            <button
              onClick={() => setNotificationBanner(null)}
              className="text-emerald-700 hover:text-emerald-900 text-sm font-bold ml-4"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. Industry Profile Header */}
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-700 dark:text-amber-400 flex-shrink-0 shadow-2xs">
                <Building2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Industry Portal</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{orgName}</h1>
                  <Badge variant="success" className="flex items-center gap-1 font-semibold">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    VERIFIED
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800">
                    {orgType}
                  </Badge>
                </div>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Current Partner: <span className="font-bold text-slate-900 dark:text-slate-100">{orgName}</span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2">
                  <span>User:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">{userFullName}</span>
                  <span className="text-slate-500 dark:text-slate-400">({user?.role || 'CSR_ORGANIZATION'})</span>
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    Civic Impact Region: Pan-India
                  </span>
                  <span className="flex items-center gap-1">
                    <span>Email:</span>
                    <span className="text-slate-700 dark:text-slate-300 font-medium">{userEmail}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Actions: Partner Switcher + Refresh */}
            <div className="flex items-center gap-3 self-start lg:self-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSwitcherModalOpen(true)}
                className="flex items-center gap-2 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-700 hover:bg-amber-50 dark:hover:bg-amber-950/40 font-semibold shadow-2xs"
              >
                <Building2 className="w-4 h-4" />
                Switch Partner
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={refreshing}
                className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-amber-600' : ''}`} />
                <span>Refresh</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Systemic Infrastructure CSR Callout */}
        <div className="bg-gradient-to-r from-emerald-950 via-teal-950 to-slate-900 border border-emerald-500/30 rounded-2xl p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-400/30 shrink-0">
              <Network className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-900/60 px-2 py-0.5 rounded border border-emerald-700/50">
                  CSR Co-Funding &amp; Capital Grants
                </span>
                <span className="text-[11px] text-amber-300 font-medium">
                  High-Impact Systemic Infrastructure
                </span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">
                Systemic Infrastructure Capital Interventions
              </h3>
              <p className="text-xs text-emerald-200/80 max-w-2xl mt-0.5">
                Co-fund high-leverage civic solutions addressing verified infrastructure failures. Deploy CSR capital alongside government matching funds to resolve systemic utility bottlenecks.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/government/systemic-intelligence"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg transition"
            >
              <span>View Systemic Incidents</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 2. Primary Navigation Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-800">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('OPPORTUNITIES')}
              className={`py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors ${
                activeTab === 'OPPORTUNITIES'
                  ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Opportunities</span>
              <span
                className={`ml-1.5 py-0.5 px-2 rounded-full text-xs font-semibold ${
                  activeTab === 'OPPORTUNITIES' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {opportunities.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('MY_INTERESTS')}
              className={`py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors ${
                activeTab === 'MY_INTERESTS'
                  ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>My Interests</span>
              <span
                className={`ml-1.5 py-0.5 px-2 rounded-full text-xs font-semibold ${
                  activeTab === 'MY_INTERESTS' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {myInterests.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('COLLABORATIONS')}
              className={`py-4 px-1 border-b-2 font-bold text-sm flex items-center gap-2 transition-colors ${
                activeTab === 'COLLABORATIONS'
                  ? 'border-amber-600 text-amber-700 dark:text-amber-400'
                  : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:border-slate-300'
              }`}
            >
              <Handshake className="w-4 h-4" />
              <span>Active Collaborations</span>
              <span
                className={`ml-1.5 py-0.5 px-2 rounded-full text-xs font-semibold ${
                  activeTab === 'COLLABORATIONS' ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}
              >
                {collaborations.length}
              </span>
            </button>
          </nav>
        </div>

        {/* 3. Tab Contents */}

        {/* TAB 1: OPPORTUNITIES */}
        {activeTab === 'OPPORTUNITIES' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Eligible Project Opportunities</h2>
                <p className="text-sm text-gray-500">
                  Civic challenges and projects open for industry expertise, CSR funding, testing, and deployment.
                </p>
              </div>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 space-y-3">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
                <p>Loading eligible opportunities...</p>
              </div>
            ) : opportunities.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 space-y-3">
                <Sparkles className="w-12 h-12 mx-auto text-gray-400" />
                <h3 className="text-base font-semibold text-gray-900">No open opportunities at this moment</h3>
                <p className="text-sm max-w-md mx-auto">
                  Opportunities will appear as soon as the Government approves civic problems and invites industry participation.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {opportunities.map(opp => (
                  <Card key={opp.id} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between">
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {opp.category}
                          </Badge>
                          <Badge
                            variant={
                              opp.priority === 'CRITICAL'
                                ? 'destructive'
                                : opp.priority === 'HIGH'
                                ? 'warning'
                                : 'default'
                            }
                            className="text-xs"
                          >
                            {opp.priority}
                          </Badge>
                          {opp.isInvitedByGovernment && (
                            <Badge variant="success" className="text-xs font-semibold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                              🏛️ Government Invited
                            </Badge>
                          )}
                          {opp.hasExpressedInterest && (
                            <Badge variant="outline" className="text-xs font-semibold bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                              ✓ Interest: {opp.interestStatus}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                          <Sparkles className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          {opp.matchScore}% Fit
                        </div>
                      </div>

                      <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100 line-clamp-2">
                        {opp.title}
                      </CardTitle>

                      <CardDescription className="text-xs text-slate-600 dark:text-slate-300 line-clamp-3">
                        {opp.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/80 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-700">
                        <div>
                          <span className="block text-slate-400 dark:text-slate-500 font-medium">Location</span>
                          <span className="text-slate-800 dark:text-slate-200 font-semibold">{opp.district || 'National'}, {opp.state || 'India'}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 dark:text-slate-500 font-medium">Partner University</span>
                          <span className="text-slate-800 dark:text-slate-200 font-semibold truncate block">{opp.universityName || 'Pending Assignment'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block mb-1.5">Required Capabilities:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {opp.matchedCapabilities.slice(0, 3).map((cap, i) => (
                            <span key={i} className="text-xs bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700">
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOpp(opp);
                            setDetailModalOpen(true);
                            fetchOpportunityPrecedents(opp.challengeId, opp.category);
                          }}
                          className="text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400"
                        >
                          View Details
                        </Button>

                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedOpp(opp);
                            setInterestForm({
                              partnershipType: 'TECHNICAL_SUPPORT',
                              fundingOffered: '',
                              message: '',
                            });
                            setInterestModalOpen(true);
                          }}
                          className={`text-xs font-bold shadow-2xs flex items-center gap-1.5 ${
                            !isIndustryPersona
                              ? 'bg-slate-900 hover:bg-slate-800 text-white'
                              : opp.hasExpressedInterest
                              ? 'bg-purple-600 hover:bg-purple-700 text-white'
                              : 'bg-blue-600 hover:bg-blue-700 text-white'
                          }`}
                        >
                          <Send className="w-3.5 h-3.5" />
                          {!isIndustryPersona
                            ? 'Partner Co-Funding Info'
                            : opp.hasExpressedInterest
                            ? 'Update Interest'
                            : 'Express Interest'}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MY INTERESTS */}
        {activeTab === 'MY_INTERESTS' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Expressed Interests & Applications</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Track status of civic opportunities where your industry has expressed interest in collaborating.
              </p>
            </div>

            {loading ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              </div>
            ) : myInterests.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
                <Clock className="w-12 h-12 mx-auto text-slate-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">No expressed interests yet</h3>
                <p className="text-sm max-w-md mx-auto">
                  Browse open civic opportunities under the "Opportunities" tab and click "Express Interest".
                </p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('OPPORTUNITIES')}>
                  Browse Opportunities
                </Button>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-800/60">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          Project / Challenge
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          University Involved
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          Support Offered
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                          Date Expressed
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-slate-900 divide-y divide-slate-200 dark:divide-slate-800">
                      {myInterests.map(item => (
                        <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{item.projectTitle}</div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="text-blue-600 dark:text-blue-400 font-medium">{item.category}</span>
                              <span>•</span>
                              <span>{item.location}</span>
                            </div>
                            {item.message && (
                              <div className="text-xs text-slate-700 dark:text-slate-300 mt-1 italic line-clamp-1 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded border border-slate-100 dark:border-slate-700">
                                "{item.message}"
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-300 font-medium">
                            {item.universityName}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-slate-900 dark:text-slate-100">{item.partnershipType.replace(/_/g, ' ')}</div>
                            {item.fundingOffered && item.fundingOffered > 0 && (
                              <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1 mt-0.5">
                                <Coins className="w-3.5 h-3.5" />
                                ₹{item.fundingOffered.toLocaleString('en-IN')}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <Badge
                              variant={
                                item.status === 'Accepted'
                                  ? 'success'
                                  : item.status === 'Under Review'
                                  ? 'warning'
                                  : item.status === 'Declined'
                                  ? 'destructive'
                                  : 'default'
                              }
                              className="text-xs font-semibold"
                            >
                              {item.status}
                            </Badge>
                            {item.status === 'Accepted' && (
                              <button
                                onClick={() => setActiveTab('COLLABORATIONS')}
                                className="block text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 font-medium"
                              >
                                View Collaboration →
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500 dark:text-slate-400">
                            {new Date(item.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ACTIVE COLLABORATIONS */}
        {activeTab === 'COLLABORATIONS' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Active Project Collaborations</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Live research and civic deployment partnerships where your industry support is formally confirmed.
              </p>
            </div>

            {loading ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              </div>
            ) : collaborations.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400 space-y-3">
                <Handshake className="w-12 h-12 mx-auto text-slate-400" />
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">No active collaborations yet</h3>
                <p className="text-sm max-w-md mx-auto">
                  When the Government or University approves an expressed interest, the project appears here as an active collaboration.
                </p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('OPPORTUNITIES')}>
                  Explore Opportunities
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {collaborations.map(collab => (
                  <Card key={collab.id} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow">
                    <CardHeader className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 font-semibold">
                          Active Partner
                        </Badge>
                        <Badge variant="default" className="text-xs font-mono">
                          {collab.projectStage}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {collab.projectTitle}
                      </CardTitle>
                      <CardDescription className="text-xs text-slate-600 dark:text-slate-300">
                        Challenge: {collab.challengeTitle}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200/80 dark:border-slate-700">
                        <div>
                          <span className="block text-slate-400 dark:text-slate-500 font-medium">Academic Lead</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate block">{collab.universityName}</span>
                        </div>
                        <div>
                          <span className="block text-slate-400 dark:text-slate-500 font-medium">Support Area</span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{collab.collaborationType.replace(/_/g, ' ')}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">Current Commitment:</span>
                        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 p-2.5 rounded-lg space-y-1">
                          {collab.fundingOffered > 0 && (
                            <div className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5 text-blue-600" />
                              Funding: ₹{collab.fundingOffered.toLocaleString('en-IN')}
                            </div>
                          )}
                          <p className="text-xs text-slate-700 dark:text-slate-300 italic">
                            "{collab.supportBeingProvided}"
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          Active since {new Date(collab.createdAt).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedCollab(collab);
                            setSupportForm({
                              fundingOffered: collab.fundingOffered ? String(collab.fundingOffered) : '',
                              equipmentOffered: collab.supportBeingProvided || '',
                            });
                            setSupportModalOpen(true);
                          }}
                          className="text-xs font-semibold flex items-center gap-1.5 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/60"
                        >
                          <PlusCircle className="w-3.5 h-3.5" />
                          Update Commitment
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL 1: EXPRESS INTEREST */}
        {interestModalOpen && selectedOpp && (
          <Modal
            isOpen={interestModalOpen}
            onClose={() => setInterestModalOpen(false)}
            title={isIndustryPersona ? 'Express Industry Interest' : 'Corporate Co-Funding Information'}
            size="md"
          >
            {!isIndustryPersona ? (
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Selected Project</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedOpp.title}</div>
                  <div className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">{selectedOpp.category} • {selectedOpp.district}, {selectedOpp.state}</div>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 rounded-xl space-y-2 text-xs text-amber-900 dark:text-amber-200">
                  <p className="font-bold text-sm text-amber-950 dark:text-amber-100 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                    Industry Partner Authorization Required
                  </p>
                  <p>
                    Corporate co-funding and CSR expressions of interest are reserved for authorized Industry, MSME, Startup, and CSR Partner accounts.
                  </p>
                  <p className="text-slate-600 dark:text-slate-300">
                    You are currently signed in as <strong>{user?.fullName || 'User'}</strong> with role <span className="font-mono">{user?.role}</span>.
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setInterestModalOpen(false)}
                  >
                    Close
                  </Button>
                  {isUniversityPersona && (
                    <Link href="/university">
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                        Return to Academic Hub
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            ) : (
              <form onSubmit={handleExpressInterest} className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Selected Project</div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedOpp.title}</div>
                  <div className="text-xs text-blue-700 dark:text-blue-400 mt-0.5">{selectedOpp.category} • {selectedOpp.district}, {selectedOpp.state}</div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Partnership Support Type *
                  </label>
                  <select
                    value={interestForm.partnershipType}
                    onChange={e => setInterestForm({ ...interestForm, partnershipType: e.target.value })}
                    className="w-full text-sm border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md shadow-2xs focus:ring-blue-500 focus:border-blue-500 p-2"
                    required
                  >
                    <option value="TECHNICAL_SUPPORT">Technical Support & Domain Expertise</option>
                    <option value="FUNDING">Direct Funding / CSR Grant</option>
                    <option value="MENTORSHIP">Technical Mentorship & Advisory</option>
                    <option value="PROTOTYPE_SUPPORT">Prototyping & Engineering Assistance</option>
                    <option value="TESTING">Testing Facilities & Quality Validation</option>
                    <option value="PILOT">Pilot Trial Deployment & Ground Support</option>
                    <option value="CSR">CSR Sponsorship & Community Outreach</option>
                    <option value="TECH_TRANSFER">Technology Transfer & Manufacturing</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Proposed Funding Contribution (₹ INR, Optional)
                  </label>
                  <Input
                    type="number"
                    placeholder="e.g. 500000"
                    value={interestForm.fundingOffered}
                    onChange={e => setInterestForm({ ...interestForm, fundingOffered: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Message / Capabilities Offered (Optional)
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Describe equipment, engineering capabilities, or pilot facilities you can contribute..."
                    value={interestForm.message}
                    onChange={e => setInterestForm({ ...interestForm, message: e.target.value })}
                  />
                </div>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setInterestModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={submittingInterest}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5 shadow-2xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {submittingInterest ? 'Submitting...' : 'Confirm Expression of Interest'}
                  </Button>
                </div>
              </form>
            )}
          </Modal>
        )}

        {/* MODAL 2: UPDATE COLLABORATION SUPPORT */}
        {supportModalOpen && selectedCollab && (
          <Modal
            isOpen={supportModalOpen}
            onClose={() => setSupportModalOpen(false)}
            title="Update Collaboration Commitment"
            size="md"
          >
            <form onSubmit={handleProvideSupport} className="space-y-4">
              <div className="bg-slate-50 dark:bg-slate-800/60 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Project</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">{selectedCollab.projectTitle}</div>
                <div className="text-xs text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">Partner: {selectedCollab.universityName}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Committed Funding (₹ INR)
                </label>
                <Input
                  type="number"
                  placeholder="e.g. 1000000"
                  value={supportForm.fundingOffered}
                  onChange={e => setSupportForm({ ...supportForm, fundingOffered: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Support Equipment, Facilities or Deliverables Provided
                </label>
                <Textarea
                  rows={3}
                  placeholder="Describe test kits, lab access, sensor equipment or field pilot deliverables provided..."
                  value={supportForm.equipmentOffered}
                  onChange={e => setSupportForm({ ...supportForm, equipmentOffered: e.target.value })}
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSupportModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingSupport}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold shadow-2xs"
                >
                  {submittingSupport ? 'Updating...' : 'Save Commitment'}
                </Button>
              </div>
            </form>
          </Modal>
        )}

        {/* MODAL 3: VIEW OPPORTUNITY DETAILS */}
        {detailModalOpen && selectedOpp && (
          <Modal
            isOpen={detailModalOpen}
            onClose={() => setDetailModalOpen(false)}
            title="Opportunity Specification"
            size="lg"
          >
            <div className="space-y-4 text-sm text-slate-700 dark:text-slate-300">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">{selectedOpp.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800">
                    {selectedOpp.category}
                  </Badge>
                  <Badge variant="default" className="text-xs">
                    Priority: {selectedOpp.priority}
                  </Badge>
                  {selectedOpp.isInvitedByGovernment && (
                    <Badge variant="success" className="text-xs">
                      Government Direct Invitation
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
                  Problem Description
                </h4>
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 leading-relaxed text-xs">
                  {selectedOpp.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Location</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{selectedOpp.district}, {selectedOpp.state}</div>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/80 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                  <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">Assigned University</div>
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{selectedOpp.universityName || 'Under Government Assignment'}</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  Required Industry Capabilities & Technologies
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedOpp.matchedCapabilities.map((cap, i) => (
                    <span key={i} className="text-xs bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-md font-medium">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Precedent Track Record for Industry Co-Investment */}
              <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Deployment Precedents &amp; Field Track Record
                  </h4>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Institutional Intelligence</span>
                </div>

                {indLoadingPrecedents ? (
                  <div className="py-4 text-center text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 rounded-lg">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto mb-1 text-blue-600" />
                    Checking empirical deployment records and field failure logs...
                  </div>
                ) : indPrecedents.length === 0 ? (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400">
                    ℹ️ No prior corporate or municipal deployments recorded for this exact specification. Pioneer pilot opportunity.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {indPrecedents.some(p => p.outcomeStatus === 'FAILED') && (
                      <HistoricalFailureWarning
                        memoryId={indPrecedents.find(p => p.outcomeStatus === 'FAILED')?.memoryId || 'prev-fail'}
                        solutionTitle={indPrecedents.find(p => p.outcomeStatus === 'FAILED')?.title || 'Prior Municipal Attempt'}
                        intendedOutcome="Corporate/civic co-deployment"
                        observedOutcome="FAILED"
                        failureFactors={indPrecedents.find(p => p.outcomeStatus === 'FAILED')?.whatFailed || 'Previous trial encountered component supply chain or maintenance challenges.'}
                        knownLimitations={indPrecedents.find(p => p.outcomeStatus === 'FAILED')?.rootCause || 'Unverified local vendor capacity or insufficient telemetry.'}
                        institutionalLesson={indPrecedents.find(p => p.outcomeStatus === 'FAILED')?.futureWarnings || 'Ensure modular component availability and SLA-backed maintenance.'}
                      />
                    )}
                    {indPrecedents.slice(0, 2).map((rec: any) => (
                      <SolutionMemoryCard
                        key={rec.memoryId || rec.id}
                        memory={rec}
                        currentProblemContext={{
                          title: selectedOpp.title,
                          description: selectedOpp.description,
                          category: selectedOpp.category,
                          district: selectedOpp.district,
                        }}
                        onCompare={id => {
                          const found = indPrecedents.find((p: any) => (p.memoryId || p.id) === id);
                          if (found) {
                            setIndComparingMemory(found);
                            setIndCompareDrawerOpen(true);
                          }
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3">
                <Button variant="outline" size="sm" onClick={() => setDetailModalOpen(false)}>
                  Close
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setDetailModalOpen(false);
                    setInterestForm({ partnershipType: 'TECHNICAL_SUPPORT', fundingOffered: '', message: '' });
                    setInterestModalOpen(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  {selectedOpp.hasExpressedInterest ? 'Update Interest' : 'Express Interest'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* MODAL 4: 1-CLICK INSTITUTIONAL SWITCHER */}
        {switcherModalOpen && (
          <Modal
            isOpen={switcherModalOpen}
            onClose={() => setSwitcherModalOpen(false)}
            title="Registered Industry / CSR Partners"
            size="lg"
          >
            <div className="space-y-4">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a registered and verified industry / CSR organization to switch active partner session:
              </p>

              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {registeredIndustries.map(ind => {
                  const isCurrent = ind.id === user?.organizationId || ind.name === user?.organization?.name;
                  return (
                    <div
                      key={ind.id}
                      onClick={() => !isCurrent && handleSwitchIndustry(ind.id)}
                      className={`p-3.5 rounded-lg border transition-all flex items-center justify-between cursor-pointer ${
                        isCurrent
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/40 ring-1 ring-blue-400'
                          : 'border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{ind.name}</span>
                          <Badge variant="outline" className="text-xs font-mono">
                            {ind.type}
                          </Badge>
                          <Badge variant="success" className="text-xs">
                            VERIFIED
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-300">
                          {ind.industryProfile?.sector || ind.metadata?.sector || 'Industrial Innovation'}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-slate-500">
                          Admin Contact: {ind.adminUser?.fullName || ind.metadata?.adminContactName || 'Authorized Admin'} ({ind.adminUser?.email || ind.metadata?.officialEmail})
                        </p>
                      </div>

                      {isCurrent ? (
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-950 px-2.5 py-1 rounded">
                          Current Active
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSwitchIndustry(ind.id);
                          }}
                          className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-2xs"
                        >
                          Switch
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setSwitcherModalOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* Side-by-side Historical Precedent Comparison Drawer */}
        <CompareCaseDrawer
          isOpen={indCompareDrawerOpen}
          onClose={() => setIndCompareDrawerOpen(false)}
          currentCase={
            selectedOpp
              ? {
                  id: selectedOpp.id,
                  title: selectedOpp.title,
                  description: selectedOpp.description,
                  category: selectedOpp.category,
                  district: selectedOpp.district,
                }
              : null
          }
          historicalCases={indComparingMemory ? [indComparingMemory] : indPrecedents}
        />
      </div>
    </AppLayout>
  );
}
