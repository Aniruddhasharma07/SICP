'use client';

import React from 'react';
import { CheckCircle2, Clock, ArrowRight, PlusCircle, Wrench, ShieldCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { ChallengeIntelligenceDto, UserRole } from '@sicp/shared';
import { ExtendedChallenge } from './ProblemWorkspace';

interface NextActionPanelProps {
  challenge: ExtendedChallenge;
  intelligence?: ChallengeIntelligenceDto | null;
  currentUser?: any;
  onOpenTechnicalDrawer: () => void;
  onOpenAddEvidence?: () => void;
  onValidateInvestigation?: () => void;
  isValidating?: boolean;
}

const CIVIC_MILESTONES = [
  { id: 'REPORT', label: 'Citizen Report', keyStatuses: ['SUBMITTED', 'DRAFT'] },
  { id: 'REVIEW', label: 'Municipal Review', keyStatuses: ['UNDER_GOV_REVIEW', 'SCREENING'] },
  { id: 'VERIFY', label: 'Field Verification', keyStatuses: ['APPROVED', 'FIELD_VERIFICATION'] },
  { id: 'PLAN', label: 'Resolution Planning', keyStatuses: ['ASSIGNED_TO_UNIVERSITY', 'IN_PROGRESS'] },
  { id: 'OUTCOME', label: 'Outcome Recording', keyStatuses: ['RESOLVED', 'CLOSED'] },
];

export function NextActionPanel({
  challenge,
  intelligence,
  currentUser,
  onOpenTechnicalDrawer,
  onOpenAddEvidence,
  onValidateInvestigation,
  isValidating = false,
}: NextActionPanelProps) {
  // Determine current milestone index
  const getActiveMilestoneIndex = (): number => {
    const s = challenge.status as string;
    if (s === 'RESOLVED' || s === 'CLOSED') return 4;
    if (s === 'ASSIGNED_TO_UNIVERSITY' || s === 'IN_PROGRESS') return 3;
    if (s === 'APPROVED' || s === 'FIELD_VERIFICATION') return 2;
    if (s === 'UNDER_GOV_REVIEW') return 1;
    return 0;
  };

  const activeIndex = getActiveMilestoneIndex();
  const isOfficer =
    currentUser?.role === UserRole.GOVERNMENT_OFFICER ||
    currentUser?.role === UserRole.GOVERNMENT_DEPARTMENT ||
    currentUser?.role === UserRole.SYSTEM_ADMIN;

  const requiresOfficerValidation =
    (challenge.status === 'UNDER_GOV_REVIEW' || challenge.status === 'SUBMITTED') && isOfficer;

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-7 shadow-sm">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Section 2 • Next Steps
          </h2>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">What Happens Next</p>
        </div>
        <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Step {activeIndex + 1} of 5
        </span>
      </div>

      {/* 5-Stage Civic Milestone Pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 sm:gap-3 py-3 mb-6">
        {CIVIC_MILESTONES.map((step, idx) => {
          const isPassed = idx < activeIndex;
          const isCurrent = idx === activeIndex;

          return (
            <div
              key={step.id}
              className={`p-3 rounded-lg border text-center transition ${
                isCurrent
                  ? 'border-blue-600 bg-blue-50/70 text-blue-900 dark:bg-blue-950/40 dark:border-blue-500 dark:text-blue-200 font-semibold ring-1 ring-blue-500/30'
                  : isPassed
                  ? 'border-emerald-200 bg-emerald-50/40 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800/60 dark:text-emerald-300'
                  : 'border-slate-200 bg-slate-50/60 text-slate-400 dark:border-slate-800 dark:bg-slate-800/20 dark:text-slate-500'
              }`}
            >
              <div className="flex items-center justify-center mb-1.5">
                {isPassed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                ) : isCurrent ? (
                  <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400 animate-pulse" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-600 flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </div>
                )}
              </div>
              <span className="text-xs block leading-tight">{step.label}</span>
            </div>
          );
        })}
      </div>

      {/* Action Controls */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div>
          {requiresOfficerValidation ? (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Statutory officer action required: Authorize municipal inspection and technical inquiry.
            </p>
          ) : (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              SICP records all municipal milestone transitions on the public verification ledger.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {requiresOfficerValidation && onValidateInvestigation ? (
            <Button
              onClick={onValidateInvestigation}
              disabled={isValidating}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2"
            >
              <ShieldCheck className="w-4 h-4 mr-1.5" />
              {isValidating ? 'Recording Validation...' : 'Validate Investigation'}
            </Button>
          ) : (
            <Button
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2"
              onClick={() => {
                const el = document.getElementById('problem-timeline');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              <Clock className="w-4 h-4 mr-1.5" />
              Track Investigation
            </Button>
          )}

          {onOpenAddEvidence && (
            <Button
              variant="outline"
              onClick={onOpenAddEvidence}
              className="text-xs border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300"
            >
              <PlusCircle className="w-3.5 h-3.5 mr-1 text-slate-500" />
              Add Evidence
            </Button>
          )}

          <Button
            variant="outline"
            onClick={onOpenTechnicalDrawer}
            className="text-xs border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Wrench className="w-3.5 h-3.5 mr-1 text-slate-500" />
            View Technical Analysis
          </Button>
        </div>
      </div>
    </section>
  );
}
