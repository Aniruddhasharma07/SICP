'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Layers,
  Heart,
  Activity,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { ChallengeDto, ChallengeStatus, SeverityLevel } from '@sicp/shared';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EvidenceChip } from '../ui/EvidenceChip';

interface ProblemHeaderProps {
  challenge: ChallengeDto & {
    supportVotesCount?: number;
    isSystemic?: boolean;
    version?: number;
  };
  hasVoted: boolean;
  voteCount: number;
  isVoting: boolean;
  onToggleVote: () => void;
  onOpenSystemicMerge?: () => void;
  isGovOrAdmin?: boolean;
  activeStageLabel?: string;
  isDemoScenario?: boolean;
}

export function ProblemHeader({
  challenge,
  hasVoted,
  voteCount,
  isVoting,
  onToggleVote,
  onOpenSystemicMerge,
  isGovOrAdmin,
  activeStageLabel = 'Active Investigation',
  isDemoScenario = false,
}: ProblemHeaderProps) {
  const router = useRouter();

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            Approved by Authority
          </span>
        );
      case 'UNDER_GOV_REVIEW':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/80 text-amber-300 border border-amber-700/60">
            <Activity className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            Under Government Review
          </span>
        );
      case 'REJECTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950/80 text-rose-300 border border-rose-700/60">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            Rejected
          </span>
        );
      case 'SUBMITTED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-950/80 text-blue-300 border border-blue-700/60">
            <Clock className="w-3.5 h-3.5 text-blue-400" />
            Submitted to Queue
          </span>
        );
      case 'IN_PILOT':
      case 'DEPLOYED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-950/80 text-purple-300 border border-purple-700/60">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            Active Intervention
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/90 text-emerald-200 border border-emerald-600">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Verified &amp; Resolved
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Navigation Breadcrumb & Badges */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/"
              className="text-slate-400 hover:text-slate-200 transition font-medium"
            >
              SICP
            </Link>
            <span className="text-slate-600">/</span>
            <Link
              href="/challenges"
              className="text-slate-400 hover:text-slate-200 transition font-medium flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Problems</span>
            </Link>
            <span className="text-slate-600">/</span>
            <span
              className="font-mono text-xs text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/60"
              title={challenge.id}
            >
              #{challenge.id.slice(0, 8)}...
            </span>
            <span className="text-xs text-slate-500 font-mono">v{challenge.version || 1}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {isDemoScenario && (
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-950 text-amber-300 border border-amber-600/70">
                CONTROLLED SIH DEMO
              </span>
            )}
            {challenge.isSystemic && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-950/80 text-purple-300 border border-purple-700/60">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                Systemic Civic Issue
              </span>
            )}
            {getStatusBadge(challenge.status)}
          </div>
        </div>

        {/* Main Title & Ground Reality Headline */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-400">
            <Badge variant="secondary" className="bg-slate-800 text-slate-300 border-slate-700">
              {challenge.category?.replace(/_/g, ' ')}
            </Badge>
            <span className="flex items-center gap-1 text-slate-300">
              <MapPin className="w-3.5 h-3.5 text-blue-400" />
              {challenge.district ? `${challenge.district}, ${challenge.state}` : 'Location Unmapped'}
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1 text-slate-400">
              <Clock className="w-3.5 h-3.5 text-slate-500" />
              {challenge.durationMonths ? `Persisting ${challenge.durationMonths} months` : 'Recent Incident'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-100 tracking-tight leading-tight">
            {challenge.title}
          </h1>

          <p className="text-sm text-slate-300 leading-relaxed max-w-5xl whitespace-pre-line">
            {challenge.description}
          </p>
        </div>

        {/* Quick Analytical Indicators Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-3 border-t border-slate-800 text-xs">
          <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
              Severity Level
            </span>
            <span className={`font-bold ${
              challenge.severity === SeverityLevel.CATASTROPHIC || challenge.severity === SeverityLevel.SEVERE
                ? 'text-rose-400'
                : challenge.severity === SeverityLevel.MODERATE
                ? 'text-amber-400'
                : 'text-slate-200'
            }`}>
              {challenge.severity}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
              Community Priority
            </span>
            <span className="font-bold text-amber-400 font-mono text-sm">
              {challenge.priorityScore !== undefined ? `${challenge.priorityScore}/100` : 'Calculating...'}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
              Affected Population
            </span>
            <span className="font-bold text-slate-200">
              {challenge.affectedPopulation ? `${challenge.affectedPopulation.toLocaleString()} citizens` : 'Awaiting sensor census'}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-800/80">
            <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
              Epistemic Status
            </span>
            <span className="font-bold text-indigo-300">
              {challenge.status === 'APPROVED' ? 'HUMAN_VALIDATED' : 'OBSERVED_SIGNAL'}
            </span>
          </div>

          <div className="p-2.5 bg-slate-950/50 rounded-lg border border-slate-800/80 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-semibold text-slate-400 block mb-0.5">
                Community Backing
              </span>
              <span className="font-bold text-rose-400 font-mono">
                {voteCount} citizen votes
              </span>
            </div>
            <Button
              variant={hasVoted ? 'primary' : 'outline'}
              size="sm"
              onClick={onToggleVote}
              disabled={isVoting}
              className={`h-7 px-2 text-xs ${
                hasVoted
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'border-slate-700 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 mr-1 ${hasVoted ? 'fill-current text-white' : 'text-rose-400'}`} />
              {hasVoted ? 'Supported' : 'Support'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
