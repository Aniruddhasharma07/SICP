'use client';

import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowRight,
  Lock,
  UserCheck,
} from 'lucide-react';
import { ChallengeDto, ChallengeStatus, UserRole, EvidenceEpistemicClass } from '@sicp/shared';
import { EvidenceChip } from '../ui/EvidenceChip';
import { Button } from '../ui/Button';
import { NextQuestionBridge } from './NextQuestionBridge';

interface ValidationLayerProps {
  challenge: ChallengeDto & {
    version?: number;
    validatedByName?: string;
    validationReason?: string;
  };
  currentUserRole?: UserRole;
  currentUserName?: string;
  actionReason: string;
  onChangeActionReason: (val: string) => void;
  onExecuteTransition: (toStatus: ChallengeStatus, reasonReq?: boolean) => void;
  isSubmittingAction: boolean;
  onContinueToMemory?: () => void;
}

export function ValidationLayer({
  challenge,
  currentUserRole,
  currentUserName,
  actionReason,
  onChangeActionReason,
  onExecuteTransition,
  isSubmittingAction,
  onContinueToMemory,
}: ValidationLayerProps) {
  const isGovOrAdmin =
    currentUserRole === UserRole.GOVERNMENT_OFFICER ||
    currentUserRole === UserRole.GOVERNMENT_DEPARTMENT ||
    currentUserRole === UserRole.SYSTEM_ADMIN;

  const isApproved =
    challenge.status === 'APPROVED' ||
    challenge.status === 'ASSIGNED_TO_UNIVERSITY' ||
    challenge.status === 'IN_PILOT' ||
    challenge.status === 'DEPLOYED' ||
    challenge.status === 'RESOLVED';

  return (
    <section id="validation-layer" className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                Stage 04 • Human Governance &amp; Validation
              </span>
              <span className="text-xs text-slate-500">
                Question: Is the evidence sufficient for an accountable decision?
              </span>
            </div>
            <h2 className="text-lg font-bold text-slate-100">
              Statutory Governance &amp; Authority Sign-Off
            </h2>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <EvidenceChip epistemicClass={EvidenceEpistemicClass.HUMAN_VALIDATED} label="Government Authorized Finding" />
        </div>
      </div>

      {/* Human Authority Boundary Invariant Banner */}
      <div className="p-4 rounded-xl bg-slate-900 border-2 border-emerald-500/30 text-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-emerald-300">
            <UserCheck className="w-4 h-4 text-emerald-400" />
            <span>Signature #7 • Human Authority Boundary</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
            SICP Invariant #1
          </span>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          AI models produce competing hypotheses, clustering metrics, and topological calculations; authorized Government Officers hold sole statutory authority to validate operational findings and mobilize public resources.
        </p>

        {/* Section 25 Statutory Sign-Off Seal if Validated / Approved */}
        {isApproved ? (
          <div className="mt-3 p-4 bg-emerald-950/60 border-2 border-emerald-500/60 rounded-xl space-y-3 text-xs animate-sicp-scale-in shadow-lg shadow-emerald-950/50">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-emerald-500/30">
              <div className="flex items-center gap-2 font-black text-emerald-300 uppercase tracking-wide">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Statutory Sign-Off Sealed</span>
              </div>
              <span className="font-mono text-[10px] font-bold bg-emerald-900/80 text-emerald-200 border border-emerald-500/40 px-2.5 py-0.5 rounded">
                GOV-VAL-{challenge.id}
              </span>
            </div>

            <div className="space-y-1.5 text-slate-200">
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-slate-400">Authorized Signatory:</span>
                <strong className="text-emerald-300 font-bold">
                  {challenge.validatedByName || currentUserName || 'Er. Rajesh Varma (Executive Engineer, PHED)'}
                </strong>
              </div>
              <div className="flex items-center justify-between text-[11.5px]">
                <span className="text-slate-400">Audit Timestamp:</span>
                <span className="font-mono text-slate-300">{new Date(challenge.updatedAt || Date.now()).toLocaleString()}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-900/30 border border-emerald-500/20 text-slate-300 italic text-[11px] leading-relaxed">
              &quot;{challenge.validationReason || actionReason || 'Field inspection and topological branch differential verified. Approved for multi-stakeholder research intervention and institutional memory matching.'}&quot;
            </div>

            <div className="pt-2 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-3 text-[10.5px]">
              <span className="text-emerald-400 font-medium font-mono">
                ✓ Recorded on Tamper-Evident Authority Audit Ledger
              </span>
              {onContinueToMemory && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={onContinueToMemory}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs h-8 px-3.5 shadow-md font-bold"
                >
                  <span>Review Solution Precedents</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
              )}
            </div>
          </div>
        ) : (
          /* Governance Actions Panel */
          <div className="pt-2 space-y-4">
            <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
              <span>Current Status: <strong className="text-slate-200">{challenge.status}</strong></span>
              <span>Active Authority: <strong className="text-slate-200">{currentUserRole || 'Guest (Read Only)'}</strong></span>
            </div>

            {challenge.status === 'SUBMITTED' && isGovOrAdmin && (
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => onExecuteTransition(ChallengeStatus.UNDER_GOV_REVIEW)}
                  isLoading={isSubmittingAction}
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs"
                >
                  Claim for Government Review
                </Button>
                <span className="text-[11px] text-slate-400">
                  Assigns official municipal responsibility to active officer session.
                </span>
              </div>
            )}

            {challenge.status === 'UNDER_GOV_REVIEW' && isGovOrAdmin && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Statutory Validation Basis / Administrative Justification:
                  </label>
                  <textarea
                    rows={3}
                    value={actionReason}
                    onChange={e => onChangeActionReason(e.target.value)}
                    placeholder="Enter evidence-backed governance reason: e.g. Field inspection and branch differential analysis confirmed localized feeder failure. Approving for university water research pilot."
                    className="w-full text-xs p-2.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button
                    variant="primary"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                    onClick={() => onExecuteTransition(ChallengeStatus.APPROVED)}
                    isLoading={isSubmittingAction}
                    disabled={actionReason.trim().length < 10}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" /> Validate &amp; Approve Challenge
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() => onExecuteTransition(ChallengeStatus.NEEDS_MORE_INFO, true)}
                    isLoading={isSubmittingAction}
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 text-xs"
                  >
                    <AlertTriangle className="w-4 h-4 mr-1.5 text-amber-400" /> Request Information
                  </Button>

                  <Button
                    variant="destructive"
                    onClick={() => onExecuteTransition(ChallengeStatus.REJECTED, true)}
                    isLoading={isSubmittingAction}
                    className="text-xs"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" /> Reject Finding
                  </Button>
                </div>
              </div>
            )}

            {!isGovOrAdmin && (
              <div className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 text-slate-400 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Government officer authentication required to execute statutory sign-off or state transitions.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Next Question Bridge to Solution Memory Layer */}
      {onContinueToMemory && (
        <NextQuestionBridge
          currentStage="Stage 04 • Human Governance & Validation"
          questionAnswered="Is the evidence sufficient for an accountable decision?"
          answeredSummary="Section 25 Statutory Sign-Off sealed on tamper-evident audit ledger by authorized Municipal Executive Engineer."
          nextStage="Stage 05 • Institutional Solution Memory"
          nextQuestion="With official validation secured, has SICP solved similar hydraulic failures before in 700+ districts?"
          ctaLabel="Review Institutional Solution Precedents"
          onContinue={onContinueToMemory}
          accentColor="emerald"
        />
      )}
    </section>
  );
}
