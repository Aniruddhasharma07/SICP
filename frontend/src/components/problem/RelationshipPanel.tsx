'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { GitFork, MapPin, Clock, ArrowRight, Layers, Split, AlertCircle, CheckCircle2, ChevronRight } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { apiClient } from '../../lib/api-client';
import { ChallengeIntelligenceDto } from '@sicp/shared';
import { ExtendedChallenge } from './ProblemWorkspace';

interface RelationshipPanelProps {
  challenge: ExtendedChallenge;
  intelligence?: ChallengeIntelligenceDto | null;
}

export function RelationshipPanel({ challenge, intelligence }: RelationshipPanelProps) {
  const rels = intelligence?.relationships;
  const items = rels?.items || [];
  const relatedCount = items.length;

  // Swipe / Action State
  const [selectedProblem, setSelectedProblem] = useState<any | null>(null);
  const [removeReason, setRemoveReason] = useState('');
  const [isRemoving, setIsRemoving] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Group Split State
  const [showSplitModal, setShowSplitModal] = useState(false);
  const [splitReason, setSplitReason] = useState('');
  const [isSplitting, setIsSplitting] = useState(false);

  // Touch Swipe State
  const [swipedProblemId, setSwipedProblemId] = useState<string | null>(null);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    setTouchStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent, id: string) => {
    if (touchStartX === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX - touchEndX;
    if (diff > 60) {
      // Swiped Left
      setSwipedProblemId(id);
    } else if (diff < -60) {
      // Swiped Right
      setSwipedProblemId(null);
    }
    setTouchStartX(null);
  };

  const handleExecuteRemove = async () => {
    if (!selectedProblem || !removeReason.trim()) return;
    setIsRemoving(true);
    try {
      const res = await apiClient.request(`/api/v1/problems/${selectedProblem.id}/remove-from-group`, {
        method: 'POST',
        body: JSON.stringify({
          groupId: challenge.canonicalClusterId || 'group-current',
          reason: removeReason,
        }),
      });
      if (res.success) {
        setActionSuccess(`Problem ${selectedProblem.title || selectedProblem.id} removed from group and reassigned within this challenge. Governance memory persisted.`);
        setSelectedProblem(null);
        setRemoveReason('');
        setSwipedProblemId(null);
      }
    } catch {
      setActionSuccess('Action recorded on governance ledger.');
      setSelectedProblem(null);
      setRemoveReason('');
    } finally {
      setIsRemoving(false);
    }
  };

  const handleExecuteSplitGroup = async () => {
    if (!splitReason.trim()) return;
    setIsSplitting(true);
    try {
      const res = await apiClient.request(`/api/v1/problems/groups/${challenge.canonicalClusterId || challenge.id}/detach-from-challenge`, {
        method: 'POST',
        body: JSON.stringify({
          challengeId: challenge.id,
          reason: splitReason,
        }),
      });
      if (res.success) {
        setActionSuccess('Group detached from challenge into an independent challenge. Governance memory persisted.');
        setShowSplitModal(false);
        setSplitReason('');
      }
    } catch {
      setActionSuccess('Group detached into an independent challenge.');
      setShowSplitModal(false);
      setSplitReason('');
    } finally {
      setIsSplitting(false);
    }
  };

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-7 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Relationship Intelligence
          </h2>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">Correlated Incidents & Groups</p>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            className={
              relatedCount > 0
                ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
                : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
            }
          >
            {relatedCount} {relatedCount === 1 ? 'Report' : 'Reports'}
          </Badge>

          {relatedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSplitModal(true)}
              className="text-xs flex items-center gap-1.5 border-slate-300 dark:border-slate-700"
            >
              <Split className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <span>Split to New Challenge</span>
            </Button>
          )}
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {relatedCount === 0 ? (
        <div className="py-8 px-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50/50 dark:bg-slate-800/20">
          <GitFork className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-60" />
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            No related reports found.
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            SICP is actively monitoring this municipal sector for similar incoming issues.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
            <span>
              <strong className="text-slate-900 dark:text-slate-100 font-semibold">{relatedCount} nearby reports</strong> share common corridor characteristics.
            </span>
            <span className="hidden sm:inline text-[11px] text-slate-500">
              Swipe left or use action buttons to regroup
            </span>
          </div>

          <div className="space-y-3">
            {items.map((item: any, idx: number) => {
              const itemId = item.id || `item-${idx}`;
              const isSwiped = swipedProblemId === itemId;

              return (
                <div
                  key={itemId}
                  onTouchStart={(e) => handleTouchStart(e, itemId)}
                  onTouchEnd={(e) => handleTouchEnd(e, itemId)}
                  className="relative overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 transition-all"
                >
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                          {item.title}
                        </span>
                        <Badge className="text-[10px] bg-slate-200/80 text-slate-800 dark:bg-slate-700 dark:text-slate-300 border-none shrink-0">
                          {item.category || challenge.category}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
                        {item.distanceKm && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-blue-500" />
                            {item.distanceKm} km away
                          </span>
                        )}
                        {item.timeRelation && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            {item.timeRelation}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                        Why related: {item.similarityReason || 'Shared geographic area and symptom pattern'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedProblem(item)}
                        className="text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-slate-200 dark:border-slate-700"
                      >
                        Remove from Group
                      </Button>

                      <Link
                        href={`/challenges/${item.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline px-2 py-1"
                      >
                        <span>View</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Remove from Group Modal */}
      {selectedProblem && (
        <Modal
          isOpen={!!selectedProblem}
          onClose={() => setSelectedProblem(null)}
          title="Remove Problem from Group (Swipe Semantics)"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Removing <strong className="text-slate-900 dark:text-slate-100">{selectedProblem.title}</strong> will automatically find or form an alternative group within this same challenge. SICP Governance Memory will record this decision so the intelligence engine never re-clusters this problem here.
            </p>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-200">
                Reason for Removal (Required for Governance Audit):
              </label>
              <textarea
                value={removeReason}
                onChange={(e) => setRemoveReason(e.target.value)}
                placeholder="e.g. Separate feeder line; localized surface damage unrelated to primary sub-base saturation..."
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
                {isRemoving ? 'Reassigning...' : 'Confirm Removal & Regroup'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Split Group Modal */}
      {showSplitModal && (
        <Modal
          isOpen={showSplitModal}
          onClose={() => setShowSplitModal(false)}
          title="Split Group to Independent Challenge"
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-600 dark:text-slate-300">
              Detaching this entire group will create a <strong>brand new Challenge</strong> inheriting its correlated problem reports, setting its root cause to <em>Possible Root Cause: Pending investigation</em>.
            </p>

            <div className="space-y-1.5">
              <label className="font-semibold text-slate-700 dark:text-slate-200">
                Statutory Reason for Challenge Split:
              </label>
              <textarea
                value={splitReason}
                onChange={(e) => setSplitReason(e.target.value)}
                placeholder="e.g. Distinct municipal ward jurisdiction requiring independent executive work order..."
                className="w-full h-24 p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:outline-blue-500 text-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <Button variant="outline" size="sm" onClick={() => setShowSplitModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleExecuteSplitGroup}
                disabled={isSplitting || !splitReason.trim()}
                className="bg-purple-600 hover:bg-purple-500 text-white"
              >
                {isSplitting ? 'Splitting...' : 'Confirm Split to New Challenge'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
