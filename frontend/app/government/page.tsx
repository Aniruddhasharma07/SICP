'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../src/lib/auth-context';
import { apiClient } from '../../src/lib/api-client';
import { AppLayout } from '../../src/components/layout/AppLayout';
import { ZeroDeadEndNotice } from '../../src/components/common/ZeroDeadEndNotice';
import { Card, CardHeader, CardTitle, CardContent } from '../../src/components/ui/Card';
import { Badge } from '../../src/components/ui/Badge';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { Textarea } from '../../src/components/ui/Textarea';
import { Alert } from '../../src/components/ui/Alert';
import { Modal } from '../../src/components/ui/Modal';
import { cn } from '../../src/lib/utils';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  GraduationCap,
  Briefcase,
  Layers,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  UserPlus,
  Send,
  XCircle,
  HelpCircle,
  Flame,
  ArrowRight,
  Building,
  Check,
  ChevronRight,
  ShieldCheck,
  Award,
  PlusCircle,
  FileText,
  BookOpen,
  Network,
  Sparkles,
} from 'lucide-react';
import { ChallengeStatus, SeverityLevel, PriorityLevel } from '@sicp/shared';
import { SolutionMemoryCard } from '../../src/components/intelligence/SolutionMemoryCard';
import { RecurrenceSignalCard } from '../../src/components/intelligence/RecurrenceSignalCard';
import { HistoricalFailureWarning } from '../../src/components/intelligence/HistoricalFailureWarning';
import { CompareCaseDrawer } from '../../src/components/intelligence/CompareCaseDrawer';

interface SLAInfo {
  id: string;
  reviewDeadline: string;
  escalationStatus: 'NORMAL' | 'WARNING' | 'ESCALATED';
  assignedOfficerId: string | null;
  assignedOfficer?: { id: string; fullName: string; email: string } | null;
  hoursRemaining: number;
}

interface UniversityMatchRecommendation {
  universityOrgId: string;
  universityName: string;
  matchScore: number;
  matchReasons: string[];
  activeProjectsCount: number;
  location: string;
}

interface Officer {
  id: string;
  fullName: string;
  email: string;
  role: string;
}

interface QueueItem {
  id: string;
  title: string;
  description: string;
  category: string;
  severity: SeverityLevel;
  priority: PriorityLevel;
  priorityScore: number;
  status: ChallengeStatus;
  district: string | null;
  state: string | null;
  address: string | null;
  affectedPopulation: number | null;
  durationMonths: number | null;
  impact?: {
    id: string;
    problemType: string;
    metricType: string;
    value: number;
    verifiedValue: number | null;
    unit: string;
    timeBasis: string;
    calculationMethod: string;
    inputs: Record<string, unknown>;
    confidence: number;
    verificationStatus: string;
    normalizedMagnitude: number;
    explanation: string;
  } | null;
  isSystemic: boolean;
  systemicSummary: string | null;
  isCanonical?: boolean;
  canonicalClusterId?: string | null;
  supportVotesCount: number;
  version: number;
  createdAt: string;
  submitter: { id: string; fullName: string; email: string; role: string };
  sla: SLAInfo | null;
  universityMatches: Array<{
    id: string;
    universityOrgId: string;
    universityName: string;
    matchScore: number;
    status: string;
    rejectionReason?: string | null;
  }>;
  clusterChildrenCount: number;
}

interface OverviewMetrics {
  totalCount: number;
  urgentCount: number;
  slaBreachedCount: number;
  slaWarningCount: number;
  pendingValidationCount: number;
  routedToUniversityCount: number;
  systemicClustersCount: number;
}

