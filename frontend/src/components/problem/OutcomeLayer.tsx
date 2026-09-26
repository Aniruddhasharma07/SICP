'use client';

import React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  FolderKanban,
  ExternalLink,
  Star,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Flame,
  ArrowRight,
  ShieldAlert,
  History,
  MessageSquare,
  Award,
} from 'lucide-react';
import {
  ChallengeDto,
  CitizenFeedbackDto,
  CitizenProblemStatus,
  EvidenceEpistemicClass,
  ChallengeTimelineDto,
} from '@sicp/shared';
import { EvidenceChip } from '../ui/EvidenceChip';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { ZeroDeadEndNotice } from '../common/ZeroDeadEndNotice';

interface OutcomeLayerProps {
  challenge: ChallengeDto & {
    projects?: { id: string; title: string; status: any }[];
    timelines?: ChallengeTimelineDto[];
  };
  feedbacks: CitizenFeedbackDto[];
  feedbackForm: {
    problemStatus: CitizenProblemStatus;
    rating: number;
    effectivenessRating: number;
    improvementRating: number;
    comments: string;
    unresolvedIssues: string;
    isRecurrenceReported: boolean;
  };
  onChangeFeedbackForm: (updater: (prev: any) => any) => void;
  onSubmitFeedback: (e: React.FormEvent) => Promise<void>;
  feedbackSubmitting: boolean;
  feedbackSuccess: boolean;
  currentUser: any;
  onJumpToMemory?: () => void;
}

