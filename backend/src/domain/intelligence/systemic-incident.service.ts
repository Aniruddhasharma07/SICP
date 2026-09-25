import { prisma } from '../../database/prisma';
import {
  UserRole,
  SeverityLevel,
  SystemicIncidentStatus,
  InfrastructureNodeType,
  InfrastructureProvenance,
  InfrastructureEdgeType,
  InfrastructureImpactStatus,
  HypothesisStatus,
  SentinelProbeStatus,
  SentinelChoice,
  BranchDifferentialStatus,
  EvidenceEpistemicClass,
  SystemicIncidentSummaryDto,
  SystemicIncidentDto,
  InfrastructureGraphDto,
  RootCauseHypothesisDto,
  SentinelProbeRequestDto,
  SentinelProbeResponseDto,
  BranchDifferentialResultDto,
  EvidenceItemDto,
} from '@sicp/shared';
import { ValidationError, NotFoundError, ForbiddenError } from '../../utils/errors';
import { InfrastructureGraphEngine, GraphNodeDefinition, GraphEdgeDefinition } from './infrastructure-graph.engine';
import { CompetingHypothesesEngine, HypothesisEvaluationInput } from './competing-hypotheses.engine';
import { ProactiveSentinelService } from './proactive-sentinel.service';
import { AuditService } from '../../modules/audit/audit.service';

export class SystemicIncidentService {
  // In-memory runtime state for the controlled demonstration scenario to enable instant 30-60s rapid verification
  private static demoState: {
    incident: SystemicIncidentDto;
    graphEngine: InfrastructureGraphEngine;
    rawHypotheses: HypothesisEvaluationInput[];
    sentinelResponses: SentinelProbeResponseDto[];
    currentBranchDifferential: BranchDifferentialResultDto | null;
  } | null = null;

