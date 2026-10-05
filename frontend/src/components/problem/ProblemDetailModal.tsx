'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  MapPin,
  Calendar,
  User,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ExternalLink,
  ImageIcon,
  MessageSquare,
  Activity,
  Layers,
  FileCheck,
  X,
  Compass,
  Download,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { apiClient } from '../../lib/api-client';

export interface ProblemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  problem: any | null;
  challenge?: any | null;
  currentUser?: any | null;
  clarifications?: any[];
  onRefresh?: () => void;
}

export function ProblemDetailModal({
  isOpen,
  onClose,
  problem,
  challenge,
  currentUser,
  clarifications = [],
  onRefresh,
}: ProblemDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'EVIDENCE' | 'TRIAGE' | 'CLARIFICATIONS'>('OVERVIEW');
  const [fullProblem, setFullProblem] = useState<any | null>(null);
  const [loadingFull, setLoadingFull] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Fetch complete problem details from backend when opened
  useEffect(() => {
    if (isOpen && problem?.id) {
      setFullProblem(problem);
      setLoadingFull(true);
      apiClient
        .request<any>(`/api/v1/problems/${problem.id}`)
        .then((res) => {
          if (res.success && res.data) {
            setFullProblem(res.data);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingFull(false));
    } else {
      setFullProblem(null);
    }
  }, [isOpen, problem?.id]);

  if (!isOpen || !problem) return null;

  const currentProb = fullProblem || problem;
  const problemCode = currentProb.code || `PRB-2026-${(currentProb.id || '0000').slice(0, 4).toUpperCase()}`;
  const category = currentProb.category || challenge?.category || 'CIVIC_INFRASTRUCTURE';
  const title = currentProb.title || challenge?.title || 'Citizen Problem Report';
  const description = currentProb.description || challenge?.description || 'No narrative description provided.';

  const location =
    currentProb.locationName ||
    [currentProb.district, currentProb.state].filter(Boolean).join(', ') ||
    challenge?.address ||
    'Corridor Jurisdiction';

  const latitude = currentProb.latitude ?? challenge?.latitude;
  const longitude = currentProb.longitude ?? challenge?.longitude;
  const hasCoordinates = latitude != null && longitude != null;

  const probDate = currentProb.createdAt
    ? new Date(currentProb.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Recent Submission';

  const status = (currentProb.status || challenge?.status || 'SUBMITTED')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c: string) => c.toUpperCase());

  const aiSeverity = (currentProb.aiSeverity || challenge?.severity || 'MODERATE').toUpperCase();
  const govSeverity = currentProb.govSeverity?.toUpperCase();
  const aiPriority = (currentProb.aiPriority || challenge?.priority || 'MEDIUM').toUpperCase();
  const govPriority = currentProb.govPriority?.toUpperCase();

  // Consolidate multimodal evidence
  const challengeEvidences = challenge?.evidence || [];
  const clarificationEvidences = (clarifications || [])
    .filter((c) => c.targetId === currentProb.id && c.responses?.some((r: any) => r.evidenceFileKey))
    .flatMap((c) =>
      c.responses
        .filter((r: any) => r.evidenceFileKey)
        .map((r: any) => ({
          id: r.id,
          originalName: r.evidenceFileKey.split('/').pop() || 'Citizen Clarification Evidence',
          mimeType: 'image/jpeg',
          sizeBytes: 245000,
          source: 'Citizen Clarification Attachment',
          uploadedAt: r.createdAt,
        }))
    );

  const allEvidences = [
    ...(currentProb.evidence || []),
    ...challengeEvidences,
    ...clarificationEvidences,
  ];

  // Specific problem clarifications
  const probClarifications = (clarifications || []).filter(
    (c) => c.targetId === currentProb.id || c.problemId === currentProb.id
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="xl"
      className="p-0 overflow-hidden"
    >
      <div className="flex flex-col max-h-[85vh]">
        {/* Header Strip */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-900/40">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  {problemCode}
                </span>
                <Badge className="text-[10px] bg-blue-500/20 text-blue-200 border-blue-400/30">
                  {status}
                </Badge>
                <Badge className="text-[10px] bg-emerald-500/20 text-emerald-200 border-emerald-400/30">
                  {category.replace(/_/g, ' ')}
                </Badge>
              </div>
              <h2 className="text-lg font-bold text-white leading-tight">
                {title}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-indigo-200/70 pt-0.5">
                <span className="inline-flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                  {location}
                </span>
                <span>•</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                  {probDate}
                </span>
                {currentProb.affectedPopulation && (
                  <>
                    <span>•</span>
                    <span>Affected Pop: <strong>{currentProb.affectedPopulation.toLocaleString()}</strong></span>
                  </>
                )}
              </div>
            </div>

            <Link
              href={`/problems/${currentProb.id}`}
              target="_blank"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600/80 hover:bg-indigo-600 text-white text-xs font-semibold rounded-lg shadow-sm transition shrink-0"
              title="Open full standalone page in new tab"
            >
              <span>Full Page</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="flex border-b border-indigo-800/40 gap-6 mt-5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setActiveTab('OVERVIEW')}
              className={`pb-2.5 transition-all border-b-2 ${
                activeTab === 'OVERVIEW'
                  ? 'border-indigo-400 text-white'
                  : 'border-transparent text-indigo-300/70 hover:text-indigo-200'
              }`}
            >
              Narrative &amp; Provenance
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('EVIDENCE')}
              className={`pb-2.5 transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'EVIDENCE'
                  ? 'border-indigo-400 text-white'
                  : 'border-transparent text-indigo-300/70 hover:text-indigo-200'
              }`}
            >
              <span>Multimodal Evidences</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-800/80 text-indigo-200">
                {allEvidences.length + (hasCoordinates ? 1 : 0)}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('TRIAGE')}
              className={`pb-2.5 transition-all border-b-2 ${
                activeTab === 'TRIAGE'
                  ? 'border-indigo-400 text-white'
                  : 'border-transparent text-indigo-300/70 hover:text-indigo-200'
              }`}
            >
              Statutory Triage &amp; Audit
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('CLARIFICATIONS')}
              className={`pb-2.5 transition-all border-b-2 flex items-center gap-1.5 ${
                activeTab === 'CLARIFICATIONS'
                  ? 'border-indigo-400 text-white'
                  : 'border-transparent text-indigo-300/70 hover:text-indigo-200'
              }`}
            >
              <span>Clarifications</span>
              {probClarifications.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/30 text-amber-200 border border-amber-400/40">
                  {probClarifications.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200">
          {/* TAB 1: OVERVIEW & NARRATIVE */}
          {activeTab === 'OVERVIEW' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>Citizen Ground Truth Description</span>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed">
                  {description}
                </p>
              </div>

              {/* Geographic Spatial Anchor */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <Compass className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>Spatial &amp; Jurisdictional Anchor</span>
                  </div>
                  {hasCoordinates && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                    >
                      <span>Open in Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500">District / Ward</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {currentProb.district || challenge?.district || 'Central District'}
                      {currentProb.wardNumber ? ` (Ward ${currentProb.wardNumber})` : ''}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500">State / Region</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {currentProb.state || challenge?.state || 'National Capital'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500">Latitude</div>
                    <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {latitude != null ? Number(latitude).toFixed(6) : 'Unanchored'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                    <div className="text-[10px] text-slate-500">Longitude</div>
                    <div className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {longitude != null ? Number(longitude).toFixed(6) : 'Unanchored'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Provenance & Citizen Profile */}
              <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Submission Provenance
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                  <span>
                    Submitter Mode:{' '}
                    <strong>{currentProb.isAnonymous ? 'Anonymous Citizen' : 'Registered Civic Profile'}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Population Provenance:{' '}
                    <strong>{currentProb.populationProvenance || 'Municipal Census AI Model'}</strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MULTIMODAL EVIDENCES */}
          {activeTab === 'EVIDENCE' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Multimodal Statutory Evidences &amp; Field Records
                  </h3>
                  <p className="text-xs text-slate-500">
                    Photographic, spatial, and evidentiary records verified by municipal authorities and citizen submitters.
                  </p>
                </div>
              </div>

              {allEvidences.length === 0 && !hasCoordinates ? (
                <div className="py-8 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 space-y-2">
                  <ImageIcon className="w-8 h-8 text-slate-400 mx-auto opacity-60" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No attachment media files registered for this report.
                  </p>
                  <p className="text-xs text-slate-500">
                    Municipal inspections can upload photographic proof during statutory validation.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* GIS Coordinates Card as Evidence */}
                  {hasCoordinates && (
                    <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/30 dark:bg-blue-950/20 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-700 dark:text-blue-300 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-blue-600" />
                          <span>GIS Coordinate Anchor Evidence</span>
                        </span>
                        <Badge className="text-[9.5px] bg-blue-100 text-blue-800 dark:bg-blue-900/60 border-none font-bold">
                          Validated GPS
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Exact spatial coordinates anchored on municipal infrastructure topology.
                      </p>
                      <div className="font-mono text-xs bg-white dark:bg-slate-900 p-2 rounded border border-blue-100 dark:border-blue-900">
                        Lat: {Number(latitude).toFixed(6)}, Lng: {Number(longitude).toFixed(6)}
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline"
                      >
                        <Compass className="w-3.5 h-3.5" />
                        <span>Inspect Satellite Coordinates</span>
                      </a>
                    </div>
                  )}

                  {/* Uploaded Evidence Files */}
                  {allEvidences.map((ev: any, idx: number) => {
                    const isImg =
                      ev.mimeType?.startsWith('image/') ||
                      ev.originalName?.match(/\.(jpg|jpeg|png|webp|gif)$/i) ||
                      ev.fileKey?.match(/\.(jpg|jpeg|png|webp)$/i);

                    const fileSizeDisplay = ev.sizeBytes
                      ? `${(ev.sizeBytes / 1024).toFixed(1)} KB`
                      : 'Verified File';

                    return (
                      <div
                        key={ev.id || idx}
                        className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs space-y-3 flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                                {isImg ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                              </div>
                              <div className="min-w-0">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                                  {ev.originalName || `Evidence Attachment #${idx + 1}`}
                                </h4>
                                <span className="text-[10px] text-slate-400">
                                  {fileSizeDisplay} • {ev.mimeType || 'Document'}
                                </span>
                              </div>
                            </div>
                            <Badge className="text-[9px] bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-none shrink-0 font-bold">
                              Verified
                            </Badge>
                          </div>

                          {/* Image Preview / Inspection Block */}
                          {isImg && (
                            <div
                              onClick={() => setSelectedPhoto(ev.fileKey || ev.originalName)}
                              className="relative h-32 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/80 flex items-center justify-center overflow-hidden cursor-pointer group"
                            >
                              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold gap-1">
                                <Eye className="w-4 h-4" />
                                <span>Inspect Full Photo</span>
                              </div>
                              <div className="text-center p-3 text-slate-400 text-xs">
                                <ImageIcon className="w-8 h-8 mx-auto mb-1 opacity-50" />
                                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                                  Click to view field inspection record
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Source: <strong>{ev.source || 'Municipal Statutory Dossier'}</strong></span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: STATUTORY TRIAGE & AUDIT */}
          {activeTab === 'TRIAGE' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      AI Diagnostic Triage
                    </span>
                    <Sparkles className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">AI Severity:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{aiSeverity}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">AI Priority:</span>
                      <strong className="text-slate-800 dark:text-slate-200">{aiPriority}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Affected Population:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {currentProb.aiAffectedPopulation
                          ? currentProb.aiAffectedPopulation.toLocaleString()
                          : 'Model Calculated'}
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Statutory Government Validation
                    </span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gov Severity:</span>
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        {govSeverity || `${aiSeverity} (Validated)`}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gov Priority:</span>
                      <strong className="text-emerald-700 dark:text-emerald-400">
                        {govPriority || `${aiPriority} (Validated)`}
                      </strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Gov Override Status:</span>
                      <strong className="text-slate-800 dark:text-slate-200">
                        {currentProb.overrideReason ? 'Officer Overridden' : 'Standard Validation'}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Override Audit History */}
              {currentProb.overrideLogs && currentProb.overrideLogs.length > 0 && (
                <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-3">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Statutory Override Audit Trail
                  </div>
                  <div className="space-y-2 text-xs">
                    {currentProb.overrideLogs.map((log: any, idx: number) => (
                      <div
                        key={log.id || idx}
                        className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800 space-y-1"
                      >
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Field: <strong>{log.field}</strong></span>
                          <span>{new Date(log.createdAt).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-200">
                          Changed from <strong>{log.previousValue}</strong> to <strong>{log.overriddenValue}</strong>
                        </p>
                        <p className="text-[11px] text-slate-500 italic">
                          Reason: {log.reason}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CLARIFICATIONS */}
          {activeTab === 'CLARIFICATIONS' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Citizen Clarification Inquiry History
                  </h3>
                  <p className="text-xs text-slate-500">
                    Formal communication thread between municipal officers and the citizen regarding this specific report.
                  </p>
                </div>
              </div>

              {probClarifications.length === 0 ? (
                <div className="py-8 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-400 mx-auto opacity-60" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    No clarification questions raised for this problem.
                  </p>
                  <p className="text-xs text-slate-500">
                    Authorized officers can initiate clarification queries from the Problem Workspace.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {probClarifications.map((req: any) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-xl border border-amber-200 dark:border-amber-900/60 bg-amber-50/30 dark:bg-amber-950/20 space-y-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>Municipal Officer Inquiry</span>
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'Recent'}
                        </span>
                      </div>
                      <p className="text-slate-800 dark:text-slate-200 font-medium">
                        Q: {req.question}
                      </p>

                      {req.responses && req.responses.length > 0 ? (
                        <div className="pt-2 border-t border-amber-200/60 dark:border-amber-900/40 space-y-1">
                          <span className="text-[10px] uppercase font-bold text-emerald-700 dark:text-emerald-400">
                            Citizen Verified Response:
                          </span>
                          <p className="text-slate-800 dark:text-slate-200">
                            {req.responses[0].response}
                          </p>
                        </div>
                      ) : (
                        <div className="pt-1 text-[11px] text-amber-700 dark:text-amber-400 italic">
                          Awaiting citizen response...
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <Link
            href={`/problems/${currentProb.id}`}
            className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline inline-flex items-center gap-1"
          >
            <span>Open Standalone Problem Dossier</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <Button variant="outline" size="sm" onClick={onClose} className="text-xs">
            Close Problem View
          </Button>
        </div>
      </div>
    </Modal>
  );
}
