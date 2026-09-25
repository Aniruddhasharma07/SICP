'use client';

import React, { useState, useEffect } from 'react';
import {
  InfrastructureGraphDto,
  InfrastructureNodeDto,
  InfrastructureImpactStatus,
  InfrastructureNodeType,
  BranchDifferentialStatus,
} from '@sicp/shared';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
  ShieldCheck,
  AlertTriangle,
  HelpCircle,
  Activity,
  Layers,
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  GitCommit,
  Network,
} from 'lucide-react';
import { Badge } from '../ui/Badge';
import { ExplainWhy } from '../common/ExplainWhy';

interface InfrastructureGraphVisualizerProps {
  graph: InfrastructureGraphDto;
  onSelectNode?: (node: InfrastructureNodeDto) => void;
}

export function InfrastructureGraphVisualizer({ graph, onSelectNode }: InfrastructureGraphVisualizerProps) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const [selectedNode, setSelectedNode] = useState<InfrastructureNodeDto | null>(null);
  const [traversalStep, setTraversalStep] = useState<number>(4); // 0=none, 1=signals(layer 4), 2=feeder(layer 3), 3=trunk(layer 2), 4=LCA(layer 1), 5=complete
  const [isTraversing, setIsTraversing] = useState<boolean>(false);

  // Play traversal animation: citizen signals (layer 4) -> distribution/feeder (layer 3) -> trunk (layer 2) -> LCA (layer 1) -> source (layer 0)
  const runTraversalAnimation = () => {
    setIsTraversing(true);
    setTraversalStep(1);
    setTimeout(() => setTraversalStep(2), 350);
    setTimeout(() => setTraversalStep(3), 700);
    setTimeout(() => setTraversalStep(4), 1050);
    setTimeout(() => {
      setTraversalStep(5);
      setIsTraversing(false);
    }, 1400);
  };

  // Fallback for unavailable infrastructure network
  if (!graph || !graph.nodes || graph.nodes.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-4">
        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/60 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <Network className="w-6 h-6" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2">
            <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Infrastructure topology unavailable; catchment-based relationship is an inference.
            </h4>
            <Badge variant="warning" className="font-mono text-[10px]">
              INFERRED
            </Badge>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg mx-auto">
            Official municipal GIS pipe vectors for this jurisdiction are currently synchronizing. Topological lineage is approximated from administrative catchment boundaries and known feeder alignments, not physical valve schematics.
          </p>
          <div className="pt-2">
            <ExplainWhy
              title="Why is this an inference?"
              summary="Direct pipeline connectivity requires verified GIS pipe alignment layers. Until official municipal GIS vectors are ingested, SICP approximates connectivity using municipal ward catchment polygons and known bulk supply booster locations."
              technicalDetails={{
                epistemicClass: 'INFERRED',
                provenance: 'Municipal Ward Boundary Gazetteer v2.1 (Approximate Catchment)',
                invariants: 'SICP Invariant #2: Inferred catchment topology must not be claimed as verified physical infrastructure.',
              }}
              role="GOVERNMENT"
            />
          </div>
        </div>
      </div>
    );
  }

  // Layout coordinates calculation for nodes
  // Group nodes into topological layers:
  // Layer 0: TREATMENT_PLANT
  // Layer 1: RESERVOIR
  // Layer 2: TRUNK_LINE
  // Layer 3: PUMP_HOUSE, DISTRIBUTION_LINE, VALVE
  // Layer 4: SERVICE_AREA
  const getNodeLayer = (node: InfrastructureNodeDto): number => {
    switch (node.type) {
      case InfrastructureNodeType.TREATMENT_PLANT:
        return 0;
      case InfrastructureNodeType.RESERVOIR:
        return 1;
      case InfrastructureNodeType.TRUNK_LINE:
        return 2;
      case InfrastructureNodeType.PUMP_HOUSE:
      case InfrastructureNodeType.DISTRIBUTION_LINE:
      case InfrastructureNodeType.VALVE:
        return 3;
      case InfrastructureNodeType.SERVICE_AREA:
      default:
        return 4;
    }
  };

  const layers: InfrastructureNodeDto[][] = [[], [], [], [], []];
  graph.nodes.forEach(n => {
    const l = getNodeLayer(n);
    layers[l].push(n);
  });

  // Calculate coordinates in a 900x480 coordinate space
  const nodePositions = new Map<string, { x: number; y: number }>();
  const width = 860;
  const height = 440;
  const layerY = [60, 140, 230, 320, 400];

  layers.forEach((layerNodes, lIdx) => {
    const count = layerNodes.length;
    const y = layerY[lIdx];
    layerNodes.forEach((node, nIdx) => {
      const spacing = width / (count + 1);
      const x = spacing * (nIdx + 1);
      nodePositions.set(node.id, { x, y });
    });
  });

  const getNodeVisualConfig = (node: InfrastructureNodeDto) => {
    const layer = getNodeLayer(node);
    const isStepActive =
      traversalStep === 5 ||
      (traversalStep === 1 && layer === 4) ||
      (traversalStep === 2 && layer >= 3) ||
      (traversalStep === 3 && layer >= 2) ||
      (traversalStep === 4 && layer >= 1);

    switch (node.impactStatus) {
      case InfrastructureImpactStatus.OBSERVED_AFFECTED:
        return {
          bg: isStepActive ? 'fill-red-50 dark:fill-red-950/80' : 'fill-slate-100 dark:fill-slate-800 opacity-60',
          border: isStepActive ? 'stroke-red-500' : 'stroke-slate-400',
          textColor: 'text-red-700 dark:text-red-300',
          badgeText: 'Observed Affected',
          icon: <AlertTriangle className="w-3.5 h-3.5 text-red-500 inline mr-1" />,
        };
      case InfrastructureImpactStatus.POTENTIALLY_AFFECTED:
        return {
          bg: isStepActive ? 'fill-amber-50 dark:fill-amber-950/80' : 'fill-slate-100 dark:fill-slate-800 opacity-60',
          border: isStepActive ? 'stroke-amber-500' : 'stroke-slate-400',
          textColor: 'text-amber-700 dark:text-amber-300',
          badgeText: 'Potentially Affected',
          icon: <Activity className="w-3.5 h-3.5 text-amber-500 inline mr-1" />,
        };
      case InfrastructureImpactStatus.OBSERVED_NORMAL:
        return {
          bg: isStepActive ? 'fill-emerald-50 dark:fill-emerald-950/80' : 'fill-slate-100 dark:fill-slate-800 opacity-60',
          border: isStepActive ? 'stroke-emerald-500' : 'stroke-slate-400',
          textColor: 'text-emerald-700 dark:text-emerald-300',
          badgeText: 'Verified Normal',
          icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 inline mr-1" />,
        };
      case InfrastructureImpactStatus.ROOT_CAUSE_CANDIDATE:
        return {
          bg: isStepActive ? 'fill-purple-50 dark:fill-purple-950/80' : 'fill-slate-100 dark:fill-slate-800 opacity-60',
          border: isStepActive ? 'stroke-purple-600' : 'stroke-slate-400',
          textColor: 'text-purple-700 dark:text-purple-300',
          badgeText: 'Investigating Defect',
          icon: <Layers className="w-3.5 h-3.5 text-purple-600 inline mr-1" />,
        };
      case InfrastructureImpactStatus.UNKNOWN:
      default:
        return {
          bg: 'fill-slate-50 dark:fill-slate-900',
          border: 'stroke-slate-400 dark:stroke-slate-600',
          textColor: 'text-slate-600 dark:text-slate-400',
          badgeText: 'Unknown Status',
          icon: <HelpCircle className="w-3.5 h-3.5 text-slate-400 inline mr-1" />,
        };
    }
  };

  const handleNodeClick = (node: InfrastructureNodeDto) => {
    setSelectedNode(node);
    if (onSelectNode) onSelectNode(node);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm animate-sicp-slide-up">
      {/* Top Toolbar */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-900/70">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              Infrastructure Supply Network Topology
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
              Official Municipal GIS
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Directed physical flow from treatment source to terminal residential service areas.
          </p>
        </div>

        {/* Animation & Zoom Controls */}
        <div className="flex items-center gap-2">
          {/* Replay Traversal Button (Signature #3) */}
          <button
            type="button"
            onClick={runTraversalAnimation}
            disabled={isTraversing}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/60 dark:text-blue-300 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800 transition-colors"
            title="Animate topological path from citizen signals to common ancestor"
          >
            <Play className={`w-3.5 h-3.5 ${isTraversing ? 'animate-spin' : ''}`} />
            <span>{isTraversing ? 'Traversing...' : 'Trace Path'}</span>
          </button>

          <ExplainWhy
            title="Why this infrastructure node?"
            summary="Topological graph traversal from the 4 reported citizen signals ascends through local distribution lines up to Trunk Line 4 and converges at Master Balancing Reservoir 2 (MBR-02) as the Lowest Common Ancestor. Because parallel Trunk Line 5 also originates from MBR-02 and reports normal service, the root cause is isolated downstream of MBR-02."
            evidenceItems={[
              'LCA Junction: Master Balancing Reservoir 2 (MBR-02)',
              'Affected Branch: Feeder Trunk Line 4 (Wards 11, 12, 13)',
              'Unaffected Branch: Feeder Trunk Line 5 (Ward 14)',
              'Provenance: PHED Bhopal GIS v2.1',
            ]}
            technicalDetails={{
              algorithm: 'Lowest Common Ancestor (LCA) DAG Traversal',
              epistemicClass: 'COMPUTED',
              provenance: 'Municipal Distribution GIS Layer',
              invariants: 'Branch Differential Invariant active',
            }}
            buttonText="Why LCA Node?"
            variant="badge"
          />

          <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-0.5">
            <button
              onClick={() => setZoomLevel(prev => Math.min(prev + 0.15, 1.6))}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(prev => Math.max(prev - 0.15, 0.7))}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded text-slate-600 dark:text-slate-300"
              title="Reset View"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Semantic Status Legend */}
      <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-950/40 flex flex-wrap items-center gap-4 text-xs font-medium">
        <span className="text-slate-500 dark:text-slate-400">Status Semantics:</span>
        <span className="flex items-center gap-1.5 text-red-700 dark:text-red-400">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
          Observed Affected
        </span>
        <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
          Potentially Affected
        </span>
        <span className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
          Verified Normal
        </span>
        <span className="flex items-center gap-1.5 text-purple-700 dark:text-purple-400">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
          Investigating Defect Point
        </span>
        <span className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" />
          Unknown / Unobserved
        </span>
      </div>

      {/* SVG Canvas */}
      <div className="relative overflow-auto p-4 flex justify-center bg-slate-100/50 dark:bg-slate-950/50 min-h-[480px]">
        <svg
          viewBox="0 0 880 480"
          className="w-full max-w-[880px] h-auto transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <defs>
            {/* Arrow marker for flow direction */}
            <marker
              id="flow-arrow"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
            </marker>
            <marker
              id="flow-arrow-active"
              viewBox="0 0 10 10"
              refX="18"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#3b82f6" />
            </marker>
          </defs>

          {/* Render Edges */}
          {graph.edges.map(edge => {
            const srcPos = nodePositions.get(edge.sourceNodeId);
            const tgtPos = nodePositions.get(edge.targetNodeId);
            if (!srcPos || !tgtPos) return null;

            return (
              <g key={edge.id} className="group">
                <line
                  x1={srcPos.x}
                  y1={srcPos.y}
                  x2={tgtPos.x}
                  y2={tgtPos.y}
                  className="stroke-slate-300 dark:stroke-slate-700 hover:stroke-blue-500 transition-colors"
                  strokeWidth="2.5"
                  strokeDasharray={edge.edgeType === 'BYPASS' ? '4 4' : undefined}
                  markerEnd="url(#flow-arrow)"
                />
                {/* Edge tooltip text */}
                {edge.capacityFlow && (
                  <text
                    x={(srcPos.x + tgtPos.x) / 2 + 8}
                    y={(srcPos.y + tgtPos.y) / 2}
                    className="text-[10px] fill-slate-400 dark:fill-slate-500 font-mono select-none"
                  >
                    {edge.capacityFlow}
                  </text>
                )}
              </g>
            );
          })}

          {/* Render Nodes */}
          {graph.nodes.map(node => {
            const pos = nodePositions.get(node.id);
            if (!pos) return null;

            const config = getNodeVisualConfig(node);
            const isSelected = selectedNode?.id === node.id;
            const isLcaNode = node.id === 'node-mbr-02';

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => handleNodeClick(node)}
                className="cursor-pointer group transition-all duration-300"
              >
                {/* Outer halo if selected or LCA */}
                {isSelected && (
                  <circle
                    r="28"
                    className="fill-blue-500/20 stroke-blue-500 stroke-2 animate-pulse"
                  />
                )}

                {isLcaNode && !isSelected && (
                  <circle
                    r="26"
                    className="fill-purple-500/10 stroke-purple-500/60 stroke-2 animate-sicp-pulse-subtle"
                  />
                )}

                {/* Node Circle */}
                <circle
                  r="22"
                  className={`${config.bg} ${config.border} stroke-[2.5] shadow-sm hover:scale-110 transition-transform`}
                />

                {/* Node Icon inside */}
                <foreignObject x="-10" y="-10" width="20" height="20">
                  <div className="w-full h-full flex items-center justify-center pointer-events-none">
                    {node.impactStatus === InfrastructureImpactStatus.OBSERVED_NORMAL ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : node.impactStatus === InfrastructureImpactStatus.OBSERVED_AFFECTED ? (
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    ) : (
                      <span className="text-[11px] font-bold font-mono text-slate-700 dark:text-slate-300">
                        {node.code.substring(0, 2)}
                      </span>
                    )}
                  </div>
                </foreignObject>

                {/* Node Code Label */}
                <text
                  x="0"
                  y="36"
                  textAnchor="middle"
                  className="text-[11px] font-bold fill-slate-800 dark:fill-slate-100 font-mono select-none"
                >
                  {node.code}
                </text>

                {/* Node Name Label */}
                <text
                  x="0"
                  y="48"
                  textAnchor="middle"
                  className="text-[10px] fill-slate-500 dark:fill-slate-400 select-none max-w-[120px]"
                >
                  {node.name.length > 24 ? `${node.name.substring(0, 22)}...` : node.name}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Details Drawer/Banner */}
      {selectedNode && (
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex flex-wrap items-start justify-between gap-4 animate-sicp-slide-up">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded">
                {selectedNode.code}
              </span>
              <h5 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                {selectedNode.name}
              </h5>
              <Badge variant="secondary">{selectedNode.type}</Badge>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Capacity: <strong>{selectedNode.capacity || 'Standard Grid Flow'}</strong> | Provenance: <strong>{selectedNode.provenance || 'Official Municipal GIS'}</strong>
            </p>
            {selectedNode.serviceAreaName && (
              <p className="text-xs text-slate-500">
                Service Zone: {selectedNode.serviceAreaName}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className="text-xs text-slate-500">Current Incident Impact:</div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                {selectedNode.impactStatus}
              </div>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="px-2.5 py-1 text-xs border border-slate-300 dark:border-slate-700 rounded text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
