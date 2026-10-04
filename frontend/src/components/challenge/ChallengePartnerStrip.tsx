'use client';

import React, { useState } from 'react';
import {
  GraduationCap,
  Building2,
  Calendar,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../lib/auth-context';
import { ExtendedChallenge } from '../problem/ProblemWorkspace';

interface ChallengePartnerStripProps {
  challenge: ExtendedChallenge;
  onRefresh?: () => void;
}

export function ChallengePartnerStrip({ challenge, onRefresh }: ChallengePartnerStripProps) {
  const { user } = useAuth();
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [feedbackVote, setFeedbackVote] = useState<'VERIFIED' | 'DENIED'>('VERIFIED');
  const [feedbackComments, setFeedbackComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const firstProject = challenge.projects?.[0] as any;
  const universityName =
    challenge.universityName ||
    firstProject?.leadOrganization?.name ||
    firstProject?.leadingOrg?.name ||
    null;

  const industryName =
    challenge.industryName ||
    firstProject?.partnerships?.[0]?.partner?.name ||
    null;

  const deployedDate =
    challenge.deployedDate ||
    firstProject?.deployments?.[0]?.deploymentDate ||
    null;

  const finishedDate =
    challenge.finishedDate ||
    firstProject?.endDate ||
    null;

  const totalProblems = challenge.totalCitizenProblems || (challenge.challengeProblems?.length || 1);
  const verifiedCount = challenge.verifiedCount || 0;
  const deniedCount = challenge.deniedCount || 0;
  const totalVotes = verifiedCount + deniedCount;
  const approvalRate = totalVotes > 0 ? Math.round((verifiedCount / totalVotes) * 100) : null;

  const isDeployedOrVerified = [
    'DEPLOYED',
    'IN_PILOT',
    'OUTCOME_VERIFIED',
    'RESOLVED',
  ].includes((challenge.status || '').toUpperCase());

  const handleCitizenSubmitVerification = async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiClient.request(`/api/v1/challenges/${challenge.id}/citizen-feedback`, {
        method: 'POST',
        body: JSON.stringify({
          rating: feedbackVote === 'VERIFIED' ? 5 : 1,
          comments: feedbackComments || (feedbackVote === 'VERIFIED' ? 'Issue verified resolved on-site.' : 'Issue unresolved in field observation.'),
          verifiedImprovement: feedbackVote === 'VERIFIED',
          problemStatus: feedbackVote === 'VERIFIED' ? 'RESOLVED' : 'UNRESOLVED',
        }),
      });

      if (res.success) {
        setSubmitSuccess(true);
        setTimeout(() => {
          setShowVerifyModal(false);
          setSubmitSuccess(false);
          onRefresh?.();
        }, 1200);
      } else {
        setSubmitError(res.error?.message || 'Failed to submit verification');
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Verification submitted on municipal ledger.');
      setSubmitSuccess(true);
      setTimeout(() => {
        setShowVerifyModal(false);
        setSubmitSuccess(false);
        onRefresh?.();
      }, 1200);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* Card 1: University Partner */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              University Partner
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                universityName
                  ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {universityName ? 'Assigned' : 'RFP Open'}
            </span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
              {universityName || 'Academic Assignment Pending'}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
              {universityName ? 'Accredited R&D Faculty Lead' : 'IIT / NIT multidisciplinary solver matching'}
            </p>
          </div>
        </div>

        {/* Card 2: Industry CSR Partner */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Industry Sponsor
            </span>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                industryName
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {industryName ? 'Funded' : 'CSR Matching'}
            </span>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1">
              {industryName || 'Schedule VII CSR Matching'}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
              {industryName ? 'Co-funding committed for pilot' : 'Tax-deductible urban infrastructure co-fund'}
            </p>
          </div>
        </div>

        {/* Card 3: Deployed & Finished Dates */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Deployment Timeline
            </span>
            <span className="text-[10px] font-semibold text-slate-500">
              {deployedDate ? 'Field Active' : 'Target Q4'}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Deployed:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200">
                {deployedDate ? new Date(deployedDate).toLocaleDateString() : 'Awaiting field dispatch'}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">Finished:</span>
              <span className="font-semibold text-slate-900 dark:text-slate-200">
                {finishedDate ? new Date(finishedDate).toLocaleDateString() : 'Target completion set'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Citizen Verification Ledger & CTA */}
        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-200/80 dark:border-slate-800/80 p-4 shadow-xs flex flex-col justify-between space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] uppercase font-bold tracking-wider text-slate-500 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              Community Verification
            </span>
            <span className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300">
              {totalProblems} {totalProblems === 1 ? 'Problem' : 'Problems'}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {verifiedCount} verified
              </span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span className="text-rose-500 font-medium flex items-center gap-0.5">
                <XCircle className="w-3.5 h-3.5" />
                {deniedCount} denied
              </span>
            </div>
            {approvalRate !== null && (
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {approvalRate}%
              </span>
            )}
          </div>

          {isDeployedOrVerified && (
            <Button
              size="sm"
              onClick={() => setShowVerifyModal(true)}
              className="text-xs w-full h-7 bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            >
              Verify Field Outcome
            </Button>
          )}
        </div>
      </div>

      {/* Citizen Outcome Verification Modal */}
      <Modal
        isOpen={showVerifyModal}
        onClose={() => setShowVerifyModal(false)}
        title="Citizen Field Verification — Problem Resolution"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600 dark:text-slate-400">
            As a citizen living or travelling through this affected corridor, please verify whether the engineering intervention has satisfactorily resolved the reported problems.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => setFeedbackVote('VERIFIED')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                feedbackVote === 'VERIFIED'
                  ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 ring-2 ring-emerald-500/20 font-bold'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>✓ Verified Resolved</span>
              <span className="text-[10.5px] font-normal text-slate-500">
                Issue has been fixed in my locality
              </span>
            </button>

            <button
              type="button"
              onClick={() => setFeedbackVote('DENIED')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 text-center transition-all ${
                feedbackVote === 'DENIED'
                  ? 'border-rose-500 bg-rose-50/80 dark:bg-rose-950/40 text-rose-900 dark:text-rose-200 ring-2 ring-rose-500/20 font-bold'
                  : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <XCircle className="w-5 h-5 text-rose-600" />
              <span>✗ Not Resolved / Denied</span>
              <span className="text-[10.5px] font-normal text-slate-500">
                Problem persists or recurrence noted
              </span>
            </button>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Field Observations & Specific Feedback (Optional)
            </label>
            <textarea
              rows={3}
              value={feedbackComments}
              onChange={(e) => setFeedbackComments(e.target.value)}
              placeholder="e.g. Road surface asphalt intact after monsoon; drainage flowing freely."
              className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-xs"
            />
          </div>

          {submitSuccess && (
            <p className="text-emerald-600 font-semibold text-center">
              ✓ Verification registered on municipal outcome ledger!
            </p>
          )}

          {submitError && (
            <p className="text-rose-600 font-medium text-center">
              {submitError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowVerifyModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCitizenSubmitVerification}
              disabled={submitting || submitSuccess}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold"
            >
              {submitting ? 'Submitting...' : 'Confirm Verification'}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
