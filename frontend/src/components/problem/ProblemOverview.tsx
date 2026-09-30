'use client';

import React from 'react';
import { MapPin, Calendar, CheckCircle2, AlertCircle, FileText, Camera, Shield } from 'lucide-react';
import { Badge } from '../ui/Badge';
import { ChallengeIntelligenceDto } from '@sicp/shared';
import { ExtendedChallenge } from './ProblemWorkspace';

interface ProblemOverviewProps {
  challenge: ExtendedChallenge;
  intelligence?: ChallengeIntelligenceDto | null;
}

export function ProblemOverview({ challenge, intelligence }: ProblemOverviewProps) {
  const reportedDate = challenge.createdAt
    ? new Date(challenge.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Recent';

  const locationText = [challenge.district, challenge.state].filter(Boolean).join(', ') || 'Local Ward';
  const hasPhotos = challenge.evidence && challenge.evidence.length > 0;
  const hasDescription = !!challenge.description && challenge.description.trim().length > 0;

  const categoryDisplay =
    intelligence?.understanding?.categoryDisplay ||
    intelligence?.summary?.category ||
    challenge.category?.replace(/_/g, ' ') ||
    'Civic Infrastructure';

  const severityDisplay = (challenge.severity || 'MODERATE').toUpperCase();

  const formattedStatus = challenge.status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-7 shadow-sm">
      {/* Header Info */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700 font-mono">
            REF-{challenge.id.slice(0, 6).toUpperCase()}
          </Badge>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <MapPin className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-slate-900 dark:text-slate-100">{locationText}</span>
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            Reported: <span className="text-slate-900 dark:text-slate-200">{reportedDate}</span>
          </span>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <Badge
            className={
              challenge.status === 'APPROVED' || challenge.status === 'RESOLVED'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                : 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800'
            }
          >
            {formattedStatus}
          </Badge>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-snug">
          {challenge.title}
        </h1>

        <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed max-w-4xl">
          {challenge.description}
        </p>
      </div>

      {/* Problem Intelligence Understanding Card */}
      <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800/80">
        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-lg p-4 sm:p-5 border border-slate-200/80 dark:border-slate-700/60">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Problem Intelligence
            </h2>
          </div>

          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 mb-4">
            SICP understands this as:{' '}
            <span className="font-normal text-slate-700 dark:text-slate-300">
              {intelligence?.summary?.statement || `A citizen-reported ${categoryDisplay.toLowerCase()} issue.`}
            </span>
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-200/60 dark:border-slate-700/50 text-xs">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-1">Category</span>
              <span className="font-semibold text-slate-900 dark:text-slate-100">{categoryDisplay}</span>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-1">Severity</span>
              <span
                className={`font-semibold ${
                  severityDisplay === 'CRITICAL' || severityDisplay === 'SEVERE'
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-slate-900 dark:text-slate-100'
                }`}
              >
                {severityDisplay}
              </span>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 block mb-1">Evidence Status</span>
              <div className="space-y-1">
                <span className="inline-flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                  <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  Citizen description available
                </span>
                <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                  <Camera className="w-3.5 h-3.5 text-slate-400" />
                  Photo: {hasPhotos ? 'Provided' : 'Not provided'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