  /**
   * Initializes or resets the official controlled demonstration scenario
   */
  public static initControlledDemoScenario(): SystemicIncidentDto {
    const nodes: GraphNodeDefinition[] = [
      {
        id: 'node-wtp-01',
        code: 'WTP-KOLAR',
        name: 'Kolar Water Treatment Plant (150 MLD)',
        type: InfrastructureNodeType.TREATMENT_PLANT,
        category: 'WATER',
        latitude: 23.165,
        longitude: 77.405,
        district: 'Bhopal',
        state: 'Madhya Pradesh',
        capacity: '150 MLD',
        operationalStatus: 'OPERATIONAL',
        provenance: InfrastructureProvenance.CONTROLLED_DEMO,
        serviceAreaName: 'Greater Bhopal South & East Zones',
      },
      {
        id: 'node-mbr-02',
        code: 'MBR-02',
        name: 'Master Balancing Reservoir 2 (Arera Hills)',
        type: InfrastructureNodeType.RESERVOIR,
        category: 'WATER',
        latitude: 23.218,
        longitude: 77.428,
        district: 'Bhopal',
        state: 'Madhya Pradesh',
        capacity: '45 ML Storage',
        operationalStatus: 'OPERATIONAL',
        provenance: InfrastructureProvenance.CONTROLLED_DEMO,
        serviceAreaName: 'Central & South Feeder Zone',
      },
      {
        id: 'node-trunk-04',
        code: 'TRUNK-04',
        name: 'Trunk Distribution Feeder Main 4 (South Sector)',
        type: InfrastructureNodeType.TRUNK_LINE,
        category: 'WATER',
        latitude: 23.205,
        longitude: 77.442,
        district: 'Bhopal',
        state: 'Madhya Pradesh',
        capacity: '900mm Mild Steel',
        operationalStatus: 'DEGRADED',
        provenance: InfrastructureProvenance.CONTROLLED_DEMO,
        serviceAreaName: 'Wards 11, 12, 13 Distribution Loop',
      },
      {
        id: 'node-trunk-05',
        code: 'TRUNK-05',
        name: 'Trunk Distribution Feeder Main 5 (East Sector)',
        type: InfrastructureNodeType.TRUNK_LINE,
        category: 'WATER',
        latitude: 23.235,
        longitude: 77.462,
        district: 'Bhopal',
        state: 'Madhya Pradesh',
        capacity: '750mm Ductile Iron',
        operationalStatus: 'OPERATIONAL',
        provenance: InfrastructureProvenance.CONTROLLED_DEMO,
        serviceAreaName: 'Ward 14 East Sector Loop',
      },
      {
        id: 'node-bps-11',
        code: 'BPS-KOLAR-11',
        name: 'Booster Pumping Station Ward 11',
        type: InfrastructureNodeType.PUMP_HOUSE,
        category: 'WATER',
        latitude: 23.195,
        longitude: 77.438,
        district: 'Bhopal',
        state: 'Madhya Pradesh',
        capacity: '3x 75kW Centrifugal Pumps',
        operationalStatus: 'OPERATIONAL',
        provenance: InfrastructureProvenance.CONTROLLED_DEMO,
        serviceAreaName: 'Ward 11 Hillcrest Grid',
      },
      {
        id: 'node-zone-4b',
        code: 'ZONE-4B',
        name: 'Service Zone 4B (Wards 12 & 13 Residential Area)',
        type: InfrastructureNodeType.SERVICE_AREA,
        category: 'WATER',
        latitude: 23.192,
        longitude: 77.452,
        district: 'Bhopal',
        state: 'Madhya Pradesh',
        capacity: '14,200 Household Connections',
        operationalStatus: 'DEGRADED',
        provenance: InfrastructureProvenance.CONTROLLED_DEMO,
        serviceAreaName: 'Ward 12-13 Residential',
      },
      {
        id: 'node-zone-5a',
        code: 'ZONE-5A',
        name: 'Service Zone 5A (Ward 14 East Residential Area)',
        type: InfrastructureNodeType.SERVICE_AREA,
        category: 'WATER',
        latitude: 23.242,
        longitude: 77.472,
        district: 'Bhopal',
        state: 'Madhya Pradesh',
        capacity: '11,800 Household Connections',
        operationalStatus: 'OPERATIONAL',
        provenance: InfrastructureProvenance.CONTROLLED_DEMO,
        serviceAreaName: 'Ward 14 East Residential',
      },
    ];

    const edges: GraphEdgeDefinition[] = [
      {
        id: 'edge-01',
        sourceNodeId: 'node-wtp-01',
        targetNodeId: 'node-mbr-02',
        edgeType: InfrastructureEdgeType.GRAVITY_MAIN,
        capacityFlow: '150 MLD Gravity Conduit',
        bidirectional: false,
        status: 'ACTIVE',
        provenance: 'MUNICIPAL_SCHEMATIC',
      },
      {
        id: 'edge-02',
        sourceNodeId: 'node-mbr-02',
        targetNodeId: 'node-trunk-04',
        edgeType: InfrastructureEdgeType.FEEDER_BRANCH,
        capacityFlow: 'Branch South (70 MLD)',
        bidirectional: false,
        status: 'ACTIVE',
        provenance: 'MUNICIPAL_SCHEMATIC',
      },
      {
        id: 'edge-03',
        sourceNodeId: 'node-mbr-02',
        targetNodeId: 'node-trunk-05',
        edgeType: InfrastructureEdgeType.FEEDER_BRANCH,
        capacityFlow: 'Branch East (50 MLD)',
        bidirectional: false,
        status: 'ACTIVE',
        provenance: 'MUNICIPAL_SCHEMATIC',
      },
      {
        id: 'edge-04',
        sourceNodeId: 'node-trunk-04',
        targetNodeId: 'node-bps-11',
        edgeType: InfrastructureEdgeType.FLOW_SUPPLY,
        capacityFlow: 'Direct Pressure Feed',
        bidirectional: false,
        status: 'ACTIVE',
        provenance: 'MUNICIPAL_SCHEMATIC',
      },
      {
        id: 'edge-05',
        sourceNodeId: 'node-trunk-04',
        targetNodeId: 'node-zone-4b',
        edgeType: InfrastructureEdgeType.FLOW_SUPPLY,
        capacityFlow: 'Zone Sub-mains (45 MLD)',
        bidirectional: false,
        status: 'ACTIVE',
        provenance: 'MUNICIPAL_SCHEMATIC',
      },
      {
        id: 'edge-06',
        sourceNodeId: 'node-trunk-05',
        targetNodeId: 'node-zone-5a',
        edgeType: InfrastructureEdgeType.FLOW_SUPPLY,
        capacityFlow: 'East Sub-mains (40 MLD)',
        bidirectional: false,
        status: 'ACTIVE',
        provenance: 'MUNICIPAL_SCHEMATIC',
      },
    ];

    const graphEngine = new InfrastructureGraphEngine(nodes, edges);

    // Initial impact mapping: Wards 11, 12, 13 affected; Ward 14 initially UNKNOWN
    const impactMap = graphEngine.projectDownstreamImpact(
      'node-trunk-04',
      ['node-bps-11', 'node-zone-4b'],
      [] // No normal evidence yet
    );

    const initialHypotheses: HypothesisEvaluationInput[] = [
      {
        id: 'hyp-01',
        incidentId: 'SYS-2026-BHP-001',
        title: 'Trunk Line 4 Joint Failure with Sub-soil Infiltration',
        description: 'Physical shear or gasket displacement along 900mm MS Feeder Main 4 causing localized pressure drop and sediment ingress during non-pumping diurnal cycles.',
        targetNodeId: 'node-trunk-04',
        targetNodeName: 'Trunk Distribution Feeder Main 4 (South Sector)',
        failureMode: 'TRUNK_LINE_FRACTURE_INFILTRATION',
        initialScore: 68,
        status: HypothesisStatus.LEADING_HYPOTHESIS,
        supportingEvidence: [
          {
            id: 'ev-01',
            epistemicClass: EvidenceEpistemicClass.OBSERVED,
            title: 'Cluster of 4 Citizen Reports in Wards 11-13',
            description: 'Residents report brown/turbid water and low terminal pressure at household delivery taps.',
            sourceName: 'Citizen Mobile App Reports',
            diagnosticWeight: 20,
          },
          {
            id: 'ev-02',
            epistemicClass: EvidenceEpistemicClass.COMPUTED,
            title: 'Shared Upstream Trunk Association',
            description: 'Topological analysis traces both Ward 11 and Ward 12-13 supply strictly through Trunk Line 4.',
            sourceName: 'Graph Topological Traversal',
            diagnosticWeight: 25,
          },
        ],
        contradictingEvidence: [],
        missingEvidence: [
          'Acoustic leak log verification between Ch. 2+400 and 3+100',
          'Downstream Branch B (Ward 14) comparison telemetry or sentinel confirmation',
        ],
        falsificationCriteria: 'If Ward 14 (on Branch East) also exhibits identical contamination, root cause must be upstream at MBR-02 or Treatment Plant.',
      },
      {
        id: 'hyp-02',
        incidentId: 'SYS-2026-BHP-001',
        title: 'Kolar Treatment Plant Filtration & Coagulant Disruption',
        description: 'Coagulant chemical dosage shortfall or clarifier overflow at Kolar 150 MLD plant discharging elevated turbidity plant-wide.',
        targetNodeId: 'node-wtp-01',
        targetNodeName: 'Kolar Water Treatment Plant (150 MLD)',
        failureMode: 'TREATMENT_COAGULATION_FAILURE',
        initialScore: 45,
        status: HypothesisStatus.UNDER_EVALUATION,
        supportingEvidence: [
          {
            id: 'ev-03',
            epistemicClass: EvidenceEpistemicClass.OBSERVED,
            title: 'Turbidity in Dispatched Water',
            description: 'Coloration reported by citizens could conceptually originate at primary treatment clarifiers.',
            sourceName: 'Citizen Reports',
            diagnosticWeight: 10,
          },
        ],
        contradictingEvidence: [
          {
            id: 'ev-04',
            epistemicClass: EvidenceEpistemicClass.SOURCE_DERIVED,
            title: 'WTP SCADA Outflow Turbidity Log',
            description: 'Plant laboratory log recorded treated water outlet turbidity at 0.8 NTU (well within 1.0 NTU BIS limit) at 06:00 AM.',
            sourceName: 'Kolar WTP Quality Log',
            diagnosticWeight: 20,
          },
        ],
        missingEvidence: [
          'Multi-branch differential inspection on parallel distribution trunks',
        ],
        falsificationCriteria: 'If any parallel feeder trunk (such as Trunk Line 5) reports clear, normal water, plant-wide treatment failure is conclusively refuted.',
      },
      {
        id: 'hyp-03',
        incidentId: 'SYS-2026-BHP-001',
        title: 'Ward 11 Booster Station Impeller Cavitation',
        description: 'Pump seal degradation or air ingress at Ward 11 Booster Station causing hydraulic pressure disruption.',
        targetNodeId: 'node-bps-11',
        targetNodeName: 'Booster Pumping Station Ward 11',
        failureMode: 'PUMP_STATION_CAVITATION',
        initialScore: 35,
        status: HypothesisStatus.UNDER_EVALUATION,
        supportingEvidence: [
          {
            id: 'ev-05',
            epistemicClass: EvidenceEpistemicClass.OBSERVED,
            title: 'Low Pressure in Ward 11 Elevated Zone',
            description: 'Pressure loss is pronounced at the terminal nodes of Ward 11.',
            sourceName: 'Citizen Reports',
            diagnosticWeight: 15,
          },
        ],
        contradictingEvidence: [
          {
            id: 'ev-06',
            epistemicClass: EvidenceEpistemicClass.COMPUTED,
            title: 'Gravity Flow Inconsistency in Ward 12',
            description: 'Ward 12 receives water by gravity from Trunk 4 without passing through the Ward 11 Booster Station, yet exhibits identical symptoms.',
            sourceName: 'Graph Topological Isolation',
            diagnosticWeight: 30,
          },
        ],
        missingEvidence: [
          'Booster pump current draw and suction pressure logs',
        ],
        falsificationCriteria: 'Cannot account for contamination and pressure drop in gravity-fed Ward 12.',
      },
    ];

    const evaluatedHypotheses = CompetingHypothesesEngine.evaluateMatrix(initialHypotheses);

    const initialSentinelProbe: SentinelProbeRequestDto = {
      id: 'probe-01',
      incidentId: 'SYS-2026-BHP-001',
      targetNodeId: 'node-zone-5a',
      targetNodeName: 'Service Zone 5A (Ward 14 East Residential Area)',
      serviceAreaName: 'Ward 14 East Residential (Parallel Branch)',
      inquiryTitle: 'Municipal Utility Quality Check — Ward 14 East',
      inquiryText: 'Periodic municipal utility check: How is the tap water pressure and clarity at your premises today? Please report your direct observation.',
      status: SentinelProbeStatus.DISPATCHED,
      totalSent: 150,
      totalResponses: 0,
      responseBreakdown: {
        [SentinelChoice.NORMAL_SERVICE]: 0,
        [SentinelChoice.DEGRADED_PRESSURE]: 0,
        [SentinelChoice.CONTAMINATION_ODOR]: 0,
        [SentinelChoice.NO_SERVICE]: 0,
        [SentinelChoice.UNSURE]: 0,
      },
      branchVerificationOutcome: BranchDifferentialStatus.INSUFFICIENT_EVIDENCE,
      evidenceContributionSummary: 'Pending community observations from Ward 14 to evaluate Branch Differential against Trunk Line 4.',
      dispatchedAt: new Date(Date.now() - 3600000).toISOString(),
      closedAt: null,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    };

    const incident: SystemicIncidentDto = {
      id: 'SYS-2026-BHP-001',
      code: 'SYS-2026-001',
      title: 'Bhopal Kolar Water Supply Network — Trunk Line 4 Rupture & Contamination',
      description: 'Systemic municipal water disruption detected across Wards 11, 12, and 13. Multi-point low pressure and turbidity reports correlate to common upstream feeder Trunk Line 4 originating from Master Balancing Reservoir 2.',
      category: 'WATER',
      status: SystemicIncidentStatus.INVESTIGATING,
      severity: SeverityLevel.SEVERE,
      evidenceStrength: 'STRONG',
      systemicScore: 0.84, // Heuristic evidence strength
      factorBreakdown: {
        semantic: 82,
        spatial: 78,
        temporal: 92,
        symptom: 88,
        infrastructure: 95,
        rootCause: 80,
        historical: 70,
        weights: {
          semantic: 0.18,
          spatial: 0.15,
          temporal: 0.15,
          symptom: 0.18,
          infrastructure: 0.18,
          rootCause: 0.10,
          historical: 0.06,
        },
        availableFactors: ['semantic', 'spatial', 'temporal', 'symptom', 'infrastructure', 'rootCause', 'historical'],
        unavailableFactors: [],
        scoringModelVersion: 'Heuristic Evidence Assessment v1.0',
      },
      district: 'Bhopal',
      state: 'Madhya Pradesh',
      infrastructureDomain: 'WATER_DISTRIBUTION',
      canonicalChallengeId: null,
      clusterId: null,
      assignedOfficerId: 'officer-gov-01',
      assignedOfficerName: 'Er. Rajesh Varma (Executive Engineer, PHED Bhopal)',
      validatedAt: null,
      validatedById: null,
      validatedByName: null,
      validationReason: null,
      signals: [
        {
          id: 'sig-01',
          incidentId: 'SYS-2026-BHP-001',
          title: 'Severely discolored brown water and zero pressure',
          category: 'WATER',
          severity: 'SEVERE',
          district: 'Bhopal',
          state: 'Madhya Pradesh',
          latitude: 23.193,
          longitude: 77.451,
          reportedAt: new Date(Date.now() - 7200000).toISOString(),
          closestNodeId: 'node-zone-4b',
          closestNodeName: 'Service Zone 4B (Wards 12 & 13)',
          symptomSummary: 'Turbidity, low pressure, particulate matter',
        },
        {
          id: 'sig-02',
          incidentId: 'SYS-2026-BHP-001',
          title: 'Muddy water supply during morning supply cycle',
          category: 'WATER',
          severity: 'MODERATE',
          district: 'Bhopal',
          state: 'Madhya Pradesh',
          latitude: 23.196,
          longitude: 77.454,
          reportedAt: new Date(Date.now() - 6500000).toISOString(),
          closestNodeId: 'node-zone-4b',
          closestNodeName: 'Service Zone 4B (Wards 12 & 13)',
          symptomSummary: 'Muddy appearance, low pressure',
        },
        {
          id: 'sig-03',
          incidentId: 'SYS-2026-BHP-001',
          title: 'Water pressure dropped suddenly, smelling of clay',
          category: 'WATER',
          severity: 'SEVERE',
          district: 'Bhopal',
          state: 'Madhya Pradesh',
          latitude: 23.195,
          longitude: 77.439,
          reportedAt: new Date(Date.now() - 5400000).toISOString(),
          closestNodeId: 'node-bps-11',
          closestNodeName: 'Booster Pumping Station Ward 11',
          symptomSummary: 'Pressure drop, clay odor',
        },
        {
          id: 'sig-04',
          incidentId: 'SYS-2026-BHP-001',
          title: 'Tap water unusable for cooking or drinking in Sector C',
          category: 'WATER',
          severity: 'MODERATE',
          district: 'Bhopal',
          state: 'Madhya Pradesh',
          latitude: 23.201,
          longitude: 77.447,
          reportedAt: new Date(Date.now() - 4000000).toISOString(),
          closestNodeId: 'node-trunk-04',
          closestNodeName: 'Trunk Distribution Feeder Main 4',
          symptomSummary: 'Unpotable water, silt sediment',
        },
      ],
      graph: graphEngine.toDto('SYS-2026-BHP-001', impactMap, null),
      hypotheses: evaluatedHypotheses,
      sentinelProbes: [initialSentinelProbe],
      evidenceGaps: [
        'Acoustic pipeline correlation test along Trunk Line 4 (Ch. 2+000 to 3+500)',
        'Sentinel verification from Ward 14 (Branch East) to formally rule out Kolar Treatment Plant failure',
        'Residual chlorine test at Master Balancing Reservoir 2 outlet',
      ],
      recommendedInvestigations: [
        'Dispatch PHED leak inspection team with acoustic listening rods to Trunk Line 4',
        'Review sentinel responses from Ward 14 to verify Branch Differential',
        'Initiate University R&D proposal for acoustic pipeline leak detection and hydrodynamic modeling',
      ],
      solutionMemoryPrecedentIds: [
        'mem-kolar-pipeline-2024',
        'mem-indore-trunk-remediation',
      ],
      isControlledDemo: true,
      version: 1,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.demoState = {
      incident,
      graphEngine,
      rawHypotheses: initialHypotheses,
      sentinelResponses: [],
      currentBranchDifferential: null,
    };

    return incident;
  }

  /**
   * Get all active systemic incidents (summaries)
   */
  public static async listIncidents(filters?: {
    status?: string;
    category?: string;
    district?: string;
  }): Promise<SystemicIncidentSummaryDto[]> {
    const list: SystemicIncidentSummaryDto[] = [];

    // Ensure controlled demo is always initialized
    if (!this.demoState) {
      this.initControlledDemoScenario();
    }

    if (this.demoState) {
      const demo = this.demoState.incident;
      const leading = demo.hypotheses.find(h => h.status === HypothesisStatus.LEADING_HYPOTHESIS || h.status === HypothesisStatus.HUMAN_VALIDATED) || demo.hypotheses[0];

      list.push({
        id: demo.id,
        code: demo.code,
        title: demo.title,
        category: demo.category,
        status: demo.status,
        severity: demo.severity,
        evidenceStrength: demo.evidenceStrength,
        systemicScore: demo.systemicScore,
        district: demo.district,
        state: demo.state,
        signalCount: demo.signals.length,
        leadingHypothesisTitle: leading ? leading.title : null,
        leadingHypothesisScore: leading ? leading.diagnosticSupportScore : null,
        isControlledDemo: true,
        createdAt: demo.createdAt,
        updatedAt: demo.updatedAt,
      });
    }

    // Try reading persistent incidents from Prisma if database is connected
    try {
      const dbIncidents = await prisma.systemicIncident.findMany({
        where: {
          ...(filters?.status ? { status: filters.status as any } : {}),
          ...(filters?.category ? { category: filters.category } : {}),
          ...(filters?.district ? { district: filters.district } : {}),
        },
        include: {
          signals: true,
          hypotheses: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      for (const dbi of dbIncidents) {
        // Skip duplicate if code matches demo
        if (this.demoState && dbi.code === this.demoState.incident.code) continue;

        const leading = dbi.hypotheses.find(h => h.status === 'LEADING_HYPOTHESIS' || h.status === 'HUMAN_VALIDATED') || dbi.hypotheses[0];
        list.push({
          id: dbi.id,
          code: dbi.code,
          title: dbi.title,
          category: dbi.category,
          status: dbi.status as any,
          severity: dbi.severity as any,
          evidenceStrength: dbi.evidenceStrength as any,
          systemicScore: dbi.systemicScore,
          district: dbi.district,
          state: dbi.state,
          signalCount: dbi.signals.length,
          leadingHypothesisTitle: leading ? leading.title : null,
          leadingHypothesisScore: leading ? leading.diagnosticSupportScore : null,
          isControlledDemo: dbi.isControlledDemo,
          createdAt: dbi.createdAt.toISOString(),
          updatedAt: dbi.updatedAt.toISOString(),
        });
      }
    } catch {
      // Prisma offline or unmigrated; continue safely with controlled demo
    }

    return list;
  }

  /**
   * Get full 24-point Root Cause Dossier by Incident ID
   */
  public static async getIncidentById(id: string): Promise<SystemicIncidentDto> {
    if (!this.demoState || this.demoState.incident.id === id) {
      if (!this.demoState) this.initControlledDemoScenario();
      return this.demoState!.incident;
    }

    try {
      const dbi = await prisma.systemicIncident.findUnique({
        where: { id },
        include: {
          signals: true,
          hypotheses: true,
          sentinelProbes: {
            include: { responses: true },
          },
          nodeImpacts: {
            include: { node: true },
          },
        },
      });

      if (!dbi) {
        throw new NotFoundError('Systemic Incident', id);
      }

      // Reconstruct graph DTO from db if available
      return {
        id: dbi.id,
        code: dbi.code,
        title: dbi.title,
        description: dbi.description,
        category: dbi.category,
        status: dbi.status as any,
        severity: dbi.severity as any,
        evidenceStrength: dbi.evidenceStrength as any,
        systemicScore: dbi.systemicScore,
        factorBreakdown: (dbi.factorBreakdown as any) || {},
        district: dbi.district,
        state: dbi.state,
        infrastructureDomain: dbi.infrastructureDomain,
        canonicalChallengeId: dbi.canonicalChallengeId,
        clusterId: dbi.clusterId,
        assignedOfficerId: dbi.assignedOfficerId,
        assignedOfficerName: dbi.assignedOfficerName,
        validatedAt: dbi.validatedAt?.toISOString() || null,
        validatedById: dbi.validatedById,
        validatedByName: dbi.validatedByName,
        validationReason: dbi.validationReason,
        signals: dbi.signals.map(s => ({
          id: s.id,
          incidentId: s.incidentId,
          challengeId: s.challengeId,
          title: s.title,
          category: s.category,
          severity: s.severity,
          district: s.district,
          state: s.state,
          latitude: s.latitude,
          longitude: s.longitude,
          reportedAt: s.reportedAt.toISOString(),
          closestNodeId: s.closestNodeId,
          symptomSummary: s.symptomSummary,
        })),
        graph: {
          incidentId: dbi.id,
          nodes: [],
          edges: [],
          hasCycles: false,
          commonUpstreamNodes: [],
          provenanceSummary: 'Database infrastructure graph',
        },
        hypotheses: dbi.hypotheses.map(h => ({
          id: h.id,
          incidentId: h.incidentId,
          title: h.title,
          description: h.description,
          targetNodeId: h.targetNodeId,
          failureMode: h.failureMode,
          diagnosticSupportScore: h.diagnosticSupportScore,
          status: h.status as any,
          supportingEvidence: (h.supportingEvidence as any) || [],
          contradictingEvidence: (h.contradictingEvidence as any) || [],
          missingEvidence: (h.missingEvidence as any) || [],
          falsificationCriteria: h.falsificationCriteria,
          refutationReason: h.refutationReason,
          validatedById: h.validatedById,
          validatedByName: h.validatedByName,
          validatedAt: h.validatedAt?.toISOString() || null,
          validationReason: h.validationReason,
          createdAt: h.createdAt.toISOString(),
          updatedAt: h.updatedAt.toISOString(),
        })),
        sentinelProbes: dbi.sentinelProbes.map(p => ({
          id: p.id,
          incidentId: p.incidentId,
          targetNodeId: p.targetNodeId,
          serviceAreaName: p.serviceAreaName,
          inquiryTitle: p.inquiryTitle,
          inquiryText: p.inquiryText,
          status: p.status as any,
          totalSent: p.totalSent,
          totalResponses: p.totalResponses,
          responseBreakdown: {},
          branchVerificationOutcome: p.branchVerificationOutcome as any,
          evidenceContributionSummary: p.evidenceSummary || '',
          dispatchedAt: p.dispatchedAt?.toISOString() || null,
          closedAt: p.closedAt?.toISOString() || null,
          createdAt: p.createdAt.toISOString(),
        })),
        evidenceGaps: (dbi.evidenceGaps as any) || [],
        recommendedInvestigations: (dbi.recommendedActions as any) || [],
        solutionMemoryPrecedentIds: dbi.precedentIds || [],
        isControlledDemo: dbi.isControlledDemo,
        version: dbi.version,
        createdAt: dbi.createdAt.toISOString(),
        updatedAt: dbi.updatedAt.toISOString(),
      };
    } catch {
      if (this.demoState) return this.demoState.incident;
      throw new NotFoundError('Systemic Incident', id);
    }
  }

  /**
   * Submit citizen sentinel response and trigger branch differential re-evaluation
   */
  public static async submitSentinelResponse(params: {
    probeRequestId: string;
    userId?: string | null;
    choice: SentinelChoice;
    feedbackText?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }): Promise<{
    response: SentinelProbeResponseDto;
    updatedProbe: SentinelProbeRequestDto;
    updatedHypotheses: RootCauseHypothesisDto[];
    branchDifferential: BranchDifferentialResultDto | null;
  }> {
    if (!this.demoState) this.initControlledDemoScenario();

    const responseDto: SentinelProbeResponseDto = {
      id: `resp-${Date.now()}`,
      probeRequestId: params.probeRequestId,
      userId: params.userId || null,
      responseChoice: params.choice,
      feedbackText: params.feedbackText || null,
      latitude: params.latitude || null,
      longitude: params.longitude || null,
      isVerifiedLocation: true,
      createdAt: new Date().toISOString(),
    };

    this.demoState!.sentinelResponses.push(responseDto);

    // Aggregate all responses
    const aggregation = ProactiveSentinelService.aggregateResponses(this.demoState!.sentinelResponses);

    const probe = this.demoState!.incident.sentinelProbes.find(p => p.id === params.probeRequestId) || this.demoState!.incident.sentinelProbes[0];
    probe.totalResponses = aggregation.totalResponses;
    probe.responseBreakdown = aggregation.breakdown;
    probe.branchVerificationOutcome = aggregation.outcome;
    probe.evidenceContributionSummary = aggregation.summary;

    let branchDiffResult: BranchDifferentialResultDto | null = null;
    let weakenedHypothesisIds: string[] = [];

    // If sentinel confirms normal on Branch East (Ward 14)
    if (aggregation.outcome === BranchDifferentialStatus.BRANCH_UNAFFECTED_DISPROVED_UPSTREAM) {
      branchDiffResult = this.demoState!.graphEngine.evaluateBranchDifferential(
        'node-mbr-02', // Common junction (Master Balancing Reservoir 2)
        ['node-zone-4b', 'node-bps-11'], // Affected Branch South
        ['node-zone-5a'], // Verified Normal Branch East
        this.demoState!.rawHypotheses
      );

      weakenedHypothesisIds = branchDiffResult.weakenedHypothesisIds;
      this.demoState!.currentBranchDifferential = branchDiffResult;

      // Update node impact status for Ward 14 to OBSERVED_NORMAL
      const updatedImpact = this.demoState!.graphEngine.projectDownstreamImpact(
        'node-trunk-04',
        ['node-bps-11', 'node-zone-4b'],
        ['node-zone-5a']
      );

      this.demoState!.incident.graph = this.demoState!.graphEngine.toDto(
        this.demoState!.incident.id,
        updatedImpact,
        branchDiffResult
      );

      // Add verified normal evidence to Trunk 4 hypothesis and WTP hypothesis
      const hypTrunk = this.demoState!.rawHypotheses.find(h => h.id === 'hyp-01');
      if (hypTrunk && !hypTrunk.supportingEvidence.some(e => e.id === 'ev-sentinel-normal')) {
        hypTrunk.supportingEvidence.push({
          id: 'ev-sentinel-normal',
          epistemicClass: EvidenceEpistemicClass.OBSERVED,
          title: 'Branch Differential Verification via Sentinel',
          description: `${aggregation.totalResponses} community sentinel responses from Ward 14 confirmed normal water quality, proving the disruption is localized downstream of MBR-02 on Trunk Line 4.`,
          sourceName: 'Proactive Community Sentinel',
          diagnosticWeight: 30,
        });
      }

      const hypWtp = this.demoState!.rawHypotheses.find(h => h.id === 'hyp-02');
      if (hypWtp && !hypWtp.contradictingEvidence.some(e => e.id === 'ev-branch-diff')) {
        hypWtp.contradictingEvidence.push({
          id: 'ev-branch-diff',
          epistemicClass: EvidenceEpistemicClass.COMPUTED,
          title: 'Topological Branch Differential Contradiction',
          description: 'Verified normal water in parallel East Sector demonstrates Kolar Treatment Plant is functioning normally.',
          sourceName: 'Infrastructure Branch Differential Engine',
          diagnosticWeight: 45,
        });
      }
    }

    // Recalculate hypothesis matrix
    const updatedHypotheses = CompetingHypothesesEngine.evaluateMatrix(
      this.demoState!.rawHypotheses,
      weakenedHypothesisIds
    );

    this.demoState!.incident.hypotheses = updatedHypotheses;
    this.demoState!.incident.updatedAt = new Date().toISOString();

    return {
      response: responseDto,
      updatedProbe: probe,
      updatedHypotheses,
      branchDifferential: branchDiffResult,
    };
  }

  /**
   * Authoritative Government Officer validation of leading root-cause hypothesis
   */
  public static async validateHypothesis(params: {
    incidentId: string;
    hypothesisId: string;
    reason: string;
    actorId: string;
    actorName: string;
    actorRole: UserRole;
    ipAddress?: string;
  }): Promise<SystemicIncidentDto> {
    const allowedRoles: UserRole[] = [
      UserRole.GOVERNMENT_OFFICER,
      UserRole.GOVERNMENT_DEPARTMENT,
      UserRole.SYSTEM_ADMIN,
    ];

    if (!allowedRoles.includes(params.actorRole)) {
      throw new ForbiddenError('Only authorized Government Officers or System Administrators can validate root-cause investigation hypotheses.');
    }

    if (!params.reason || params.reason.trim().length < 10) {
      throw new ValidationError('A detailed official governance reason (minimum 10 characters) is required for root-cause hypothesis validation.');
    }

    if (!this.demoState) this.initControlledDemoScenario();

    const incident = this.demoState!.incident;
    const targetHypothesis = incident.hypotheses.find(h => h.id === params.hypothesisId);
    if (!targetHypothesis) {
      throw new NotFoundError('Root Cause Hypothesis', params.hypothesisId);
    }

    // Mark as HUMAN_VALIDATED
    targetHypothesis.status = HypothesisStatus.HUMAN_VALIDATED;
    targetHypothesis.validatedById = params.actorId;
    targetHypothesis.validatedByName = params.actorName;
    targetHypothesis.validatedAt = new Date().toISOString();
    targetHypothesis.validationReason = params.reason;

    incident.status = SystemicIncidentStatus.HUMAN_VALIDATED;
    incident.validatedAt = new Date().toISOString();
    incident.validatedById = params.actorId;
    incident.validatedByName = params.actorName;
    incident.validationReason = params.reason;
    incident.updatedAt = new Date().toISOString();

    // Log governance audit
    AuditService.record({
      action: 'SYSTEMIC_INCIDENT_VALIDATED',
      resource: 'SystemicIncident',
      resourceId: incident.id,
      actorId: params.actorId,
      actorRole: params.actorRole,
      ipAddress: params.ipAddress,
      requestId: `req-sys-${Date.now()}`,
      reason: params.reason,
      newState: {
        incidentCode: incident.code,
        validatedHypothesisId: targetHypothesis.id,
        validatedHypothesisTitle: targetHypothesis.title,
      },
    }).catch(() => {});

    return incident;
  }

  /**
   * Dispatch municipal field team
   */
  public static async dispatchFieldTeam(params: {
    incidentId: string;
    instructions: string;
    targetNodeIds: string[];
    actorId: string;
    actorName: string;
    actorRole: UserRole;
  }): Promise<SystemicIncidentDto> {
    if (!this.demoState) this.initControlledDemoScenario();

    const incident = this.demoState!.incident;
    incident.status = SystemicIncidentStatus.FIELD_DISPATCHED;
    incident.recommendedInvestigations.push(
      `Field Team Dispatched by ${params.actorName} (${params.actorRole}): ${params.instructions}`
    );
    incident.updatedAt = new Date().toISOString();

    return incident;
  }

  /**
   * Convert validated incident to a high-priority multidisciplinary Project/Challenge
   * Connects to University R&D & Industry CSR co-funding
   */
  public static async createProjectIntervention(params: {
    incidentId: string;
    projectTitle: string;
    projectDescription: string;
    targetDomain: string;
    estimatedBudget?: number;
    actorId: string;
    actorRole: UserRole;
  }): Promise<{
    incident: SystemicIncidentDto;
    interventionOpportunity: {
      id: string;
      title: string;
      description: string;
      category: string;
      targetNode: string;
      eligibleUniversityDomains: string[];
      eligibleCsrThemes: string[];
      status: string;
      createdAt: string;
    };
  }> {
    if (!this.demoState) this.initControlledDemoScenario();
    const incident = this.demoState!.incident;

    incident.status = SystemicIncidentStatus.INTERVENTION_ACTIVE;
    incident.updatedAt = new Date().toISOString();

    const interventionOpportunity = {
      id: `opp-${Date.now()}`,
      title: params.projectTitle,
      description: params.projectDescription,
      category: incident.category,
      targetNode: 'Trunk Distribution Feeder Main 4 (South Sector)',
      eligibleUniversityDomains: [
        'Acoustic Pipeline Sensor IoT Design',
        'Hydrodynamic Network Simulation & Cavitation Control',
        'Real-time Potable Water Quality Nanomaterial Sensors',
      ],
      eligibleCsrThemes: [
        'Clean Water Infrastructure Remediation (Schedule VII Item 1)',
        'Urban Utility Reliability & Vulnerable Community Water Access',
      ],
      status: 'OPEN_FOR_UNIVERSITY_AND_CSR',
      createdAt: new Date().toISOString(),
    };

    return {
      incident,
      interventionOpportunity,
    };
  }
}
