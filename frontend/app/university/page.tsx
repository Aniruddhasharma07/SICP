'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/lib/auth-context';
import { apiClient } from '../../src/lib/api-client';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { ZeroDeadEndNotice } from '../../src/components/common/ZeroDeadEndNotice';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Textarea } from '../../src/components/ui/Textarea';
import { Alert } from '../../src/components/ui/Alert';
import {
  GraduationCap,
  Users,
  FileText,
  Building2,
  DollarSign,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  ShieldCheck,
  Award,
  BookOpen,
  Briefcase,
  ChevronRight,
  Send,
  HelpCircle,
  Layers,
} from 'lucide-react';
import {
  UserRole,
  ChallengeStatus,
  MatchStatus,
  ProposalStatus,
  TeamRole,
  InvitationStatus,
  FacultyMatchScoreDto,
  IndustryMatchScoreDto,
} from '@sicp/shared';

interface UniversityMatchItem {
  id: string;
  challengeId: string;
  universityOrgId: string;
  matchScore: number;
  matchReasons: string[];
  status: MatchStatus;
  rejectionReason?: string | null;
  challenge: {
    id: string;
    title: string;
    description: string;
    category: string;
    severity: string;
    priority: string;
    status: ChallengeStatus;
    district?: string | null;
    state?: string | null;
    teams?: Array<{
      id: string;
      name: string;
      leadFacultyId: string;
      leadFaculty: { fullName: string; email: string };
      members: Array<{
        id: string;
        userId: string;
        roleInTeam: TeamRole;
        invitationStatus: InvitationStatus;
        user: { fullName: string; email: string };
      }>;
    }>;
    projects?: Array<{
      id: string;
      title: string;
      status: string;
      budget?: number | null;
      proposals?: Array<{
        id: string;
        version: number;
        status: ProposalStatus;
        problemUnderstanding: string;
        technicalApproach: string;
        expectedImpact: string;
        reviewComments?: string | null;
      }>;
    }>;
  };
}

