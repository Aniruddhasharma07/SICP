'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BrainCircuit,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Layers,
  MapPin,
  Maximize2,
  Network,
  Radio,
  Share2,
  ShieldAlert,
  Sparkles,
  Zap,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export interface SimilarProblemItem {
  id: string;
  title: string;
  similarityScore: number; // 0 to 1
  distanceMeters?: number;
  status: string;
  hasSameRootCause?: boolean;
  matchReason?: string;
}

export interface RootCauseData {
  primaryCause: string;
  confidence: number;
  systemicCategory: string;
  secondaryFactors?: string[];
  rationale?: string;
}

export interface SpatialData {
  latitude?: number;
  longitude?: number;
  address?: string;
  radiusMeters?: number;
  nearbyCount?: number;
  clusterDensity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface MergeRecommendationData {
  recommendedAction: 'MERGE' | 'LINK' | 'STANDALONE';
  canonicalId?: string;
  canonicalTitle?: string;
  confidence: number;
  rationale: string;
}

interface AiIntelligenceAccordionProps {
  challengeId: string;
  rootCause?: RootCauseData;
  spatialData?: SpatialData;
  similarProblems?: SimilarProblemItem[];
  mergeRecommendation?: MergeRecommendationData;
  userRole?: string;
  isMerged?: boolean;
  canonicalChallengeId?: string;
  onOpenDrawer?: () => void;
  onTriggerMerge?: (canonicalId: string, reason: string) => void;
}

export function AiIntelligenceAccordion({
  challengeId,
  rootCause = {
    primaryCause: 'Undersized Culvert & Sediment Blockage at Main Canal Conduit',
    confidence: 93,
    systemicCategory: 'CIVIL_STORMWATER_INFRASTRUCTURE',
    secondaryFactors: [
      'Unplanned pavement runoff diversion from adjacent commercial hub',
      'Solid waste accumulation at intake grates',
      'High seasonal water table delaying natural percolation',
    ],
    rationale: 'AI spatial clustering and historical hydrology data indicate consistent overflow patterns during precipitation exceeding 25mm/hr.',
  },
  spatialData = {
    latitude: 12.9716,
    longitude: 77.5946,
    address: 'Corridor 4, Ward 15, Central Administrative District',
    radiusMeters: 450,
    nearbyCount: 4,
    clusterDensity: 'HIGH',
  },
  similarProblems = [
    {
      id: 'ch-prev-001',
      title: 'Repetitive street flooding near 4th Cross Bus Terminal',
      similarityScore: 0.94,
      distanceMeters: 280,
      status: 'UNDER_INVESTIGATION',
      hasSameRootCause: true,
      matchReason: 'Identical stormwater line feeding into Canal 2; reported 3 days prior.',
    },
    {
      id: 'ch-prev-002',
      title: 'Clogged roadside catch basins along Commercial Link Road',
      similarityScore: 0.81,
      distanceMeters: 420,
      status: 'VERIFIED',
      hasSameRootCause: true,
      matchReason: 'Downstream silt blockage preventing discharge.',
    },
  ],
  mergeRecommendation = {
    recommendedAction: 'MERGE',
    canonicalId: 'ch-prev-001',
    canonicalTitle: 'Repetitive street flooding near 4th Cross Bus Terminal',
    confidence: 92,
    rationale: 'High geospatial overlap (280m) combined with identical structural root cause. Merging preserves civic credit while focusing municipal resources on the shared culvert.',
  },
  userRole,
  isMerged = false,
  canonicalChallengeId,
  onOpenDrawer,
  onTriggerMerge,
}: AiIntelligenceAccordionProps) {
  // Section toggle state
  const [openSections, setOpenSections] = useState<{
    rootCause: boolean;
    spatial: boolean;
    duplicates: boolean;
    merge: boolean;
  }>({
    rootCause: true,
    spatial: false,
    duplicates: true,
    merge: true,
  });

  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isGovOrAdmin =
    userRole === 'GOVERNMENT_OFFICIAL' ||
    userRole === 'ADMIN' ||
    userRole === 'SUPER_ADMIN' ||
    userRole === 'DEPT_HEAD';

  return (
    <div className="bg-white rounded-xl border border-indigo-200/80 shadow-xs overflow-hidden">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 px-4 py-3 text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-indigo-500/30 border border-indigo-400/40 text-indigo-200">
            <Sparkles className="w-4 h-4 text-indigo-300 animate-pulse" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              Context-Aware Problem Intelligence
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-400/30">
                Active Analysis
              </span>
            </h3>
            <p className="text-[11px] text-slate-300">
              Real-time semantic similarity, geospatial clustering & systemic merge recommendations
            </p>
          </div>
        </div>

        {onOpenDrawer && (
          <Button
            size="sm"
            variant="outline"
            onClick={onOpenDrawer}
            className="text-xs bg-white/10 hover:bg-white/20 text-white border-white/20 h-7 flex items-center gap-1.5"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Open Deep Inspector</span>
          </Button>
        )}
      </div>

      <div className="divide-y divide-slate-100">
        {/* SECTION 1: Deep Root Cause */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection('rootCause')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                <BrainCircuit className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Root-Cause Intelligence & Structural Genesis
                </span>
                <span className="text-[11px] text-slate-500">
                  Identified systemic cause with {rootCause.confidence}% confidence
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-mono border-red-200 text-red-700 bg-red-50">
                {rootCause.systemicCategory.replace(/_/g, ' ')}
              </Badge>
              {openSections.rootCause ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {openSections.rootCause && (
            <div className="px-4 pb-4 pt-1 bg-slate-50/40 text-xs space-y-2.5">
              <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase text-slate-400">
                    Primary Failure Vector
                  </span>
                  <span className="text-xs font-semibold text-emerald-700">
                    Confidence: {rootCause.confidence}%
                  </span>
                </div>
                <p className="font-bold text-slate-900 text-xs sm:text-sm">{rootCause.primaryCause}</p>
                {rootCause.rationale && (
                  <p className="text-slate-600 text-xs leading-relaxed pt-1 border-t border-slate-100">
                    <span className="font-semibold text-slate-700">AI Rationale: </span>
                    {rootCause.rationale}
                  </p>
                )}
              </div>

              {rootCause.secondaryFactors && rootCause.secondaryFactors.length > 0 && (
                <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                  <span className="text-[11px] font-bold uppercase text-slate-400 block">
                    Secondary Contributing Factors
                  </span>
                  <ul className="space-y-1 text-slate-600 list-disc list-inside">
                    {rootCause.secondaryFactors.map((factor, idx) => (
                      <li key={idx}>{factor}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 2: Spatial Proximity & Density Radar */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection('spatial')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                <Radio className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Geospatial Radar & Incident Clustering
                </span>
                <span className="text-[11px] text-slate-500">
                  {spatialData.nearbyCount || 0} incidents detected within {spatialData.radiusMeters || 500}m radius
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  spatialData.clusterDensity === 'CRITICAL' || spatialData.clusterDensity === 'HIGH'
                    ? 'destructive'
                    : 'default'
                }
                className="text-[10px]"
              >
                {spatialData.clusterDensity || 'MODERATE'} DENSITY
              </Badge>
              {openSections.spatial ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {openSections.spatial && (
            <div className="px-4 pb-4 pt-1 bg-slate-50/40 text-xs space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Monitoring Radius
                  </span>
                  <span className="font-bold text-slate-800 text-sm">
                    {spatialData.radiusMeters || 500} meters
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Cluster Hotspot
                  </span>
                  <span className="font-bold text-blue-600 text-sm">
                    {spatialData.nearbyCount || 0} Active Reports
                  </span>
                </div>
                <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Spatial Density Index
                  </span>
                  <span className="font-bold text-amber-600 text-sm">
                    {spatialData.clusterDensity || 'NORMAL'}
                  </span>
                </div>
              </div>
              {spatialData.address && (
                <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center gap-2 text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="text-xs truncate">{spatialData.address}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 3: Duplicate & Similarity Matrix */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection('duplicates')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                <Network className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Duplicate & Related Problem Detection
                </span>
                <span className="text-[11px] text-slate-500">
                  {similarProblems.length} correlated civic reports evaluated
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] border-amber-200 text-amber-800 bg-amber-50">
                {similarProblems.length} MATCHES
              </Badge>
              {openSections.duplicates ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {openSections.duplicates && (
            <div className="px-4 pb-4 pt-1 bg-slate-50/40 text-xs space-y-2">
              {similarProblems.length === 0 ? (
                <p className="p-3 text-center text-slate-500 bg-white rounded-lg border border-slate-200">
                  No direct duplicates or overlapping reports detected within jurisdiction.
                </p>
              ) : (
                <div className="space-y-2">
                  {similarProblems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <Badge
                              variant={item.similarityScore >= 0.85 ? 'destructive' : 'warning'}
                              className="text-[10px]"
                            >
                              {Math.round(item.similarityScore * 100)}% Match
                            </Badge>
                            {item.distanceMeters !== undefined && (
                              <span className="text-[10px] text-slate-500 font-mono">
                                📍 {item.distanceMeters}m away
                              </span>
                            )}
                            {item.hasSameRootCause && (
                              <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.2 rounded">
                                Same Root Cause
                              </span>
                            )}
                          </div>
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{item.title}</h4>
                        </div>
                        <Link href={`/challenges/${item.id}`} target="_blank">
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-blue-600">
                            View <ExternalLink className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      </div>
                      {item.matchReason && (
                        <p className="text-[11px] text-slate-600 bg-slate-50 p-1.5 rounded border border-slate-100">
                          <span className="font-semibold text-slate-700">Correlation: </span>
                          {item.matchReason}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SECTION 4: Systemic & Merge Intelligence Recommendation */}
        <div>
          <button
            type="button"
            onClick={() => toggleSection('merge')}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <div className="p-1.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-slate-900 block">
                  Systemic Consolidation & Merge Recommendation
                </span>
                <span className="text-[11px] text-slate-500">
                  {mergeRecommendation.recommendedAction === 'MERGE'
                    ? 'Consolidation into Master Record recommended'
                    : 'Maintain independent challenge with cross-links'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={mergeRecommendation.recommendedAction === 'MERGE' ? 'destructive' : 'outline'}
                className="text-[10px]"
              >
                {mergeRecommendation.recommendedAction}
              </Badge>
              {openSections.merge ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </div>
          </button>

          {openSections.merge && (
            <div className="px-4 pb-4 pt-1 bg-slate-50/40 text-xs space-y-3">
              <div className="p-3 bg-purple-50/60 border border-purple-200 rounded-lg space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wide text-purple-800 block">
                      Recommended Course of Action
                    </span>
                    <p className="font-bold text-purple-950 text-xs sm:text-sm">
                      {mergeRecommendation.recommendedAction === 'MERGE'
                        ? `Merge into Canonical Record: ${mergeRecommendation.canonicalTitle || mergeRecommendation.canonicalId}`
                        : 'Keep As Standalone Challenge'}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-purple-700 bg-white px-2 py-0.5 rounded border border-purple-200 shrink-0">
                    {mergeRecommendation.confidence}% Confidence
                  </span>
                </div>

                <p className="text-xs text-purple-900 leading-relaxed">
                  {mergeRecommendation.rationale}
                </p>

                <div className="p-2 bg-white rounded border border-purple-100 flex items-center gap-2 text-purple-800 text-[11px]">
                  <Share2 className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                  <span>
                    <strong>Citizen Credit Guarantee:</strong> Merging transfers voter support and preserves the citizen&apos;s original report, timestamp, and audit trail in the master problem.
                  </span>
                </div>

                {isGovOrAdmin &&
                  !isMerged &&
                  mergeRecommendation.recommendedAction === 'MERGE' &&
                  mergeRecommendation.canonicalId &&
                  onTriggerMerge && (
                    <div className="pt-2 flex justify-end">
                      <Button
                        size="sm"
                        onClick={() =>
                          onTriggerMerge(
                            mergeRecommendation.canonicalId!,
                            mergeRecommendation.rationale
                          )
                        }
                        className="bg-purple-700 hover:bg-purple-800 text-white text-xs h-8"
                      >
                        <Layers className="w-3.5 h-3.5 mr-1.5" />
                        Execute Consolidation Merge
                      </Button>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
