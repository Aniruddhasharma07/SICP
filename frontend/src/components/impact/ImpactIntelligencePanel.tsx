'use client';

import React, { useState } from 'react';
import {
  ImpactMetricDto,
  ImpactVerificationStatus,
  ProblemType,
  UserRole,
} from '@sicp/shared';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Alert } from '../ui/Alert';
import { apiClient } from '../../lib/api-client';
import {
  ShieldCheck,
  Calculator,
  BrainCircuit,
  Users,
  Car,
  GraduationCap,
  HeartPulse,
  Zap,
  Sprout,
  Trash2,
  Waves,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileCheck,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';

interface ImpactIntelligencePanelProps {
  challengeId: string;
  impact?: ImpactMetricDto | null;
  userRole?: UserRole | null;
  onImpactUpdated?: () => void;
}

export const ImpactIntelligencePanel: React.FC<ImpactIntelligencePanelProps> = ({
  challengeId,
  impact,
  userRole,
  onImpactUpdated,
}) => {
  const [showFormulaDetails, setShowFormulaDetails] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verifyAction, setVerifyAction] = useState<'VERIFY' | 'MODIFY' | 'REQUEST_EVIDENCE'>('VERIFY');
  const [verifiedValue, setVerifiedValue] = useState<number | ''>(
    impact?.verifiedValue ?? impact?.value ?? 0
  );
  const [verificationNotes, setVerificationNotes] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  // Adaptive questions state
  const [adaptiveAnswers, setAdaptiveAnswers] = useState<Record<string, string | number | boolean>>({});
  const [isSubmittingAnswers, setIsSubmittingAnswers] = useState(false);
  const [answerSuccess, setAnswerSuccess] = useState<string | null>(null);

  const isGovOrAdmin =
    userRole === UserRole.GOVERNMENT_OFFICER ||
    userRole === UserRole.GOVERNMENT_DEPARTMENT ||
    userRole === UserRole.SYSTEM_ADMIN;

  const getProblemTypeMeta = (problemType?: ProblemType) => {
    switch (problemType) {
      case ProblemType.WATER_SUPPLY:
        return {
          label: 'Water Supply Dependency',
          icon: <Waves className="w-5 h-5 text-sky-600" />,
          color: 'border-sky-200 bg-sky-50/20',
          accentBadge: 'bg-sky-100 text-sky-800',
        };
      case ProblemType.ROAD_USAGE:
        return {
          label: 'Road Multi-Modal Usage (Daily Flow)',
          icon: <Car className="w-5 h-5 text-amber-600" />,
          color: 'border-amber-200 bg-amber-50/20',
          accentBadge: 'bg-amber-100 text-amber-800',
        };
      case ProblemType.HEALTHCARE_SERVICE:
        return {
          label: 'Healthcare Facility Catchment',
          icon: <HeartPulse className="w-5 h-5 text-rose-600" />,
          color: 'border-rose-200 bg-rose-50/20',
          accentBadge: 'bg-rose-100 text-rose-800',
        };
      case ProblemType.EDUCATION_SERVICE:
        return {
          label: 'Educational Institution Impact',
          icon: <GraduationCap className="w-5 h-5 text-indigo-600" />,
          color: 'border-indigo-200 bg-indigo-50/20',
          accentBadge: 'bg-indigo-100 text-indigo-800',
        };
      case ProblemType.ELECTRICITY_NETWORK:
        return {
          label: 'Electricity Grid & Pump Connections',
          icon: <Zap className="w-5 h-5 text-yellow-600" />,
          color: 'border-yellow-200 bg-yellow-50/20',
          accentBadge: 'bg-yellow-100 text-yellow-800',
        };
      case ProblemType.AGRICULTURE_DEPENDENCY:
        return {
          label: 'Agricultural Livelihood Dependency',
          icon: <Sprout className="w-5 h-5 text-emerald-600" />,
          color: 'border-emerald-200 bg-emerald-50/20',
          accentBadge: 'bg-emerald-100 text-emerald-800',
        };
      case ProblemType.SANITATION_SERVICE:
        return {
          label: 'Sanitation & Catchment Contamination',
          icon: <Trash2 className="w-5 h-5 text-teal-600" />,
          color: 'border-teal-200 bg-teal-50/20',
          accentBadge: 'bg-teal-100 text-teal-800',
        };
      case ProblemType.FLOOD_ENVIRONMENTAL:
        return {
          label: 'Inundation / Environmental Exposure',
          icon: <Waves className="w-5 h-5 text-cyan-600" />,
          color: 'border-cyan-200 bg-cyan-50/20',
          accentBadge: 'bg-cyan-100 text-cyan-800',
        };
      default:
        return {
          label: 'Civic Impact (Standard Model)',
          icon: <Users className="w-5 h-5 text-slate-600" />,
          color: 'border-slate-200 bg-slate-50/20',
          accentBadge: 'bg-slate-100 text-slate-800',
        };
    }
  };

  const getStatusBadge = (status?: ImpactVerificationStatus) => {
    switch (status) {
      case ImpactVerificationStatus.VERIFIED:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
            <ShieldCheck className="w-3.5 h-3.5" /> Official Government Verified
          </span>
        );
      case ImpactVerificationStatus.CALCULATED:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
            <Calculator className="w-3.5 h-3.5" /> Formula Calculated
          </span>
        );
      case ImpactVerificationStatus.ESTIMATED:
      case ImpactVerificationStatus.AI_ASSISTED:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
            <BrainCircuit className="w-3.5 h-3.5" /> Statistical Benchmark Estimate
          </span>
        );
      case ImpactVerificationStatus.REPORTED:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            <Users className="w-3.5 h-3.5" /> Citizen Reported
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
            <AlertTriangle className="w-3.5 h-3.5" /> Unverified / Data Required
          </span>
        );
    }
  };

  const handleVerifyOrModify = async () => {
    setIsVerifying(true);
    setVerifyError(null);

    const val = Number(verifiedValue);
    if (isNaN(val) || val < 0) {
      setVerifyError('Please enter a valid non-negative impact value.');
      setIsVerifying(false);
      return;
    }

    const res = await apiClient.request(`/api/v1/challenges/${challengeId}/impact/verify`, {
      method: 'PATCH',
      body: JSON.stringify({
        action: verifyAction,
        verifiedValue: verifyAction === 'MODIFY' ? val : undefined,
        verificationNotes: verificationNotes || undefined,
      }),
    });

    setIsVerifying(false);
    if (res.success) {
      setShowVerificationModal(false);
      if (onImpactUpdated) onImpactUpdated();
    } else {
      setVerifyError(res.error?.message || 'Verification failed');
    }
  };

  const handleAnswerQuestion = (questionId: string, val: string | number | boolean) => {
    setAdaptiveAnswers(prev => ({ ...prev, [questionId]: val }));
  };

  const handleSubmitAdaptiveAnswers = async () => {
    setIsSubmittingAnswers(true);
    setAnswerSuccess(null);

    const res = await apiClient.request(`/api/v1/challenges/${challengeId}/adaptive-answers`, {
      method: 'POST',
      body: JSON.stringify({ answers: adaptiveAnswers }),
    });

    setIsSubmittingAnswers(false);
    if (res.success) {
      setAnswerSuccess('Impact model re-evaluated with updated field data.');
      setAdaptiveAnswers({});
      if (onImpactUpdated) onImpactUpdated();
    }
  };

  const meta = getProblemTypeMeta(impact?.problemType);
  const displayValue = impact?.verifiedValue ?? impact?.value ?? 0;
  const unitLabel = (impact?.unit || 'PEOPLE').replace(/_/g, ' ').toLowerCase();

  return (
    <Card className={`border ${meta.color} shadow-sm transition-all`}>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-white shadow-xs border border-slate-200">
              {meta.icon}
            </div>
            <div>
              <CardTitle className="text-base text-slate-900 flex items-center gap-2">
                Problem-Specific Impact Intelligence
                <Badge variant="secondary" className={`text-[11px] font-mono font-medium ${meta.accentBadge}`}>
                  {meta.label}
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                Rigorous, domain-specific evaluation of societal impact, service disruption, and affected assets.
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {getStatusBadge(impact?.verificationStatus)}
            {isGovOrAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs font-medium border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                onClick={() => {
                  setVerifyAction('VERIFY');
                  setVerifiedValue(displayValue);
                  setShowVerificationModal(true);
                }}
              >
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Review & Verify
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Core Metric & Magnitude Display */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-white rounded-xl border border-slate-200/80 shadow-xs">
          <div className="space-y-1 md:col-span-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
              Estimated Societal Footprint
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-slate-900 font-mono tracking-tight">
                {displayValue > 0 ? displayValue.toLocaleString() : 'Data Pending'}
              </span>
              <span className="text-sm font-semibold uppercase text-slate-600">
                {unitLabel}
              </span>
              {impact?.timeBasis && (
                <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                  {impact.timeBasis.replace(/_/g, ' ')}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 pt-1">
              {impact?.explanation ||
                (displayValue === 0
                  ? 'No generic population assigned. Answer adaptive questions below to calculate precise impact.'
                  : `Estimated ${displayValue.toLocaleString()} ${unitLabel} impacted by this civic issue.`)}
            </p>
          </div>

          {/* Normalized Magnitude Meter */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 flex items-center gap-1">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                Impact Magnitude
              </span>
              <span className="font-bold font-mono text-blue-700">
                {impact?.normalizedMagnitude ?? 0}/100
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-linear-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, impact?.normalizedMagnitude ?? 0))}%` }}
              />
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Weighted input into SICP Priority Engine alongside Severity (35%) and Urgency (20%).
            </p>
          </div>
        </div>

        {/* Verification Summary Banner if Verified */}
        {impact?.verificationStatus === ImpactVerificationStatus.VERIFIED && (
          <div className="flex items-start gap-2.5 p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Authoritatively Verified:</span>{' '}
              This impact metric was validated by an authorized government official. Background AI recalculations are locked to respect municipal authority.
              {impact.verificationNotes && (
                <p className="mt-1 italic text-emerald-800">
                  Note: &quot;{impact.verificationNotes}&quot;
                </p>
              )}
            </div>
          </div>
        )}

        {/* Expandable Calculation Breakdown */}
        <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
          <button
            type="button"
            onClick={() => setShowFormulaDetails(!showFormulaDetails)}
            className="w-full flex items-center justify-between p-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-slate-500" />
              Transparent Calculation Breakdown & Evidence Basis
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-normal text-slate-500">
                Confidence: {Math.round((impact?.confidence ?? 0.5) * 100)}%
              </span>
              {showFormulaDetails ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {showFormulaDetails && (
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 space-y-3 text-xs">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Calculation Methodology:</span>
                  <div className="p-2 bg-white rounded border border-slate-200 font-mono text-[11px] text-slate-800">
                    {impact?.calculationMethod || 'STANDARD_POPULATION_ESTIMATE'}
                  </div>
                </div>

                <div>
                  <span className="font-bold text-slate-700 block mb-1">Model Confidence:</span>
                  <div className="flex items-center gap-2 p-2 bg-white rounded border border-slate-200 text-[11px]">
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${Math.round((impact?.confidence ?? 0.5) * 100)}%` }}
                      />
                    </div>
                    <span className="font-bold text-slate-700">
                      {Math.round((impact?.confidence ?? 0.5) * 100)}%
                    </span>
                  </div>
                </div>
              </div>

              {impact?.inputs && Object.keys(impact.inputs).length > 0 && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Input Parameters Evaluated:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(impact.inputs).map(([k, v]) => (
                      <span
                        key={k}
                        className="inline-flex items-center gap-1 font-mono text-[11px] px-2 py-0.5 bg-white border border-slate-200 rounded text-slate-700"
                      >
                        <span className="text-slate-400">{k}:</span>
                        <span className="font-bold">{String(v)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {impact?.evidenceBasis && impact.evidenceBasis.length > 0 && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Evidence Basis:</span>
                  <ul className="list-disc pl-4 space-y-0.5 text-slate-600 text-[11px]">
                    {impact.evidenceBasis.map((e, idx) => (
                      <li key={idx}>{e}</li>
                    ))}
                  </ul>
                </div>
              )}

              {impact?.dataSources && impact.dataSources.length > 0 && (
                <div>
                  <span className="font-bold text-slate-700 block mb-1">Data Sources Cited:</span>
                  <div className="flex flex-wrap gap-1 text-[11px] text-slate-500">
                    {impact.dataSources.map((s, idx) => (
                      <span key={idx} className="bg-slate-200/70 px-1.5 py-0.5 rounded">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Adaptive Follow-up Questions Panel */}
        {impact?.suggestedQuestions && impact.suggestedQuestions.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-50/50 border border-amber-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HelpCircleIcon className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-bold text-amber-950">
                  Refine Impact Precision (Adaptive Civic Ingestion)
                </span>
              </div>
              <span className="text-[11px] text-amber-700 font-medium">
                {impact.suggestedQuestions.length} parameter{impact.suggestedQuestions.length > 1 ? 's' : ''} requested
              </span>
            </div>

            <p className="text-[11px] text-amber-800">
              Supplying these field parameters allows SICP to replace generic statistical assumptions with verified local asset data.
            </p>

            {answerSuccess && (
              <Alert variant="success" className="bg-emerald-50 border-emerald-200 py-1.5">
                <span className="text-xs text-emerald-800 font-semibold">{answerSuccess}</span>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {impact.suggestedQuestions.map(q => (
                <div key={q.id} className="p-3 bg-white rounded-lg border border-amber-200/70 space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-800">
                    {q.prompt}
                  </label>
                  {q.helpText && (
                    <p className="text-[11px] text-slate-500">{q.helpText}</p>
                  )}

                  {q.inputType === 'boolean' ? (
                    <div className="flex items-center gap-3 pt-1">
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name={q.id}
                          checked={adaptiveAnswers[q.id] === true}
                          onChange={() => handleAnswerQuestion(q.id, true)}
                        />
                        Yes
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="radio"
                          name={q.id}
                          checked={adaptiveAnswers[q.id] === false}
                          onChange={() => handleAnswerQuestion(q.id, false)}
                        />
                        No
                      </label>
                    </div>
                  ) : q.inputType === 'select' && q.options ? (
                    <select
                      value={String(adaptiveAnswers[q.id] ?? '')}
                      onChange={e => handleAnswerQuestion(q.id, e.target.value)}
                      className="w-full h-8 px-2 text-xs rounded border border-slate-300 bg-white"
                    >
                      <option value="">-- Select option --</option>
                      {q.options.map((opt: string) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type={q.inputType === 'number' ? 'number' : 'text'}
                        value={adaptiveAnswers[q.id] !== undefined ? String(adaptiveAnswers[q.id]) : ''}
                        onChange={e =>
                          handleAnswerQuestion(
                            q.id,
                            q.inputType === 'number' ? Number(e.target.value) : e.target.value
                          )
                        }
                        placeholder={q.placeholder || 'Enter value...'}
                        className="flex-1 h-8 px-2 text-xs rounded border border-slate-300 bg-white"
                      />
                      {q.unit && (
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          {q.unit}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-1">
              <Button
                size="sm"
                className="h-8 text-xs"
                onClick={handleSubmitAdaptiveAnswers}
                isLoading={isSubmittingAnswers}
                disabled={Object.keys(adaptiveAnswers).length === 0}
              >
                <RefreshCw className="w-3 h-3 mr-1.5" />
                Submit Answers & Recalculate Impact
              </Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* Government Verification Modal */}
      {showVerificationModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Government Impact Verification
                </h3>
                <p className="text-xs text-slate-500">
                  Validate or authoritatively correct the calculated impact metric for this civic issue.
                </p>
              </div>
            </div>

            {verifyError && (
              <Alert variant="destructive">
                <span className="text-xs font-semibold">{verifyError}</span>
              </Alert>
            )}

            <div className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-700">Verification Action</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setVerifyAction('VERIFY')}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      verifyAction === 'VERIFY'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Confirm Current ({displayValue.toLocaleString()})
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerifyAction('MODIFY')}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      verifyAction === 'MODIFY'
                        ? 'border-blue-600 bg-blue-50 text-blue-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Modify Value
                  </button>
                  <button
                    type="button"
                    onClick={() => setVerifyAction('REQUEST_EVIDENCE')}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      verifyAction === 'REQUEST_EVIDENCE'
                        ? 'border-amber-600 bg-amber-50 text-amber-900 font-bold'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Request Field Evidence
                  </button>
                </div>
              </div>

              {verifyAction === 'MODIFY' && (
                <div className="space-y-1">
                  <label className="font-semibold text-slate-700">
                    Authoritative Impact Value ({unitLabel})
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={verifiedValue}
                    onChange={e => setVerifiedValue(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="e.g. 5200"
                    className="w-full h-9 rounded-lg border border-slate-300 px-3 text-sm font-mono focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    Changing this value will update the challenge magnitude and immediately recalculate the official priority score.
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label className="font-semibold text-slate-700">
                  Verification Notes / Source Citation
                </label>
                <textarea
                  rows={3}
                  value={verificationNotes}
                  onChange={e => setVerificationNotes(e.target.value)}
                  placeholder="e.g. Verified via Assistant Engineer site inspection on 2026-09-10. Field census confirmed 320 connected households."
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowVerificationModal(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleVerifyOrModify}
                isLoading={isVerifying}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="w-4 h-4 mr-1.5" />
                Commit Official Verification
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

function HelpCircleIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );
}
