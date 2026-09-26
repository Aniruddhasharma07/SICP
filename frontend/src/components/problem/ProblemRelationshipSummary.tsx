'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Network,
  Cpu,
  Layers,
  GitBranch,
  History,
  AlertTriangle,
  Info,
  ChevronDown,
} from 'lucide-react';
import {
  relationshipIntelligenceService,
  RelationshipSummaryData,
} from '../../services/relationshipIntelligenceService';
import { ProblemRelationshipPreview } from './ProblemRelationshipPreview';
import { WhyConnectedModal } from './WhyConnectedModal';
import { ChallengeDto } from '@sicp/shared';

export interface ProblemRelationshipSummaryProps {
  challenge: ChallengeDto;
  className?: string;
  initialSummary?: RelationshipSummaryData;
}

export function ProblemRelationshipSummary({
  challenge,
  className = '',
  initialSummary,
}: ProblemRelationshipSummaryProps) {
  const initial = initialSummary || relationshipIntelligenceService.deriveInitialSummary(challenge);
  const [summary, setSummary] = useState<RelationshipSummaryData>(initial);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchOpen, setIsTouchOpen] = useState(false);
  const [isWhyConnectedOpen, setIsWhyConnectedOpen] = useState(false);
  const [selectedPreviewItem, setSelectedPreviewItem] = useState<any | null>(null);

  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let isMounted = true;
    relationshipIntelligenceService.getRelationshipSummary(challenge).then(res => {
      if (isMounted && res) {
        setSummary(res);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [challenge.id]);

  // ~260ms dwell timer to prevent accidental flicker during fast scrolling
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
    }, 260); // 260ms optimal dwell
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsHovered(false);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsHovered(false);
        setIsTouchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isPopoverVisible = isHovered || isTouchOpen;

  if (!summary) return null;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block w-full ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Badge Row Strip: Restrained, Dignified Civic Infrastructure Badges */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10.5px]">
        {/* Related Incidents Badge */}
        {summary.relatedCount > 0 ? (
          <button
            type="button"
            onClick={e => {
              e.preventDefault();
              e.stopPropagation();
              setIsTouchOpen(!isTouchOpen);
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 transition cursor-pointer"
            title={`${summary.relatedCount} connected civic incident reports detected`}
            aria-label={`${summary.relatedCount} connected civic incident reports`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 dark:bg-slate-400" />
            <span>{summary.relatedCount} Related</span>
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
            <span>Isolated Report</span>
          </span>
        )}

        {/* Active Investigations Badge */}
        {summary.investigationsCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <Cpu className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            <span>{summary.investigationsCount} Active AMCH</span>
          </span>
        )}

        {/* Solution Precedents Badge */}
        {summary.precedentsCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <History className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            <span>{summary.precedentsCount} Precedents</span>
          </span>
        )}

        {/* Failure Warning Badge - High Semantic Importance */}
        {summary.failureWarningsCount > 0 && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700/80">
            <AlertTriangle className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span>{summary.failureWarningsCount} Warning</span>
          </span>
        )}

        {/* Shared Feeder Tag */}
        {summary.sharedInfrastructure && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium font-mono text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <GitBranch className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            <span>Shared Feeder</span>
          </span>
        )}

        {/* Touch / Click Affordance */}
        <button
          type="button"
          onClick={e => {
            e.preventDefault();
            e.stopPropagation();
            setIsTouchOpen(!isTouchOpen);
          }}
          className="ml-auto p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition"
          aria-label="Toggle relationship preview"
          aria-haspopup="dialog"
          aria-expanded={isPopoverVisible}
        >
          <Info className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Popover on Hover / Tap */}
      {isPopoverVisible && (
        <div
          className="absolute z-40 left-0 right-0 sm:right-auto sm:w-96 bottom-full mb-2"
          onMouseEnter={() => {
            if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
            setIsHovered(true);
          }}
          onMouseLeave={handleMouseLeave}
        >
          <ProblemRelationshipPreview
            summary={summary}
            problemTitle={challenge.title}
            onOpenWhyConnected={item => {
              setSelectedPreviewItem(item);
              setIsWhyConnectedOpen(true);
              setIsHovered(false);
              setIsTouchOpen(false);
            }}
            onClose={() => {
              setIsHovered(false);
              setIsTouchOpen(false);
            }}
          />
        </div>
      )}

      {/* "Why Connected?" Deep Dive Modal */}
      <WhyConnectedModal
        isOpen={isWhyConnectedOpen}
        onClose={() => setIsWhyConnectedOpen(false)}
        problemId={challenge.id}
        problemTitle={challenge.title}
        targetProblemTitle={selectedPreviewItem?.title || 'Correlated Municipal Incident'}
        targetProblemId={selectedPreviewItem?.id}
        relationType={selectedPreviewItem?.relationType || 'SYSTEMIC_ROOT_CAUSE'}
        confidenceScore={selectedPreviewItem?.confidenceScore || summary.confidenceScore}
        sharedInfrastructure={summary.sharedInfrastructure}
        distance={selectedPreviewItem?.distance || '1.4 km apart'}
        reasoning={selectedPreviewItem?.reasoning || 'Shared distribution conduit path downstream of Lowest Common Ancestor. Co-temporal signal emergence verifies physical line correlation.'}
      />
    </div>
  );
}

// Officially exported alias for ProblemRelationshipCardBadge requirement
export const ProblemRelationshipCardBadge = ProblemRelationshipSummary;
