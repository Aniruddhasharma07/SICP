'use client';

import React, { useState, useEffect } from 'react';
import {
  Network,
  Cpu,
  Layers,
  MapPin,
  GitBranch,
  History,
  AlertTriangle,
  Info,
  ShieldCheck,
  CheckCircle2,
  Users,
  Building2,
  GraduationCap,
  Activity,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  ArrowRight,
} from 'lucide-react';
import {
  relationshipIntelligenceService,
  ProblemKnowledgeGraphData,
  ProblemKnowledgeGraphNode,
  ProblemKnowledgeGraphEdge,
} from '../../services/relationshipIntelligenceService';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { EvidenceChip } from '../ui/EvidenceChip';
import { EvidenceEpistemicClass } from '@sicp/shared';

export interface ProblemRelationshipGraphProps {
  problemId: string;
  problemTitle: string;
  onJumpToSection?: (sectionId: string) => void;
  className?: string;
}

export function ProblemRelationshipGraph({
  problemId,
  problemTitle,
  onJumpToSection,
  className = '',
}: ProblemRelationshipGraphProps) {
  const [data, setData] = useState<ProblemKnowledgeGraphData | null>(null);
  const [selectedNode, setSelectedNode] = useState<ProblemKnowledgeGraphNode | null>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    relationshipIntelligenceService
      .getProblemKnowledgeGraph(problemId, problemTitle)
      .then(res => {
        if (isMounted) {
          setData(res);
          setSelectedNode(res.nodes.find(n => n.category === 'PROBLEM') || res.nodes[0] || null);
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [problemId, problemTitle]);

  if (loading || !data) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3 animate-pulse">
        <Network className="w-8 h-8 text-indigo-400 mx-auto animate-spin" />
        <p className="text-xs text-slate-400">Synthesizing Semantic Problem Knowledge Graph...</p>
      </div>
    );
  }

  const getNodeColor = (node: ProblemKnowledgeGraphNode) => {
    switch (node.category) {
      case 'PROBLEM':
        return {
          fill: '#1e3a8a', // Deep navy/blue
          stroke: '#60a5fa',
          text: '#93c5fd',
          badgeBg: 'bg-blue-950',
          badgeBorder: 'border-blue-700',
        };
      case 'SIGNAL_CLUSTER':
        return {
          fill: '#0f2942',
          stroke: '#38bdf8', // Cyan/sky
          text: '#7dd3fc',
          badgeBg: 'bg-sky-950',
          badgeBorder: 'border-sky-800',
        };
      case 'HYPOTHESIS':
        return {
          fill: '#2e1065',
          stroke: '#c084fc', // Purple
          text: '#e9d5ff',
          badgeBg: 'bg-purple-950',
          badgeBorder: 'border-purple-800',
        };
      case 'INFRASTRUCTURE':
        return {
          fill: '#1e1b4b',
          stroke: '#818cf8', // Indigo
          text: '#c7d2fe',
          badgeBg: 'bg-indigo-950',
          badgeBorder: 'border-indigo-800',
        };
      case 'PRECEDENT':
        return {
          fill: node.status === 'WARNING' ? '#451a03' : '#064e3b',
          stroke: node.status === 'WARNING' ? '#fbbf24' : '#34d399', // Amber or Emerald
          text: node.status === 'WARNING' ? '#fde68a' : '#a7f3d0',
          badgeBg: node.status === 'WARNING' ? 'bg-amber-950' : 'bg-emerald-950',
          badgeBorder: node.status === 'WARNING' ? 'border-amber-800' : 'border-emerald-800',
        };
      case 'COLLABORATION':
        return {
          fill: '#3b0764',
          stroke: '#d946ef', // Fuchsia
          text: '#f5d0fe',
          badgeBg: 'bg-fuchsia-950',
          badgeBorder: 'border-fuchsia-800',
        };
      case 'OUTCOME':
        return {
          fill: '#064e3b',
          stroke: '#10b981', // Emerald
          text: '#6ee7b7',
          badgeBg: 'bg-emerald-950',
          badgeBorder: 'border-emerald-800',
        };
      default:
        return {
          fill: '#1e293b',
          stroke: '#94a3b8',
          text: '#cbd5e1',
          badgeBg: 'bg-slate-900',
          badgeBorder: 'border-slate-800',
        };
    }
  };

  return (
    <div
      data-testid="problem-relationship-graph"
      className={`bg-slate-900/95 border border-slate-800 rounded-2xl overflow-hidden shadow-xl space-y-0 ${className}`}
    >
      {/* Top Banner Explaining Distinction from Topology DAG */}
      <div className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-400 bg-indigo-950 px-2 py-0.5 rounded border border-indigo-800/60">
              Semantic Knowledge Graph
            </span>
            <span className="text-xs text-slate-400 font-medium">Problem as Center of Gravity</span>
          </div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Network className="w-4 h-4 text-indigo-400" />
            Problem Relationship &amp; Institutional Intelligence Graph
          </h3>
          <p className="text-[11.5px] text-slate-400 leading-relaxed max-w-2xl">
            Visualizes the problem as the central gravitational anchor connected to empirical citizen signals, competing hypotheses, historical solution precedents, multi-sector partners, and verified ground outcomes.
          </p>
        </div>

        {/* Zoom & Reset Controls */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.15, 1.5))}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-300 transition"
              title="Zoom In"
              aria-label="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.15, 0.75))}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-300 transition"
              title="Zoom Out"
              aria-label="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="p-1.5 hover:bg-slate-800 rounded text-slate-300 transition"
              title="Reset Zoom"
              aria-label="Reset Zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Distinction Callout Strip */}
      <div className="px-4 py-2 bg-indigo-950/30 border-b border-indigo-900/40 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-indigo-300">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span className="text-[11px]">
            <strong>Analytical Distinction:</strong> This graph represents <em>knowledge, hypothesis &amp; institutional connections</em>. The 880×480 physical supply network DAG (water pipes, pumps, valves) is rendered in the Topology DAG tab.
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          Two Distinct Models
        </span>
      </div>

      {/* Main Split Layout: SVG Canvas + Inspector Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
        {/* Left: SVG Canvas (8 cols) */}
        <div className="lg:col-span-8 relative bg-slate-950/90 overflow-hidden flex items-center justify-center min-h-[460px] p-4">
          <svg
            viewBox="0 0 880 500"
            className="w-full h-auto transition-transform duration-300 cursor-grab active:cursor-grabbing"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <defs>
              <marker
                id="sem-arrow"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
              </marker>
              <marker
                id="sem-arrow-active"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 10 5 L 0 9 z" fill="#818cf8" />
              </marker>
            </defs>

            {/* Edge Connections */}
            {data.edges.map(edge => {
              const srcNode = data.nodes.find(n => n.id === edge.source);
              const tgtNode = data.nodes.find(n => n.id === edge.target);
              if (!srcNode || !tgtNode) return null;

              const isEdgeActive =
                selectedNode && (selectedNode.id === srcNode.id || selectedNode.id === tgtNode.id);

              return (
                <g key={edge.id} className="transition-opacity duration-200">
                  <line
                    x1={srcNode.x}
                    y1={srcNode.y}
                    x2={tgtNode.x}
                    y2={tgtNode.y}
                    stroke={isEdgeActive ? '#818cf8' : '#334155'}
                    strokeWidth={isEdgeActive ? 2.5 : 1.5}
                    strokeDasharray={edge.style === 'dashed' ? '5 4' : undefined}
                    markerEnd={isEdgeActive ? 'url(#sem-arrow-active)' : 'url(#sem-arrow)'}
                  />
                  {/* Edge Label on Midpoint */}
                  <rect
                    x={(srcNode.x + tgtNode.x) / 2 - 45}
                    y={(srcNode.y + tgtNode.y) / 2 - 8}
                    width={90}
                    height={16}
                    rx={4}
                    fill="#0f172a"
                    stroke={isEdgeActive ? '#6366f1' : '#1e293b'}
                    strokeWidth={1}
                  />
                  <text
                    x={(srcNode.x + tgtNode.x) / 2}
                    y={(srcNode.y + tgtNode.y) / 2 + 3}
                    textAnchor="middle"
                    fill={isEdgeActive ? '#c7d2fe' : '#94a3b8'}
                    fontSize={8.5}
                    fontFamily="monospace"
                  >
                    {edge.label.slice(0, 16)}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {data.nodes.map(node => {
              const isSelected = selectedNode?.id === node.id;
              const isCenterProblem = node.category === 'PROBLEM';
              const colors = getNodeColor(node);

              return (
                <g
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className="cursor-pointer group"
                  transform={`translate(${node.x}, ${node.y})`}
                >
                  {/* Highlight Glow Circle when Selected */}
                  {isSelected && (
                    <circle
                      r={isCenterProblem ? 50 : 38}
                      fill="none"
                      stroke={colors.stroke}
                      strokeWidth={3}
                      strokeDasharray="4 3"
                      className="animate-spin"
                      style={{ animationDuration: '10s' }}
                    />
                  )}

                  {/* Node Main Circle */}
                  <circle
                    r={isCenterProblem ? 44 : 32}
                    fill={colors.fill}
                    stroke={isSelected ? '#ffffff' : colors.stroke}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                    className="transition-transform group-hover:scale-105 duration-150"
                  />

                  {/* Center Problem Ring / Node Icon */}
                  {isCenterProblem ? (
                    <circle r={20} fill="#2563eb" stroke="#93c5fd" strokeWidth={1.5} />
                  ) : (
                    <circle r={14} fill="#0f172a" stroke={colors.stroke} strokeWidth={1} />
                  )}

                  {/* Center Node Title */}
                  <text
                    y={isCenterProblem ? 4 : 3}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize={isCenterProblem ? 11 : 9}
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    pointerEvents="none"
                  >
                    {isCenterProblem ? 'PROBLEM' : node.category.slice(0, 3)}
                  </text>

                  {/* Node Label Pill below */}
                  <rect
                    x={-75}
                    y={isCenterProblem ? 54 : 38}
                    width={150}
                    height={22}
                    rx={6}
                    fill="#020617"
                    stroke={isSelected ? colors.stroke : '#1e293b'}
                    strokeWidth={isSelected ? 1.5 : 1}
                  />
                  <text
                    y={isCenterProblem ? 68 : 52}
                    textAnchor="middle"
                    fill={colors.text}
                    fontSize={9.5}
                    fontWeight="600"
                    fontFamily="sans-serif"
                    pointerEvents="none"
                  >
                    {node.label.length > 24 ? node.label.slice(0, 22) + '...' : node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Right: Selected Node Details Inspector Panel (4 cols) */}
        <div className="lg:col-span-4 p-5 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Node Inspector
            </span>
            {selectedNode && (
              <Badge
                variant="secondary"
                className="bg-indigo-950 text-indigo-300 border-indigo-800/60 font-mono text-[10px]"
              >
                {selectedNode.epistemicClass}
              </Badge>
            )}
          </div>

          {selectedNode ? (
            <div className="space-y-4 animate-sicp-fade">
              <div className="space-y-1">
                <span className="text-[10px] font-mono text-indigo-400 block font-bold">
                  {selectedNode.category} • {selectedNode.status}
                </span>
                <h4 className="text-base font-bold text-slate-100">{selectedNode.label}</h4>
                <p className="text-xs text-slate-400">{selectedNode.sublabel}</p>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                {selectedNode.details}
              </div>

              {/* Node Semantic Context Actions */}
              <div className="pt-2 space-y-2">
                {selectedNode.category === 'HYPOTHESIS' && onJumpToSection && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onJumpToSection('investigation-layer')}
                    className="w-full border-purple-700 text-purple-300 hover:bg-purple-950/60 text-xs flex items-center justify-between"
                  >
                    <span>Inspect AMCH Matrix Layer</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}

                {selectedNode.category === 'INFRASTRUCTURE' && onJumpToSection && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onJumpToSection('relationship-layer')}
                    className="w-full border-indigo-700 text-indigo-300 hover:bg-indigo-950/60 text-xs flex items-center justify-between"
                  >
                    <span>View 880×480 Topology DAG</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}

                {selectedNode.category === 'PRECEDENT' && onJumpToSection && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onJumpToSection('memory-layer')}
                    className="w-full border-emerald-700 text-emerald-300 hover:bg-emerald-950/60 text-xs flex items-center justify-between"
                  >
                    <span>Review Solution Memory</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}

                {selectedNode.category === 'COLLABORATION' && onJumpToSection && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onJumpToSection('collaboration-layer')}
                    className="w-full border-fuchsia-700 text-fuchsia-300 hover:bg-fuchsia-950/60 text-xs flex items-center justify-between"
                  >
                    <span>Inspect Academic RFP &amp; CSR</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}

                {selectedNode.category === 'OUTCOME' && onJumpToSection && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onJumpToSection('outcome-layer')}
                    className="w-full border-emerald-700 text-emerald-300 hover:bg-emerald-950/60 text-xs flex items-center justify-between"
                  >
                    <span>Inspect Sentinel Verification</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-500 py-8 text-center">
              Click any node in the graph to inspect evidence and relationships.
            </p>
          )}

          {/* Epistemic Provenance Footer */}
          <div className="pt-4 border-t border-slate-800 text-[10.5px] text-slate-400 space-y-1">
            <span className="font-bold text-slate-300 block">Epistemic Provenance Rule:</span>
            <p className="leading-relaxed">
              Nodes reflect verified evidence classes (OBSERVED, COMPUTED, HYPOTHESIZED, VALIDATED). Connections represent semantic boundaries rather than causal proof.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
