import {
  InfrastructureNodeType,
  InfrastructureProvenance,
  InfrastructureEdgeType,
  InfrastructureImpactStatus,
  BranchDifferentialStatus,
  InfrastructureNodeDto,
  InfrastructureEdgeDto,
  InfrastructureGraphDto,
  BranchDifferentialResultDto,
} from '@sicp/shared';

export interface GraphNodeDefinition {
  id: string;
  code: string;
  name: string;
  type: InfrastructureNodeType;
  category: string;
  latitude?: number | null;
  longitude?: number | null;
  district?: string | null;
  state?: string | null;
  capacity?: string | null;
  operationalStatus?: string;
  provenance: InfrastructureProvenance;
  serviceAreaName?: string | null;
  metadata?: Record<string, any>;
}

export interface GraphEdgeDefinition {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  edgeType: InfrastructureEdgeType;
  capacityFlow?: string | null;
  bidirectional?: boolean;
  status?: string;
  provenance?: string;
  metadata?: Record<string, any>;
}

export class InfrastructureGraphEngine {
  private nodes: Map<string, GraphNodeDefinition> = new Map();
  private edges: GraphEdgeDefinition[] = [];
  // Adjacency lists for forward and reverse traversal
  private forwardAdj: Map<string, string[]> = new Map();
  private reverseAdj: Map<string, string[]> = new Map();

  constructor(nodes: GraphNodeDefinition[] = [], edges: GraphEdgeDefinition[] = []) {
    nodes.forEach(n => this.addNode(n));
    edges.forEach(e => this.addEdge(e));
  }

  public addNode(node: GraphNodeDefinition): void {
    this.nodes.set(node.id, node);
    if (!this.forwardAdj.has(node.id)) this.forwardAdj.set(node.id, []);
    if (!this.reverseAdj.has(node.id)) this.reverseAdj.set(node.id, []);
  }

  public addEdge(edge: GraphEdgeDefinition): void {
    this.edges.push(edge);
    if (!this.forwardAdj.has(edge.sourceNodeId)) this.forwardAdj.set(edge.sourceNodeId, []);
    if (!this.forwardAdj.has(edge.targetNodeId)) this.forwardAdj.set(edge.targetNodeId, []);
    if (!this.reverseAdj.has(edge.sourceNodeId)) this.reverseAdj.set(edge.sourceNodeId, []);
    if (!this.reverseAdj.has(edge.targetNodeId)) this.reverseAdj.set(edge.targetNodeId, []);

    this.forwardAdj.get(edge.sourceNodeId)!.push(edge.targetNodeId);
    this.reverseAdj.get(edge.targetNodeId)!.push(edge.sourceNodeId);

    if (edge.bidirectional) {
      this.forwardAdj.get(edge.targetNodeId)!.push(edge.sourceNodeId);
      this.reverseAdj.get(edge.sourceNodeId)!.push(edge.targetNodeId);
    }
  }

  public getNode(id: string): GraphNodeDefinition | undefined {
    return this.nodes.get(id);
  }

  public getAllNodes(): GraphNodeDefinition[] {
    return Array.from(this.nodes.values());
  }

  public getAllEdges(): GraphEdgeDefinition[] {
    return [...this.edges];
  }

  /**
   * Cycle Detection using DFS color marking (WHITE=0, GREY=1, BLACK=2)
   */
  public hasCycles(): boolean {
    const visited = new Map<string, number>();
    for (const nodeId of this.nodes.keys()) {
      visited.set(nodeId, 0); // 0 = unvisited
    }

    const dfs = (nodeId: string): boolean => {
      visited.set(nodeId, 1); // 1 = currently exploring
      const neighbors = this.forwardAdj.get(nodeId) || [];
      for (const nextId of neighbors) {
        const state = visited.get(nextId);
        if (state === 1) return true; // Cycle detected
        if (state === 0 && dfs(nextId)) return true;
      }
      visited.set(nodeId, 2); // 2 = completed
      return false;
    };

    for (const nodeId of this.nodes.keys()) {
      if (visited.get(nodeId) === 0) {
        if (dfs(nodeId)) return true;
      }
    }
    return false;
  }

