'use client';

import React from 'react';
import { cn } from '../../lib/utils';
import { Check, Clock, AlertCircle, Circle } from 'lucide-react';

export interface TimelineStage {
  id: string;
  label: string;
  shortLabel?: string;
  status: 'completed' | 'current' | 'upcoming' | 'blocked';
  actor?: string;
  timestamp?: string;
  description?: string;
}

export interface LifecycleTimelineProps {
  stages?: TimelineStage[];
  activeStageId?: string;
  onSelectStage?: (stageId: string) => void;
  className?: string;
  compact?: boolean;
}

export function LifecycleTimeline({
  stages = [
    { id: '1', label: 'Problem Reported', status: 'completed', actor: 'Citizen Submitter', timestamp: 'Day 1' },
    { id: '2', label: 'AI Synthesis', status: 'completed', actor: 'Intelligence Engine', timestamp: 'Day 1' },
    { id: '3', label: 'Gov Triage', status: 'completed', actor: 'Municipal Officer', timestamp: 'Day 3' },
    { id: '4', label: 'Univ Routing', status: 'completed', actor: 'Research Desk', timestamp: 'Day 5' },
    { id: '5', label: 'Team Formed', status: 'completed', actor: 'Lead Faculty', timestamp: 'Day 8' },
    { id: '6', label: 'Proposal Approved', status: 'current', actor: 'Innovation Board', timestamp: 'Active' },
    { id: '7', label: 'Prototype & Testing', status: 'upcoming', actor: 'Engineering Lab', timestamp: 'Pending' },
    { id: '8', label: 'Civic Pilot', status: 'upcoming', actor: 'Field Operations', timestamp: 'Pending' },
    { id: '9', label: 'Citizen Verified', status: 'upcoming', actor: 'Community & PRI', timestamp: 'Pending' },
    { id: '10', label: 'Solution Memory', status: 'upcoming', actor: 'Platform Archive', timestamp: 'Pending' },
  ],
  activeStageId,
  onSelectStage,
  className,
  compact = false,
}: LifecycleTimelineProps) {
  return (
    <div className={cn('w-full overflow-x-auto py-2', className)}>
      <div className="flex items-center min-w-[720px] justify-between relative px-2">
        {stages.map((stage, idx) => {
          const isSelected = activeStageId === stage.id;
          const isCompleted = stage.status === 'completed';
          const isCurrent = stage.status === 'current';
          const isBlocked = stage.status === 'blocked';

          return (
            <React.Fragment key={stage.id}>
              <button
                type="button"
                onClick={() => onSelectStage?.(stage.id)}
                className={cn(
                  'flex flex-col items-center group relative text-center focus:outline-none transition-all',
                  onSelectStage ? 'cursor-pointer' : 'cursor-default'
                )}
              >
                {/* Node Circle */}
                <div
                  className={cn(
                    'w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs transition-all shadow-2xs z-10',
                    isCompleted
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-blue-600 text-white ring-4 ring-blue-100 animate-pulse'
                      : isBlocked
                      ? 'bg-rose-600 text-white ring-4 ring-rose-100'
                      : 'bg-white border-2 border-slate-300 text-slate-400 group-hover:border-slate-400',
                    isSelected ? 'ring-2 ring-blue-500 scale-110' : ''
                  )}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  ) : isBlocked ? (
                    <AlertCircle className="w-3.5 h-3.5" />
                  ) : isCurrent ? (
                    <Clock className="w-3.5 h-3.5" />
                  ) : (
                    <span className="text-[10px]">{idx + 1}</span>
                  )}
                </div>

                {/* Stage Label */}
                <div className="mt-2 max-w-[85px] space-y-0.5">
                  <span
                    className={cn(
                      'block text-[11px] leading-tight font-semibold truncate',
                      isCurrent
                        ? 'text-blue-600 font-bold'
                        : isCompleted
                        ? 'text-slate-800'
                        : isBlocked
                        ? 'text-rose-600'
                        : 'text-slate-400'
                    )}
                  >
                    {stage.shortLabel || stage.label}
                  </span>
                  {!compact && stage.actor && (
                    <span className="block text-[9px] text-slate-400 truncate">
                      {stage.actor}
                    </span>
                  )}
                </div>
              </button>

              {/* Connecting Line */}
              {idx < stages.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-0.5 mx-1 -mt-6 transition-colors',
                    isCompleted
                      ? 'bg-emerald-500'
                      : isCurrent
                      ? 'bg-gradient-to-r from-emerald-500 to-slate-200'
                      : 'bg-slate-200'
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