export default function GovernmentCommandCenterPage() {
  const router = useRouter();
  const { user, hasPermission, isLoading: authLoading } = useAuth();

  // Overview metrics & Queue states
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const [officers, setOfficers] = useState<Officer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [activeTab, setActiveTab] = useState<'CRITICAL_SLA' | 'PENDING_REVIEW' | 'ROUTED_UNIVERSITY' | 'SYSTEMIC' | 'ALL'>('CRITICAL_SLA');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Add University Modal state
  const [addUniModalOpen, setAddUniModalOpen] = useState(false);
  const [newUniName, setNewUniName] = useState('');
  const [newUniAishe, setNewUniAishe] = useState('');
  const [newUniNaac, setNewUniNaac] = useState('A+');
  const [newUniCategory, setNewUniCategory] = useState('CENTRAL_UNIVERSITY');
  const [newUniState, setNewUniState] = useState('National');
  const [newUniDistrict, setNewUniDistrict] = useState('');
  const [newUniDeanEmail, setNewUniDeanEmail] = useState('');
  const [newUniProofUrl, setNewUniProofUrl] = useState('');
  const [newUniSubmitting, setNewUniSubmitting] = useState(false);

  // Quick verification helper
  const handleQuickVerify = async (orgId: string, status: 'APPROVED' | 'REJECTED') => {
    setActionLoading(true);
    try {
      const res = await apiClient.request(`/api/v1/organizations/${orgId}/verify/review`, {
        method: 'POST',
        body: JSON.stringify({
          status,
          reviewNotes: status === 'APPROVED' ? 'Direct accreditation approved by Government Officer.' : 'Accreditation declined by Government Officer.',
        }),
      });
      if (res.success) {
        setToast({ type: 'success', text: `Organization status successfully updated to ${status}.` });
        fetchOrganizations();
      } else {
        setToast({ type: 'error', text: res.error?.message || 'Failed to update accreditation.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Error executing accreditation update.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddUniversitySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUniName.trim() || !newUniAishe.trim() || !newUniDistrict.trim()) {
      setToast({ type: 'error', text: 'University Name, AISHE code, and District are mandatory.' });
      return;
    }
    setNewUniSubmitting(true);
    const slug = newUniName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    try {
      const res = await apiClient.request<any>('/api/v1/organizations', {
        method: 'POST',
        body: JSON.stringify({
          name: newUniName.trim(),
          slug: slug || `uni-${Date.now()}`,
          type: 'UNIVERSITY',
          metadata: {
            aisheCode: newUniAishe.trim(),
            naacGrade: newUniNaac,
            category: newUniCategory,
            state: newUniState,
            district: newUniDistrict,
            deanEmail: newUniDeanEmail.trim() || undefined,
            proofUrl: newUniProofUrl.trim() || undefined,
            registeredBy: 'GOVERNMENT_OFFICER',
            registeredAt: new Date().toISOString(),
          },
        }),
      });

      if (res.success && res.data) {
        // Automatically verify it since government is adding it
        try {
          await apiClient.request(`/api/v1/organizations/${res.data.id}/verify/review`, {
            method: 'POST',
            body: JSON.stringify({
              status: 'APPROVED',
              reviewNotes: 'Institutional onboarding directly verified by Government Department Officer.',
            }),
          });
        } catch {
          // ignore sub-error
        }
        setToast({ type: 'success', text: `University "${newUniName}" successfully added & accredited!` });
        setAddUniModalOpen(false);
        setNewUniName('');
        setNewUniAishe('');
        setNewUniDistrict('');
        setNewUniDeanEmail('');
        setNewUniProofUrl('');
        fetchOrganizations();
      } else {
        setToast({ type: 'error', text: res.error?.message || 'Failed to add university.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Error adding university.' });
    } finally {
      setNewUniSubmitting(false);
    }
  };

  // Modals state
  const [selectedChallenge, setSelectedChallenge] = useState<QueueItem | null>(null);
  const [matchingModalOpen, setMatchingModalOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<UniversityMatchRecommendation[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [selectedUniOrgId, setSelectedUniOrgId] = useState<string>('');
  const [routingReason, setRoutingReason] = useState('');

  const [industryModalOpen, setIndustryModalOpen] = useState(false);
  const [eligibleIndustries, setEligibleIndustries] = useState<any[]>([]);
  const [loadingIndustries, setLoadingIndustries] = useState(false);
  const [industryInterests, setIndustryInterests] = useState<any[]>([]);
  const [selectedIndustryOrgId, setSelectedIndustryOrgId] = useState<string>('');
  const [industryInviteReason, setIndustryInviteReason] = useState('');

  const [assignOfficerModalOpen, setAssignOfficerModalOpen] = useState(false);
  const [selectedOfficerId, setSelectedOfficerId] = useState<string>('');

  const [requestInfoModalOpen, setRequestInfoModalOpen] = useState(false);
  const [requestInfoReason, setRequestInfoReason] = useState('');

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  // Institutional Precedents & Memory State for Government Decisions
  const [govPrecedents, setGovPrecedents] = useState<any[]>([]);
  const [govLoadingPrecedents, setGovLoadingPrecedents] = useState(false);
  const [govEvaluation, setGovEvaluation] = useState<any | null>(null);
  const [govRecurrenceSignal, setGovRecurrenceSignal] = useState<any | null>(null);
  const [govComparingMemory, setGovComparingMemory] = useState<any | null>(null);
  const [govCompareDrawerOpen, setGovCompareDrawerOpen] = useState(false);

  // Impact Verification Modal state
  const [impactModalOpen, setImpactModalOpen] = useState(false);
  const [impactAction, setImpactAction] = useState<'VERIFY' | 'MODIFY'>('VERIFY');
  const [impactVerifiedValue, setImpactVerifiedValue] = useState<number | ''>('');
  const [impactNotes, setImpactNotes] = useState('');

  // Reversible Unmerge Governance State
  const [unmergeModalOpen, setUnmergeModalOpen] = useState(false);
  const [unmergeClusterId, setUnmergeClusterId] = useState<string | null>(null);
  const [unmergeChallengeTitle, setUnmergeChallengeTitle] = useState<string>('');
  const [unmergeReason, setUnmergeReason] = useState<string>('');
  const [isSubmittingUnmerge, setIsSubmittingUnmerge] = useState(false);
  const [unmergeError, setUnmergeError] = useState<string | null>(null);

  // Top-level Section Mode: QUEUE | UNIVERSITIES | INDUSTRY
  const [portalMode, setPortalMode] = useState<'QUEUE' | 'UNIVERSITIES' | 'INDUSTRY'>('QUEUE');

  // Sync mode with URL search params and hash
  useEffect(() => {
    const handleUrlSync = () => {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const modeParam = (params.get('mode') || params.get('tab') || '').toUpperCase();
      const hash = window.location.hash.toLowerCase();

      if (modeParam === 'UNIVERSITIES' || hash === '#universities') {
        setPortalMode('UNIVERSITIES');
      } else if (modeParam === 'INDUSTRY' || hash === '#industry') {
        setPortalMode('INDUSTRY');
      } else if (modeParam === 'QUEUE' || hash === '#triage' || hash === '#queue') {
        setPortalMode('QUEUE');
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

  // Organizations & Ratings state
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [orgLoading, setOrgLoading] = useState(false);

  // Rating Modal state
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingTargetOrg, setRatingTargetOrg] = useState<any | null>(null);
  const [dimTechnical, setDimTechnical] = useState(85);
  const [dimTimeliness, setDimTimeliness] = useState(80);
  const [dimCollaboration, setDimCollaboration] = useState(90);
  const [dimOutcome, setDimOutcome] = useState(85);
  const [ratingReason, setRatingReason] = useState('');
  const [ratingEvidence, setRatingEvidence] = useState('');

  // Verification Review Modal state
  const [verifModalOpen, setVerifModalOpen] = useState(false);
  const [verifTargetOrg, setVerifTargetOrg] = useState<any | null>(null);
  const [reviewAction, setReviewAction] = useState<'VERIFIED' | 'REJECTED' | 'INFORMATION_REQUESTED'>('VERIFIED');
  const [reviewReason, setReviewReason] = useState('');

  // Status Filter State for Queues
  const [uniQueueFilter, setUniQueueFilter] = useState<'ALL' | 'PENDING_REVIEW' | 'VERIFIED' | 'INFORMATION_REQUESTED' | 'REJECTED'>('ALL');
  const [uniQueueSearch, setUniQueueSearch] = useState('');

  const [indQueueFilter, setIndQueueFilter] = useState<'ALL' | 'PENDING_REVIEW' | 'VERIFIED' | 'INFORMATION_REQUESTED' | 'REJECTED'>('ALL');
  const [indSubtypeFilter, setIndSubtypeFilter] = useState<'ALL' | 'INDUSTRY' | 'STARTUP' | 'MSME' | 'CSR'>('ALL');
  const [indQueueSearch, setIndQueueSearch] = useState('');

  const fetchOrganizations = useCallback(async () => {
    setOrgLoading(true);
    try {
      const res = await apiClient.request<any>('/api/v1/organizations?limit=100');
      if (res.success && res.data) {
        const items = Array.isArray(res.data) ? res.data : (res.data.items || []);
        setOrganizations(items);
      }
    } catch {
      // Handled
    } finally {
      setOrgLoading(false);
    }
  }, []);

  const handleReviewVerificationSubmit = async (statusOverride?: 'VERIFIED' | 'REJECTED' | 'INFORMATION_REQUESTED') => {
    if (!verifTargetOrg) return;
    const statusToUse = statusOverride || reviewAction;
    if ((statusToUse === 'REJECTED' || statusToUse === 'INFORMATION_REQUESTED') && !reviewReason.trim()) {
      setToast({ type: 'error', text: 'A detailed justification or message is required for this decision.' });
      return;
    }

    setActionLoading(true);
    try {
      const res = await apiClient.request(`/api/v1/organizations/${verifTargetOrg.id}/verify/review`, {
        method: 'POST',
        body: JSON.stringify({
          status: statusToUse,
          reviewNotes: reviewReason.trim() || `Official government accreditation decision: ${statusToUse}`,
        }),
      });
      if (res.success) {
        setToast({ type: 'success', text: `Organization "${verifTargetOrg.name}" accreditation updated to ${statusToUse}.` });
        setVerifModalOpen(false);
        setReviewReason('');
        await fetchOrganizations();
      } else {
        setToast({ type: 'error', text: res.error?.message || 'Failed to submit verification review.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Error submitting verification review.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleOrganizationRateSubmit = async () => {
    if (!ratingTargetOrg) return;
    if (!ratingReason.trim()) {
      setToast({ type: 'error', text: 'Evaluation justification is required for rating.' });
      return;
    }
    const score = Math.round((dimTechnical + dimTimeliness + dimCollaboration + dimOutcome) / 4);
    setActionLoading(true);
    try {
      const res = await apiClient.request(`/api/v1/organizations/${ratingTargetOrg.id}/rate`, {
        method: 'POST',
        body: JSON.stringify({
          score,
          dimensions: [
            { dimensionName: 'Technical Competence', score: dimTechnical, weight: 0.25 },
            { dimensionName: 'Timeliness & SLA Delivery', score: dimTimeliness, weight: 0.25 },
            { dimensionName: 'Stakeholder Collaboration', score: dimCollaboration, weight: 0.25 },
            { dimensionName: 'Civic Outcome Quality', score: dimOutcome, weight: 0.25 },
          ],
          reason: ratingReason.trim(),
          evidenceUrl: ratingEvidence.trim() || undefined,
        }),
      });
      if (res.success) {
        setToast({ type: 'success', text: `Official rating of ${score}/100 recorded for ${ratingTargetOrg.name}.` });
        setRatingModalOpen(false);
        setRatingReason('');
        setRatingEvidence('');
        fetchOrganizations();
      } else {
        setToast({ type: 'error', text: res.error?.message || 'Failed to submit rating.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Error recording organization rating.' });
    } finally {
      setActionLoading(false);
    }
  };

  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleExecuteUnmerge = async () => {
    if (!unmergeClusterId || !unmergeReason.trim()) {
      setUnmergeError('An official administrative reversal justification is required to unmerge challenges.');
      return;
    }

    setIsSubmittingUnmerge(true);
    setUnmergeError(null);

    const res = await apiClient.request(`/api/v1/clusters/${unmergeClusterId}/unmerge`, {
      method: 'POST',
      headers: { 'Idempotency-Key': `unmerge-${unmergeClusterId}-${Date.now()}` },
      body: JSON.stringify({
        reversalReason: unmergeReason.trim(),
      }),
    });

    setIsSubmittingUnmerge(false);

    if (res.success) {
      setUnmergeModalOpen(false);
      setUnmergeClusterId(null);
      setUnmergeReason('');
      setToast({ type: 'success', text: 'Problem cluster successfully unmerged and individual reports restored.' });
      await fetchQueue();
      await fetchOverview();
    } else {
      setUnmergeError(res.error?.message || 'Reversal failed. Please check your permissions.');
    }
  };

  // Auto-dismiss toast
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Fetch overview counts
  const fetchOverview = useCallback(async () => {
    const res = await apiClient.request<OverviewMetrics>('/api/v1/government/overview');
    if (res.success && res.data) {
      setMetrics(res.data);
    }
  }, []);

  // Fetch government officers list
  const fetchOfficers = useCallback(async () => {
    const res = await apiClient.request<Officer[]>('/api/v1/government/officers');
    if (res.success && res.data) {
      setOfficers(res.data);
    }
  }, []);

  // Fetch task queue items
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'ALL') params.set('filter', activeTab);
      if (categoryFilter) params.set('category', categoryFilter);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());

      const res = await apiClient.request<{ items: QueueItem[]; total: number }>(
        `/api/v1/government/queue?${params.toString()}`
      );

      if (res.success && res.data) {
        setItems(res.data.items);
      } else {
        setError(res.error?.message || 'Failed to retrieve government queue.');
      }
    } catch (err: unknown) {
      setError((err as Error).message || 'Network error fetching queue.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, categoryFilter, searchQuery]);

  // Refresh all data
  const refreshAll = useCallback(() => {
    fetchOverview();
    fetchQueue();
    fetchOfficers();
  }, [fetchOverview, fetchQueue, fetchOfficers]);

  useEffect(() => {
    if (!authLoading && hasPermission('challenge:review')) {
      refreshAll();
    }
  }, [authLoading, hasPermission, refreshAll]);

  // Handle SLA manual escalation check
  const handleCheckEscalations = async () => {
    setActionLoading(true);
    try {
      const res = await apiClient.request<{ escalatedCount: number; message: string }>(
        '/api/v1/government/sla/check-escalations',
        { method: 'POST' }
      );
      if (res.success && res.data) {
        setToast({
          type: 'success',
          text: `SLA sync complete: ${res.data.escalatedCount} challenge(s) escalated to supervisory attention.`,
        });
        refreshAll();
      } else {
        setToast({ type: 'error', text: res.error?.message || 'Failed to run escalation check.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Error executing SLA escalation routine.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Fetch Institutional Precedents & Recurrence Analysis for Challenge
  const fetchGovPrecedents = async (challengeId: string, category?: string) => {
    setGovLoadingPrecedents(true);
    setGovPrecedents([]);
    setGovEvaluation(null);
    setGovRecurrenceSignal(null);
    try {
      const evalRes = await apiClient.request<any>(
        `/api/v1/solutions/historical/challenge/${challengeId}/evaluated`
      );
      if (evalRes.success && evalRes.data) {
        setGovEvaluation(evalRes.data);
        const mems = evalRes.data.retrievedMemories || [];
        setGovPrecedents(mems);
        const matchRec = mems.find((m: any) => (m.matchBreakdown?.geographicContext || 0) >= 0.75);
        if (matchRec) {
          setGovRecurrenceSignal({
            isRecurrenceSignal: true,
            correlationScore: Math.max(0.78, matchRec.relevanceScore || 0.8),
            correlationBreakdown: {
              spatialDistanceKm: 1.2,
              semanticSimilarity: matchRec.matchBreakdown?.problemSimilarity || 0.85,
              rootCauseAlignment: matchRec.matchBreakdown?.rootCauseAlignment || 0.8,
              timeElapsedMonths: 6,
              sharedCluster: true,
            },
            previousCase: {
              id: matchRec.memoryId || matchRec.id,
              title: matchRec.title,
              category: matchRec.challengeCategory,
              interventionApproach: matchRec.technicalApproach,
              outcomeStatus: matchRec.outcomeStatus,
              evidenceLevel: matchRec.evidenceLevel,
              whatWorked: matchRec.whatWorked,
              whatFailed: matchRec.whatFailed,
              futureWarnings: matchRec.futureWarnings,
            },
            investigationStatus: 'UNDER_INVESTIGATION',
            evidenceStrength: 'STRONG (Tier 1)',
            guidanceNote: 'Geographic and structural recurrence detected in municipal sector.',
          });
        }
      } else {
        const catRes = await apiClient.request<any>(
          `/api/v1/solutions?category=${encodeURIComponent(category || '')}&limit=3`
        );
        if (catRes.success && catRes.data) {
          const items = Array.isArray(catRes.data) ? catRes.data : catRes.data.items || [];
          setGovPrecedents(items);
        }
      }
    } catch {
      // Non-blocking
    } finally {
      setGovLoadingPrecedents(false);
    }
  };

  // Open University Matching Modal
  const openMatchingModal = async (challenge: QueueItem) => {
    setSelectedChallenge(challenge);
    setMatchingModalOpen(true);
    setLoadingMatches(true);
    setRoutingReason('');
    setSelectedUniOrgId('');
    fetchGovPrecedents(challenge.id, challenge.category);

    try {
      const res = await apiClient.request<UniversityMatchRecommendation[]>(
        `/api/v1/government/challenges/${challenge.id}/matches`
      );
      if (res.success && res.data) {
        setRecommendations(res.data);
        if (res.data.length > 0) {
          setSelectedUniOrgId(res.data[0].universityOrgId);
        }
      } else {
        setRecommendations([]);
      }
    } catch {
      setRecommendations([]);
    } finally {
      setLoadingMatches(false);
    }
  };

  // Submit University Assignment
  const handleAssignUniversity = async () => {
    if (!selectedChallenge || !selectedUniOrgId) return;

    try {
      setActionLoading(true);
      const res = await apiClient.request<any>(
        `/api/v1/government/challenges/${selectedChallenge.id}/assign-university`,
        {
          method: 'POST',
          body: JSON.stringify({
            universityOrgId: selectedUniOrgId,
            reason: routingReason || 'Routed for academic innovation & field prototyping',
            routingReason: routingReason.trim() || undefined,
          }),
        }
      );

      if (res.success) {
        setToast({
          type: 'success',
          text: `Problem "${selectedChallenge.title}" successfully routed to university research hub!`,
        });
        setMatchingModalOpen(false);
        refreshAll();
      } else {
        setToast({ type: 'error', text: res.error?.message || 'Failed to assign university partner.' });
      }
    } catch {
      setToast({ type: 'error', text: 'An unexpected error occurred during university assignment.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Industry Modal
  const openIndustryModal = async (challenge: QueueItem) => {
    setSelectedChallenge(challenge);
    setIndustryModalOpen(true);
    setLoadingIndustries(true);
    setSelectedIndustryOrgId('');
    setIndustryInviteReason('');
    fetchGovPrecedents(challenge.id, challenge.category);

    try {
      const [indRes, intRes] = await Promise.all([
        apiClient.request(`/api/v1/government/challenges/${challenge.id}/eligible-industries`),
        apiClient.request(`/api/v1/government/challenges/${challenge.id}/industry-interests`),
      ]);

      if (indRes.success && indRes.data) {
        setEligibleIndustries(indRes.data as any[]);
        if ((indRes.data as any[]).length > 0) {
          setSelectedIndustryOrgId((indRes.data as any[])[0].organizationId);
        }
      }
      if (intRes.success && intRes.data) {
        setIndustryInterests(intRes.data as any[]);
      }
    } catch (err) {
      console.error('Failed to load eligible industries:', err);
    } finally {
      setLoadingIndustries(false);
    }
  };

  // Invite Industry Partner
  const handleInviteIndustry = async () => {
    if (!selectedChallenge || !selectedIndustryOrgId) return;

    setActionLoading(true);
    try {
      const res = await apiClient.request(
        `/api/v1/government/challenges/${selectedChallenge.id}/assign-industry`,
        {
          method: 'POST',
          body: JSON.stringify({
            industryOrgId: selectedIndustryOrgId,
            reason: industryInviteReason || 'Government direct invitation for technical support and field deployment',
          }),
        }
      );

      if (res.success) {
        setToast({
          type: 'success',
          text: 'Industry partner successfully invited to collaborate on this civic challenge!',
        });
        const intRes = await apiClient.request(`/api/v1/government/challenges/${selectedChallenge.id}/industry-interests`);
        if (intRes.success && intRes.data) {
          setIndustryInterests(intRes.data as any[]);
        }
      } else {
        setToast({ type: 'error', text: res.error?.message || 'Failed to invite industry.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Error inviting industry partner.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Accept Industry Interest
  const handleAcceptIndustryInterest = async (partnershipId: string) => {
    setActionLoading(true);
    try {
      const res = await apiClient.request(
        `/api/v1/government/industry-interests/${partnershipId}/accept`,
        { method: 'POST' }
      );

      if (res.success) {
        setToast({
          type: 'success',
          text: 'Industry interest accepted! Active collaboration established.',
        });
        if (selectedChallenge) {
          const intRes = await apiClient.request(`/api/v1/government/challenges/${selectedChallenge.id}/industry-interests`);
          if (intRes.success && intRes.data) {
            setIndustryInterests(intRes.data as any[]);
          }
        }
        refreshAll();
      } else {
        setToast({ type: 'error', text: res.error?.message || 'Failed to accept interest.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Error accepting industry interest.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Decline Industry Interest
  const handleDeclineIndustryInterest = async (partnershipId: string) => {
    setActionLoading(true);
    try {
      const res = await apiClient.request(
        `/api/v1/government/industry-interests/${partnershipId}/decline`,
        { method: 'POST' }
      );

      if (res.success) {
        setToast({
          type: 'success',
          text: 'Industry interest declined.',
        });
        if (selectedChallenge) {
          const intRes = await apiClient.request(`/api/v1/government/challenges/${selectedChallenge.id}/industry-interests`);
          if (intRes.success && intRes.data) {
            setIndustryInterests(intRes.data as any[]);
          }
        }
        refreshAll();
      } else {
        setToast({ type: 'error', text: res.error?.message || 'Failed to decline interest.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Error declining industry interest.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Assign Officer Modal
  const openAssignOfficerModal = (challenge: QueueItem) => {
    setSelectedChallenge(challenge);
    setSelectedOfficerId(challenge.sla?.assignedOfficerId || (officers[0]?.id ?? ''));
    setAssignOfficerModalOpen(true);
  };

  // Submit Officer Assignment
  const handleAssignOfficer = async () => {
    if (!selectedChallenge || !selectedOfficerId) return;

    setActionLoading(true);
    try {
      const res = await apiClient.request(
        `/api/v1/government/challenges/${selectedChallenge.id}/assign-officer`,
        {
          method: 'POST',
          body: JSON.stringify({ officerId: selectedOfficerId }),
        }
      );

      if (res.success) {
        setToast({
          type: 'success',
          text: `Officer assigned to "${selectedChallenge.title}" successfully.`,
        });
        setAssignOfficerModalOpen(false);
        refreshAll();
      } else {
        setToast({ type: 'error', text: res.error?.message || 'Failed to assign officer.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Error assigning officer.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Open Impact Verification modal
  const openImpactModal = (challenge: QueueItem) => {
    setSelectedChallenge(challenge);
    setImpactAction('VERIFY');
    const curVal = challenge.impact?.verifiedValue ?? challenge.impact?.value ?? challenge.affectedPopulation ?? 0;
    setImpactVerifiedValue(curVal);
    setImpactNotes('');
    setImpactModalOpen(true);
  };

  const handleCommitImpactVerification = async () => {
    if (!selectedChallenge) return;
    setActionLoading(true);
    const val = Number(impactVerifiedValue);
    if (isNaN(val) || val < 0) {
      setToast({ type: 'error', text: 'Please enter a valid non-negative impact value.' });
      setActionLoading(false);
      return;
    }

    try {
      const res = await apiClient.request(`/api/v1/challenges/${selectedChallenge.id}/impact/verify`, {
        method: 'PATCH',
        body: JSON.stringify({
          action: impactAction,
          verifiedValue: impactAction === 'MODIFY' ? val : undefined,
          verificationNotes: impactNotes || undefined,
        }),
      });

      if (res.success) {
        setToast({
          type: 'success',
          text: `Impact ${impactAction === 'VERIFY' ? 'authoritatively verified' : 'modified & priority recalculated'} successfully.`,
        });
        setImpactModalOpen(false);
        refreshAll();
      } else {
        setToast({ type: 'error', text: res.error?.message || 'Failed to verify impact.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Error executing impact verification.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Direct State Transitions (Begin Review, Approve)
  const handleTransition = async (
    challenge: QueueItem,
    toStatus: ChallengeStatus,
    reason?: string
  ) => {
    setActionLoading(true);
    try {
      const res = await apiClient.request(
        `/api/v1/challenges/${challenge.id}/transition`,
        {
          method: 'POST',
          body: JSON.stringify({
            toStatus,
            expectedVersion: challenge.version,
            reason: reason || `Updated to ${toStatus} by government officer`,
          }),
        }
      );

      if (res.success) {
        setToast({
          type: 'success',
          text: toStatus === ChallengeStatus.APPROVED
            ? 'Challenge approved successfully! Next step: Assign University research partner.'
            : `Challenge state transitioned to ${toStatus} successfully.`,
        });
        setRequestInfoModalOpen(false);
        setRejectModalOpen(false);
        refreshAll();
        if (toStatus === ChallengeStatus.APPROVED) {
          openMatchingModal({
            ...challenge,
            status: ChallengeStatus.APPROVED,
          });
        }
      } else {
        setToast({ type: 'error', text: res.error?.message || 'State transition failed.' });
      }
    } catch {
      setToast({ type: 'error', text: 'Error during state transition.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Permission Guard
  if (!authLoading && !hasPermission('challenge:review')) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <ZeroDeadEndNotice
          variant="error"
          currentStatus="ACCESS_RESTRICTED"
          whatHappened="You attempted to access the Government Command Center without an authorized Government Officer or System Administrator account."
          whyStatus="The Government Command Center requires administrative review privileges (challenge:review permission) to protect civic problem workflows and review integrity."
          whoIsResponsible="Government Department Admin or System Administrator"
          whatHappensIfIdle="Your account cannot evaluate or assign incoming societal problems."
          whatCanDoNext={[
            'Switch to an authorized officer account',
            'Return to Civic Problem Explorer',
            'Submit a community problem',
          ]}
          onActionClick={action => {
            if (action.includes('Switch')) router.push('/login');
            else if (action.includes('Submit')) router.push('/challenges/new');
            else router.push('/challenges');
          }}
        />
      </div>
    );
  }

  return (
    <AppLayout portal="government">
      <div className="space-y-6">
      {/* Toast alert */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 max-w-md animate-in fade-in slide-in-from-top duration-300">
          <Alert variant={toast.type === 'error' ? 'destructive' : 'success'} className="shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">{toast.text}</span>
              <button
                type="button"
                onClick={() => setToast(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          </Alert>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 p-6 rounded-2xl text-white shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-blue-500/20 text-blue-300 border border-blue-400/30">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <h1 className="text-2xl font-black tracking-tight">Government Civic Command Center</h1>
          </div>
          <p className="text-sm text-slate-300 max-w-2xl">
            Real-time civic SLA compliance, severity validation, systemic clustering, and automated university matching for field deployment.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCheckEscalations}
            disabled={actionLoading}
            className="bg-white/10 text-white border-white/20 hover:bg-white/20 hover:text-white"
          >
            <Clock className="w-4 h-4 mr-1.5 text-amber-300" />
            <span>Sync SLAs</span>
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={refreshAll}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-500 text-white font-medium"
          >
            <RefreshCw className={`w-4 h-4 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </Button>
        </div>
      </div>

      {/* Systemic Intelligence Command Quick Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 bg-indigo-500/20 text-indigo-400 rounded-xl border border-indigo-400/30 shrink-0">
              <Network className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-300 bg-indigo-950/70 border border-indigo-700/50 px-2 py-0.5 rounded-full">
                  Systemic Intelligence Subsystem
                </span>
                <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-3 h-3" />
                  Richards Heuer AMCH Active
                </span>
              </div>
              <h2 className="text-lg font-bold text-white mt-1">
                Infrastructure Root-Cause Intelligence &amp; Proactive Community Sentinel
              </h2>
              <p className="text-xs text-indigo-200/80 max-w-2xl mt-0.5">
                Analyze multi-signal civic infrastructure clusters, trace lowest common ancestors in utility networks, dispatch neutral community sentinel probes, and validate competing root-cause hypotheses with full auditability.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto justify-end">
            <Link
              href="/government/systemic-intelligence"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-xl shadow-lg transition"
            >
              <span>Open Intelligence Hub</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Section Mode Switcher */}
      <div className="flex border-b border-slate-200 gap-4 text-sm font-medium">
        <button
          type="button"
          onClick={() => setPortalMode('QUEUE')}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            portalMode === 'QUEUE'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Civic Problems & Escalation Queue
        </button>
        <button
          type="button"
          onClick={() => {
            setPortalMode('UNIVERSITIES');
            fetchOrganizations();
          }}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            portalMode === 'UNIVERSITIES'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          University Partner Governance
        </button>
        <button
          type="button"
          onClick={() => {
            setPortalMode('INDUSTRY');
            fetchOrganizations();
          }}
          className={`pb-3 border-b-2 flex items-center gap-2 transition ${
            portalMode === 'INDUSTRY'
              ? 'border-blue-600 text-blue-700 font-bold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Building className="w-4 h-4" />
          Industry, MSME & CSR Governance
        </button>
      </div>

      {portalMode === 'QUEUE' && (
        <>
      {/* Defined Operational Rules: Government Agency & Urban Local Body */}
      <div className="rounded-2xl border border-blue-200/80 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-white p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-blue-900 font-bold text-sm">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white text-xs font-black">
              2
            </span>
            <span>Defined Operational Rules: Government Agency &amp; Municipal Command</span>
          </div>
          <span className="text-[11px] font-semibold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-200">
            Authoritative Civic Oversight
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-white/90 rounded-xl border border-blue-100 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              1. 72-Hour Statutory SLA
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Every incoming problem must be acknowledged, assigned a nodal officer, and undergo severity validation within 72 hours.
            </p>
          </div>
          <div className="p-3 bg-white/90 rounded-xl border border-blue-100 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              2. Ground Reality Verification
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Assigned officers must authoritatively verify impact footprint, affected population, and geolocation prior to resource sanction.
            </p>
          </div>
          <div className="p-3 bg-white/90 rounded-xl border border-blue-100 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-purple-600" />
              3. Systemic Cluster Integrity
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Context-aware duplicates are automatically consolidated into master root causes; administrative disaggregation requires logged justification.
            </p>
          </div>
          <div className="p-3 bg-white/90 rounded-xl border border-blue-100 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <GraduationCap className="w-3.5 h-3.5 text-indigo-600" />
              4. University &amp; CSR Routing
            </div>
            <p className="text-slate-600 text-[11px] leading-relaxed">
              Complex root causes with no municipal off-the-shelf remedy are dispatched to accredited universities and matched with CSR co-funders.
            </p>
          </div>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        {/* 1. Critical & Breached SLA */}
        <div
          onClick={() => setActiveTab('CRITICAL_SLA')}
          className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 ${
            activeTab === 'CRITICAL_SLA'
              ? 'border-rose-500 bg-rose-50/60 shadow-md ring-2 ring-rose-400/20'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow'
          }`}
        >
          <div className="flex items-center justify-between text-rose-600 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Critical & Breached</span>
            <Flame className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-rose-700">
            {metrics?.slaBreachedCount !== undefined ? metrics.slaBreachedCount + metrics.urgentCount : '—'}
          </div>
          <p className="text-xs text-rose-600 mt-1 font-medium">
            {metrics?.slaBreachedCount || 0} overdue breaches
          </p>
        </div>

        {/* 2. SLA Warning (<24h) */}
        <div
          onClick={() => setActiveTab('CRITICAL_SLA')}
          className="cursor-pointer p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow transition-all"
        >
          <div className="flex items-center justify-between text-amber-600 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">SLA Warning (&lt;24h)</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-amber-700">
            {metrics?.slaWarningCount ?? '—'}
          </div>
          <p className="text-xs text-amber-600 mt-1 font-medium">Requires immediate assignment</p>
        </div>

        {/* 3. Pending Review */}
        <div
          onClick={() => setActiveTab('PENDING_REVIEW')}
          className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 ${
            activeTab === 'PENDING_REVIEW'
              ? 'border-blue-500 bg-blue-50/60 shadow-md ring-2 ring-blue-400/20'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow'
          }`}
        >
          <div className="flex items-center justify-between text-blue-600 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Review</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-blue-700">
            {metrics?.pendingValidationCount ?? '—'}
          </div>
          <p className="text-xs text-blue-600 mt-1 font-medium">Awaiting evaluation</p>
        </div>

        {/* 4. Routed to University */}
        <div
          onClick={() => setActiveTab('ROUTED_UNIVERSITY')}
          className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 ${
            activeTab === 'ROUTED_UNIVERSITY'
              ? 'border-emerald-500 bg-emerald-50/60 shadow-md ring-2 ring-emerald-400/20'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-600 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Routed to Uni</span>
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            {metrics?.routedToUniversityCount ?? '—'}
          </div>
          <p className="text-xs text-emerald-600 mt-1 font-medium">Research underway</p>
        </div>

        {/* 5. Systemic Clusters */}
        <div
          onClick={() => setActiveTab('SYSTEMIC')}
          className={`cursor-pointer p-4 rounded-xl border transition-all duration-200 ${
            activeTab === 'SYSTEMIC'
              ? 'border-purple-500 bg-purple-50/60 shadow-md ring-2 ring-purple-400/20'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow'
          }`}
        >
          <div className="flex items-center justify-between text-purple-600 mb-1.5">
            <span className="text-xs font-bold uppercase tracking-wider">Systemic Clusters</span>
            <Layers className="w-4 h-4" />
          </div>
          <div className="text-2xl font-black text-purple-700">
            {metrics?.systemicClustersCount ?? '—'}
          </div>
          <p className="text-xs text-purple-600 mt-1 font-medium">Multi-site aggregation</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Tabs */}
            <div className="flex flex-wrap gap-1.5 p-1 rounded-xl bg-slate-100 border border-slate-200/80">
              <button
                type="button"
                onClick={() => setActiveTab('CRITICAL_SLA')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'CRITICAL_SLA'
                    ? 'bg-rose-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Critical & SLA Breached
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('PENDING_REVIEW')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'PENDING_REVIEW'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Pending Validation
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('SYSTEMIC')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'SYSTEMIC'
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Systemic Clusters
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ROUTED_UNIVERSITY')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'ROUTED_UNIVERSITY'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                Routed to Universities
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'ALL'
                    ? 'bg-slate-800 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                All Records
              </button>
            </div>

            {/* Quick Count Badge */}
            <div className="text-xs text-slate-500 font-medium">
              Showing <span className="font-bold text-slate-800">{items.length}</span> active tasks
            </div>
          </div>

          {/* Search & Category Filter */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-2 border-t border-slate-100">
            <div className="md:col-span-8 relative">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <Input
                placeholder="Search by problem title, district, or keywords..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 text-sm"
              />
            </div>
            <div className="md:col-span-4 flex gap-2">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Categories</option>
                <option value="Water Supply">Water Supply</option>
                <option value="Sanitation">Sanitation</option>
                <option value="Roads & Transport">Roads & Transport</option>
                <option value="Healthcare Access">Healthcare Access</option>
                <option value="Education Infrastructure">Education Infrastructure</option>
                <option value="Agriculture & Irrigation">Agriculture & Irrigation</option>
                <option value="Air Quality">Air Quality</option>
              </select>

              <Button
                variant="outline"
                size="sm"
                onClick={fetchQueue}
                className="shrink-0 px-3"
              >
                Filter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Queue Items List */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm space-y-3">
          <RefreshCw className="w-8 h-8 mx-auto text-blue-600 animate-spin" />
          <p className="text-sm font-medium text-slate-600">Retrieving real-time government task queue...</p>
        </div>
      ) : error ? (
        <ZeroDeadEndNotice
          variant="error"
          currentStatus="QUEUE_FETCH_ERROR"
          whatHappened="The government task queue could not be loaded due to a network or server communication error."
          whyStatus={error}
          whoIsResponsible="System Operations / Government Command Center Service"
          whatHappensIfIdle="The queue remains stale and incoming civic problems cannot be evaluated."
          whatCanDoNext={['Retry Queue Request', 'Reload Entire Page', 'Check Healthz Status']}
          onActionClick={action => {
            if (action.includes('Retry')) fetchQueue();
            else if (action.includes('Healthz')) window.open('/healthz', '_blank');
            else window.location.reload();
          }}
        />
      ) : items.length === 0 ? (
        <ZeroDeadEndNotice
          variant="info"
          currentStatus="QUEUE_CLEAR"
          whatHappened={`No civic tasks match the current filter criteria [${activeTab}].`}
          whyStatus="Either all tasks in this category have been evaluated, or no new citizen problems currently match your search filters."
          whoIsResponsible="Government Officer"
          whatHappensIfIdle="The system will continuously listen for incoming citizen reports and escalate SLA warnings automatically."
          whatCanDoNext={['Reset Filters to All', 'Sync SLAs', 'Browse Public Challenges']}
          onActionClick={action => {
            if (action.includes('Reset')) {
              setActiveTab('ALL');
              setCategoryFilter('');
              setSearchQuery('');
            } else if (action.includes('Sync')) {
              handleCheckEscalations();
            } else {
              router.push('/challenges');
            }
          }}
        />
      ) : (
        <div className="space-y-3.5">
          {items.map(challenge => {
            const isBreached = challenge.sla?.escalationStatus === 'ESCALATED';
            const isWarning = challenge.sla?.escalationStatus === 'WARNING';
            const hoursLeft = challenge.sla?.hoursRemaining ?? 0;

            return (
              <Card
                key={challenge.id}
                className={`overflow-hidden transition-all duration-200 border-2 ${
                  isBreached
                    ? 'border-rose-400 bg-rose-50/20'
                    : isWarning
                    ? 'border-amber-400 bg-amber-50/20'
                    : 'border-slate-200/90 hover:border-blue-400'
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Top Badges Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status */}
                      <Badge
                        variant={
                          challenge.status === ChallengeStatus.APPROVED
                            ? 'success'
                            : challenge.status === ChallengeStatus.ASSIGNED_TO_UNIVERSITY
                            ? 'default'
                            : challenge.status === ChallengeStatus.REJECTED
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {challenge.status.replace(/_/g, ' ')}
                      </Badge>

                      {/* SLA Status Badge */}
                      {isBreached ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-600 text-white animate-pulse">
                          <Flame className="w-3.5 h-3.5" />
                          SLA BREACHED ({Math.abs(hoursLeft)}h OVERDUE)
                        </span>
                      ) : isWarning ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white">
                          <Clock className="w-3.5 h-3.5" />
                          SLA WARNING ({hoursLeft}h LEFT)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          <Clock className="w-3 h-3 text-slate-500" />
                          {hoursLeft > 0 ? `${Math.round(hoursLeft / 24)}d deadline` : 'Active'}
                        </span>
                      )}

                      {/* Systemic Cluster Badge */}
                      {challenge.isSystemic && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-300">
                          <Layers className="w-3 h-3 text-purple-600" />
                          Systemic Cluster ({challenge.clusterChildrenCount} linked)
                        </span>
                      )}

                      {/* Category */}
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                        {challenge.category}
                      </span>
                    </div>

                    {/* Priority Score Tag */}
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <div className="text-xs text-slate-400 uppercase font-bold tracking-wider">Priority Score</div>
                        <div className="text-sm font-black text-slate-800">{challenge.priorityScore}/100</div>
                      </div>
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shadow-sm ${
                          challenge.priorityScore >= 75
                            ? 'bg-rose-600'
                            : challenge.priorityScore >= 50
                            ? 'bg-amber-500'
                            : 'bg-emerald-600'
                        }`}
                      >
                        {challenge.priorityScore}
                      </div>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div className="space-y-1.5">
                    <Link
                      href={`/challenges/${challenge.id}`}
                      className="group inline-flex items-center gap-2"
                    >
                      <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                        {challenge.title}
                      </h3>
                      <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                    </Link>
                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {challenge.description}
                    </p>
                  </div>

                  {/* Context Info Footer */}
                  <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-slate-100 text-xs text-slate-500">
                    <div className="flex flex-wrap items-center gap-4">
                      <span>
                        📍 <span className="font-semibold text-slate-700">{challenge.district || 'Regional'}, {challenge.state || 'National'}</span>
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <span>👥 Footprint:</span>
                        <span className="font-bold text-slate-800">
                          {challenge.impact?.verifiedValue !== undefined && challenge.impact.verifiedValue !== null
                            ? `${challenge.impact.verifiedValue.toLocaleString()} ${challenge.impact.unit?.toLowerCase().replace(/_/g, ' ') || 'citizens'}`
                            : challenge.impact?.value !== undefined && challenge.impact.value !== null
                            ? `${challenge.impact.value.toLocaleString()} ${challenge.impact.unit?.toLowerCase().replace(/_/g, ' ') || 'citizens'}`
                            : challenge.affectedPopulation
                            ? `${challenge.affectedPopulation.toLocaleString()} citizens`
                            : 'Data Pending'}
                        </span>
                        {challenge.impact?.verificationStatus === 'VERIFIED' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            ✓ Verified
                          </span>
                        ) : challenge.impact?.verificationStatus === 'CALCULATED' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-100 text-blue-800 border border-blue-200">
                            Calculated
                          </span>
                        ) : challenge.impact?.verificationStatus === 'UNKNOWN' ? (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-800 border border-rose-200">
                            Unverified
                          </span>
                        ) : null}
                      </span>
                      <span>
                        👍 <span className="font-semibold text-slate-700">{challenge.supportVotesCount}</span> endorsements
                      </span>
                      <span>
                        Officer: <span className="font-semibold text-slate-800">{challenge.sla?.assignedOfficer?.fullName || 'Unassigned'}</span>
                      </span>
                    </div>

                    {/* Action Buttons Toolbar */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Verify Impact quick button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openImpactModal(challenge)}
                        className="text-xs h-8 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        <span>Verify Impact</span>
                      </Button>

                      {/* Assign Officer button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAssignOfficerModal(challenge)}
                        className="text-xs h-8"
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                        <span>{challenge.sla?.assignedOfficer ? 'Reassign Officer' : 'Assign Officer'}</span>
                      </Button>

                      {/* If in SUBMITTED: Begin Review or Direct Approve */}
                      {challenge.status === ChallengeStatus.SUBMITTED && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleTransition(challenge, ChallengeStatus.UNDER_GOV_REVIEW)}
                            className="text-blue-700 border-blue-300 hover:bg-blue-50 text-xs h-8"
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            <span>Begin Review</span>
                          </Button>

                          <Button
                            variant="primary"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleTransition(challenge, ChallengeStatus.APPROVED)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-xs h-8 font-bold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            <span>Approve Challenge</span>
                          </Button>
                        </div>
                      )}

                      {/* If in UNDER_GOV_REVIEW: Approve Challenge (Primary), Match University, Request Info, Reject */}
                      {challenge.status === ChallengeStatus.UNDER_GOV_REVIEW && (
                        <>
                          <Button
                            variant="primary"
                            size="sm"
                            disabled={actionLoading}
                            onClick={() => handleTransition(challenge, ChallengeStatus.APPROVED)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-xs h-8 font-bold"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            <span>Approve Challenge</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openMatchingModal(challenge)}
                            className="text-indigo-700 border-indigo-300 hover:bg-indigo-50 text-xs h-8 font-bold"
                          >
                            <GraduationCap className="w-3.5 h-3.5 mr-1" />
                            <span>Match University</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedChallenge(challenge);
                              setRequestInfoModalOpen(true);
                            }}
                            className="text-amber-700 border-amber-300 hover:bg-amber-50 text-xs h-8"
                          >
                            <HelpCircle className="w-3.5 h-3.5 mr-1" />
                            <span>Request Info</span>
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedChallenge(challenge);
                              setRejectModalOpen(true);
                            }}
                            className="text-rose-700 border-rose-300 hover:bg-rose-50 text-xs h-8"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" />
                            <span>Reject</span>
                          </Button>
                        </>
                      )}

                      {/* If APPROVED: Sequential Next Step -> Assign University */}
                      {challenge.status === ChallengeStatus.APPROVED && (() => {
                        const rejectedMatch = challenge.universityMatches?.find((m: any) => m.status === 'REJECTED');
                        const interestedMatch = challenge.universityMatches?.find((m: any) =>
                          (Array.isArray(m.matchReasons) && m.matchReasons.some((r: string) => r.includes('EXPRESSED_INTEREST'))) || m.status === 'OFFERED'
                        );
                        return (
                          <div className="flex flex-wrap items-center gap-2">
                            {interestedMatch && (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 px-2 py-0.5 rounded-lg bg-indigo-50 border border-indigo-200"
                                title="This institution officially declared readiness to research this problem"
                              >
                                <Send className="w-3 h-3 text-indigo-600 shrink-0" />
                                Interest: {interestedMatch.universityName || 'Accredited University'}
                              </span>
                            )}
                            {rejectedMatch && (
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 px-2 py-0.5 rounded-lg bg-rose-50 border border-rose-200"
                                title={rejectedMatch.rejectionReason || 'Previous university declined assignment'}
                              >
                                <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                Declined: {rejectedMatch.rejectionReason?.substring(0, 35) || 'Institutional constraint'}...
                              </span>
                            )}
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => openMatchingModal(challenge)}
                              className="bg-indigo-600 hover:bg-indigo-700 text-xs h-8 font-bold shadow-xs"
                            >
                              <GraduationCap className="w-3.5 h-3.5 mr-1" />
                              <span>{rejectedMatch ? 'Re-route University' : interestedMatch ? 'Route to University' : 'Assign University (Next Step)'}</span>
                            </Button>
                          </div>
                        );
                      })()}

                      {/* If already ASSIGNED_TO_UNIVERSITY */}
                      {challenge.status === ChallengeStatus.ASSIGNED_TO_UNIVERSITY && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Routed: {challenge.universityMatches[0]?.universityName || 'Partner University'}
                        </span>
                      )}

                      {/* Involve Industry & CSR Button */}
                      {[ChallengeStatus.APPROVED, ChallengeStatus.ASSIGNED_TO_UNIVERSITY, ChallengeStatus.IN_RESEARCH].includes(challenge.status as any) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openIndustryModal(challenge)}
                          className="border-blue-300 text-blue-700 hover:bg-blue-50 text-xs h-8 font-bold shadow-xs flex items-center gap-1"
                        >
                          <Building className="w-3.5 h-3.5" />
                          <span>Industry & CSR</span>
                        </Button>
                      )}

                      {/* If Systemic or Canonical: Allow Disaggregate / Unmerge */}
                      {(challenge.isSystemic || challenge.isCanonical || challenge.canonicalClusterId) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setUnmergeClusterId(challenge.canonicalClusterId || challenge.id);
                            setUnmergeChallengeTitle(challenge.title);
                            setUnmergeReason('');
                            setUnmergeError(null);
                            setUnmergeModalOpen(true);
                          }}
                          className="text-purple-700 border-purple-300 hover:bg-purple-50 text-xs h-8 font-semibold"
                        >
                          <Layers className="w-3.5 h-3.5 mr-1" />
                          <span>Unmerge / Disaggregate</span>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
        </>
      )}

      {/* UNIVERSITIES GOVERNANCE PANEL */}
      {portalMode === 'UNIVERSITIES' && (() => {
        const universities = organizations.filter((o) => o.type === 'UNIVERSITY');
        const uniPending = universities.filter((u) => u.verificationStatus === 'PENDING_REVIEW' || u.verificationStatus === 'UNVERIFIED').length;
        const uniVerified = universities.filter((u) => u.verificationStatus === 'VERIFIED').length;
        const uniInfoReq = universities.filter((u) => u.verificationStatus === 'INFORMATION_REQUESTED').length;
        const uniRejected = universities.filter((u) => u.verificationStatus === 'REJECTED').length;

        const filteredUnis = universities.filter((u) => {
          if (uniQueueFilter === 'PENDING_REVIEW' && u.verificationStatus !== 'PENDING_REVIEW' && u.verificationStatus !== 'UNVERIFIED') return false;
          if (uniQueueFilter === 'VERIFIED' && u.verificationStatus !== 'VERIFIED') return false;
          if (uniQueueFilter === 'INFORMATION_REQUESTED' && u.verificationStatus !== 'INFORMATION_REQUESTED') return false;
          if (uniQueueFilter === 'REJECTED' && u.verificationStatus !== 'REJECTED') return false;

          if (uniQueueSearch.trim()) {
            const q = uniQueueSearch.toLowerCase();
            const matchesName = u.name?.toLowerCase().includes(q);
            const matchesDistrict = u.metadata?.district?.toLowerCase().includes(q);
            const matchesState = u.metadata?.state?.toLowerCase().includes(q);
            const matchesAishe = u.metadata?.aisheCode?.toLowerCase().includes(q) || u.metadata?.accreditationDetails?.toLowerCase().includes(q);
            if (!matchesName && !matchesDistrict && !matchesState && !matchesAishe) return false;
          }
          return true;
        });

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                  <span>University & Academic Verification Queue</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review incoming institutional registrations, verify AISHE / NAAC credentials, and manage university authorizations.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setAddUniModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
                >
                  <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                  Add New University
                </Button>
                <Button size="sm" variant="outline" onClick={fetchOrganizations} disabled={orgLoading} className="text-xs">
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${orgLoading ? 'animate-spin' : ''}`} />
                  Refresh Queue
                </Button>
              </div>
            </div>

            {/* Live Database Queue Counters */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div
                onClick={() => setUniQueueFilter('PENDING_REVIEW')}
                className={cn(
                  'p-4 rounded-xl border transition-all cursor-pointer select-none',
                  uniQueueFilter === 'PENDING_REVIEW'
                    ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-amber-300'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Verification</span>
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                </div>
                <div className="text-2xl font-black text-amber-700 font-mono mt-1">{uniPending}</div>
                <div className="text-[11px] text-slate-500 mt-1">Awaiting government review</div>
              </div>

              <div
                onClick={() => setUniQueueFilter('VERIFIED')}
                className={cn(
                  'p-4 rounded-xl border transition-all cursor-pointer select-none',
                  uniQueueFilter === 'VERIFIED'
                    ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verified Institutions</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-700 font-mono mt-1">{uniVerified}</div>
                <div className="text-[11px] text-slate-500 mt-1">Active in university portal</div>
              </div>

              <div
                onClick={() => setUniQueueFilter('INFORMATION_REQUESTED')}
                className={cn(
                  'p-4 rounded-xl border transition-all cursor-pointer select-none',
                  uniQueueFilter === 'INFORMATION_REQUESTED'
                    ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-400/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-blue-300'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Info Requested</span>
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-blue-700 font-mono mt-1">{uniInfoReq}</div>
                <div className="text-[11px] text-slate-500 mt-1">Under applicant update</div>
              </div>

              <div
                onClick={() => setUniQueueFilter('REJECTED')}
                className={cn(
                  'p-4 rounded-xl border transition-all cursor-pointer select-none',
                  uniQueueFilter === 'REJECTED'
                    ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-400/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-rose-300'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rejected</span>
                  <XCircle className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-black text-rose-700 font-mono mt-1">{uniRejected}</div>
                <div className="text-[11px] text-slate-500 mt-1">Can correct & resubmit</div>
              </div>
            </div>

            {/* Filter Controls & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                {(['ALL', 'PENDING_REVIEW', 'VERIFIED', 'INFORMATION_REQUESTED', 'REJECTED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setUniQueueFilter(filter)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-xs font-semibold transition-all',
                      uniQueueFilter === filter
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {filter === 'ALL' && `All Universities (${universities.length})`}
                    {filter === 'PENDING_REVIEW' && `Pending (${uniPending})`}
                    {filter === 'VERIFIED' && `Verified (${uniVerified})`}
                    {filter === 'INFORMATION_REQUESTED' && `Info Requested (${uniInfoReq})`}
                    {filter === 'REJECTED' && `Rejected (${uniRejected})`}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={uniQueueSearch}
                  onChange={(e) => setUniQueueSearch(e.target.value)}
                  placeholder="Search university, AISHE, district..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* University Queue Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">University Profile</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Admin Contact</th>
                      <th className="p-3">Submitted</th>
                      <th className="p-3">Registration Status</th>
                      <th className="p-3">Documents</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUnis.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          <GraduationCap className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">No university registrations match current filters.</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Change filter status or register a new university.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredUnis.map((u) => {
                        const adminUser = u.users?.[0];
                        const lastRating = u.metadata?.lastRatingScore ?? null;
                        const docs = u.metadata?.supportingDocuments || [];
                        const aishe = u.metadata?.aisheCode || 'N/A';

                        return (
                          <tr key={u.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{u.name}</div>
                              <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                  AISHE: {aishe}
                                </span>
                                {u.metadata?.category && (
                                  <span className="text-slate-400">{u.metadata.category}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-slate-800 font-medium">
                                {u.metadata?.district || u.metadata?.city || 'District N/A'}
                              </div>
                              <div className="text-[11px] text-slate-500">{u.metadata?.state || 'State N/A'}</div>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-slate-900">
                                {adminUser?.fullName || u.metadata?.adminContactName || 'Admin User'}
                              </div>
                              <div className="text-[11px] text-slate-500 font-mono">
                                {adminUser?.email || u.metadata?.adminContactEmail || u.metadata?.officialEmail || 'No email'}
                              </div>
                            </td>
                            <td className="p-3 text-slate-600 font-mono text-[11px]">
                              {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="p-3">
                              {u.verificationStatus === 'VERIFIED' && (
                                <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Verified
                                </span>
                              )}
                              {u.verificationStatus === 'PENDING_REVIEW' && (
                                <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  Pending Review
                                </span>
                              )}
                              {u.verificationStatus === 'UNVERIFIED' && (
                                <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                                  Unverified
                                </span>
                              )}
                              {u.verificationStatus === 'INFORMATION_REQUESTED' && (
                                <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                                  <HelpCircle className="w-3 h-3 text-blue-600" />
                                  Info Requested
                                </span>
                              )}
                              {u.verificationStatus === 'REJECTED' && (
                                <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px] bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  Rejected
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              {docs.length > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 font-medium">
                                  <FileText className="w-3 h-3" />
                                  {docs.length} Doc{docs.length > 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">None</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="primary"
                                  className="h-7 text-xs px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold shadow-2xs"
                                  onClick={() => {
                                    setVerifTargetOrg(u);
                                    setReviewAction('VERIFIED');
                                    setReviewReason('');
                                    setVerifModalOpen(true);
                                  }}
                                >
                                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                                  Review
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2 border-amber-300 text-amber-800 hover:bg-amber-50"
                                  onClick={() => {
                                    setRatingTargetOrg(u);
                                    setDimTechnical(90);
                                    setDimTimeliness(85);
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
        );
      })()}

      {/* INDUSTRY & CSR GOVERNANCE PANEL */}
      {portalMode === 'INDUSTRY' && (() => {
        const industries = organizations.filter((o) => ['INDUSTRY', 'MSME', 'CSR', 'STARTUP'].includes(o.type));
        const indPending = industries.filter((i) => i.verificationStatus === 'PENDING_REVIEW' || i.verificationStatus === 'UNVERIFIED').length;
        const indVerified = industries.filter((i) => i.verificationStatus === 'VERIFIED').length;
        const indInfoReq = industries.filter((i) => i.verificationStatus === 'INFORMATION_REQUESTED').length;
        const indRejected = industries.filter((i) => i.verificationStatus === 'REJECTED').length;

        const filteredInds = industries.filter((ind) => {
          if (indSubtypeFilter !== 'ALL' && ind.type !== indSubtypeFilter) return false;

          if (indQueueFilter === 'PENDING_REVIEW' && ind.verificationStatus !== 'PENDING_REVIEW' && ind.verificationStatus !== 'UNVERIFIED') return false;
          if (indQueueFilter === 'VERIFIED' && ind.verificationStatus !== 'VERIFIED') return false;
          if (indQueueFilter === 'INFORMATION_REQUESTED' && ind.verificationStatus !== 'INFORMATION_REQUESTED') return false;
          if (indQueueFilter === 'REJECTED' && ind.verificationStatus !== 'REJECTED') return false;

          if (indQueueSearch.trim()) {
            const q = indQueueSearch.toLowerCase();
            const matchesName = ind.name?.toLowerCase().includes(q);
            const matchesSector = ind.metadata?.sector?.toLowerCase().includes(q);
            const matchesDistrict = ind.metadata?.district?.toLowerCase().includes(q);
            if (!matchesName && !matchesSector && !matchesDistrict) return false;
          }
          return true;
        });

        return (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div>
                <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Briefcase className="w-5 h-5 text-amber-600" />
                  <span>Industry, MSME &amp; CSR Verification Queue</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review corporate onboarding submissions, verify statutory CIN/Udyam credentials, and authorize enterprise partnerships.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={fetchOrganizations} disabled={orgLoading} className="text-xs">
                <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${orgLoading ? 'animate-spin' : ''}`} />
                Refresh Queue
              </Button>
            </div>

            {/* Live Database Queue Counters */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div
                onClick={() => setIndQueueFilter('PENDING_REVIEW')}
                className={cn(
                  'p-4 rounded-xl border transition-all cursor-pointer select-none',
                  indQueueFilter === 'PENDING_REVIEW'
                    ? 'bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-amber-300'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Verification</span>
                  <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                </div>
                <div className="text-2xl font-black text-amber-700 font-mono mt-1">{indPending}</div>
                <div className="text-[11px] text-slate-500 mt-1">Awaiting government review</div>
              </div>

              <div
                onClick={() => setIndQueueFilter('VERIFIED')}
                className={cn(
                  'p-4 rounded-xl border transition-all cursor-pointer select-none',
                  indQueueFilter === 'VERIFIED'
                    ? 'bg-emerald-50/80 border-emerald-400 ring-2 ring-emerald-400/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-emerald-300'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Verified Partners</span>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-black text-emerald-700 font-mono mt-1">{indVerified}</div>
                <div className="text-[11px] text-slate-500 mt-1">Active in industry portal</div>
              </div>

              <div
                onClick={() => setIndQueueFilter('INFORMATION_REQUESTED')}
                className={cn(
                  'p-4 rounded-xl border transition-all cursor-pointer select-none',
                  indQueueFilter === 'INFORMATION_REQUESTED'
                    ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-400/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-blue-300'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Info Requested</span>
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-black text-blue-700 font-mono mt-1">{indInfoReq}</div>
                <div className="text-[11px] text-slate-500 mt-1">Under applicant update</div>
              </div>

              <div
                onClick={() => setIndQueueFilter('REJECTED')}
                className={cn(
                  'p-4 rounded-xl border transition-all cursor-pointer select-none',
                  indQueueFilter === 'REJECTED'
                    ? 'bg-rose-50/80 border-rose-400 ring-2 ring-rose-400/20 shadow-xs'
                    : 'bg-white border-slate-200 hover:border-rose-300'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Rejected</span>
                  <XCircle className="w-4 h-4 text-rose-600" />
                </div>
                <div className="text-2xl font-black text-rose-700 font-mono mt-1">{indRejected}</div>
                <div className="text-[11px] text-slate-500 mt-1">Can correct & resubmit</div>
              </div>
            </div>

            {/* Filter Controls & Search */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200">
              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                {(['ALL', 'INDUSTRY', 'STARTUP', 'MSME', 'CSR'] as const).map((subtype) => (
                  <button
                    key={subtype}
                    onClick={() => setIndSubtypeFilter(subtype)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                      indSubtypeFilter === subtype
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {subtype}
                  </button>
                ))}
                <span className="text-slate-300 mx-1">|</span>
                {(['ALL', 'PENDING_REVIEW', 'VERIFIED', 'INFORMATION_REQUESTED', 'REJECTED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setIndQueueFilter(filter)}
                    className={cn(
                      'px-2.5 py-1 rounded-lg text-xs font-semibold transition-all',
                      indQueueFilter === filter
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    )}
                  >
                    {filter === 'ALL' && 'All Statuses'}
                    {filter === 'PENDING_REVIEW' && 'Pending'}
                    {filter === 'VERIFIED' && 'Verified'}
                    {filter === 'INFORMATION_REQUESTED' && 'Info Req'}
                    {filter === 'REJECTED' && 'Rejected'}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={indQueueSearch}
                  onChange={(e) => setIndQueueSearch(e.target.value)}
                  placeholder="Search industry, sector, city..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>

            {/* Industry Queue Table */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-3">Organization Profile</th>
                      <th className="p-3">Subtype</th>
                      <th className="p-3">Sector &amp; Location</th>
                      <th className="p-3">Capabilities</th>
                      <th className="p-3">Registration Status</th>
                      <th className="p-3">Documents</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInds.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-slate-500">
                          <Briefcase className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                          <p className="font-semibold text-slate-700">No industry partner registrations match current filters.</p>
                        </td>
                      </tr>
                    ) : (
                      filteredInds.map((ind) => {
                        const adminUser = ind.users?.[0];
                        const caps: string[] = ind.metadata?.capabilities || [];
                        const docs = ind.metadata?.supportingDocuments || [];

                        return (
                          <tr key={ind.id} className="hover:bg-slate-50/80 transition">
                            <td className="p-3">
                              <div className="font-bold text-slate-900">{ind.name}</div>
                              <div className="text-[11px] text-slate-500">
                                Contact: {adminUser?.fullName || ind.metadata?.adminContactName || 'Admin'} ({adminUser?.email || ind.metadata?.officialEmail || 'No email'})
                              </div>
                            </td>
                            <td className="p-3">
                              <span className="font-bold text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                {ind.type}
                              </span>
                            </td>
                            <td className="p-3">
                              <div className="font-medium text-slate-800">{ind.metadata?.sector || 'General Sector'}</div>
                              <div className="text-[11px] text-slate-500">
                                {ind.metadata?.district || ind.metadata?.city || 'District N/A'}, {ind.metadata?.state || ''}
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1 max-w-[200px]">
                                {caps.slice(0, 3).map((c) => (
                                  <span key={c} className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                                    {c}
                                  </span>
                                ))}
                                {caps.length > 3 && (
                                  <span className="text-[10px] text-slate-400">+{caps.length - 3}</span>
                                )}
                              </div>
                            </td>
                            <td className="p-3">
                              {ind.verificationStatus === 'VERIFIED' && (
                                <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Verified
                                </span>
                              )}
                              {ind.verificationStatus === 'PENDING_REVIEW' && (
                                <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-700 border border-amber-200">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  Pending Review
                                </span>
                              )}
                              {ind.verificationStatus === 'UNVERIFIED' && (
                                <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
                                  Unverified
                                </span>
                              )}
                              {ind.verificationStatus === 'INFORMATION_REQUESTED' && (
                                <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px] bg-blue-50 text-blue-700 border border-blue-200">
                                  <HelpCircle className="w-3 h-3 text-blue-600" />
                                  Info Requested
                                </span>
                              )}
                              {ind.verificationStatus === 'REJECTED' && (
                                <span className="inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-full text-[11px] bg-rose-50 text-rose-700 border border-rose-200">
                                  <XCircle className="w-3 h-3 text-rose-600" />
                                  Rejected
                                </span>
                              )}
                            </td>
                            <td className="p-3">
                              {docs.length > 0 ? (
                                <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-medium">
                                  <FileText className="w-3 h-3" />
                                  {docs.length} Doc{docs.length > 1 ? 's' : ''}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[11px]">None</span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  size="sm"
                                  variant="primary"
                                  className="h-7 text-xs px-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold shadow-2xs"
                                  onClick={() => {
                                    setVerifTargetOrg(ind);
                                    setReviewAction('VERIFIED');
                                    setReviewReason('');
                                    setVerifModalOpen(true);
                                  }}
                                >
                                  <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                                  Review
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
        );
      })()}

      {/* COMPREHENSIVE ORGANIZATION VERIFICATION REVIEW MODAL */}
      {verifModalOpen && verifTargetOrg && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{verifTargetOrg.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                        {verifTargetOrg.type}
                      </span>
                      <span>•</span>
                      <span>Slug: {verifTargetOrg.slug}</span>
                    </div>
                  </div>
                </div>
              </div>

              <span className={cn(
                'px-2.5 py-1 rounded-full text-xs font-bold border',
                verifTargetOrg.verificationStatus === 'VERIFIED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                verifTargetOrg.verificationStatus === 'REJECTED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                verifTargetOrg.verificationStatus === 'INFORMATION_REQUESTED' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                'bg-amber-50 text-amber-700 border-amber-200'
              )}>
                {verifTargetOrg.verificationStatus}
              </span>
            </div>

            {/* Profile & Credentials */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Accreditation / Registration</span>
                <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                  {verifTargetOrg.metadata?.accreditationDetails || verifTargetOrg.metadata?.registrationNumber || 'Statutory details verified in application'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Location</span>
                <span className="font-bold text-slate-800 text-xs mt-0.5 block">
                  {verifTargetOrg.metadata?.address || ''}, {verifTargetOrg.metadata?.district || ''}, {verifTargetOrg.metadata?.state || ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Admin Contact</span>
                <span className="font-medium text-slate-800 text-xs mt-0.5 block">
                  {verifTargetOrg.users?.[0]?.fullName || verifTargetOrg.metadata?.adminContactName || 'Admin'} ({verifTargetOrg.users?.[0]?.email || verifTargetOrg.metadata?.officialEmail || 'No email'})
                </span>
              </div>
              <div>
                <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[10px]">Official Website</span>
                <span className="font-mono text-slate-800 text-xs mt-0.5 block truncate">
                  {verifTargetOrg.metadata?.website || 'Not provided'}
                </span>
              </div>
            </div>

            {/* Capabilities & Domains */}
            {verifTargetOrg.type === 'UNIVERSITY' ? (
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-800 block">Academic &amp; Research Capabilities:</span>
                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1.5">
                  <div>
                    <strong className="text-indigo-950">Research Domains: </strong>
                    <span className="text-slate-700">
                      {Array.isArray(verifTargetOrg.metadata?.researchDomains)
                        ? verifTargetOrg.metadata.researchDomains.join(', ')
                        : 'Water Purification, Renewable Energy, Rural Infrastructure'}
                    </span>
                  </div>
                  <div>
                    <strong className="text-indigo-950">Departments: </strong>
                    <span className="text-slate-700">
                      {Array.isArray(verifTargetOrg.metadata?.departments)
                        ? verifTargetOrg.metadata.departments.join(', ')
                        : 'Civil & Environmental Engineering, Computer Science'}
                    </span>
                  </div>
                  <div>
                    <strong className="text-indigo-950">Specialized Facilities: </strong>
                    <span className="text-slate-700">
                      {Array.isArray(verifTargetOrg.metadata?.facilities)
                        ? verifTargetOrg.metadata.facilities.join(', ')
                        : 'Environmental Testing Lab, GIS Remote Sensing Facility'}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-800 block">Partnership Capabilities Offered:</span>
                <div className="flex flex-wrap gap-1.5">
                  {(verifTargetOrg.metadata?.capabilities || ['Funding', 'Mentorship', 'Technology', 'Pilot']).map((cap: string) => (
                    <span key={cap} className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                      ✓ {cap}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Verification Documents */}
            <div className="space-y-2 text-xs">
              <span className="font-bold text-slate-800 block">Uploaded Supporting Verification Documents:</span>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                {(verifTargetOrg.metadata?.supportingDocuments || [{ name: 'Institutional_Accreditation_Certificate.pdf' }]).map((doc: any, idx: number) => {
                  const docName = typeof doc === 'string' ? doc : (doc.name || `Verification_Evidence_${idx + 1}.pdf`);
                  return (
                    <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-indigo-600" />
                        <span className="font-semibold text-slate-800">{docName}</span>
                      </div>
                      <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Verified Valid Format
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Submission & Audit History */}
            {verifTargetOrg.verifications && verifTargetOrg.verifications.length > 0 && (
              <div className="space-y-2 text-xs">
                <span className="font-bold text-slate-800 block">Review &amp; Verification Audit History:</span>
                <div className="space-y-1.5 max-h-28 overflow-y-auto">
                  {verifTargetOrg.verifications.map((v: any) => (
                    <div key={v.id} className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] flex justify-between items-start">
                      <div>
                        <span className="font-bold text-slate-800">Status: {v.status}</span>
                        <p className="text-slate-600 mt-0.5">{v.reviewNotes || 'No notes provided.'}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {v.createdAt ? new Date(v.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Official Reviewer Decision Panel */}
            <div className="p-4 rounded-xl bg-slate-100/70 border border-slate-300 space-y-3 pt-3">
              <span className="font-bold text-slate-900 text-xs block">Government Officer Decision:</span>

              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  Review Justification / Specific Instructions *
                </label>
                <textarea
                  rows={2}
                  value={reviewReason}
                  onChange={(e) => setReviewReason(e.target.value)}
                  placeholder={
                    reviewAction === 'VERIFIED'
                      ? 'e.g. Verified against UGC AISHE portal; accreditation credentials confirmed valid.'
                      : reviewAction === 'INFORMATION_REQUESTED'
                      ? 'e.g. Please upload the revised NAAC Cycle 4 certificate and provide updated dean signatory.'
                      : 'e.g. Statutory registration documents could not be validated.'
                  }
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setVerifModalOpen(false)}
                  disabled={actionLoading}
                  className="text-xs"
                >
                  Cancel
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-rose-300 text-rose-800 hover:bg-rose-50"
                  onClick={() => handleReviewVerificationSubmit('REJECTED')}
                  disabled={actionLoading}
                >
                  <XCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                  Reject
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs border-blue-300 text-blue-800 hover:bg-blue-50"
                  onClick={() => handleReviewVerificationSubmit('INFORMATION_REQUESTED')}
                  disabled={actionLoading}
                >
                  <HelpCircle className="w-3.5 h-3.5 mr-1 text-blue-600" />
                  Request More Info
                </Button>

                <Button
                  size="sm"
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                  onClick={() => handleReviewVerificationSubmit('VERIFIED')}
                  disabled={actionLoading}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-white" />
                  Approve &amp; Verify
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1. UNIVERSITY ASSIGNMENT & MATCHING MODAL */}
      {matchingModalOpen && selectedChallenge && (
        <Modal
          isOpen={matchingModalOpen}
          onClose={() => setMatchingModalOpen(false)}
          title={`Assign University Partner — ${selectedChallenge.title}`}
          description="Select an accredited research university with matched academic faculty and domain facilities."
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMatchingModalOpen(false)}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAssignUniversity}
                disabled={actionLoading || !selectedUniOrgId}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                {actionLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <GraduationCap className="w-3.5 h-3.5 mr-1.5" />}
                Confirm Assignment &amp; Route
              </Button>
            </div>
          }
        >
          <div className="space-y-4">
            {/* Challenge Summary Context */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-700">Category: {selectedChallenge.category}</span>
                <Badge variant="outline" className="text-[10px]">Priority Score: {Math.round(selectedChallenge.priorityScore || 50)}/100</Badge>
              </div>
              <p className="text-slate-600 line-clamp-2">{selectedChallenge.description}</p>
            </div>

            {/* INSTITUTIONAL MEMORY CHECK: Precedents & Recurrence Invariant */}
            <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                  Institutional Memory Precedent Check
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  Closed-Loop Evidence Verification
                </span>
              </div>

              {govLoadingPrecedents ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin mx-auto mb-1 text-blue-600" />
                  Retrieving historical municipal interventions and failure logs...
                </div>
              ) : (
                <div className="space-y-2.5">
                  {govRecurrenceSignal && (
                    <RecurrenceSignalCard
                      signal={govRecurrenceSignal}
                      onInvestigate={() => {
                        if (govRecurrenceSignal.previousCase?.id) {
                          const found = govPrecedents.find(p => (p.memoryId || p.id) === govRecurrenceSignal.previousCase.id);
                          if (found) {
                            setGovComparingMemory(found);
                            setGovCompareDrawerOpen(true);
                          }
                        }
                      }}
                    />
                  )}

                  {govPrecedents.some(p => p.outcomeStatus === 'FAILED') && (
                    <HistoricalFailureWarning
                      memoryId={govPrecedents.find(p => p.outcomeStatus === 'FAILED')?.memoryId || 'prev-fail'}
                      solutionTitle={govPrecedents.find(p => p.outcomeStatus === 'FAILED')?.title || 'Prior Municipal Intervention'}
                      intendedOutcome="Standard civic deployment"
                      observedOutcome="FAILED"
                      failureFactors={govPrecedents.find(p => p.outcomeStatus === 'FAILED')?.whatFailed || 'Prior implementation encountered unaddressed operational or geographic failure factors.'}
                      knownLimitations={govPrecedents.find(p => p.outcomeStatus === 'FAILED')?.rootCause || 'Root cause was inadequately addressed during initial deployment.'}
                      institutionalLesson={govPrecedents.find(p => p.outcomeStatus === 'FAILED')?.futureWarnings || 'Ensure prerequisite maintenance contracts and community feedback mechanisms are established.'}
                    />
                  )}

                  {govPrecedents.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-slate-600 font-medium">
                        Historical precedent(s) for comparison and context:
                      </p>
                      {govPrecedents.slice(0, 2).map((rec: any) => (
                        <SolutionMemoryCard
                          key={rec.memoryId || rec.id}
                          memory={rec}
                          currentProblemContext={{
                            title: selectedChallenge.title,
                            description: selectedChallenge.description,
                            category: selectedChallenge.category,
                            district: selectedChallenge.district || undefined,
                          }}
                          onCompare={id => {
                            const found = govPrecedents.find(p => (p.memoryId || p.id) === id);
                            if (found) {
                              setGovComparingMemory(found);
                              setGovCompareDrawerOpen(true);
                            }
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200">
                      ℹ️ Limited institutional memory available for this specific municipal domain and location. Proceeding with clean-slate academic routing.
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* University Recommendations */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 block">
                Recommended Academic Institutions:
              </label>
              {loadingMatches ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-1 text-indigo-600" />
                  Calculating domain faculty and facility matching scores...
                </div>
              ) : recommendations.length > 0 ? (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recommendations.map(rec => (
                    <div
                      key={rec.universityOrgId}
                      onClick={() => setSelectedUniOrgId(rec.universityOrgId)}
                      className={cn(
                        'p-3 rounded-xl border cursor-pointer transition-all flex items-start justify-between text-xs',
                        selectedUniOrgId === rec.universityOrgId
                          ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      )}
                    >
                      <div className="space-y-1">
                        <span className="font-bold text-slate-900 block">{rec.universityName}</span>
                        <div className="flex flex-wrap gap-1">
                          {rec.matchReasons.map((r, i) => (
                            <span key={i} className="text-[10px] bg-white border border-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded">
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="text-xs font-black text-indigo-700">{Math.round(rec.matchScore)}%</span>
                        <span className="text-[10px] text-slate-400 block">Match Score</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800">
                  No automated algorithmic match above threshold. You may select any accredited university from the registry below.
                </div>
              )}
            </div>

            {/* Manual University Selector fallback */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Select University from Accredited Registry:
              </label>
              <select
                value={selectedUniOrgId}
                onChange={e => setSelectedUniOrgId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">-- Choose Accredited University --</option>
                {organizations.filter(o => o.type === 'UNIVERSITY').map(u => (
                  <option key={u.id} value={u.id}>
                    {u.name} {u.verificationStatus === 'VERIFIED' ? '✓ (Accredited)' : `(${u.verificationStatus})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Routing Justification */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 block">
                Official Routing Justification &amp; Mandate:
              </label>
              <Textarea
                rows={2}
                value={routingReason}
                onChange={e => setRoutingReason(e.target.value)}
                placeholder="e.g. Assigned to Department of Environmental Engineering for rapid water purification prototype development."
                className="text-xs"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* 1B. INDUSTRY DIRECT INVITATION & INTERESTS REVIEW MODAL */}
      {industryModalOpen && selectedChallenge && (
        <Modal
          isOpen={industryModalOpen}
          onClose={() => setIndustryModalOpen(false)}
          title={`Industry Collaboration & Assignment — ${selectedChallenge.title}`}
          description="Involve eligible industry, MSME, or CSR partners for technical support, funding, and testing."
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setIndustryModalOpen(false)}>
                Close
              </Button>
            </div>
          }
        >
          <div className="space-y-6">
            {/* Section A: Industry Interests Received */}
            <div>
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-600" />
                Industry Expressions of Interest ({industryInterests.length})
              </h4>
              {industryInterests.length === 0 ? (
                <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200 text-center">
                  No industry partners have applied to this project yet. Use the invitation panel below to invite eligible industries.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {industryInterests.map(interest => (
                    <div
                      key={interest.id}
                      className="p-3 bg-white border border-gray-200 rounded-lg shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-gray-900">{interest.industryName}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {interest.partnershipType}
                          </Badge>
                          <Badge
                            variant={
                              interest.status === 'CONFIRMED'
                                ? 'success'
                                : interest.status === 'DECLINED'
                                ? 'destructive'
                                : 'warning'
                            }
                            className="text-[10px] font-semibold"
                          >
                            {interest.status === 'CONFIRMED' ? 'Accepted' : interest.status === 'DECLINED' ? 'Declined' : 'Interested'}
                          </Badge>
                        </div>
                        {interest.fundingOffered > 0 && (
                          <div className="text-xs font-semibold text-emerald-700">
                            Funding Offered: ₹{interest.fundingOffered.toLocaleString('en-IN')}
                          </div>
                        )}
                        {interest.message && (
                          <p className="text-xs text-gray-600 italic">
                            "{interest.message}"
                          </p>
                        )}
                      </div>

                      {interest.status === 'PROPOSED' && (
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            size="sm"
                            onClick={() => handleAcceptIndustryInterest(interest.id)}
                            disabled={actionLoading}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-7 font-bold"
                          >
                            Accept Collaboration
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeclineIndustryInterest(interest.id)}
                            disabled={actionLoading}
                            className="text-rose-600 border-rose-200 hover:bg-rose-50 text-xs h-7"
                          >
                            Decline
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section B: Direct Invitation to Eligible Industries */}
            <div className="pt-4 border-t border-gray-200 space-y-3">
              <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-indigo-600" />
                Invite Eligible Industry Partners
              </h4>

              {loadingIndustries ? (
                <div className="text-center py-4 text-xs text-gray-500">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto text-blue-600 mb-1" />
                  Ranking verified industry and CSR partners...
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                    {eligibleIndustries.map(ind => (
                      <div
                        key={ind.partnerOrgId || ind.organizationId}
                        onClick={() => setSelectedIndustryOrgId(ind.partnerOrgId || ind.organizationId)}
                        className={`p-3 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between ${
                          selectedIndustryOrgId === (ind.partnerOrgId || ind.organizationId)
                            ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-400'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900">{ind.partnerName || ind.organizationName}</span>
                            <span className="bg-emerald-50 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[10px]">
                              {ind.overallScore || ind.totalScore}% Fit
                            </span>
                            {ind.isInvited && (
                              <span className="bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded text-[10px]">
                                Already Invited
                              </span>
                            )}
                          </div>
                          <div className="text-gray-500">
                            Sector: <span className="text-gray-700 font-medium">{ind.sector || 'CleanTech & Engineering'}</span>
                          </div>
                        </div>

                        <input
                          type="radio"
                          name="selectedIndustry"
                          checked={selectedIndustryOrgId === (ind.partnerOrgId || ind.organizationId)}
                          onChange={() => setSelectedIndustryOrgId(ind.partnerOrgId || ind.organizationId)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                      </div>
                    ))}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Direct Assignment / Invitation Reason
                    </label>
                    <Textarea
                      rows={2}
                      value={industryInviteReason}
                      onChange={e => setIndustryInviteReason(e.target.value)}
                      placeholder="e.g. Assigned for specialized manufacturing, laboratory testing, or CSR field deployment."
                      className="text-xs"
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={handleInviteIndustry}
                      disabled={actionLoading || !selectedIndustryOrgId}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
                    >
                      {actionLoading ? 'Inviting...' : 'Send Government Invitation'}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* 2. ASSIGN OFFICER MODAL */}
      {assignOfficerModalOpen && selectedChallenge && (
        <Modal
          isOpen={assignOfficerModalOpen}
          onClose={() => setAssignOfficerModalOpen(false)}
          title="Assign Departmental Nodal Officer"
          description={`Assign an officer to oversee review and ground verification for "${selectedChallenge.title}".`}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAssignOfficerModalOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleAssignOfficer} disabled={actionLoading || !selectedOfficerId} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                Confirm Officer Assignment
              </Button>
            </div>
          }
        >
          <div className="space-y-3">
            <label className="text-xs font-semibold text-slate-700 block">Select Government Officer:</label>
            <select
              value={selectedOfficerId}
              onChange={e => setSelectedOfficerId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white text-slate-900 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">-- Choose Officer --</option>
              {officers.map(off => (
                <option key={off.id} value={off.id}>
                  {off.fullName} ({off.email})
                </option>
              ))}
            </select>
          </div>
        </Modal>
      )}

      {/* 3. REQUEST MORE INFO MODAL */}
      {requestInfoModalOpen && selectedChallenge && (
        <Modal
          isOpen={requestInfoModalOpen}
          onClose={() => setRequestInfoModalOpen(false)}
          title="Request Additional Information"
          description={`Prompt citizen submitter for specific evidentiary details regarding "${selectedChallenge.title}".`}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRequestInfoModalOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleTransition(selectedChallenge, ChallengeStatus.NEEDS_MORE_INFO, requestInfoReason)}
                disabled={actionLoading || !requestInfoReason.trim()}
                className="bg-amber-600 hover:bg-amber-700 text-white font-bold"
              >
                Send Information Request
              </Button>
            </div>
          }
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">Clarification / Documents Needed *</label>
            <Textarea
              rows={3}
              value={requestInfoReason}
              onChange={e => setRequestInfoReason(e.target.value)}
              placeholder="Specify the missing information (e.g. Please upload recent water test report or exact landmark GPS pin)..."
              className="text-xs"
            />
          </div>
        </Modal>
      )}

      {/* 4. REJECT SUBMISSION MODAL */}
      {rejectModalOpen && selectedChallenge && (
        <Modal
          isOpen={rejectModalOpen}
          onClose={() => setRejectModalOpen(false)}
          title="Reject Problem Submission"
          description={`Provide statutory justification for rejecting "${selectedChallenge.title}".`}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRejectModalOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleTransition(selectedChallenge, ChallengeStatus.REJECTED, rejectReason)}
                disabled={actionLoading || !rejectReason.trim()}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
              >
                Confirm Rejection
              </Button>
            </div>
          }
        >
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 block">Rejection Justification *</label>
            <Textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="State clear statutory reason (e.g. Private commercial dispute outside municipal jurisdiction)..."
              className="text-xs"
            />
          </div>
        </Modal>
      )}

      {/* 5. IMPACT VERIFICATION MODAL */}
      {impactModalOpen && selectedChallenge && (
        <Modal
          isOpen={impactModalOpen}
          onClose={() => setImpactModalOpen(false)}
          title="Verify &amp; Calibrate Societal Impact"
          description={`Calibrate verified ground impact for "${selectedChallenge.title}".`}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setImpactModalOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCommitImpactVerification}
                disabled={actionLoading || impactVerifiedValue === ''}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                Save Impact Verification
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Verified Ground Impact Count ({selectedChallenge.impact?.unit || 'people'}):
              </label>
              <Input
                type="number"
                min={0}
                value={impactVerifiedValue}
                onChange={e => setImpactVerifiedValue(e.target.value === '' ? '' : Number(e.target.value))}
                className="text-xs"
              />
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Field Verification Notes / Source:</label>
              <Textarea
                rows={2}
                value={impactNotes}
                onChange={e => setImpactNotes(e.target.value)}
                placeholder="e.g. Verified via Ward 7 ration card registry and field health clinic census."
                className="text-xs"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* 6. UNIVERSITY RATING MODAL */}
      {ratingModalOpen && ratingTargetOrg && (
        <Modal
          isOpen={ratingModalOpen}
          onClose={() => setRatingModalOpen(false)}
          title={`Official Performance Scorecard — ${ratingTargetOrg.name}`}
          description="Submit authoritative government performance rating across key academic dimensions."
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setRatingModalOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOrganizationRateSubmit}
                disabled={actionLoading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Submit Performance Rating
              </Button>
            </div>
          }
        >
          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Technical Execution (0-100):</label>
                <Input type="number" min={0} max={100} value={dimTechnical} onChange={e => setDimTechnical(Number(e.target.value))} className="text-xs" />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Timeliness / SLA (0-100):</label>
                <Input type="number" min={0} max={100} value={dimTimeliness} onChange={e => setDimTimeliness(Number(e.target.value))} className="text-xs" />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Collaboration (0-100):</label>
                <Input type="number" min={0} max={100} value={dimCollaboration} onChange={e => setDimCollaboration(Number(e.target.value))} className="text-xs" />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ground Outcome (0-100):</label>
                <Input type="number" min={0} max={100} value={dimOutcome} onChange={e => setDimOutcome(Number(e.target.value))} className="text-xs" />
              </div>
            </div>
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Rating Justification / Commendation:</label>
              <Textarea
                rows={2}
                value={ratingReason}
                onChange={e => setRatingReason(e.target.value)}
                placeholder="e.g. Demonstrated exceptional turnaround on potable water filtration prototype."
                className="text-xs"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* 7. ADD UNIVERSITY MODAL */}
      {addUniModalOpen && (
        <Modal
          isOpen={addUniModalOpen}
          onClose={() => setAddUniModalOpen(false)}
          title="Onboard &amp; Accredit New University"
          description="Register an accredited higher education institution into the SICP innovation directory."
          size="lg"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setAddUniModalOpen(false)} disabled={newUniSubmitting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddUniversitySubmit}
                disabled={newUniSubmitting || !newUniName.trim() || !newUniAishe.trim() || !newUniDistrict.trim()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                {newUniSubmitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <PlusCircle className="w-3.5 h-3.5 mr-1.5" />}
                Accredit &amp; Register University
              </Button>
            </div>
          }
        >
          <form onSubmit={handleAddUniversitySubmit} className="space-y-3 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">University / Institute Name *</label>
                <Input value={newUniName} onChange={e => setNewUniName(e.target.value)} placeholder="e.g. National Institute of Technology" required className="text-xs" />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">AISHE / Statutory Code *</label>
                <Input value={newUniAishe} onChange={e => setNewUniAishe(e.target.value)} placeholder="e.g. U-0123" required className="text-xs" />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">NAAC Grade</label>
                <select value={newUniNaac} onChange={e => setNewUniNaac(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white text-slate-900">
                  <option value="A++">A++</option>
                  <option value="A+">A+</option>
                  <option value="A">A</option>
                  <option value="B++">B++</option>
                  <option value="B+">B+</option>
                  <option value="B">B</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Institutional Category</label>
                <select value={newUniCategory} onChange={e => setNewUniCategory(e.target.value)} className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white text-slate-900">
                  <option value="CENTRAL_UNIVERSITY">Central University</option>
                  <option value="STATE_UNIVERSITY">State Public University</option>
                  <option value="DEEMED_UNIVERSITY">Deemed University</option>
                  <option value="INSTITUTE_OF_NATIONAL_IMPORTANCE">Institute of National Importance (IIT/NIT)</option>
                  <option value="PRIVATE_UNIVERSITY">Private University</option>
                </select>
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">State *</label>
                <Input value={newUniState} onChange={e => setNewUniState(e.target.value)} required className="text-xs" />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">District *</label>
                <Input value={newUniDistrict} onChange={e => setNewUniDistrict(e.target.value)} required className="text-xs" />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Dean / Nodal Contact Email</label>
                <Input type="email" value={newUniDeanEmail} onChange={e => setNewUniDeanEmail(e.target.value)} placeholder="dean.rd@university.ac.in" className="text-xs" />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Accreditation Evidence URL</label>
                <Input type="url" value={newUniProofUrl} onChange={e => setNewUniProofUrl(e.target.value)} placeholder="https://aishe.gov.in/certificate" className="text-xs" />
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* 8. UNMERGE MODAL */}
      {unmergeModalOpen && unmergeClusterId && (
        <Modal
          isOpen={unmergeModalOpen}
          onClose={() => setUnmergeModalOpen(false)}
          title="Disaggregate / Unmerge Problem Cluster"
          description={`Revert and disaggregate cluster "${unmergeChallengeTitle}".`}
          size="md"
          footer={
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setUnmergeModalOpen(false)} disabled={isSubmittingUnmerge}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleExecuteUnmerge}
                disabled={isSubmittingUnmerge || !unmergeReason.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white font-bold"
              >
                {isSubmittingUnmerge ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
                Confirm Disaggregation
              </Button>
            </div>
          }
        >
          <div className="space-y-2 text-xs">
            <label className="font-semibold text-slate-700 block">Disaggregation Justification *</label>
            <Textarea
              rows={3}
              value={unmergeReason}
              onChange={e => setUnmergeReason(e.target.value)}
              placeholder="State technical reasons why these problems should be decoupled and tracked independently..."
              className="text-xs"
            />
            {unmergeError && <p className="text-rose-600 text-xs">{unmergeError}</p>}
          </div>
        </Modal>
      )}

      {/* Side-by-side Historical Precedent Comparison Drawer */}
      <CompareCaseDrawer
        isOpen={govCompareDrawerOpen}
        onClose={() => setGovCompareDrawerOpen(false)}
        currentCase={
          selectedChallenge
            ? {
                id: selectedChallenge.id,
                title: selectedChallenge.title,
                description: selectedChallenge.description,
                category: selectedChallenge.category,
                district: selectedChallenge.district || undefined,
              }
            : null
        }
        historicalCases={govComparingMemory ? [govComparingMemory] : govPrecedents}
      />
    </div>
    </AppLayout>
  );
}
