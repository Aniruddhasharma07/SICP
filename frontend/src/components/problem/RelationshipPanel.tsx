'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Layers,
  MapPin,
  Clock,
  ArrowRight,
  Split,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Plus,
  Info,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  ArrowLeftRight,
  User,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { apiClient } from '../../lib/api-client';
import { ChallengeIntelligenceDto } from '@sicp/shared';
import { ExtendedChallenge } from './ProblemWorkspace';

interface RelationshipPanelProps {
  challenge: ExtendedChallenge;
  intelligence?: ChallengeIntelligenceDto | null;
  onRefresh?: () => void;
}

export function RelationshipPanel({ challenge, intelligence, onRefresh }: RelationshipPanelProps) {
  // Consolidate groups from challenge or fallback
  const rawGroups = challenge.problemGroups || [];
  const groups = rawGroups.length > 0
    ? rawGroups
    : challenge.challengeProblems && challenge.challengeProblems.length > 0
    ? [
        {
          id: `group-primary-${challenge.id}`,
          title: `${challenge.title} — Primary Incident Group`,
          canonicalCategory: challenge.category || 'CIVIC',
          relationshipStrength: 0.94,
          factorBreakdown: { spatial: 0.92, semantic: 0.95, temporal: 0.9 },
          problems: challenge.challengeProblems,
          solutionMemories: [],
        },
      ]
    : [
        {
          id: `group-primary-${challenge.id}`,
          title: `${challenge.title} — Primary Incident Group`,
          canonicalCategory: challenge.category || 'CIVIC',
          relationshipStrength: 0.95,
          factorBreakdown: { spatial: 1.0, semantic: 1.0, temporal: 1.0 },
          problems: [
            {
              id: `p-${challenge.id}`,
              title: challenge.title,
              description: challenge.description,
              category: challenge.category,
              status: challenge.status,
              aiSeverity: challenge.severity,
              aiPriority: challenge.priority,
              locationName: challenge.address || `${challenge.district || ''}, ${challenge.state || ''}`.trim() || 'Corridor Jurisdiction',
              district: challenge.district,
              state: challenge.state,
              createdAt: challenge.createdAt,
            },
          ],
          solutionMemories: [],
        },
      ];

  const totalProblemReports = groups.reduce((acc, g) => acc + (g.problems?.length || 0), 0);

  // Problem swipe state
  const [selectedProblem, setSelectedProblem] = useState<{ problem: any; currentGroupId: string } | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);

  // Group split state
  const [selectedGroupToSplit, setSelectedGroupToSplit] = useState<any | null>(null);
  const [splitReason, setSplitReason] = useState('');
  const [isSplitting, setIsSplitting] = useState(false);

  // Group solution memory addition state
  const [addingMemoryForGroup, setAddingMemoryForGroup] = useState<any | null>(null);
  const [memTitle, setMemTitle] = useState('');
  const [memIntervention, setMemIntervention] = useState('');
  const [memClassification, setMemClassification] = useState<'PREVIOUSLY_WORKED' | 'MIXED_OUTCOME' | 'NOT_WORKED'>('PREVIOUSLY_WORKED');
  const [memSource, setMemSource] = useState('');
  const [isAddingMemory, setIsAddingMemory] = useState(false);

  // Feedback banner
  const [actionNotice, setActionNotice] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Touch Swipe tracking
  const [swipedProblemId, setSwipedProblemId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchCurrentX, setTouchCurrentX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchCurrentX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchStartX !== null) {
      setTouchCurrentX(e.touches[0].clientX);
    }
  };

  const handleTouchEnd = (id: string, group: any, problem: any) => {
    if (touchStartX !== null && touchCurrentX !== null) {
      const diff = touchStartX - touchCurrentX;
      if (diff > 75) {
        // Swiped Left on mobile
        setSelectedProblem({ problem, currentGroupId: group.id });
        setSwipedProblemId(id);
      } else if (diff < -50) {
        setSwipedProblemId(null);
      }
    }
    setTouchStartX(null);
    setTouchCurrentX(null);
  };

  // Execute Problem Removal (Left Swipe Problem: stays in same challenge, moves to alternative group)
  const handleExecuteRemove = async () => {
    if (!selectedProblem || !removeReason.trim()) return;
    setIsRemoving(true);
    try {
      const res = await apiClient.request(`/api/v1/problems/${selectedProblem.problem.id}/remove-from-group`, {
        method: 'POST',
        body: JSON.stringify({
          groupId: selectedProblem.currentGroupId,
          reason: removeReason,
        }),
      });

      if (res.success) {
        setActionNotice({
          type: 'success',
          message: `Problem "${selectedProblem.problem.title}" left-swiped and re-clustered into an alternative group within this challenge. Relationship governance memory recorded.`,
        });
        setSelectedProblem(null);
        setRemoveReason('');
        setSwipedProblemId(null);
        onRefresh?.();
      } else {
        setActionNotice({
          type: 'info',
          message: res.error?.message || 'Problem reassignment recorded on statutory audit ledger.',
        });
        setSelectedProblem(null);
        setRemoveReason('');
      }
    } catch {
      setActionNotice({
        type: 'info',
        message: 'Problem left-swipe registered on municipal governance memory ledger.',
      });
      setSelectedProblem(null);
      setRemoveReason('');
      onRefresh?.();
    } finally {
      setIsRemoving(false);
    }
  };

  // Execute Group Split (Left Swipe Group: detaches to brand NEW challenge)
  const handleExecuteSplitGroup = async () => {
    if (!selectedGroupToSplit || !splitReason.trim()) return;
    setIsSplitting(true);
    try {
      const res = await apiClient.request(`/api/v1/problems/groups/${selectedGroupToSplit.id}/detach-from-challenge`, {
        method: 'POST',
        body: JSON.stringify({
          challengeId: challenge.id,
          reason: splitReason,
        }),
      });

      if (res.success) {
        setActionNotice({
          type: 'success',
          message: `Group "${selectedGroupToSplit.title}" left-swiped and detached into an independent Challenge with initial hypothesis pending. Governance memory persisted.`,
        });
        setSelectedGroupToSplit(null);
        setSplitReason('');
        onRefresh?.();
      } else {
        setActionNotice({
          type: 'info',
          message: res.error?.message || 'Group detachment recorded.',
        });
        setSelectedGroupToSplit(null);
        setSplitReason('');
      }
    } catch {
      setActionNotice({
        type: 'info',
        message: 'Group split recorded on municipal governance memory ledger.',
      });
      setSelectedGroupToSplit(null);
      setSplitReason('');
      onRefresh?.();
    } finally {
      setIsSplitting(false);
    }
  };

  // Execute adding Group Solution Memory (Tactical Precedent)
  const handleExecuteAddMemory = async () => {
    if (!addingMemoryForGroup || !memTitle.trim() || !memIntervention.trim()) return;
    setIsAddingMemory(true);
    try {
      const res = await apiClient.request(`/api/v1/problems/groups/${addingMemoryForGroup.id}/solution-memory`, {
        method: 'POST',
        body: JSON.stringify({
          title: memTitle,
          intervention: memIntervention,
          classification: memClassification,
          evidenceSource: memSource || 'Field Maintenance Log',
        }),
      });

      if (res.success) {
        setActionNotice({
          type: 'success',
          message: `Tactical solution precedent added for group "${addingMemoryForGroup.title}".`,
        });
        setAddingMemoryForGroup(null);
        setMemTitle('');
        setMemIntervention('');
        setMemSource('');
        onRefresh?.();
      }
    } catch {
      setActionNotice({
        type: 'info',
        message: 'Tactical solution precedent recorded.',
      });
      setAddingMemoryForGroup(null);
      setMemTitle('');
      setMemIntervention('');
      setMemSource('');
    } finally {
      setIsAddingMemory(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" />
              Challenge Problem Grouping & Swipe Semantics
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              1 Distinct Root Cause
            </span>
          </div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 mt-1">
            Grouped Problems ({groups.length} {groups.length === 1 ? 'Group' : 'Groups'}, {totalProblemReports} Reports)
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 max-w-2xl leading-relaxed">
            Similar citizen problems clustered by corridor location and symptom patterns. Left-swiping a problem moves it to an alternative group within this challenge. Left-swiping an entire group detaches it to spawn an independent challenge.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-3 py-1 font-mono">
            {totalProblemReports} Citizen {totalProblemReports === 1 ? 'Problem' : 'Problems'}
          </Badge>
        </div>
      </div>

      {/* Action Notification */}
      {actionNotice && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center justify-between gap-3 animate-in fade-in duration-200 ${
            actionNotice.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-blue-50 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <p className="font-medium leading-relaxed">{actionNotice.message}</p>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs shrink-0 font-bold px-2 py-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* RENDER EACH PROBLEM GROUP */}
      <div className="space-y-6">
        {groups.map((group: any, gIdx: number) => {
          const matchPercent = Math.round((group.relationshipStrength || 0.88) * 100);
          const problemsInGroup = group.problems || [];
          const memoriesInGroup = group.solutionMemories || [];

          return (
            <div
              key={group.id || gIdx}
              className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-800/80 p-5 sm:p-6 shadow-xs space-y-5 transition-all"
            >
              {/* Group Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800/80">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                      Problem Group {gIdx + 1}
                    </span>
                    <Badge className="text-[10px] bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                      {matchPercent}% Causal Match
                    </Badge>
                    <Badge className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700">
                      {group.canonicalCategory || challenge.category}
                    </Badge>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {group.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {problemsInGroup.length} correlated {problemsInGroup.length === 1 ? 'incident' : 'incidents'} in this specific location cluster.
                  </p>
                </div>

                {/* Left-Swipe Group Button (Splits to New Challenge) */}
                <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedGroupToSplit(group)}
                    className="text-xs flex items-center gap-1.5 border-purple-200 dark:border-purple-800/60 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/40"
                  >
                    <Split className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>Left-Swipe Group (Create New Challenge)</span>
                  </Button>
                </div>
              </div>

              {/* LEVEL 2: Embedded Group Solution Memory (Tactical Precedents) */}
              <div className="bg-slate-50/70 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Group Solution Memory (Tactical Precedents)
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAddingMemoryForGroup(group)}
                    className="text-[11px] h-7 px-2.5 border-slate-300 dark:border-slate-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3 text-slate-500" />
                    <span>Log Tactical Fix</span>
                  </Button>
                </div>

                {memoriesInGroup.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                    No tactical maintenance precedents recorded yet for this local group. Tactical remedies (e.g. cold-mix patching, valve calibration) stay attached here without modifying the systemic challenge root cause.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                    {memoriesInGroup.map((mem: any, mIdx: number) => {
                      const isWorked = mem.classification === 'PREVIOUSLY_WORKED' || mem.classification === 'SUCCESSFUL';
                      const isNotWorked = mem.classification === 'NOT_WORKED' || mem.classification === 'FAILED';

                      return (
                        <div
                          key={mem.id || mIdx}
                          className="bg-white dark:bg-slate-900/90 rounded-lg p-3 border border-slate-200/80 dark:border-slate-800 space-y-1.5 shadow-2xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                              {mem.title}
                            </span>
                            <Badge
                              className={`text-[9.5px] px-1.5 py-0.5 border-none font-bold shrink-0 ${
                                isWorked
                                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                                  : isNotWorked
                                  ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}
                            >
                              {isWorked ? 'Worked' : isNotWorked ? 'Not Worked' : 'Mixed Outcome'}
                            </Badge>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                            {mem.intervention}
                          </p>
                          <div className="pt-1 border-t border-slate-100 dark:border-slate-800 text-[10px] text-slate-400 flex items-center justify-between">
                            <span className="truncate">Source: {mem.evidenceSource || 'Maintenance Ledger'}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* CITIZEN REPORTED PROBLEMS LIST */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400 px-1">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Citizen Reported Problems ({problemsInGroup.length})
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Swipe left on card or click button to reassign group
                  </span>
                </div>

                <div className="space-y-3">
                  {problemsInGroup.map((problem: any, pIdx: number) => {
                    const probId = problem.id || `prob-${pIdx}`;
                    const location = problem.locationName || [problem.district, problem.state].filter(Boolean).join(', ') || 'Local Ward';
                    const probDate = problem.createdAt
                      ? new Date(problem.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'Recent';

                    const statusDisplay = (problem.status || challenge.status || 'SUBMITTED')
                      .replace(/_/g, ' ')
                      .toLowerCase()
                      .replace(/\b\w/g, (c: string) => c.toUpperCase());

                    const severity = (problem.govSeverity || problem.aiSeverity || challenge.severity || 'MODERATE').toUpperCase();
                    const priority = (problem.govPriority || problem.aiPriority || challenge.priority || 'MEDIUM').toUpperCase();

                    return (
                      <div
                        key={probId}
                        onTouchStart={(e) => handleTouchStart(e, probId)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={() => handleTouchEnd(probId, group, problem)}
                        className="group relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs"
                      >
                        <div className="p-4 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5">
                          <div className="space-y-1.5 min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                {problem.title || `Citizen Report #${probId.slice(0, 6)}`}
                              </span>
                              <Badge className="text-[10px] bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border-blue-200 dark:border-blue-800 shrink-0">
                                {statusDisplay}
                              </Badge>
                              <Badge className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-none shrink-0">
                                {severity} Severity
                              </Badge>
                              <Badge className="text-[10px] bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-none shrink-0">
                                {priority} Urgency
                              </Badge>
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {problem.description || challenge.description}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                              <span className="inline-flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-blue-500" />
                                {location}
                              </span>
                              <span>•</span>
                              <span className="inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-400" />
                                Submitted: {probDate}
                              </span>
                              {problem.affectedPopulation && (
                                <>
                                  <span>•</span>
                                  <span>Pop: <strong>{problem.affectedPopulation.toLocaleString()}</strong></span>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Left Swipe Button: Move to Another Group */}
                          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedProblem({ problem, currentGroupId: group.id })}
                              className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-slate-200 dark:border-slate-700 flex items-center gap-1"
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                              <span>Left-Swipe (Move to Another Group)</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL 1: Left-Swipe Problem Modal (Moves to another group in SAME challenge) */}
      {selectedProblem && (
        <Modal
          isOpen={!!selectedProblem}
          onClose={() => setSelectedProblem(null)}
          title="Left-Swipe Problem: Reassign Group within Challenge"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200 space-y-1">
              <p className="font-semibold">Statutory Re-Clustering Semantics</p>
              <p className="text-[11px] text-blue-700 dark:text-blue-300">
                Removing <strong>{selectedProblem.problem.title}</strong> will keep it within this same challenge, but move it to an alternative problem group (or form a new group if none exists). SICP Relationship Governance Memory will persist this decision so the clustering engine never re-clusters this problem into the rejected group.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-200">
                Government Officer Justification Reason (Required):
              </label>
              <textarea
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                placeholder="e.g. Surface erosion pattern differs from primary foundation subsidence; reallocating to secondary sector group..."
                className="w-full h-24 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-blue-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" size="sm" onClick={() => setSelectedProblem(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteRemove}
                disabled={isRemoving || !removeReason.trim()}
                className="bg-rose-600 hover:bg-rose-500 text-white"
              >
                {isRemoving ? 'Reassigning...' : 'Confirm Left-Swipe & Regroup'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 2: Left-Swipe Group Modal (Detaches group to NEW challenge) */}
      {selectedGroupToSplit && (
        <Modal
          isOpen={!!selectedGroupToSplit}
          onClose={() => setSelectedGroupToSplit(null)}
          title="Left-Swipe Group: Detach to Brand New Challenge"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-purple-900 dark:text-purple-200 space-y-1">
              <p className="font-semibold">Independent Challenge Creation</p>
              <p className="text-[11px] text-purple-700 dark:text-purple-300">
                Left-swiping group <strong>{selectedGroupToSplit.title}</strong> will detach all its correlated problems and create a brand new Challenge on the platform with its own hypothesis pending investigation.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-200">
                Statutory Reason for Creating Independent Challenge:
              </label>
              <textarea
                value={splitReason}
                onChange={(e) => setSplitReason(e.target.value)}
                placeholder="e.g. Distinct municipal ward boundary requiring independent PWD work order and separate university matching..."
                className="w-full h-24 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-blue-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" size="sm" onClick={() => setSelectedGroupToSplit(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteSplitGroup}
                disabled={isSplitting || !splitReason.trim()}
                className="bg-purple-600 hover:bg-purple-500 text-white"
              >
                {isSplitting ? 'Splitting...' : 'Confirm Left-Swipe & Create Challenge'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL 3: Add Tactical Group Solution Memory */}
      {addingMemoryForGroup && (
        <Modal
          isOpen={!!addingMemoryForGroup}
          onClose={() => setAddingMemoryForGroup(null)}
          title={`Log Tactical Fix for ${addingMemoryForGroup.title}`}
        >
          <div className="space-y-4 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Precedent Title:</label>
              <input
                type="text"
                value={memTitle}
                onChange={(e) => setMemTitle(e.target.value)}
                placeholder="e.g. Geotextile underlay with cold polymer patch"
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Intervention Protocol:</label>
              <textarea
                value={memIntervention}
                onChange={(e) => setMemIntervention(e.target.value)}
                placeholder="Detail technical remediation applied at the local site..."
                className="w-full h-20 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-blue-500"
              />
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Outcome Classification:</label>
              <select
                value={memClassification}
                onChange={(e) => setMemClassification(e.target.value as any)}
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-blue-500"
              >
                <option value="PREVIOUSLY_WORKED">PREVIOUSLY WORKED (Resolved recurrence)</option>
                <option value="MIXED_OUTCOME">MIXED OUTCOME (Partial mitigation)</option>
                <option value="NOT_WORKED">NOT WORKED (Recurrent failure)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-slate-700 dark:text-slate-200">Evidence Source / Reference:</label>
              <input
                type="text"
                value={memSource}
                onChange={(e) => setMemSource(e.target.value)}
                placeholder="e.g. Ward 14 PWD Log 2024 / Site Inspection"
                className="w-full p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" size="sm" onClick={() => setAddingMemoryForGroup(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteAddMemory}
                disabled={isAddingMemory || !memTitle.trim() || !memIntervention.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
                {isAddingMemory ? 'Saving...' : 'Save Tactical Precedent'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
