'use client';

import React, { useState } from 'react';
import {
  SentinelProbeRequestDto,
  SentinelChoice,
  BranchDifferentialStatus,
  SentinelProbeResponseDto,
} from '@sicp/shared';
import {
  Radio,
  Send,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  BarChart2,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface SentinelProbeWidgetProps {
  probe: SentinelProbeRequestDto;
  onSendResponse: (params: {
    choice: SentinelChoice;
    feedbackText?: string;
  }) => Promise<void>;
  isLoading?: boolean;
}

export function SentinelProbeWidget({
  probe,
  onSendResponse,
  isLoading,
}: SentinelProbeWidgetProps) {
  const [selectedChoice, setSelectedChoice] = useState<SentinelChoice>(
    SentinelChoice.NORMAL_SERVICE
  );
  const [feedbackText, setFeedbackText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState<'citizen' | 'government'>('citizen');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSendResponse({
      choice: selectedChoice,
      feedbackText: feedbackText.trim() || undefined,
    });
    setSubmitted(true);
  };

  const handleSimulateNormal = async () => {
    await onSendResponse({
      choice: SentinelChoice.NORMAL_SERVICE,
      feedbackText: 'Simulated citizen observation: Tap water pressure is high and water is completely clear.',
    });
    setSubmitted(true);
  };

  const getBranchOutcomeBadge = (outcome: BranchDifferentialStatus) => {
    switch (outcome) {
      case BranchDifferentialStatus.BRANCH_UNAFFECTED_DISPROVED_UPSTREAM:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Branch Differential Confirmed Unaffected
          </span>
        );
      case BranchDifferentialStatus.CONFIRMED_AFFECTED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800">
            <AlertCircle className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
            Branch Confirmed Affected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Collecting Community Feedback
          </span>
        );
    }
  };

  const total = probe.totalResponses || 0;
  const normal = probe.responseBreakdown?.[SentinelChoice.NORMAL_SERVICE] || 0;
  const normalPercent = total > 0 ? Math.round((normal / total) * 100) : 0;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
      {/* Header with Mode Toggle */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Radio className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Proactive Community Sentinel
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Targeted, non-leading community verification probe dispatched to {probe.serviceAreaName}.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 p-0.5 rounded-lg text-xs font-medium">
          <button
            onClick={() => setActiveTab('citizen')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'citizen'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Citizen Inquirer
          </button>
          <button
            onClick={() => setActiveTab('government')}
            className={`px-3 py-1 rounded-md transition-colors ${
              activeTab === 'government'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            Live Aggregation ({total})
          </button>
        </div>
      </div>

      <div className="p-5">
        {activeTab === 'citizen' ? (
          <div>
            {/* Citizen Inquiry Card */}
            <div className="bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-2 text-xs font-semibold text-blue-800 dark:text-blue-300">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                {probe.inquiryTitle}
              </div>
              <p className="text-sm text-slate-800 dark:text-slate-200 font-medium">
                &quot;{probe.inquiryText}&quot;
              </p>
              <div className="mt-2 text-[11px] text-slate-500 italic">
                Notice: This inquiry is completely neutral and does not presume any disruption. Please share your genuine observation.
              </div>
            </div>

            {submitted ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <h5 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
                  Observation Recorded Successfully
                </h5>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Your direct feedback has updated the municipal branch differential analysis in real-time.
                </p>
                <button
                  onClick={() => setSubmitted(false)}
                  className="mt-2 text-xs text-blue-600 hover:underline"
                >
                  Submit another observation
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Options Radio List */}
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                    <input
                      type="radio"
                      name="sentinel-choice"
                      checked={selectedChoice === SentinelChoice.NORMAL_SERVICE}
                      onChange={() => setSelectedChoice(SentinelChoice.NORMAL_SERVICE)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        Normal Service
                      </span>
                      <span className="text-slate-500">
                        Adequate pressure and clean, odorless water.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                    <input
                      type="radio"
                      name="sentinel-choice"
                      checked={selectedChoice === SentinelChoice.DEGRADED_PRESSURE}
                      onChange={() => setSelectedChoice(SentinelChoice.DEGRADED_PRESSURE)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        Lower Than Normal Pressure
                      </span>
                      <span className="text-slate-500">
                        Water flows, but pressure is significantly reduced.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                    <input
                      type="radio"
                      name="sentinel-choice"
                      checked={selectedChoice === SentinelChoice.CONTAMINATION_ODOR}
                      onChange={() => setSelectedChoice(SentinelChoice.CONTAMINATION_ODOR)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        Discolored / Smelly Water
                      </span>
                      <span className="text-slate-500">
                        Noticeable yellow/brown tint or mud sediment.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                    <input
                      type="radio"
                      name="sentinel-choice"
                      checked={selectedChoice === SentinelChoice.NO_SERVICE}
                      onChange={() => setSelectedChoice(SentinelChoice.NO_SERVICE)}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <div className="text-xs">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 block">
                        No Water Supply
                      </span>
                      <span className="text-slate-500">
                        Taps completely dry during scheduled supply hours.
                      </span>
                    </div>
                  </label>
                </div>

                {/* Additional Comments */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Optional Observation Note (Street / Floor)
                  </label>
                  <input
                    type="text"
                    value={feedbackText}
                    onChange={e => setFeedbackText(e.target.value)}
                    placeholder="e.g. Ground floor tap running clear, normal pressure"
                    className="w-full text-xs px-3 py-2 border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Submit Action */}
                <div className="flex items-center justify-between pt-2">
                  <button
                    type="button"
                    onClick={handleSimulateNormal}
                    disabled={isLoading}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-1"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Quick 1-Click Demo Observation (Normal)
                  </button>

                  <Button type="submit" variant="primary" size="sm" disabled={isLoading}>
                    <Send className="w-3.5 h-3.5 mr-1" />
                    Submit Observation
                  </Button>
                </div>
              </form>
            )}
          </div>
        ) : (
          /* Government Live Aggregation View */
          <div className="space-y-4">
            {/* Status Summary Banner */}
            <div className="flex items-center justify-between p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700">
              <div>
                <div className="text-xs text-slate-500">Branch Verification Status:</div>
                <div className="mt-1">{getBranchOutcomeBadge(probe.branchVerificationOutcome)}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-slate-500">Total Observations:</div>
                <div className="text-base font-bold font-mono text-slate-900 dark:text-slate-100">
                  {total} <span className="text-xs font-normal text-slate-400">/ 150 dispatched</span>
                </div>
              </div>
            </div>

            {/* Distribution Bar */}
            {total > 0 && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    Normal Service Ratio:
                  </span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {normalPercent}% ({normal} of {total})
                  </span>
                </div>
                <div className="w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-500 transition-all duration-500"
                    style={{ width: `${normalPercent}%` }}
                    title={`Normal: ${normal}`}
                  />
                  <div
                    className="bg-amber-500 transition-all duration-500"
                    style={{ width: `${100 - normalPercent}%` }}
                    title={`Degraded/Other: ${total - normal}`}
                  />
                </div>
              </div>
            )}

            {/* Evidence Contribution Summary */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
              <strong className="block text-slate-800 dark:text-slate-200 font-semibold mb-1">
                Topological Evidence Contribution:
              </strong>
              <p className="text-slate-600 dark:text-slate-300">
                {probe.evidenceContributionSummary || 'Awaiting community observations.'}
              </p>
            </div>

            {/* Quick Simulation Trigger for Demonstration */}
            <div className="pt-2 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSimulateNormal}
                disabled={isLoading}
              >
                <Sparkles className="w-3.5 h-3.5 mr-1 text-blue-500" />
                Inject Ward 14 Verified Normal Report
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