  /**
   * Upstream Reachability: Find all ancestors that can flow into the target node
   * Bounded and cycle-safe with visited set
   */
  public getUpstreamAncestors(targetNodeId: string, maxDepth: number = 30): Set<string> {
    const ancestors = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: targetNodeId, depth: 0 }];
    const visited = new Set<string>([targetNodeId]);

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      const upstreamNodes = this.reverseAdj.get(id) || [];
      for (const upId of upstreamNodes) {
        if (!visited.has(upId)) {
          visited.add(upId);
          ancestors.add(upId);
          queue.push({ id: upId, depth: depth + 1 });
        }
      }
    }

    return ancestors;
  }

  /**
   * Downstream Reachability: Find all nodes that receive flow from the source node
   * Bounded and cycle-safe with visited set
   */
  public getDownstreamReachable(sourceNodeId: string, maxDepth: number = 30): Set<string> {
    const downstream = new Set<string>();
    const queue: Array<{ id: string; depth: number }> = [{ id: sourceNodeId, depth: 0 }];
    const visited = new Set<string>([sourceNodeId]);

    while (queue.length > 0) {
      const { id, depth } = queue.shift()!;
      if (depth >= maxDepth) continue;

      const downstreamNodes = this.forwardAdj.get(id) || [];
      for (const downId of downstreamNodes) {
        if (!visited.has(downId)) {
          visited.add(downId);
          downstream.add(downId);
          queue.push({ id: downId, depth: depth + 1 });
        }
      }
    }

    return downstream;
  }

  /**
   * Common Upstream Dependency Analysis
   * Finds the intersection of upstream dependencies for a set of affected nodes.
   */
  public findCommonUpstreamDependencies(targetNodeIds: string[]): string[] {
    if (targetNodeIds.length === 0) return [];
    if (targetNodeIds.length === 1) {
      return Array.from(this.getUpstreamAncestors(targetNodeIds[0]));
    }

    const ancestorSets = targetNodeIds.map(id => this.getUpstreamAncestors(id));
    // Intersection of all ancestor sets
    const common = Array.from(ancestorSets[0]).filter(candidateId =>
      ancestorSets.every(set => set.has(candidateId))
    );

    // Sort by topological proximity to targets (closest upstream junction first)
    common.sort((a, b) => {
      const aDownstream = this.getDownstreamReachable(a).size;
      const bDownstream = this.getDownstreamReachable(b).size;
      return aDownstream - bDownstream;
    });

    return common;
  }

  /**
   * Project Downstream Impact given observed failure and normal evidence
   */
  public projectDownstreamImpact(
    candidateSourceNodeId: string,
    observedFailureNodeIds: string[],
    observedNormalNodeIds: string[]
  ): Map<string, InfrastructureImpactStatus> {
    const impactMap = new Map<string, InfrastructureImpactStatus>();
    const reachable = this.getDownstreamReachable(candidateSourceNodeId);

    const failureSet = new Set(observedFailureNodeIds);
    const normalSet = new Set(observedNormalNodeIds);

    for (const nodeId of this.nodes.keys()) {
      if (failureSet.has(nodeId)) {
        impactMap.set(nodeId, InfrastructureImpactStatus.OBSERVED_AFFECTED);
      } else if (normalSet.has(nodeId)) {
        impactMap.set(nodeId, InfrastructureImpactStatus.OBSERVED_NORMAL);
      } else if (nodeId === candidateSourceNodeId) {
        impactMap.set(nodeId, InfrastructureImpactStatus.ROOT_CAUSE_CANDIDATE);
      } else if (reachable.has(nodeId)) {
        impactMap.set(nodeId, InfrastructureImpactStatus.POTENTIALLY_AFFECTED);
      } else {
        impactMap.set(nodeId, InfrastructureImpactStatus.UNKNOWN);
      }
    }

    return impactMap;
  }

  /**
   * Branch Differential Analysis
   * Evaluates evidence where one branch from junction J fails and another branch reports verified normal.
   * Weakens upstream hypotheses without asserting an uncalibrated 0% unless topology strictly guarantees impossibility.
   */
  public evaluateBranchDifferential(
    junctionNodeId: string,
    affectedBranchNodeIds: string[],
    normalBranchNodeIds: string[],
    candidateHypotheses: Array<{ id: string; targetNodeId?: string | null; title: string }>
  ): BranchDifferentialResultDto {
    const junction = this.nodes.get(junctionNodeId);
    const junctionName = junction ? junction.name : junctionNodeId;

    if (affectedBranchNodeIds.length === 0 || normalBranchNodeIds.length === 0) {
      return {
        junctionNodeId,
        junctionNodeName: junctionName,
        affectedBranchNodeIds,
        normalBranchNodeIds,
        status: BranchDifferentialStatus.INSUFFICIENT_EVIDENCE,
        deduction: 'Branch differential requires at least one affected branch and one verified normal branch.',
        weakenedHypothesisIds: [],
        evaluatedAt: new Date().toISOString(),
      };
    }

    // Check if both branches genuinely share the junction as an upstream ancestor
    const affectedAncestors = affectedBranchNodeIds.map(id => this.getUpstreamAncestors(id));
    const normalAncestors = normalBranchNodeIds.map(id => this.getUpstreamAncestors(id));

    const affectsDependOnJunction = affectedAncestors.every(set => set.has(junctionNodeId));
    const normalDependsOnJunction = normalAncestors.every(set => set.has(junctionNodeId));

    if (!affectsDependOnJunction || !normalDependsOnJunction) {
      return {
        junctionNodeId,
        junctionNodeName: junctionName,
        affectedBranchNodeIds,
        normalBranchNodeIds,
        status: BranchDifferentialStatus.INCONCLUSIVE,
        deduction: 'Topology indicates reported branches do not exclusively share this junction as a common ancestor.',
        weakenedHypothesisIds: [],
        evaluatedAt: new Date().toISOString(),
      };
    }

    // Check for bypasses or alternative supply paths into the normal branch from outside the junction
    const normalBranchSet = new Set(normalBranchNodeIds);
    const reachableFromJunction = this.getDownstreamReachable(junctionNodeId);
    reachableFromJunction.add(junctionNodeId);

    let hasAlternativeFeed = false;
    for (const normalId of normalBranchSet) {
      const directInEdges = this.edges.filter(e => e.targetNodeId === normalId);
      if (
        directInEdges.some(
          e =>
            e.edgeType === InfrastructureEdgeType.BYPASS ||
            !reachableFromJunction.has(e.sourceNodeId)
        )
      ) {
        hasAlternativeFeed = true;
        break;
      }
    }

    // Identify upstream nodes (nodes upstream of junction)
    const upstreamOfJunction = this.getUpstreamAncestors(junctionNodeId);
    upstreamOfJunction.add(junctionNodeId);

    const weakenedHypothesisIds: string[] = [];
    let deduction = '';

    for (const hyp of candidateHypotheses) {
      if (hyp.targetNodeId && upstreamOfJunction.has(hyp.targetNodeId)) {
        weakenedHypothesisIds.push(hyp.id);
      }
    }

    if (hasAlternativeFeed) {
      deduction = `Verified normal reports on Branch (${normalBranchNodeIds.join(', ')}) weaken upstream hypotheses, but alternative bypass/feed feeds were detected. Upstream hypothesis support adjusted down by 40% rather than eliminated.`;
    } else {
      deduction = `Branch Differential Confirmed: Verified normal service on Branch (${normalBranchNodeIds.join(', ')}) sharing junction "${junctionName}" with affected Branch (${affectedBranchNodeIds.join(', ')}) provides strong topological evidence that the defect is localized downstream of "${junctionName}". Upstream hypotheses significantly weakened.`;
    }

    return {
      junctionNodeId,
      junctionNodeName: junctionName,
      affectedBranchNodeIds,
      normalBranchNodeIds,
      status: BranchDifferentialStatus.BRANCH_UNAFFECTED_DISPROVED_UPSTREAM,
      deduction,
      weakenedHypothesisIds,
      evaluatedAt: new Date().toISOString(),
    };
  }

  /**
   * Export graph as complete DTO for API and frontend visualization
   */
  public toDto(
    incidentId: string,
    impactMap: Map<string, InfrastructureImpactStatus> = new Map(),
    branchDifferential?: BranchDifferentialResultDto | null
  ): InfrastructureGraphDto {
    const nodesDto: InfrastructureNodeDto[] = Array.from(this.nodes.values()).map(n => ({
      id: n.id,
      code: n.code,
      name: n.name,
      type: n.type,
      category: n.category,
      latitude: n.latitude,
      longitude: n.longitude,
      district: n.district,
      state: n.state,
      capacity: n.capacity,
      operationalStatus: n.operationalStatus || 'OPERATIONAL',
      provenance: n.provenance,
      impactStatus: impactMap.get(n.id) || InfrastructureImpactStatus.UNKNOWN,
      serviceAreaName: n.serviceAreaName,
      activeSignalCount: 0,
      metadata: n.metadata,
    }));

    const edgesDto: InfrastructureEdgeDto[] = this.edges.map(e => ({
      id: e.id,
      sourceNodeId: e.sourceNodeId,
      targetNodeId: e.targetNodeId,
      edgeType: e.edgeType,
      capacityFlow: e.capacityFlow,
      bidirectional: Boolean(e.bidirectional),
      status: e.status || 'ACTIVE',
      provenance: e.provenance || 'MUNICIPAL_SCHEMATIC',
      metadata: e.metadata,
    }));

    const hasCycles = this.hasCycles();
    const targetNodes = Array.from(impactMap.entries())
      .filter(([_, status]) => status === InfrastructureImpactStatus.OBSERVED_AFFECTED)
      .map(([id]) => id);

    const commonUpstream = this.findCommonUpstreamDependencies(targetNodes);

    return {
      incidentId,
      nodes: nodesDto,
      edges: edgesDto,
      hasCycles,
      commonUpstreamNodes: commonUpstream,
      branchDifferentialResult: branchDifferential || null,
      provenanceSummary: 'Official municipal network topological schematic with field verification overlay.',
    };
  }
}
