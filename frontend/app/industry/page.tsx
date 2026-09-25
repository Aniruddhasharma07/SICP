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

  // Sync tab with URL search parameter if present
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
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
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 flex-shrink-0">
                <Building2 className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-blue-600 text-xs font-bold uppercase tracking-wider">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Industry Portal</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">{orgName}</h1>
                  <Badge variant="success" className="flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    VERIFIED
                  </Badge>
                  <Badge variant="outline" className="font-mono text-xs text-blue-700 bg-blue-50 border-blue-200">
                    {orgType}
                  </Badge>
                </div>
                <div className="text-sm font-semibold text-gray-700">
                  Current Partner: <span className="font-bold text-gray-900">{orgName}</span>
                </div>
                <p className="text-sm text-gray-600 flex items-center gap-2">
                  <span>User:</span>
                  <span className="font-semibold text-gray-800">{userFullName}</span>
                  <span className="text-gray-500">({user?.role || 'CSR_ORGANIZATION'})</span>
                </p>
                <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-gray-400" />
                    Civic Impact Region: Pan-India
                  </span>
                  <span className="flex items-center gap-1">
                    <span>Email:</span>
                    <span className="text-gray-600 font-medium">{userEmail}</span>
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
                className="flex items-center gap-2 text-blue-700 border-blue-300 hover:bg-blue-50 font-semibold shadow-sm"
              >
                <Building2 className="w-4 h-4" />
                Switch Partner
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchData}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 font-semibold"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
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
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('OPPORTUNITIES')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === 'OPPORTUNITIES'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Opportunities</span>
              <span
                className={`ml-1.5 py-0.5 px-2 rounded-full text-xs font-semibold ${
                  activeTab === 'OPPORTUNITIES' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {opportunities.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('MY_INTERESTS')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === 'MY_INTERESTS'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>My Interests</span>
              <span
                className={`ml-1.5 py-0.5 px-2 rounded-full text-xs font-semibold ${
                  activeTab === 'MY_INTERESTS' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {myInterests.length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('COLLABORATIONS')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-colors ${
                activeTab === 'COLLABORATIONS'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Handshake className="w-4 h-4" />
              <span>Active Collaborations</span>
              <span
                className={`ml-1.5 py-0.5 px-2 rounded-full text-xs font-semibold ${
                  activeTab === 'COLLABORATIONS' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
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
                  <Card key={opp.id} className="border border-gray-200 hover:shadow-md transition-shadow flex flex-col justify-between">
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
                            <Badge variant="success" className="text-xs font-semibold bg-emerald-100 text-emerald-800 border-emerald-300">
                              🏛️ Government Invited
                            </Badge>
                          )}
                          {opp.hasExpressedInterest && (
                            <Badge variant="outline" className="text-xs font-semibold bg-purple-50 text-purple-700 border-purple-200">
                              ✓ Interest: {opp.interestStatus}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <Sparkles className="w-3 h-3" />
                          {opp.matchScore}% Fit
                        </div>
                      </div>

                      <CardTitle className="text-base font-bold text-gray-900 line-clamp-2">
                        {opp.title}
                      </CardTitle>

                      <CardDescription className="text-xs text-gray-600 line-clamp-3">
                        {opp.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 bg-gray-50 p-2.5 rounded-lg border border-gray-100">
                        <div>
                          <span className="block text-gray-400 font-medium">Location</span>
                          <span className="text-gray-800 font-semibold">{opp.district || 'National'}, {opp.state || 'India'}</span>
                        </div>
                        <div>
                          <span className="block text-gray-400 font-medium">Partner University</span>
                          <span className="text-gray-800 font-semibold truncate block">{opp.universityName || 'Pending Assignment'}</span>
                        </div>
                      </div>

                      <div>
                        <span className="text-xs text-gray-500 font-medium block mb-1.5">Required Capabilities:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {opp.matchedCapabilities.slice(0, 3).map((cap, i) => (
                            <span key={i} className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                              {cap}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedOpp(opp);
                            setDetailModalOpen(true);
                            fetchOpportunityPrecedents(opp.challengeId, opp.category);
                          }}
                          className="text-xs text-gray-600 hover:text-gray-900"
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
                          className={`text-xs font-semibold flex items-center gap-1.5 ${
                            !isIndustryPersona
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
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
              <h2 className="text-lg font-semibold text-gray-900">Expressed Interests & Applications</h2>
              <p className="text-sm text-gray-500">
                Track status of civic opportunities where your industry has expressed interest in collaborating.
              </p>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              </div>
            ) : myInterests.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 space-y-3">
                <Clock className="w-12 h-12 mx-auto text-gray-400" />
                <h3 className="text-base font-semibold text-gray-900">No expressed interests yet</h3>
                <p className="text-sm max-w-md mx-auto">
                  Browse open civic opportunities under the "Opportunities" tab and click "Express Interest".
                </p>
                <Button variant="outline" size="sm" onClick={() => setActiveTab('OPPORTUNITIES')}>
                  Browse Opportunities
                </Button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Project / Challenge
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          University Involved
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Support Offered
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Date Expressed
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {myInterests.map(item => (
                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-semibold text-gray-900">{item.projectTitle}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-2 mt-0.5">
                              <span className="text-blue-600 font-medium">{item.category}</span>
                              <span>•</span>
                              <span>{item.location}</span>
                            </div>
                            {item.message && (
                              <div className="text-xs text-gray-600 mt-1 italic line-clamp-1 bg-gray-50 p-1 rounded">
                                "{item.message}"
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                            {item.universityName}
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{item.partnershipType.replace(/_/g, ' ')}</div>
                            {item.fundingOffered && item.fundingOffered > 0 && (
                              <div className="text-xs text-emerald-700 font-semibold flex items-center gap-1 mt-0.5">
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
                                className="block text-xs text-blue-600 hover:underline mt-1"
                              >
                                View Collaboration →
                              </button>
                            )}
                          </td>
                          <td className="px-6 py-4 text-xs text-gray-500">
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
              <h2 className="text-lg font-semibold text-gray-900">Active Project Collaborations</h2>
              <p className="text-sm text-gray-500">
                Live research and civic deployment partnerships where your industry support is formally confirmed.
              </p>
            </div>

            {loading ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600" />
              </div>
            ) : collaborations.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 space-y-3">
                <Handshake className="w-12 h-12 mx-auto text-gray-400" />
                <h3 className="text-base font-semibold text-gray-900">No active collaborations yet</h3>
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
                  <Card key={collab.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardHeader className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold">
                          Active Partner
                        </Badge>
                        <Badge variant="default" className="text-xs font-mono">
                          {collab.projectStage}
                        </Badge>
                      </div>
                      <CardTitle className="text-base font-bold text-gray-900">
                        {collab.projectTitle}
                      </CardTitle>
                      <CardDescription className="text-xs text-gray-600">
                        Challenge: {collab.challengeTitle}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <div>
                          <span className="block text-gray-400 font-medium">Academic Lead</span>
                          <span className="font-semibold text-gray-800 truncate block">{collab.universityName}</span>
                        </div>
                        <div>
                          <span className="block text-gray-400 font-medium">Support Area</span>
                          <span className="font-semibold text-gray-800">{collab.collaborationType.replace(/_/g, ' ')}</span>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <span className="text-xs text-gray-500 font-medium block">Current Commitment:</span>
                        <div className="bg-blue-50 border border-blue-100 p-2.5 rounded-lg space-y-1">
                          {collab.fundingOffered > 0 && (
                            <div className="text-xs font-bold text-blue-900 flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5 text-blue-600" />
                              Funding: ₹{collab.fundingOffered.toLocaleString('en-IN')}
                            </div>
                          )}
                          <p className="text-xs text-gray-700 italic">
                            "{collab.supportBeingProvided}"
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-400">
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
                          className="text-xs font-semibold flex items-center gap-1.5 text-blue-700 border-blue-200 hover:bg-blue-50"
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
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 font-medium">Selected Project</div>
                  <div className="text-sm font-bold text-gray-900">{selectedOpp.title}</div>
                  <div className="text-xs text-blue-700 mt-0.5">{selectedOpp.category} • {selectedOpp.district}, {selectedOpp.state}</div>
                </div>

                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-xs text-amber-900">
                  <p className="font-bold text-sm text-amber-950 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    Industry Partner Authorization Required
                  </p>
                  <p>
                    Corporate co-funding and CSR expressions of interest are reserved for authorized Industry, MSME, Startup, and CSR Partner accounts.
                  </p>
                  <p className="text-slate-600">
                    You are currently signed in as <strong>{user?.fullName || 'User'}</strong> with role <span className="font-mono">{user?.role}</span>.
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-3">
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
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 font-medium">Selected Project</div>
                  <div className="text-sm font-bold text-gray-900">{selectedOpp.title}</div>
                  <div className="text-xs text-blue-700 mt-0.5">{selectedOpp.category} • {selectedOpp.district}, {selectedOpp.state}</div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Partnership Support Type *
                  </label>
                  <select
                    value={interestForm.partnershipType}
                    onChange={e => setInterestForm({ ...interestForm, partnershipType: e.target.value })}
                    className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Message / Capabilities Offered (Optional)
                  </label>
                  <Textarea
                    rows={3}
                    placeholder="Describe equipment, engineering capabilities, or pilot facilities you can contribute..."
                    value={interestForm.message}
                    onChange={e => setInterestForm({ ...interestForm, message: e.target.value })}
                  />
                </div>

                <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-3">
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
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold flex items-center gap-1.5"
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
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-500 font-medium">Active Project</div>
                <div className="text-sm font-bold text-gray-900">{selectedCollab.projectTitle}</div>
                <div className="text-xs text-emerald-700 font-medium mt-0.5">Partner: {selectedCollab.universityName}</div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
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
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Support Equipment, Facilities or Deliverables Provided
                </label>
                <Textarea
                  rows={3}
                  placeholder="Describe test kits, lab access, sensor equipment or field pilot deliverables provided..."
                  value={supportForm.equipmentOffered}
                  onChange={e => setSupportForm({ ...supportForm, equipmentOffered: e.target.value })}
                />
              </div>

              <div className="pt-3 border-t border-gray-200 flex items-center justify-end gap-3">
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
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
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
            <div className="space-y-4 text-sm text-gray-700">
              <div>
                <h3 className="text-base font-bold text-gray-900">{selectedOpp.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
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
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                  Problem Description
                </h4>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-gray-800 leading-relaxed text-xs">
                  {selectedOpp.description}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 font-medium">Location</div>
                  <div className="font-semibold text-gray-900">{selectedOpp.district}, {selectedOpp.state}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div className="text-xs text-gray-500 font-medium">Assigned University</div>
                  <div className="font-semibold text-gray-900">{selectedOpp.universityName || 'Under Government Assignment'}</div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Required Industry Capabilities & Technologies
                </h4>
                <div className="flex flex-wrap gap-2">
                  {selectedOpp.matchedCapabilities.map((cap, i) => (
                    <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-md font-medium">
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Precedent Track Record for Industry Co-Investment */}
              <div className="space-y-3 pt-3 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                    Deployment Precedents &amp; Field Track Record
                  </h4>
                  <span className="text-[10px] text-gray-400 font-medium">Institutional Intelligence</span>
                </div>

                {indLoadingPrecedents ? (
                  <div className="py-4 text-center text-xs text-gray-500 bg-gray-50 rounded-lg">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto mb-1 text-blue-600" />
                    Checking empirical deployment records and field failure logs...
                  </div>
                ) : indPrecedents.length === 0 ? (
                  <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-500">
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

              <div className="pt-3 border-t border-gray-200 flex justify-end gap-3">
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
              <p className="text-xs text-gray-500">
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
                          ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400'
                          : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900">{ind.name}</span>
                          <Badge variant="outline" className="text-xs font-mono">
                            {ind.type}
                          </Badge>
                          <Badge variant="success" className="text-xs">
                            VERIFIED
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600">
                          {ind.industryProfile?.sector || ind.metadata?.sector || 'Industrial Innovation'}
                        </p>
                        <p className="text-xs text-gray-400">
                          Admin Contact: {ind.adminUser?.fullName || ind.metadata?.adminContactName || 'Authorized Admin'} ({ind.adminUser?.email || ind.metadata?.officialEmail})
                        </p>
                      </div>

                      {isCurrent ? (
                        <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded">
                          Current Active
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSwitchIndustry(ind.id);
                          }}
                          className="text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-sm"
                        >
                          Switch
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 border-t border-gray-200 flex justify-end">
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