export function OutcomeLayer({
  challenge,
  feedbacks,
  feedbackForm,
  onChangeFeedbackForm,
  onSubmitFeedback,
  feedbackSubmitting,
  feedbackSuccess,
  currentUser,
  onJumpToMemory,
}: OutcomeLayerProps) {
  const isPostIntervention =
    ['IN_PILOT', 'DEPLOYED', 'RESOLVED'].includes(challenge.status) ||
    (challenge.projects && challenge.projects.length > 0);

  const avgSatisfaction =
    feedbacks.length > 0
      ? (feedbacks.reduce((acc, f) => acc + (f.rating || 0), 0) / feedbacks.length).toFixed(1)
      : '0.0';

  const resolvedPercent =
    feedbacks.length > 0
      ? Math.round(
          (feedbacks.filter(
            f => f.problemStatus === CitizenProblemStatus.YES || f.problemStatus === CitizenProblemStatus.PARTIALLY
          ).length /
            feedbacks.length) *
            100
        )
      : 0;

  const recurrenceCount = feedbacks.filter(f => f.isRecurrenceReported).length;

  return (
    <section id="outcome-layer" className="space-y-5">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                Stage 07 • Field Intervention &amp; Ground Truth Verification
              </span>
              <span className="text-xs text-slate-500">
                Question: Did the intervention actually solve the problem on the ground?
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              Field Execution &amp; Empirical Citizen Ground Truth
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <EvidenceChip epistemicClass={EvidenceEpistemicClass.VERIFIED_OUTCOME} label="Citizen Ground Truth Telemetry" />
        </div>
      </div>

      {/* Closed-Loop Invariant Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border border-emerald-500/30 text-xs space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-emerald-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>SICP Invariant #10: Verified Outcome Becomes Institutional Solution Memory</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            Closed-Loop Axiom
          </span>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          Artificial claims of success are structurally prevented. An issue only achieves full verified resolution when authenticated field observations confirm remediation. Ground-truth verified outcomes are immediately indexed as Institutional Solution Memory to assist 700+ municipal jurisdictions.
        </p>
      </div>

      {/* Linked Execution Project Cockpit Card */}
      {challenge.projects && challenge.projects.length > 0 && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 border border-blue-500/40 text-xs shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <FolderKanban className="w-4 h-4 text-blue-400" />
                <span className="font-bold text-slate-100 text-sm">
                  Active Execution Project: {challenge.projects[0].title}
                </span>
                <Badge className="bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[10px] font-mono">
                  {challenge.projects[0].status}
                </Badge>
              </div>
              <p className="text-slate-300 text-[11px]">
                Engineering prototype, automated gate checks, 8-point deployment criteria, and operational pilot monitoring.
              </p>
            </div>

            <Link href={`/projects/${challenge.projects[0].id}`}>
              <Button size="sm" variant="primary" className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shrink-0 h-8">
                <span>Open Project Cockpit</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Citizen Field Verification & Ground Truth Card */}
      {isPostIntervention ? (
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-100">
                  Citizen Outcome Verification &amp; Ground Truth Telemetry
                </h3>
                <span className="text-[10px] text-slate-400">
                  Direct empirical reports from affected residents and site observers
                </span>
              </div>
            </div>

            <Badge
              className={`text-[10px] font-mono ${
                challenge.status === 'RESOLVED'
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  : 'bg-blue-950 text-blue-300 border border-blue-800'
              }`}
            >
              {challenge.status === 'RESOLVED' ? 'Officially Verified & Resolved' : 'Active Field Telemetry'}
            </Badge>
          </div>

          {/* Feedback Statistics / Summary Metrics */}
          {feedbacks.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Community Reports</span>
                <span className="text-xl font-bold text-slate-100">{feedbacks.length}</span>
              </div>
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Avg Satisfaction</span>
                <span className="text-xl font-bold text-amber-400">{avgSatisfaction} / 5.0</span>
              </div>
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Resolved / Improved</span>
                <span className="text-xl font-bold text-emerald-400">{resolvedPercent}%</span>
              </div>
              <div className="p-3 bg-slate-950/70 rounded-lg border border-slate-800">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Recurrence Flagged</span>
                <span className={`text-xl font-bold ${recurrenceCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                  {recurrenceCount}
                </span>
              </div>
            </div>
          )}

          {/* Submission Form */}
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Star className="w-4 h-4 text-amber-400 fill-current" />
                <h4 className="font-bold text-xs text-slate-200 uppercase tracking-wider">
                  Submit Empirical Field Observation
                </h4>
              </div>
              {feedbackSuccess && (
                <span className="text-xs text-emerald-400 font-semibold bg-emerald-950/80 px-2 py-1 rounded border border-emerald-700">
                  ✓ Field Verification Recorded
                </span>
              )}
            </div>

            {currentUser ? (
              <form onSubmit={onSubmitFeedback} className="space-y-4 text-xs">
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-300 block">
                    Did the deployed intervention solve or improve the problem in your area?
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { val: CitizenProblemStatus.YES, label: 'Yes, Fully Resolved', border: 'hover:border-emerald-500' },
                      { val: CitizenProblemStatus.PARTIALLY, label: 'Partially Improved', border: 'hover:border-amber-500' },
                      { val: CitizenProblemStatus.NO, label: 'No, Persists', border: 'hover:border-rose-500' },
                      { val: CitizenProblemStatus.NOT_SURE, label: 'Not Sure / Evaluating', border: 'hover:border-slate-500' },
                    ].map(opt => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => onChangeFeedbackForm(prev => ({ ...prev, problemStatus: opt.val }))}
                        className={`p-2.5 rounded-lg border text-left font-medium transition-all ${
                          feedbackForm.problemStatus === opt.val
                            ? 'border-emerald-500 bg-emerald-950/60 text-emerald-200 ring-1 ring-emerald-500 font-bold'
                            : `border-slate-800 text-slate-300 bg-slate-900 ${opt.border}`
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Overall Satisfaction (1–5)</label>
                    <select
                      value={feedbackForm.rating}
                      onChange={e => onChangeFeedbackForm(prev => ({ ...prev, rating: Number(e.target.value) }))}
                      className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 text-xs"
                    >
                      {[5, 4, 3, 2, 1].map(n => (
                        <option key={n} value={n}>
                          {n} - {n === 5 ? 'Exceptional' : n === 4 ? 'Good' : n === 3 ? 'Acceptable' : n === 2 ? 'Poor' : 'Unacceptable'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Solution Effectiveness (1–5)</label>
                    <select
                      value={feedbackForm.effectivenessRating}
                      onChange={e => onChangeFeedbackForm(prev => ({ ...prev, effectivenessRating: Number(e.target.value) }))}
                      className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 text-xs"
                    >
                      {[5, 4, 3, 2, 1].map(n => (
                        <option key={n} value={n}>
                          {n} - {n >= 4 ? 'Highly Effective' : n === 3 ? 'Moderate' : 'Ineffective'}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="font-semibold text-slate-300">Noticeable Improvement (1–5)</label>
                    <select
                      value={feedbackForm.improvementRating}
                      onChange={e => onChangeFeedbackForm(prev => ({ ...prev, improvementRating: Number(e.target.value) }))}
                      className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-2.5 text-xs"
                    >
                      {[5, 4, 3, 2, 1].map(n => (
                        <option key={n} value={n}>
                          {n} - {n >= 4 ? 'Great Improvement' : n === 3 ? 'Slight' : 'No Noticeable Change'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Detailed Community Observations / Ground Reality *</label>
                  <textarea
                    rows={3}
                    required
                    value={feedbackForm.comments}
                    onChange={e => onChangeFeedbackForm(prev => ({ ...prev, comments: e.target.value }))}
                    placeholder="Describe field reality: e.g. Water pressure restored across Sector 4; turbidity levels normal after 48-hour pipeline flush..."
                    className="w-full p-2.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 placeholder-slate-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Unresolved Issues or Remaining Gaps (Optional)</label>
                  <input
                    type="text"
                    value={feedbackForm.unresolvedIssues}
                    onChange={e => onChangeFeedbackForm(prev => ({ ...prev, unresolvedIssues: e.target.value }))}
                    placeholder="e.g. Northern branch valve still exhibits minor seepage during peak morning load."
                    className="w-full h-9 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 px-3 text-xs placeholder-slate-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="recurrenceCheck"
                    checked={feedbackForm.isRecurrenceReported}
                    onChange={e => onChangeFeedbackForm(prev => ({ ...prev, isRecurrenceReported: e.target.checked }))}
                    className="rounded border-slate-700 bg-slate-900 text-rose-500 focus:ring-rose-500"
                  />
                  <label htmlFor="recurrenceCheck" className="text-slate-300 font-semibold text-xs cursor-pointer">
                    Flag this as a Problem Recurrence (Issue returned after initial repair or pilot deployment)
                  </label>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    isLoading={feedbackSubmitting}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 px-4"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Submit Ground Truth Observation
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4 text-xs text-slate-400 space-y-2">
                <p>Log in as a verified citizen or resident to register community field observations.</p>
                <Link href="/login">
                  <Button size="sm" variant="outline" className="border-slate-700 text-slate-200 text-xs h-8">
                    Log In to Verify
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Verified Observations List */}
          {feedbacks.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">
                Verified Citizen Field Observations ({feedbacks.length})
              </h4>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {feedbacks.map(f => (
                  <div key={f.id} className="p-3 bg-slate-950/80 rounded-lg border border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{f.citizenName || 'Verified Citizen'}</span>
                        <Badge
                          className={`text-[10px] ${
                            f.problemStatus === 'YES'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : f.problemStatus === 'PARTIALLY'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : f.problemStatus === 'NO'
                              ? 'bg-rose-950 text-rose-300 border-rose-800'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {f.problemStatus === 'YES'
                            ? 'Resolved'
                            : f.problemStatus === 'PARTIALLY'
                            ? 'Partial'
                            : f.problemStatus === 'NO'
                            ? 'Not Improved'
                            : 'Evaluating'}
                        </Badge>
                        {f.isRecurrenceReported && (
                          <Badge className="bg-rose-950 text-rose-300 border border-rose-800 text-[10px]">
                            Recurrence Flagged
                          </Badge>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {new Date(f.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-slate-300 italic bg-slate-900/60 p-2 rounded border border-slate-800/60">
                      &quot;{f.comments}&quot;
                    </p>
                    {f.unresolvedIssues && (
                      <div className="text-[11px] text-rose-400 font-medium">
                        Remaining Gap: {f.unresolvedIssues}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 text-center space-y-2">
          <p className="font-bold text-slate-200 text-sm">Awaiting Physical Field Deployment</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Citizen outcome verification unlocks automatically once an authorized engineering solution moves into PILOT or DEPLOYMENT phase.
          </p>
        </div>
      )}

      {/* Zero Dead End Notice */}
      <ZeroDeadEndNotice
        whatHappened={`Challenge "${challenge.title}" is in "${challenge.status}" state.`}
        currentStatus={challenge.status}
        whyStatus={
          challenge.status === 'DRAFT'
            ? 'Draft status allows citizen to prepare field evidence before statutory submission.'
            : challenge.status === 'SUBMITTED'
            ? 'Awaiting review queue assignment by municipal or district government officer.'
            : challenge.status === 'UNDER_GOV_REVIEW'
            ? 'Government officer is actively assessing legal jurisdiction, urgency, and resource allocation.'
            : challenge.status === 'NEEDS_MORE_INFO'
            ? 'Government officer has requested supplementary field evidence or clarification.'
            : challenge.status === 'APPROVED'
            ? 'Officially approved by statutory authority. Ready for university and CSR routing.'
            : challenge.status === 'MERGED_INTO_SYSTEMIC'
            ? 'Consolidated into a higher-level systemic civic issue with shared infrastructure.'
            : 'Formally closed or resolved with verified on-the-ground telemetry.'
        }
        whoIsResponsible={
          challenge.status === 'DRAFT' || challenge.status === 'NEEDS_MORE_INFO'
            ? 'Citizen Submitter'
            : challenge.status === 'SUBMITTED' || challenge.status === 'UNDER_GOV_REVIEW'
            ? 'Government Officer'
            : 'System Administrator & Municipal Engineering Wing'
        }
        whatHappensIfIdle={
          challenge.status === 'DRAFT'
            ? 'Draft remains private indefinitely until submitter takes action.'
            : 'Escalation notification is delivered to the supervisory department officer.'
        }
        whatCanDoNext={[
          'Review Immutable Audit Trail',
          'Download Evidence Attachments',
          'Inspect Heuer AMCH Hypotheses',
          'Examine Institutional Solution Memory',
        ]}
      />

      {/* State Machine Audit Ledger */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <Clock className="w-4 h-4 text-slate-400" />
          <div>
            <h3 className="text-sm font-bold text-slate-100">
              Immutable State Machine Audit Ledger ({challenge.timelines?.length || 0})
            </h3>
            <span className="text-[10px] text-slate-400">
              Chronological cryptographic sequence of validated state transitions
            </span>
          </div>
        </div>

        {challenge.timelines && challenge.timelines.length > 0 ? (
          <div className="space-y-3 relative pl-6 border-l-2 border-slate-800 text-xs">
            {challenge.timelines.map((t, idx) => (
              <div key={idx} className="relative space-y-1">
                <div className="absolute -left-[31px] top-1.5 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-slate-950" />
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-slate-200">
                    {t.fromStatus} → {t.toStatus}
                  </span>
                  <Badge className="bg-slate-800 text-slate-300 text-[10px] font-mono">
                    {t.actorRole}
                  </Badge>
                  <span className="text-[11px] text-slate-500 ml-auto">
                    {new Date(t.createdAt).toLocaleString()}
                  </span>
                </div>
                {t.reason && (
                  <p className="text-slate-300 italic bg-slate-950/70 p-2 rounded border border-slate-800">
                    &quot;{t.reason}&quot;
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500 italic py-2">
            No previous state transitions recorded for this problem record.
          </p>
        )}
      </div>

      {/* Closed-Loop Completion Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-900 to-slate-950 border border-emerald-500/40 text-xs shadow-xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-800/40">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-emerald-200 text-sm">
              Closed-Loop Completed: Empirical Telemetry Indexes Into Institutional Memory
            </span>
          </div>
          <Badge className="bg-emerald-900 text-emerald-200 border border-emerald-500 text-[10px] font-mono">
            SICP Invariant #10 Verified
          </Badge>
        </div>

        <p className="text-slate-300 text-[11.5px] leading-relaxed">
          The problem lifecycle does not terminate in bureaucratic filing. When field observations verify real-world resolution, this case is permanently committed into the Institutional Solution Memory registry, enabling rapid precedent retrieval and preventative warnings for over 700 municipal districts across India.
        </p>

        {onJumpToMemory && (
          <div className="pt-2 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={onJumpToMemory}
              className="border-emerald-600/60 text-emerald-300 hover:bg-emerald-950/40 text-xs h-8 px-3.5"
            >
              <span>Inspect Institutional Solution Precedent Registry ↑</span>
              <History className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