export default function UniversityPortalPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, demoSwitch } = useAuth();
  const isUniversityAdmin = user?.role === UserRole.UNIVERSITY_ADMIN || user?.role === UserRole.SYSTEM_ADMIN;
  const isFaculty = user?.role === UserRole.FACULTY;
  const isStudent = user?.role === UserRole.STUDENT || user?.role === UserRole.RESEARCH_ASSISTANT;
  const isUniversityPersona = !user || [
    UserRole.UNIVERSITY_ADMIN,
    UserRole.FACULTY,
    UserRole.STUDENT,
    UserRole.RESEARCH_ASSISTANT,
    UserRole.SYSTEM_ADMIN,
  ].includes(user.role as UserRole);

  const isIndustryPersona = Boolean(
    user &&
    [
      UserRole.INDUSTRY_PARTNER,
      UserRole.MSME,
      UserRole.CSR_ORGANIZATION,
      UserRole.STARTUP,
    ].includes(user.role as UserRole)
  );

  const isGovernmentPersona = Boolean(
    user &&
    [
      UserRole.GOVERNMENT_OFFICER,
      UserRole.GOVERNMENT_DEPARTMENT,
    ].includes(user.role as UserRole)
  );

  const [activeTab, setActiveTab] = useState<'assigned' | 'teams' | 'proposals' | 'faculty' | 'partnerships'>('assigned');
  const [registeredUnis, setRegisteredUnis] = useState<any[]>([]);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchSearch, setSwitchSearch] = useState('');

  // Load registered accredited universities
  const loadRegisteredUnis = useCallback(async () => {
    try {
      const res = await apiClient.request<any[]>('/api/v1/university/registered');
      if (res.success && Array.isArray(res.data)) {
        setRegisteredUnis(res.data);
      }
    } catch {
      // Handled
    }
  }, []);

  useEffect(() => {
    loadRegisteredUnis();
  }, [loadRegisteredUnis]);

  // Sync active tab with URL search params and hash
  useEffect(() => {
    const handleUrlSync = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const tabParam = (params.get('tab') || '').toLowerCase();
      const hash = window.location.hash.toLowerCase();

      if (tabParam === 'teams' || hash === '#teams') {
        setActiveTab('teams');
      } else if (tabParam === 'proposals' || hash === '#proposals') {
        setActiveTab('proposals');
      } else if (tabParam === 'faculty' || hash === '#faculty') {
        setActiveTab('faculty');
      } else if (tabParam === 'partnerships' || hash === '#partnerships') {
        setActiveTab('partnerships');
      } else if (tabParam === 'assigned' || hash === '#opportunities' || hash === '#assigned') {
        setActiveTab('assigned');
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
  const [matches, setMatches] = useState<UniversityMatchItem[]>([]);
  const [facultyMatches, setFacultyMatches] = useState<FacultyMatchScoreDto[]>([]);
  const [partnerMatches, setPartnerMatches] = useState<IndustryMatchScoreDto[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] = useState<string>('');

  // Modals & Action states
  const [actionLoading, setActionLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Decline Modal
  const [declineTarget, setDeclineTarget] = useState<string | null>(null);
  const [declineResult, setDeclineResult] = useState<any | null>(null);

  // Team Create Modal
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [teamName, setTeamName] = useState('');
  const [teamChallengeId, setTeamChallengeId] = useState('');

  // Team Invite Modal
  const [inviteTargetTeamId, setInviteTargetTeamId] = useState<string | null>(null);
  const [inviteUserId, setInviteUserId] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>(TeamRole.STUDENT_RESEARCHER);

  // Proposal Create Modal
  // University Self-Registration State
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [regName, setRegName] = useState('');
  const [regAishe, setRegAishe] = useState('');
  const [regNaac, setRegNaac] = useState('A+');
  const [regCategory, setRegCategory] = useState('Central University');
  const [regState, setRegState] = useState('');
  const [regDistrict, setRegDistrict] = useState('');
  const [regDeanEmail, setRegDeanEmail] = useState('');
  const [regProofUrl, setRegProofUrl] = useState('');
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Current user's institution data & rating
  const [institution, setInstitution] = useState<any | null>(user?.organization || null);
  // Resubmission Form State
  const [resubmitModalOpen, setResubmitModalOpen] = useState(false);
  const [resubmitAishe, setResubmitAishe] = useState('');
  const [resubmitNaac, setResubmitNaac] = useState('A+');
  const [resubmitDomains, setResubmitDomains] = useState('');
  const [resubmitDepartments, setResubmitDepartments] = useState('');
  const [resubmitFacilities, setResubmitFacilities] = useState('');
  const [resubmitDocName, setResubmitDocName] = useState('');
  const [resubmitNotes, setResubmitNotes] = useState('');
  const [resubmitting, setResubmitting] = useState(false);

  const handleResubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!institution?.id) return;
    setResubmitting(true);
    try {
      const res = await apiClient.request(`/api/v1/organizations/${institution.id}/resubmit`, {
        method: 'POST',
        body: JSON.stringify({
          notes: resubmitNotes.trim() || 'Updated registration submitted for verification review',
          metadata: {
            aisheCode: resubmitAishe.trim() || institution.metadata?.aisheCode,
            naacGrade: resubmitNaac || institution.metadata?.naacGrade,
            researchDomains: resubmitDomains.split(',').map((s: string) => s.trim()).filter(Boolean),
            departments: resubmitDepartments.split(',').map((s: string) => s.trim()).filter(Boolean),
            facilities: resubmitFacilities.split(',').map((s: string) => s.trim()).filter(Boolean),
            supportingDocuments: [
              ...(institution.metadata?.supportingDocuments || []),
              { name: resubmitDocName.trim() || 'Updated_Accreditation_Certificate.pdf', uploadedAt: new Date().toISOString() },
            ],
          },
        }),
      });

      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Updated registration resubmitted successfully to the Government Verification Queue!' });
        setResubmitModalOpen(false);
        // Reload institution
        const updated = await apiClient.request<any>(`/api/v1/organizations/${institution.id}`);
        if (updated.success && updated.data) {
          setInstitution(updated.data);
        }
      } else {
        setStatusMessage({ type: 'error', text: res.error?.message || 'Failed to resubmit registration.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Error resubmitting registration.' });
    } finally {
      setResubmitting(false);
    }
  };


  useEffect(() => {
    async function loadInstitution() {
      if (user?.organizationId) {
        try {
          const res = await apiClient.request<any>(`/api/v1/organizations/${user.organizationId}`);
          if (res.success && res.data) {
            setInstitution(res.data);
          }
        } catch {
          // Fallback
        }
      }
    }
    loadInstitution();
  }, [user]);

  const handleRegisterUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regAishe.trim() || !regDistrict.trim()) {
      setStatusMessage({ type: 'error', text: 'Institution Name, AISHE Code, and District are mandatory.' });
      return;
    }
    setRegSubmitting(true);
    const slug = regName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

    try {
      const res = await apiClient.request<any>('/api/v1/organizations', {
        method: 'POST',
        body: JSON.stringify({
          name: regName.trim(),
          slug: slug || `uni-${Date.now()}`,
          type: 'UNIVERSITY',
          metadata: {
            aisheCode: regAishe.trim(),
            naacGrade: regNaac,
            category: regCategory,
            state: regState,
            district: regDistrict,
            deanEmail: regDeanEmail.trim() || undefined,
            proofUrl: regProofUrl.trim() || undefined,
            registeredAt: new Date().toISOString(),
          },
        }),
      });

      if (res.success && res.data) {
        setInstitution(res.data);
        setStatusMessage({
          type: 'success',
          text: `Institution "${regName}" successfully registered! Status set to PENDING_REVIEW for Government verification.`,
        });
        setRegisterModalOpen(false);
      } else {
        setStatusMessage({ type: 'error', text: res.error?.message || 'University registration failed.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error executing registration.' });
    } finally {
      setRegSubmitting(false);
    }
  };

  const [showProposalModal, setShowProposalModal] = useState(false);
  const [propProjectId, setPropProjectId] = useState('');
  const [propProblemUnderstanding, setPropProblemUnderstanding] = useState('');
  const [propRootCause, setPropRootCause] = useState('');
  const [propApproach, setPropApproach] = useState('');
  const [propImpact, setPropImpact] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.request<UniversityMatchItem[]>('/api/v1/university/challenges');
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const dataList = res.data;
        setMatches(dataList);
        setSelectedChallengeId(prev => (dataList.some(d => d.challengeId === prev) ? prev : dataList[0].challengeId));
      } else {
        // Fallback for collaborative/observer view (e.g. Industry partner, Citizen, or unassigned university)
        const allRes = await apiClient.request<any>('/api/v1/challenges');
        if (allRes.success) {
          const items = Array.isArray(allRes.data) ? allRes.data : (allRes.data?.items || []);
          if (items.length > 0) {
            const mappedMatches: UniversityMatchItem[] = items.map((ch: any) => ({
              id: ch.id,
              challengeId: ch.id,
              universityOrgId: ch.assignedUniversityOrgId || '',
              matchScore: typeof ch.priorityScore === 'number' ? Math.round(ch.priorityScore) : 85,
              matchReasons: ['Domain Expertise', 'Civic Need Priority'],
              status: ch.status === 'APPROVED' ? MatchStatus.OFFERED : MatchStatus.ACCEPTED,
              challenge: {
                id: ch.id,
                title: ch.title,
                description: ch.description,
                category: ch.category,
                severity: ch.severity || 'MODERATE',
                priority: ch.priority || 'HIGH',
                status: ch.status as ChallengeStatus,
                district: ch.district,
                state: ch.state,
                teams: ch.teams || [],
                projects: ch.projects || [],
              },
            }));
            setMatches(mappedMatches);
            setSelectedChallengeId(prev => (mappedMatches.some(d => d.challengeId === prev) ? prev : mappedMatches[0].challengeId));
          } else {
            setMatches([]);
            setSelectedChallengeId('');
          }
        }
      }
    } catch {
      // Handled by api client
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Load faculty & partner intelligence when challenge selected
  useEffect(() => {
    if (!selectedChallengeId) return;

    const loadIntelligence = async () => {
      try {
        const facRes = await apiClient.request<FacultyMatchScoreDto[]>(
          `/api/v1/university/challenges/${selectedChallengeId}/faculty-matches`
        );
        if (facRes.success && facRes.data) {
          setFacultyMatches(facRes.data);
        }

        const match = matches.find(m => m.challengeId === selectedChallengeId);
        const project = match?.challenge?.projects?.[0];
        if (project?.id) {
          const partRes = await apiClient.request<IndustryMatchScoreDto[]>(
            `/api/v1/partnerships/project/${project.id}/recommendations`
          );
          if (partRes.success && partRes.data) {
            setPartnerMatches(partRes.data);
          }
        }
      } catch {
        // Handled silently
      }
    };

    loadIntelligence();
  }, [selectedChallengeId, matches]);

  const [declineReasonCategory, setDeclineReasonCategory] = useState<string>('No relevant faculty expertise');
  const [declineExplanation, setDeclineExplanation] = useState<string>('');

  const handleSwitchUniversity = async (uniId: string) => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await demoSwitch(uniId);
      if (res.success && res.user) {
        setStatusMessage({
          type: 'success',
          text: `Switched institutional session to ${res.user.organization?.name || 'institution'}! Active credentials updated.`,
        });
        setShowSwitchModal(false);
        if (res.user.organizationId) {
          const orgRes = await apiClient.request<any>(`/api/v1/organizations/${res.user.organizationId}`);
          if (orgRes.success && orgRes.data) {
            setInstitution(orgRes.data);
          }
        }
        setSelectedChallengeId('');
        await fetchData();
      } else {
        setStatusMessage({ type: 'error', text: res.error || 'Failed to switch institution.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Error switching institution.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleExpressInterest = async (challengeId: string) => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await apiClient.request<any>(`/api/v1/university/challenges/${challengeId}/interest`, {
        method: 'POST',
      });
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: 'Institutional interest officially declared! Government Command Center has been notified.',
        });
        fetchData();
      } else {
        setStatusMessage({ type: 'error', text: res.error?.message || 'Failed to record interest.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAccept = async (challengeId: string) => {
    setActionLoading(true);
    setStatusMessage(null);
    try {
      const res = await apiClient.request<any>(`/api/v1/university/challenges/${challengeId}/accept`, {
        method: 'POST',
      });
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: 'Challenge accepted! Proceed to select Lead Faculty and form your Multidisciplinary Research Team.',
        });
        setSelectedChallengeId(challengeId);
        setTeamChallengeId(challengeId);
        setActiveTab('teams');
        setShowTeamModal(true);
        fetchData();
      } else {
        setStatusMessage({ type: 'error', text: res.error?.message || 'Failed to accept assignment.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeclineSubmit = async () => {
    if (!declineTarget) return;

    if (declineReasonCategory === 'Other' && (!declineExplanation || declineExplanation.trim().length < 10)) {
      setStatusMessage({ type: 'error', text: 'A detailed written explanation (at least 10 characters) is required when selecting "Other".' });
      return;
    }

    const fullReason = declineReasonCategory === 'Other'
      ? declineExplanation.trim()
      : declineExplanation.trim()
      ? `${declineReasonCategory}: ${declineExplanation.trim()}`
      : declineReasonCategory;

    if (fullReason.length < 10) {
      setStatusMessage({ type: 'error', text: 'A detailed reason (at least 10 characters) is required to decline.' });
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiClient.request<any>(`/api/v1/university/challenges/${declineTarget}/decline`, {
        method: 'POST',
        body: JSON.stringify({ reason: fullReason }),
      });
      if (res.success && res.data) {
        setDeclineResult(res.data.zeroDeadEnd);
        setStatusMessage({ type: 'success', text: 'Assignment declined and reverted to Government for re-routing with zero dead ends.' });
        setDeclineTarget(null);
        setDeclineExplanation('');
        setDeclineReasonCategory('No relevant faculty expertise');
        fetchData();
      } else {
        setStatusMessage({ type: 'error', text: res.error?.message || 'Failed to decline assignment.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName || !teamChallengeId) return;

    setActionLoading(true);
    try {
      const res = await apiClient.request<any>('/api/v1/teams', {
        method: 'POST',
        body: JSON.stringify({
          name: teamName.trim(),
          challengeId: teamChallengeId,
          leadFacultyId: user?.id,
        }),
      });
      if (res.success) {
        setShowTeamModal(false);
        setTeamName('');
        setStatusMessage({ type: 'success', text: 'Team created successfully with Lead Faculty assigned!' });
        fetchData();
      } else {
        setStatusMessage({ type: 'error', text: res.error?.message || 'Failed to create team.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteTargetTeamId || !inviteUserId) return;

    setActionLoading(true);
    try {
      const res = await apiClient.request<any>(`/api/v1/teams/${inviteTargetTeamId}/invite`, {
        method: 'POST',
        body: JSON.stringify({
          userId: inviteUserId.trim(),
          roleInTeam: inviteRole,
        }),
      });
      if (res.success) {
        setInviteTargetTeamId(null);
        setInviteUserId('');
        setStatusMessage({ type: 'success', text: 'Invitation dispatched to member!' });
        fetchData();
      } else {
        setStatusMessage({ type: 'error', text: res.error?.message || 'Failed to invite member.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!propProjectId || !propApproach || !propImpact) return;

    setActionLoading(true);
    try {
      const res = await apiClient.request<any>('/api/v1/proposals', {
        method: 'POST',
        body: JSON.stringify({
          projectId: propProjectId,
          problemUnderstanding: propProblemUnderstanding || 'Root cause and scope analyzed',
          rootCauseHypothesis: propRootCause || 'Socio-technical root cause identified',
          technicalApproach: propApproach,
          expectedImpact: propImpact,
          risksAndMitigations: 'Field safety protocols and institutional monitoring established',
          sustainabilityPlan: 'Panchayat handover and community operational maintenance tariff',
        }),
      });
      if (res.success) {
        setShowProposalModal(false);
        setStatusMessage({ type: 'success', text: 'Solution proposal drafted! You can now submit it for Government review.' });
        fetchData();
      } else {
        setStatusMessage({ type: 'error', text: res.error?.message || 'Failed to create proposal.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleSubmitProposal = async (proposalId: string) => {
    setActionLoading(true);
    try {
      const res = await apiClient.request<any>(`/api/v1/proposals/${proposalId}/submit`, {
        method: 'POST',
      });
      if (res.success) {
        setStatusMessage({ type: 'success', text: 'Proposal submitted for formal Government Review! Challenge advanced to SOLUTION_PROPOSED.' });
        fetchData();
      } else {
        setStatusMessage({ type: 'error', text: res.error?.message || 'Failed to submit proposal.' });
      }
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message });
    } finally {
      setActionLoading(false);
    }
  };

  const assignedChallenges = matches.filter(m => m.status === MatchStatus.OFFERED);
  const activeResearchChallenges = matches.filter(m => m.status === MatchStatus.ACCEPTED);

  const isSystemAdmin = user?.role === UserRole.SYSTEM_ADMIN;
  const isPendingVerification = !isSystemAdmin && institution && (institution.verificationStatus === 'PENDING_REVIEW' || institution.verificationStatus === 'UNVERIFIED');
  const isInfoRequested = !isSystemAdmin && institution && institution.verificationStatus === 'INFORMATION_REQUESTED';
  const isRejected = !isSystemAdmin && institution && institution.verificationStatus === 'REJECTED';

  // Gate 1: Pending Government Verification
  if (!authLoading && isPendingVerification) {
    return (
      <AppLayout portal="university">
        <div className="max-w-4xl mx-auto py-12 px-4 space-y-6">
          <div className="p-6 rounded-3xl bg-amber-50/80 border border-amber-300 shadow-sm space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 shadow-2xs">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  Government Verification In Progress
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  {institution.name} Is Awaiting Verification
                </h2>
                <p className="text-xs text-slate-600">
                  Your academic institution registration was submitted and is currently in the Government Review Queue. While under review, institutional challenge routing and project proposal creation are restricted.
                </p>
              </div>
            </div>

            {/* Verification Lifecycle Tracker */}
            <div className="p-4 rounded-2xl bg-white border border-amber-200 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="flex items-center gap-3 p-2 rounded-xl bg-emerald-50/60 border border-emerald-200">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  ✓
                </div>
                <div>
                  <div className="font-bold text-xs text-emerald-950">1. Registration Submitted</div>
                  <div className="text-[10px] text-slate-500">Account &amp; details registered</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 rounded-xl bg-amber-50 border border-amber-300 ring-2 ring-amber-400/20">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  2
                </div>
                <div>
                  <div className="font-bold text-xs text-amber-950">2. Government Review</div>
                  <div className="text-[10px] text-amber-800 font-medium">AISHE / NAAC inspection</div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-2 rounded-xl bg-slate-50 border border-slate-200 opacity-60">
                <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                  3
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-700">3. Portal Activation</div>
                  <div className="text-[10px] text-slate-400">Full operational access</div>
                </div>
              </div>
            </div>

            {/* Institution Details Card */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="font-bold text-slate-800 uppercase tracking-wider text-[10px]">Registered Credentials:</div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">AISHE Code</span>
                  <span className="font-mono font-bold text-indigo-700">{institution.metadata?.aisheCode || 'Pending'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">NAAC Grade</span>
                  <span className="font-bold text-slate-800">{institution.metadata?.naacGrade || 'Verified'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Location</span>
                  <span className="font-medium text-slate-800">{institution.metadata?.district || 'District'}, {institution.metadata?.state || ''}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Submitted Date</span>
                  <span className="font-mono text-slate-800">{institution.createdAt ? new Date(institution.createdAt).toLocaleDateString() : 'Recent'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-500">Government review typically completes within 24 to 48 hours.</span>
              <Button
                size="sm"
                variant="outline"
                className="text-xs font-bold"
                onClick={async () => {
                  if (institution?.id) {
                    const res = await apiClient.request<any>(`/api/v1/organizations/${institution.id}`);
                    if (res.success && res.data) setInstitution(res.data);
                  }
                }}
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                Refresh Status
              </Button>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Gate 2: Information Requested by Government Reviewer
  if (!authLoading && isInfoRequested) {
    const latestNote = institution.verifications?.[0]?.reviewNotes || institution.verificationDetails?.reviewNotes || 'Please provide updated accreditation or department capacity details.';

    return (
      <AppLayout portal="university">
        <div className="max-w-4xl mx-auto py-12 px-4 space-y-6">
          <div className="p-6 rounded-3xl bg-blue-50/80 border border-blue-300 shadow-sm space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
                <HelpCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[11px] font-bold border border-blue-200">
                  Government Action Required — Information Requested
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  Additional Information Required for {institution.name}
                </h2>
                <p className="text-xs text-slate-600">
                  The municipal government reviewer inspected your registration and requested clarifications. Please review their instructions below, update your details, and resubmit.
                </p>
              </div>
            </div>

            {/* Officer Instructions Banner */}
            <div className="p-4 rounded-2xl bg-white border border-blue-200 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 block">
                Government Officer Review Notes &amp; Required Revisions:
              </span>
              <p className="text-xs font-medium text-slate-800 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                "{latestNote}"
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="primary"
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-2.5 px-4 shadow-xs"
                onClick={() => {
                  setResubmitAishe(institution.metadata?.aisheCode || '');
                  setResubmitNaac(institution.metadata?.naacGrade || 'A+');
                  setResubmitDomains(Array.isArray(institution.metadata?.researchDomains) ? institution.metadata.researchDomains.join(', ') : '');
                  setResubmitDepartments(Array.isArray(institution.metadata?.departments) ? institution.metadata.departments.join(', ') : '');
                  setResubmitFacilities(Array.isArray(institution.metadata?.facilities) ? institution.metadata.facilities.join(', ') : '');
                  setResubmitDocName('Updated_Accreditation_Certificate.pdf');
                  setResubmitNotes(`Addressing review feedback: ${latestNote}`);
                  setResubmitModalOpen(true);
                }}
              >
                <span>Update Registration &amp; Resubmit</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Resubmission Modal */}
        {resubmitModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
              <div className="space-y-1 border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Update University Registration Details</h3>
                <p className="text-xs text-slate-500">Provide corrected details or revised documents to address officer feedback.</p>
              </div>

              <form onSubmit={handleResubmitVerification} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">AISHE Code</label>
                    <input
                      type="text"
                      required
                      value={resubmitAishe}
                      onChange={(e) => setResubmitAishe(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">NAAC Grade</label>
                    <select
                      value={resubmitNaac}
                      onChange={(e) => setResubmitNaac(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    >
                      <option value="A++">A++</option>
                      <option value="A+">A+</option>
                      <option value="A">A</option>
                      <option value="B++">B++</option>
                      <option value="B+">B+</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Updated Research Domains</label>
                  <input
                    type="text"
                    value={resubmitDomains}
                    onChange={(e) => setResubmitDomains(e.target.value)}
                    placeholder="Comma-separated domains"
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Updated Supporting Document Name</label>
                  <input
                    type="text"
                    required
                    value={resubmitDocName}
                    onChange={(e) => setResubmitDocName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Response Note to Government Reviewer *</label>
                  <textarea
                    rows={3}
                    required
                    value={resubmitNotes}
                    onChange={(e) => setResubmitNotes(e.target.value)}
                    placeholder="Explain what has been updated or attached..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setResubmitModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-blue-600 hover:bg-blue-700 text-white font-bold" isLoading={resubmitting}>
                    Resubmit for Verification
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AppLayout>
    );
  }

  // Gate 3: Registration Rejected with zero dead ends
  if (!authLoading && isRejected) {
    const rejectionReason = institution.verifications?.[0]?.reviewNotes || institution.verificationDetails?.reviewNotes || 'Accreditation credentials did not match official state registry records.';

    return (
      <AppLayout portal="university">
        <div className="max-w-4xl mx-auto py-12 px-4 space-y-6">
          <div className="p-6 rounded-3xl bg-rose-50/80 border border-rose-300 shadow-sm space-y-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center shrink-0 shadow-2xs">
                <XCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[11px] font-bold border border-rose-200">
                  Registration Rejected — Correction Permitted
                </div>
                <h2 className="text-xl font-black text-slate-900">
                  University Registration Rejected: {institution.name}
                </h2>
                <p className="text-xs text-slate-600">
                  Your registration was not approved during the previous review cycle. Zero dead ends: You may inspect the official rejection reason, update any incorrect information, and resubmit for re-evaluation.
                </p>
              </div>
            </div>

            {/* Rejection Reason Card */}
            <div className="p-4 rounded-2xl bg-white border border-rose-200 space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block">
                Official Government Rejection Reason:
              </span>
              <p className="text-xs font-medium text-slate-800 bg-rose-50/50 p-3 rounded-xl border border-rose-100">
                "{rejectionReason}"
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                variant="primary"
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-2.5 px-4 shadow-xs"
                onClick={() => {
                  setResubmitAishe(institution.metadata?.aisheCode || '');
                  setResubmitNaac(institution.metadata?.naacGrade || 'A+');
                  setResubmitDomains(Array.isArray(institution.metadata?.researchDomains) ? institution.metadata.researchDomains.join(', ') : '');
                  setResubmitDepartments(Array.isArray(institution.metadata?.departments) ? institution.metadata.departments.join(', ') : '');
                  setResubmitFacilities(Array.isArray(institution.metadata?.facilities) ? institution.metadata.facilities.join(', ') : '');
                  setResubmitDocName('Corrected_Accreditation_Certificate.pdf');
                  setResubmitNotes(`Corrected registration following rejection: ${rejectionReason}`);
                  setResubmitModalOpen(true);
                }}
              >
                <span>Correct Information &amp; Resubmit</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Resubmission Modal */}
        {resubmitModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
            <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl border border-slate-200">
              <div className="space-y-1 border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Correct University Information &amp; Resubmit</h3>
                <p className="text-xs text-slate-500">Update accreditation details and documents to address the rejection reason.</p>
              </div>

              <form onSubmit={handleResubmitVerification} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">AISHE Code</label>
                    <input
                      type="text"
                      required
                      value={resubmitAishe}
                      onChange={(e) => setResubmitAishe(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">NAAC Grade</label>
                    <select
                      value={resubmitNaac}
                      onChange={(e) => setResubmitNaac(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                    >
                      <option value="A++">A++</option>
                      <option value="A+">A+</option>
                      <option value="A">A</option>
                      <option value="B++">B++</option>
                      <option value="B+">B+</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Updated Supporting Document Name</label>
                  <input
                    type="text"
                    required
                    value={resubmitDocName}
                    onChange={(e) => setResubmitDocName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Correction Explanation *</label>
                  <textarea
                    rows={3}
                    required
                    value={resubmitNotes}
                    onChange={(e) => setResubmitNotes(e.target.value)}
                    placeholder="Describe corrections made..."
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setResubmitModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-rose-600 hover:bg-rose-700 text-white font-bold" isLoading={resubmitting}>
                    Resubmit for Re-evaluation
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </AppLayout>
    );
  }

  return (
    <AppLayout portal="university">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Header Banner */}
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden border border-blue-700/30">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-300 text-xs font-bold uppercase tracking-wider">
                <GraduationCap className="h-4 w-4" />
                <span>University Portal</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {institution?.name || user?.organization?.name || 'Academic Innovation Center'}
              </h1>
              <div className="text-sm font-semibold text-blue-200">
                Current Institution: <span className="text-white font-bold">{institution?.name || user?.organization?.name || 'Academic Innovation Center'}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-blue-200">
                  User: <strong className="text-white font-semibold">{user?.fullName || 'Academic Administrator'}</strong> ({user?.role || 'UNIVERSITY_ADMIN'})
                </span>
                {institution?.metadata?.aisheCode && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 text-xs font-mono">
                    AISHE: {institution.metadata.aisheCode}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  University status: Government Verified
                </span>
              </div>
              <p className="mt-1 text-blue-200/80 text-xs max-w-2xl leading-relaxed">
                Review government-routed civic problems, accept research assignments, select qualified faculty leads, assemble multidisciplinary student teams, and publish solution proposals.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 items-center">
              <Button
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-900/30 border border-indigo-400/30"
                onClick={() => setShowSwitchModal(true)}
              >
                <Building2 className="h-4 w-4 mr-1.5" />
                Switch Institution
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30"
                onClick={() => setRegisterModalOpen(true)}
              >
                <Plus className="h-4 w-4 mr-1.5" />
                Register New University
              </Button>
              <Button
                variant="outline"
                className="bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur text-xs"
                onClick={fetchData}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* DEFINED ACADEMIC GOVERNANCE RULES */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Defined Academic Operating Rules &amp; Institutional Governance</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1">
              <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-indigo-600" />
                Rule 1: Institutional Accreditation
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                New universities self-register with AISHE / NAAC credentials. Government approval unlocks funded problem assignments.
              </p>
            </div>

            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1">
              <div className="font-bold text-blue-950 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-blue-600" />
                Rule 2: Administrator Acceptance
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Only University Administrators can accept or decline government-routed civic problems on behalf of the institution.
              </p>
            </div>

            <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100 space-y-1">
              <div className="font-bold text-purple-950 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-purple-600" />
                Rule 3: Multidisciplinary Teams
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Research teams are led by Faculty members and incorporate Student Researchers and cross-departmental subject experts.
              </p>
            </div>

            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 space-y-1">
              <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-emerald-600" />
                Rule 4: Government Review &amp; Rating
              </div>
              <p className="text-slate-600 text-[11px] leading-relaxed">
                Government officers evaluate and rate institutions across 4 dimensions: Technical Competence, Timeliness, Collaboration, and Civic Outcome Quality.
              </p>
            </div>
          </div>
        </div>

        {/* INSTITUTIONAL ACCREDITATION & GOVERNMENT RATING STATUS */}
        {institution && (
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-2xl p-6 text-white border border-indigo-500/30 shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-400" />
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-300">
                    Affiliated Institution: {institution.name}
                  </span>
                  <Badge className={`text-[10px] font-bold ${
                    institution.verificationStatus === 'VERIFIED'
                      ? 'bg-emerald-500 text-white'
                      : institution.verificationStatus === 'PENDING_REVIEW'
                      ? 'bg-amber-500 text-slate-950 animate-pulse'
                      : 'bg-slate-600 text-white'
                  }`}>
                    {institution.verificationStatus === 'VERIFIED' ? 'Accredited Academic Partner' : institution.verificationStatus}
                  </Badge>
                </div>
                <p className="text-xs text-slate-300">
                  {institution.verificationStatus === 'VERIFIED'
                    ? 'Official state accreditation verified. Eligible for civic challenge allocation and CSR matching.'
                    : 'Registration submitted. Awaiting State Higher Education Department review (Review SLA: 48 hours).'}
                </p>
              </div>

              {/* Official Rating Score */}
              {institution.metadata?.lastRatingScore !== undefined && (
                <div className="flex items-center gap-4 bg-white/10 p-3 rounded-xl border border-white/10">
                  <div className="text-right">
                    <div className="text-[10px] uppercase font-bold text-amber-300">Official Gov Rating</div>
                    <div className="text-2xl font-black text-white font-mono">
                      {institution.metadata.lastRatingScore}/100
                    </div>
                  </div>
                  <Award className="w-8 h-8 text-amber-400" />
                </div>
              )}
            </div>

            {/* Preserved Dimensions Breakdown if rated */}
            {institution.metadata?.ratings && institution.metadata.ratings.length > 0 && (() => {
              const latestRating = institution.metadata.ratings[institution.metadata.ratings.length - 1];
              const rawDims = latestRating?.dimensions;
              const dimensionList: Array<{ name: string; score: number }> = Array.isArray(rawDims)
                ? rawDims.map((d: any, idx: number) => ({
                    name: d?.dimensionName || d?.name || `Dimension ${idx + 1}`,
                    score: typeof d?.score === 'number' ? d.score : (typeof d === 'number' ? d : 0),
                  }))
                : rawDims && typeof rawDims === 'object'
                ? Object.entries(rawDims).map(([key, val]: [string, any]) => ({
                    name: key,
                    score: typeof val === 'number' ? val : (val?.score ?? 0),
                  }))
                : [];

              if (dimensionList.length === 0) return null;

              return (
                <div className="pt-3 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  {dimensionList.map((dim, idx) => (
                    <div key={idx} className="bg-black/30 p-2.5 rounded-lg border border-white/5">
                      <div className="text-[11px] text-slate-400 truncate">{dim.name}</div>
                      <div className="font-bold text-white font-mono mt-0.5">{dim.score}/100</div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Global Feedback Notifications */}
        {statusMessage && (
          <Alert
            variant={statusMessage.type === 'success' ? 'success' : 'destructive'}
            className={statusMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-300' : ''}
          >
            {statusMessage.text}
          </Alert>
        )}

        {/* Zero-Dead-End Notice if an assignment was declined */}
        {declineResult && (
          <ZeroDeadEndNotice
            variant="warning"
            whatHappened={declineResult.whatHappened}
            currentStatus="APPROVED (Reverted for Re-routing)"
            whyStatus={declineResult.why}
            whoIsResponsible={declineResult.whoActs}
            whatCanDoNext={[
              declineResult.actionRequired,
              ...(declineResult.alternativeRecommendations?.map((alt: any) => `Re-route to ${alt.universityName} (Match Score: ${alt.matchScore}%)`) || []),
            ]}
            whatHappensIfIdle="The challenge remains in the government queue awaiting alternative assignment."
          />
        )}

        {/* Tab Navigation */}
        <div className="border-b border-slate-200 flex flex-wrap gap-4 text-sm font-medium">
          <button
            onClick={() => setActiveTab('assigned')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'assigned'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="h-4 w-4" />
            Incoming Assignments ({assignedChallenges.length})
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'teams'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="h-4 w-4" />
            Active Research & Teams ({activeResearchChallenges.length})
          </button>
          <button
            onClick={() => setActiveTab('proposals')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'proposals'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileText className="h-4 w-4" />
            Solution Proposals
          </button>
          <button
            onClick={() => setActiveTab('faculty')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'faculty'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Award className="h-4 w-4" />
            Faculty Expert Intelligence
          </button>
          <button
            onClick={() => setActiveTab('partnerships')}
            className={`pb-3 border-b-2 flex items-center gap-2 transition ${
              activeTab === 'partnerships'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Building2 className="h-4 w-4" />
            Industry & CSR Matching
          </button>
        </div>

        {/* TAB 1: Incoming Assignments */}
        {activeTab === 'assigned' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Challenges Offered to University</h2>
                <p className="text-sm text-slate-500">
                  Government Command Center has routed these high-priority problems to your institution based on domain expertise.
                </p>
              </div>
            </div>

            {assignedChallenges.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <CheckCircle2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium text-slate-700">No pending assignments</p>
                  <p className="text-sm mt-1">All routed civic problems have been evaluated.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {assignedChallenges.map(item => (
                  <Card key={item.id} className="border-l-4 border-l-blue-600 shadow-sm hover:shadow transition">
                    <CardHeader className="flex flex-row items-start justify-between pb-2">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {item.challenge?.category || 'General'}
                          </Badge>
                          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                            Priority: {item.challenge?.priority || 'MEDIUM'}
                          </Badge>
                          <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                            Match Score: {Math.round(item.matchScore || 0)}%
                          </Badge>
                        </div>
                        <CardTitle className="text-lg font-bold text-slate-900">
                          {item.challenge?.title || 'Civic Challenge'}
                        </CardTitle>
                        <CardDescription className="text-slate-600 mt-1 line-clamp-2">
                          {item.challenge?.description || ''}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-slate-400">Location</span>
                        <p className="text-sm font-medium text-slate-700">
                          {item.challenge?.district || 'Regional'}, {item.challenge?.state || 'National'}
                        </p>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Match Reasons */}
                      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200/60 text-xs text-slate-700">
                        <span className="font-semibold text-slate-800">Routing Justification:</span>
                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                          {(Array.isArray(item.matchReasons) ? item.matchReasons : []).map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-100 gap-3">
                        <Link
                          href={`/challenges/${item.challengeId}`}
                          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium"
                        >
                          View Full Challenge Dossier <ExternalLink className="h-3 w-3" />
                        </Link>
                        {isUniversityAdmin ? (
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="border-indigo-300 text-indigo-700 hover:bg-indigo-50 font-semibold"
                              disabled={actionLoading || item.matchReasons?.some((r: string) => r.includes('EXPRESSED_INTEREST'))}
                              onClick={() => handleExpressInterest(item.challengeId)}
                            >
                              <Send className="h-4 w-4 mr-1 text-indigo-600" />
                              {item.matchReasons?.some((r: string) => r.includes('EXPRESSED_INTEREST')) ? 'Interest Expressed' : 'Express Interest'}
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={actionLoading}
                              onClick={() => {
                                setDeclineTarget(item.challengeId);
                                setDeclineExplanation('');
                                setDeclineReasonCategory('No relevant faculty expertise');
                              }}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Decline Assignment
                            </Button>
                            <Button
                              size="sm"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                              disabled={actionLoading}
                              onClick={() => handleAccept(item.challengeId)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Accept Assignment & Start Research
                            </Button>
                          </div>
                        ) : (
                          <div className="text-xs text-amber-800 bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 font-medium">
                            Awaiting Dean / University Administrator acceptance before faculty team formation begins.
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: Active Research & Teams */}
        {activeTab === 'teams' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Active Research Challenges & Teams</h2>
                <p className="text-sm text-slate-500">
                  Accepted civic projects undergoing multidisciplinary investigation, prototyping, and proposal drafting.
                </p>
              </div>
              {(isUniversityAdmin || isFaculty) && (
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    if (activeResearchChallenges.length > 0) {
                      setTeamChallengeId(activeResearchChallenges[0].challengeId);
                    }
                    setShowTeamModal(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Form Multidisciplinary Team
                </Button>
              )}
            </div>

            {activeResearchChallenges.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <Layers className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium text-slate-700">No active research challenges</p>
                  <p className="text-sm mt-1">Accept an incoming assignment to begin team formation.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {activeResearchChallenges.map(item => {
                  const teams = item.challenge?.teams || [];
                  const project = item.challenge?.projects?.[0];

                  return (
                    <Card key={item.id} className="border border-slate-200 shadow-sm">
                      <CardHeader className="bg-slate-50/50 pb-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
                                Status: IN_RESEARCH
                              </Badge>
                              <Badge variant="outline">{item.challenge?.category || 'General'}</Badge>
                            </div>
                            <CardTitle className="text-lg font-bold text-slate-900">
                              {item.challenge?.title || 'Research Project'}
                            </CardTitle>
                          </div>
                          {project && (
                            <Link href={`/projects/${project.id}`}>
                              <Button variant="outline" size="sm" className="border-blue-300 text-blue-700 hover:bg-blue-50">
                                Open Project Cockpit <ArrowRight className="h-3.5 w-3.5 ml-1" />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                            <Users className="h-4 w-4 text-blue-600" />
                            Multidisciplinary Teams ({teams.length})
                          </h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-600 text-xs hover:bg-blue-50"
                            onClick={() => {
                              setTeamChallengeId(item.challengeId);
                              setShowTeamModal(true);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" /> Add Team
                          </Button>
                        </div>

                        {teams.length === 0 ? (
                          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold">Team Required</p>
                              <p className="mt-0.5">
                                A valid multidisciplinary team with confirmed Lead Faculty is a mandatory prerequisite for project activation.
                              </p>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {teams.map(t => (
                              <div key={t.id} className="border border-slate-200 rounded-lg p-3 bg-white space-y-3">
                                <div className="flex items-center justify-between">
                                  <div>
                                    <span className="font-bold text-sm text-slate-900">{t.name}</span>
                                    <span className="text-xs text-slate-500 ml-2">
                                      Lead: {t.leadFaculty?.fullName || 'Assigned'}
                                    </span>
                                  </div>
                                  {(isUniversityAdmin || isFaculty) && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="text-xs"
                                      onClick={() => {
                                        setInviteTargetTeamId(t.id);
                                        setInviteUserId('');
                                      }}
                                    >
                                      <Plus className="h-3 w-3 mr-1" /> Invite Member
                                    </Button>
                                  )}
                                </div>

                                {/* Members List */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  {(t.members || []).map(m => (
                                    <div
                                      key={m.id}
                                      className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-100"
                                    >
                                      <div>
                                        <p className="font-medium text-slate-800">{m.user?.fullName || 'Invited User'}</p>
                                        <p className="text-slate-500 text-[11px]">{m.roleInTeam}</p>
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className={
                                          m.invitationStatus === 'ACCEPTED'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                            : m.invitationStatus === 'DECLINED'
                                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                                            : 'bg-amber-50 text-amber-700 border-amber-200'
                                        }
                                      >
                                        {m.invitationStatus}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Solution Proposals */}
        {activeTab === 'proposals' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Solution Proposals Engine</h2>
                <p className="text-sm text-slate-500">
                  Author immutable solution proposals (V1, V2, V3) with detailed root-cause hypotheses, technical approach, and expected impact.
                </p>
              </div>
              {(isUniversityAdmin || isFaculty) && (
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => {
                    const firstProj = activeResearchChallenges.find(m => m.challenge?.projects?.[0])?.challenge?.projects?.[0];
                    if (firstProj) setPropProjectId(firstProj.id);
                    setShowProposalModal(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Draft Solution Proposal
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-6">
              {activeResearchChallenges.map(item => {
                const project = item.challenge?.projects?.[0];
                const proposals = project?.proposals || [];

                return (
                  <Card key={item.id} className="border border-slate-200 shadow-sm">
                    <CardHeader className="bg-slate-50/50 pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <Badge variant="outline" className="mb-1">{item.challenge?.category || 'General'}</Badge>
                          <CardTitle className="text-base font-bold text-slate-900">
                            {item.challenge?.title || 'Civic Challenge'}
                          </CardTitle>
                        </div>
                        {project && (isUniversityAdmin || isFaculty) && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setPropProjectId(project.id);
                              setShowProposalModal(true);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" /> Draft Next Version
                          </Button>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="pt-4">
                      {proposals.length === 0 ? (
                        <div className="p-4 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center text-xs text-slate-500">
                          No solution proposals drafted yet for this project.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {proposals.map(prop => (
                            <div
                              key={prop.id}
                              className={`p-4 rounded-xl border ${
                                prop.status === 'APPROVED'
                                  ? 'bg-emerald-50/40 border-emerald-300'
                                  : prop.status === 'REVISION_REQUESTED'
                                  ? 'bg-amber-50/50 border-amber-300'
                                  : 'bg-white border-slate-200'
                              } space-y-3`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Badge className="bg-indigo-600 text-white font-bold">
                                    Version {prop.version}
                                  </Badge>
                                  <Badge
                                    variant="outline"
                                    className={
                                      prop.status === 'APPROVED'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : prop.status === 'REVISION_REQUESTED'
                                        ? 'bg-amber-100 text-amber-800'
                                        : 'bg-slate-100 text-slate-800'
                                    }
                                  >
                                    Status: {prop.status}
                                  </Badge>
                                </div>

                                {prop.status === 'DRAFT' && (
                                  <Button
                                    size="sm"
                                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
                                    disabled={actionLoading}
                                    onClick={() => handleSubmitProposal(prop.id)}
                                  >
                                    <Send className="h-3 w-3 mr-1" /> Submit for Government Review
                                  </Button>
                                )}
                              </div>

                              <div className="text-xs space-y-1.5 text-slate-700">
                                <p>
                                  <span className="font-semibold text-slate-900">Technical Approach:</span>{' '}
                                  {prop.technicalApproach}
                                </p>
                                <p>
                                  <span className="font-semibold text-slate-900">Expected Impact:</span>{' '}
                                  {prop.expectedImpact}
                                </p>
                              </div>

                              {prop.reviewComments && (
                                <div className="p-2.5 bg-white/80 rounded border border-slate-200/80 text-xs">
                                  <span className="font-semibold text-slate-900">Review Feedback:</span>{' '}
                                  <span className="text-slate-700">{prop.reviewComments}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 4: Faculty Expert Intelligence */}
        {activeTab === 'faculty' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Deterministic Faculty Matching Engine</h2>
                <p className="text-sm text-slate-500">
                  Explainable 4-factor scoring: Department Alignment (35%), Expertise Overlap (25%), Track Record (20%), Availability (20%).
                </p>
              </div>

              {/* Challenge Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Select Challenge:</span>
                <select
                  className="text-xs border border-slate-300 rounded p-1.5 bg-white font-medium"
                  value={selectedChallengeId}
                  onChange={e => setSelectedChallengeId(e.target.value)}
                >
                  {matches.map(m => (
                    <option key={m.challengeId} value={m.challengeId}>
                      {m.challenge?.title ? (m.challenge.title.length > 45 ? `${m.challenge.title.substring(0, 45)}...` : m.challenge.title) : 'Challenge'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {facultyMatches.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <Award className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium text-slate-700">No faculty candidates evaluated</p>
                  <p className="text-sm mt-1">Select a challenge above to run intelligence matching.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {facultyMatches.map(fac => (
                  <Card key={fac.facultyId} className="border border-slate-200 shadow-sm hover:shadow transition">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base font-bold text-slate-900">
                            {fac.facultyName}
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-600">
                            {fac.designation} • {fac.department}
                          </CardDescription>
                          <p className="text-[11px] text-slate-500">{fac.universityName}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-blue-700">{fac.overallScore}%</span>
                          <span className="block text-[10px] text-slate-400 font-semibold uppercase">Match Score</span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 text-xs">
                      {/* Breakdown Bars */}
                      <div className="space-y-1 bg-slate-50 p-2.5 rounded border border-slate-100">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-600">Department Alignment</span>
                          <span className="font-semibold text-slate-800">{fac.breakdown?.departmentScore ?? 0}/35</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-600">Expertise Tag Overlap</span>
                          <span className="font-semibold text-slate-800">{fac.breakdown?.expertiseScore ?? 0}/25</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-600">Research & Patent Record</span>
                          <span className="font-semibold text-slate-800">{fac.breakdown?.trackRecordScore ?? 0}/20</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-600">Workload & Capacity</span>
                          <span className="font-semibold text-slate-800">{fac.breakdown?.workloadScore ?? 0}/20</span>
                        </div>
                      </div>

                      {/* Explanation */}
                      <p className="text-slate-600 italic bg-white p-2 rounded border border-slate-100">
                        &ldquo;{fac.explanation}&rdquo;
                      </p>

                      <div className="flex items-center justify-between pt-1">
                        <Badge
                          variant="outline"
                          className={
                            fac.availabilityStatus === 'AVAILABLE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }
                        >
                          {fac.availabilityStatus} ({fac.activeProjectCount} active)
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 5: Industry & CSR Matching */}
        {activeTab === 'partnerships' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">Industry, Startup & CSR Partners</h2>
                <p className="text-sm text-slate-500">
                  7-Factor matching across technology fit, funding capacity, CSR focus, and field deployment scale.
                </p>
              </div>

              {/* Challenge Selector */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Select Challenge:</span>
                <select
                  className="text-xs border border-slate-300 rounded p-1.5 bg-white font-medium"
                  value={selectedChallengeId}
                  onChange={e => setSelectedChallengeId(e.target.value)}
                >
                  {matches.map(m => (
                    <option key={m.challengeId} value={m.challengeId}>
                      {m.challenge?.title ? (m.challenge.title.length > 45 ? `${m.challenge.title.substring(0, 45)}...` : m.challenge.title) : 'Challenge'}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {partnerMatches.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium text-slate-700">No industry partner matches evaluated</p>
                  <p className="text-sm mt-1">Select a challenge above to run partner matching.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {partnerMatches.map(p => (
                  <Card key={p.partnerOrgId} className="border border-slate-200 shadow-sm hover:shadow transition">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base font-bold text-slate-900">
                            {p.partnerName}
                          </CardTitle>
                          <CardDescription className="text-xs text-slate-600">
                            Sector: {p.sector}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <span className="text-2xl font-black text-indigo-700">{p.overallScore}%</span>
                          <span className="block text-[10px] text-slate-400 font-semibold uppercase">Partner Fit</span>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3 text-xs">
                      {/* Breakdown Bars */}
                      <div className="space-y-1 bg-slate-50 p-2.5 rounded border border-slate-100">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-600">Technology Fit</span>
                          <span className="font-semibold text-slate-800">{p.breakdown?.technologyFit ?? 0}/30</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-600">Domain & Problem Fit</span>
                          <span className="font-semibold text-slate-800">{p.breakdown?.domainFit ?? 0}/20</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-600">Resource Fit (Equipment/Labs)</span>
                          <span className="font-semibold text-slate-800">{p.breakdown?.resourceFit ?? 0}/15</span>
                        </div>
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-600">Funding Capacity (CSR)</span>
                          <span className="font-semibold text-slate-800">{p.breakdown?.fundingFit ?? 0}/15</span>
                        </div>
                      </div>

                      <p className="text-slate-600 italic bg-white p-2 rounded border border-slate-100">
                        &ldquo;{p.explanation}&rdquo;
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL: Decline Assignment with Mandatory Reason */}
        {declineTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <XCircle className="h-6 w-6" />
                <h3 className="text-lg font-bold text-slate-900">Decline University Assignment</h3>
              </div>
              <p className="text-xs text-slate-600">
                A formal reason is mandatory. The challenge will revert to APPROVED status so the Government Command Center can review the institutional decision and re-route the problem to an alternative institution with zero dead ends.
              </p>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Primary Reason for Decline *
                  </label>
                  <select
                    value={declineReasonCategory}
                    onChange={e => setDeclineReasonCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-rose-500 font-medium"
                  >
                    <option value="No relevant faculty expertise">No relevant faculty expertise</option>
                    <option value="Insufficient capacity">Insufficient capacity</option>
                    <option value="Infrastructure unavailable">Infrastructure unavailable</option>
                    <option value="Outside university scope">Outside university scope</option>
                    <option value="Timeline infeasible">Timeline infeasible</option>
                    <option value="Other">Other (Requires written explanation)</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    {declineReasonCategory === 'Other' ? 'Written Explanation (Mandatory - Min 10 chars) *' : 'Additional Technical Details (Optional)'}
                  </label>
                  <Textarea
                    placeholder={
                      declineReasonCategory === 'Other'
                        ? 'Explain specific institutional constraints or reasons why this problem cannot be addressed...'
                        : 'Provide any additional context for the municipal government reviewer...'
                    }
                    rows={3}
                    value={declineExplanation}
                    onChange={e => setDeclineExplanation(e.target.value)}
                    className="text-xs"
                    required={declineReasonCategory === 'Other'}
                  />
                  {declineReasonCategory === 'Other' && declineExplanation.trim().length > 0 && declineExplanation.trim().length < 10 && (
                    <span className="text-[10px] text-rose-600 font-semibold block mt-1">
                      Minimum 10 characters required ({declineExplanation.trim().length}/10)
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDeclineTarget(null);
                    setDeclineExplanation('');
                    setDeclineReasonCategory('No relevant faculty expertise');
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={actionLoading || (declineReasonCategory === 'Other' && declineExplanation.trim().length < 10)}
                  onClick={handleDeclineSubmit}
                >
                  Confirm Decline & Re-Route
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: Create Multidisciplinary Team */}
        {showTeamModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <form onSubmit={handleCreateTeam} className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Users className="h-6 w-6" />
                <h3 className="text-lg font-bold text-slate-900">Form Multidisciplinary Team</h3>
              </div>
              <p className="text-xs text-slate-600">
                Establish an official multidisciplinary project team. You will be assigned as Lead Faculty.
              </p>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block text-slate-700 mb-1">Team Name</label>
                  <Input
                    placeholder="e.g. Advanced Water Filtration Research Group"
                    value={teamName}
                    onChange={e => setTeamName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block text-slate-700 mb-1">Challenge</label>
                  <select
                    className="w-full border border-slate-300 rounded p-2 bg-white"
                    value={teamChallengeId}
                    onChange={e => setTeamChallengeId(e.target.value)}
                    required
                  >
                    <option value="">Select an active challenge...</option>
                    {activeResearchChallenges.map(m => (
                      <option key={m.challengeId} value={m.challengeId}>
                        {m.challenge.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowTeamModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={actionLoading || !teamName}>
                  Create Team
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL: Invite Team Member */}
        {inviteTargetTeamId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
            <form onSubmit={handleInviteMember} className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-blue-600">
                <Users className="h-6 w-6" />
                <h3 className="text-lg font-bold text-slate-900">Invite Multidisciplinary Member</h3>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block text-slate-700 mb-1">User ID / Email</label>
                  <Input
                    placeholder="User ID of faculty, student, or industry mentor"
                    value={inviteUserId}
                    onChange={e => setInviteUserId(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block text-slate-700 mb-1">Role in Team</label>
                  <select
                    className="w-full border border-slate-300 rounded p-2 bg-white"
                    value={inviteRole}
                    onChange={e => setInviteRole(e.target.value as TeamRole)}
                  >
                    <option value={TeamRole.STUDENT_RESEARCHER}>Student Researcher</option>
                    <option value={TeamRole.CO_FACULTY}>Co-Faculty Expert</option>
                    <option value={TeamRole.INDUSTRY_MENTOR}>Industry Mentor</option>
                    <option value={TeamRole.SUBJECT_EXPERT}>Subject Matter Expert</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setInviteTargetTeamId(null)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={actionLoading || !inviteUserId}>
                  Dispatch Invitation
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL: Draft Solution Proposal */}
        {showProposalModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
            <form onSubmit={handleCreateProposal} className="bg-white rounded-2xl p-6 max-w-xl w-full shadow-2xl border border-slate-200 space-y-4 my-8">
              <div className="flex items-center gap-2 text-indigo-600">
                <FileText className="h-6 w-6" />
                <h3 className="text-lg font-bold text-slate-900">Draft Solution Proposal</h3>
              </div>
              <p className="text-xs text-slate-600">
                Draft an immutable versioned solution proposal. Once reviewed and approved by Government, the project can be formally activated.
              </p>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block text-slate-700 mb-1">Project</label>
                  <select
                    className="w-full border border-slate-300 rounded p-2 bg-white"
                    value={propProjectId}
                    onChange={e => setPropProjectId(e.target.value)}
                    required
                  >
                    <option value="">Select Project...</option>
                    {activeResearchChallenges.map(m => {
                      const proj = m.challenge?.projects?.[0];
                      if (!proj) return null;
                      return (
                        <option key={proj.id} value={proj.id}>
                          {proj.title}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block text-slate-700 mb-1">Technical Approach</label>
                  <Textarea
                    placeholder="Describe engineering methodologies, technology components, prototype architecture..."
                    rows={3}
                    value={propApproach}
                    onChange={e => setPropApproach(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="font-semibold block text-slate-700 mb-1">Expected Societal Impact</label>
                  <Textarea
                    placeholder="Measurable outcomes, beneficiaries reached, performance benchmarks..."
                    rows={2}
                    value={propImpact}
                    onChange={e => setPropImpact(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm" type="button" onClick={() => setShowProposalModal(false)}>
                  Cancel
                </Button>
                <Button size="sm" type="submit" disabled={actionLoading || !propApproach || !propImpact}>
                  Save Proposal Draft
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* MODAL: Switch Registered University */}
        {showSwitchModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2 text-indigo-600">
                  <GraduationCap className="h-6 w-6" />
                  <h3 className="text-lg font-bold text-slate-900">Switch Registered University</h3>
                </div>
                <button
                  onClick={() => setShowSwitchModal(false)}
                  className="text-slate-400 hover:text-slate-600 text-sm font-bold p-1 rounded-lg hover:bg-slate-100"
                >
                  ✕
                </button>
              </div>

              <p className="text-xs text-slate-600">
                Select an accredited institution to review civic problems assigned by Government, manage multidisciplinary research teams, and author technical proposals.
              </p>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search registered university by name, state, or AISHE..."
                  value={switchSearch}
                  onChange={e => setSwitchSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Institutions List */}
              <div className="space-y-3">
                {registeredUnis
                  .filter(u => {
                    if (!switchSearch.trim()) return true;
                    const q = switchSearch.toLowerCase();
                    return (
                      u.name?.toLowerCase().includes(q) ||
                      u.district?.toLowerCase().includes(q) ||
                      u.state?.toLowerCase().includes(q) ||
                      u.aisheCode?.toLowerCase().includes(q)
                    );
                  })
                  .map(u => {
                    const isActive = user?.organizationId === u.id;
                    return (
                      <div
                        key={u.id}
                        className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                          isActive
                            ? 'border-indigo-500 bg-indigo-50/50 ring-2 ring-indigo-400/20'
                            : 'border-slate-200 hover:border-indigo-300 bg-white'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900">{u.name}</span>
                            {isActive && (
                              <Badge className="bg-indigo-600 text-white text-[10px]">Active Session</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span>{u.district}, {u.state}</span>
                            {u.aisheCode && <span>• AISHE: {u.aisheCode}</span>}
                            {u.naacGrade && <span className="font-semibold text-emerald-700">• NAAC: {u.naacGrade}</span>}
                          </div>
                          {u.researchDomains && u.researchDomains.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {u.researchDomains.slice(0, 3).map((d: string, idx: number) => (
                                <span key={idx} className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                                  {d}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="shrink-0">
                          <Button
                            size="sm"
                            disabled={actionLoading || isActive}
                            className={isActive ? 'bg-slate-200 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs'}
                            onClick={() => handleSwitchUniversity(u.id)}
                          >
                            {isActive ? 'Current Institution' : 'Switch & Access'}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setShowSwitchModal(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
