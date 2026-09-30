'use client';

import React from 'react';
import Link from 'next/link';
import { GitFork, MapPin, Clock, ArrowRight, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Badge } from '../ui/Badge';
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

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-7 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Section 3 • Pattern Detection
          </h2>
          <p className="text-base font-bold text-slate-900 dark:text-slate-100">Related Reports</p>
        </div>
        <Badge
          className={
            relatedCount > 0
              ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800'
              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
          }
        >
          {relatedCount} {relatedCount === 1 ? 'Report' : 'Reports'}
        </Badge>
      </div>

      {relatedCount === 0 ? (
        // Clean, reassuring empty state
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
        // List of related reports with plain-language context
        <div className="space-y-4">
          <p className="text-sm text-slate-700 dark:text-slate-300">
            <span className="font-semibold text-slate-900 dark:text-slate-100">{relatedCount} nearby reports</span> describe similar issues within this municipal sector.
          </p>

          <div className="space-y-3">
            {items.map((item, idx) => (
              <div
                key={item.id || idx}
                className="p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      {item.title}
                    </span>
                    <Badge className="text-[10px] bg-slate-200/80 text-slate-800 dark:bg-slate-700 dark:text-slate-300 border-none">
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

                <Link
                  href={`/challenges/${item.id}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline self-start sm:self-center shrink-0"
                >
                  View Report
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
