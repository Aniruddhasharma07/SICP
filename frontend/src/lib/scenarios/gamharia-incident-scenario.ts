/**
 * Controlled Demonstration Scenario: Gamharia Block, Seraikela Kharsawan, Jharkhand
 * Modeled on authentic Jal Jeevan Mission (JJM-IMIS) and OpenStreetMap geographic vectors.
 * 
 * Epistemic Evidence Classes:
 *  - OBSERVED: Direct empirical observation (citizen voice/text report, photo, neutral sentinel response)
 *  - COMPUTED: Deterministic algorithmic output (graph traversal, spatial snapping, propagation window)
 *  - HYPOTHESIZED: Causal inference / potential explanation generated for human review
 *  - VALIDATED: Verified by authorized departmental engineer or physical field inspection
 */

export type EvidenceClass = 'OBSERVED' | 'COMPUTED' | 'HYPOTHESIZED' | 'VALIDATED';

export interface IncidentEvidenceItem {
  id: string;
  evidenceClass: EvidenceClass;
  title: string;
  description: string;
  source: string;
  timestamp: string;
  confidenceOrStrength?: string;
  metric?: string;
}

export interface RootCauseHypothesisItem {
  id: string;
  hypothesisCode: 'H1' | 'H2' | 'H3' | 'H4';
  title: string;
  level: 'HIGH' | 'MODERATE' | 'LOW';
  summary: string;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  missingEvidence: string[];
  whatWouldStrengthen: string[];
  whatWouldWeaken: string[];
  status: 'UNDER_INVESTIGATION' | 'LESS_SUPPORTED' | 'UNLIKELY' | 'VALIDATED';
}

export interface EvidenceGapItem {
  id: string;
  label: string;
  category: 'TELEMETRY' | 'FIELD_INSPECTION' | 'LAB_TEST' | 'COMMUNITY_VERIFICATION';
  status: 'AVAILABLE' | 'MISSING' | 'PENDING_DISPATCH';
  recommendedAction: string;
}

export interface InfrastructureNodeItem {
  id: string;
  code: string;
  name: string;
  type: 'WATER_SOURCE' | 'TREATMENT_PLANT' | 'PRIMARY_STORAGE' | 'ESR' | 'CONTROL_VALVE' | 'FEEDER_JUNCTION' | 'TERMINAL_HABITATION' | 'SUBSTATION';
  latitude: number;
  longitude: number;
  status: 'OPERATIONAL' | 'SUSPECTED_FAULT' | 'UNAFFECTED_BASELINE' | 'AFFECTED';
  details: string;
}

export interface InfrastructureEdgeItem {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  name: string;
  lengthMeters: number;
  diameterMm: number;
  material: string;
  designVelocityMin: number; // m/s
  designVelocityMax: number; // m/s
  isAffectedBranch: boolean;
}

export interface SentinelInquiryItem {
  id: string;
  targetHabitation: string;
  question: string;
  responses: {
    normal: number;
    unusualCloudyOdor: number;
    lowPressure: number;
    noWater: number;
    notSure: number;
  };
  totalResponses: number;
  updatedAt: string;
}

export interface SystemicIncidentScenario {
  incidentCode: string;
  title: string;
  shortSummary: string;
  jurisdiction: {
    state: string;
    district: string;
    block: string;
    schemeName: string;
    schemeCode: string;
  };
  metrics: {
    totalReports: number;
    affectedVillagesCount: number;
    unaffectedBaselineCount: number;
    temporalWindowMinutes: number;
    evidenceSignalsAvailable: number;
    evidenceSignalsTotal: number;
    evidenceStrengthScore: number; // 0 - 100
  };
  status: 'UNDER_REVIEW' | 'FIELD_DISPATCHED' | 'VALIDATED_ROOT_CAUSE' | 'RESOLVED';
  crossUtilityCascade: {
    detected: boolean;
    providerUtility: string;
    providerAsset: string;
    incidentTime: string;
    durationMinutes: number;
    hypothesis: string;
  };
  estimatedPropagationWindow: {
    minMinutes: number;
    maxMinutes: number;
    explanation: string;
  };
  nodes: InfrastructureNodeItem[];
  edges: InfrastructureEdgeItem[];
  evidenceList: IncidentEvidenceItem[];
  hypotheses: RootCauseHypothesisItem[];
  evidenceGaps: EvidenceGapItem[];
  sentinelInquiry: SentinelInquiryItem;
  solutionMemoryPrecedent: {
    hasPrecedent: boolean;
    previousIncidentCode: string;
    previousYear: number;
    validatedCause: string;
    interventionApplied: string;
    verifiedOutcome: string;
    institutionalLesson: string;
  };
}

export const GAMHARIA_SYSTEMIC_INCIDENT_SI_204: SystemicIncidentScenario = {
  incidentCode: 'SI-204',
  title: 'Water Supply Service Disruption — Kandra Rural Water Supply Scheme',
  shortSummary: '25 citizen reports across 3 villages indicate a shared feeder-level disruption rather than isolated pipe leaks.',
  jurisdiction: {
    state: 'Jharkhand',
    district: 'Seraikela Kharsawan',
    block: 'Gamharia',
    schemeName: 'Kandra Multi-Village Water Supply Scheme (JJM)',
    schemeCode: 'JJM-JHK-SER-092',
  },
  metrics: {
    totalReports: 25,
    affectedVillagesCount: 3,
    unaffectedBaselineCount: 1,
    temporalWindowMinutes: 41,
    evidenceSignalsAvailable: 8,
    evidenceSignalsTotal: 12,
    evidenceStrengthScore: 84,
  },
  status: 'UNDER_REVIEW',
  crossUtilityCascade: {
    detected: true,
    providerUtility: 'JBVNL Power Grid',
    providerAsset: 'Gamharia 33/11kV Substation',
    incidentTime: '07:45 AM (Today)',
    durationMinutes: 90,
    hypothesis: 'Potential cross-utility cascade: 90-minute substation power trip halted high-lift intake pumps, causing hydraulic line depressurization and suspected back-siphonage before morning supply cycle.',
  },
  estimatedPropagationWindow: {
    minMinutes: 35,
    maxMinutes: 60,
    explanation: 'Estimated network propagation window based on nominal pipeline velocity parameters (0.8–1.4 m/s). Parametric engineering estimate, not full hydraulic simulation.',
  },
  nodes: [
    {
      id: 'node-intake',
      code: 'W-01',
      name: 'Subarnarekha River Intake Well',
      type: 'WATER_SOURCE',
      latitude: 22.8214,
      longitude: 86.0821,
      status: 'OPERATIONAL',
      details: 'Surface water intake; raw water turbidity normal at intake chamber.',
    },
    {
      id: 'node-wtp',
      code: 'WTP-01',
      name: 'Kandra Water Treatment Plant (25 MLD)',
      type: 'TREATMENT_PLANT',
      latitude: 22.7934,
      longitude: 86.1042,
      status: 'OPERATIONAL',
      details: 'Primary clariflocculator and rapid sand filters operational.',
    },
    {
      id: 'node-mbr',
      code: 'MBR-01',
      name: 'Master Balancing Reservoir (MBR-1)',
      type: 'PRIMARY_STORAGE',
      latitude: 22.7885,
      longitude: 86.1092,
      status: 'OPERATIONAL',
      details: 'Storage volume at 82% nominal capacity.',
    },
    {
      id: 'node-esr-north',
      code: 'ESR-N',
      name: 'Gamharia North Elevated Storage Reservoir',
      type: 'ESR',
      latitude: 22.7842,
      longitude: 86.1154,
      status: 'SUSPECTED_FAULT',
      details: 'Feeds northern distribution branch. Supplying affected habitations A, B, and C.',
    },
    {
      id: 'node-junction-x',
      code: 'J-X',
      name: 'Feeder Junction X & Sluice Valve Chamber V-408',
      type: 'FEEDER_JUNCTION',
      latitude: 22.7801,
      longitude: 86.1218,
      status: 'SUSPECTED_FAULT',
      details: 'Physical confluence of distribution lines to Kandra Tola, Gamharia Basti, and Chota Gamharia.',
    },
    {
      id: 'node-esr-south',
      code: 'ESR-S',
      name: 'Adityapur South Elevated Storage Reservoir',
      type: 'ESR',
      latitude: 22.7752,
      longitude: 86.1325,
      status: 'OPERATIONAL',
      details: 'Supplies southern branch. Feeds clean baseline Village D.',
    },
    {
      id: 'node-junction-y',
      code: 'J-Y',
      name: 'Feeder Junction Y (Southern Main)',
      type: 'FEEDER_JUNCTION',
      latitude: 22.7712,
      longitude: 86.1398,
      status: 'OPERATIONAL',
      details: 'Independent southern distribution manifold.',
    },
    {
      id: 'node-village-a',
      code: 'HAB-01',
      name: 'Village A: Kandra Tola',
      type: 'TERMINAL_HABITATION',
      latitude: 22.7825,
      longitude: 86.1265,
      status: 'AFFECTED',
      details: '8 citizen reports: low water pressure (08:15–08:35 AM).',
    },
    {
      id: 'node-village-b',
      code: 'HAB-02',
      name: 'Village B: Gamharia Basti',
      type: 'TERMINAL_HABITATION',
      latitude: 22.7785,
      longitude: 86.1292,
      status: 'AFFECTED',
      details: '11 citizen reports: total loss of tap supply (08:25–08:48 AM).',
    },
    {
      id: 'node-village-c',
      code: 'HAB-03',
      name: 'Village C: Chota Gamharia',
      type: 'TERMINAL_HABITATION',
      latitude: 22.7745,
      longitude: 86.1345,
      status: 'AFFECTED',
      details: '6 citizen reports: cloudy discharge and odor (08:38–08:56 AM).',
    },
    {
      id: 'node-village-d',
      code: 'HAB-04',
      name: 'Village D: Adityapur Ward 4',
      type: 'TERMINAL_HABITATION',
      latitude: 22.7685,
      longitude: 86.1452,
      status: 'UNAFFECTED_BASELINE',
      details: '0 citizen complaints. 14 neutral sentinel inquiries confirm normal clear water supply.',
    },
  ],
  edges: [
    {
      id: 'edge-1',
      fromNodeId: 'node-intake',
      toNodeId: 'node-wtp',
      name: 'Raw Water Transmission Main',
      lengthMeters: 4800,
      diameterMm: 500,
      material: 'Ductile Iron (DI K9)',
      designVelocityMin: 0.9,
      designVelocityMax: 1.5,
      isAffectedBranch: false,
    },
    {
      id: 'edge-2',
      fromNodeId: 'node-wtp',
      toNodeId: 'node-mbr',
      name: 'Treated Water Transmission Main',
      lengthMeters: 2200,
      diameterMm: 450,
      material: 'Ductile Iron (DI K9)',
      designVelocityMin: 1.0,
      designVelocityMax: 1.4,
      isAffectedBranch: false,
    },
    {
      id: 'edge-3',
      fromNodeId: 'node-mbr',
      toNodeId: 'node-esr-north',
      name: 'Feeder Trunk Line North',
      lengthMeters: 3100,
      diameterMm: 300,
      material: 'Ductile Iron (DI K7)',
      designVelocityMin: 0.8,
      designVelocityMax: 1.3,
      isAffectedBranch: true,
    },
    {
      id: 'edge-4',
      fromNodeId: 'node-esr-north',
      toNodeId: 'node-junction-x',
      name: 'Feeder Line F-3 (Gamharia North Distribution)',
      lengthMeters: 1400,
      diameterMm: 250,
      material: 'HDPE PE-100',
      designVelocityMin: 0.8,
      designVelocityMax: 1.2,
      isAffectedBranch: true,
    },
    {
      id: 'edge-5',
      fromNodeId: 'node-junction-x',
      toNodeId: 'node-village-a',
      name: 'Kandra Tola Distribution Branch',
      lengthMeters: 900,
      diameterMm: 150,
      material: 'uPVC',
      designVelocityMin: 0.7,
      designVelocityMax: 1.1,
      isAffectedBranch: true,
    },
    {
      id: 'edge-6',
      fromNodeId: 'node-junction-x',
      toNodeId: 'node-village-b',
      name: 'Gamharia Basti Distribution Branch',
      lengthMeters: 1200,
      diameterMm: 150,
      material: 'uPVC',
      designVelocityMin: 0.7,
      designVelocityMax: 1.1,
      isAffectedBranch: true,
    },
    {
      id: 'edge-7',
      fromNodeId: 'node-junction-x',
      toNodeId: 'node-village-c',
      name: 'Chota Gamharia Distribution Branch',
      lengthMeters: 1800,
      diameterMm: 150,
      material: 'HDPE',
      designVelocityMin: 0.7,
      designVelocityMax: 1.1,
      isAffectedBranch: true,
    },
    {
      id: 'edge-8',
      fromNodeId: 'node-mbr',
      toNodeId: 'node-esr-south',
      name: 'Feeder Trunk Line South',
      lengthMeters: 4200,
      diameterMm: 300,
      material: 'Ductile Iron (DI K7)',
      designVelocityMin: 0.8,
      designVelocityMax: 1.3,
      isAffectedBranch: false,
    },
    {
      id: 'edge-9',
      fromNodeId: 'node-esr-south',
      toNodeId: 'node-junction-y',
      name: 'Adityapur South Distribution Feeder',
      lengthMeters: 1600,
      diameterMm: 250,
      material: 'HDPE PE-100',
      designVelocityMin: 0.8,
      designVelocityMax: 1.2,
      isAffectedBranch: false,
    },
    {
      id: 'edge-10',
      fromNodeId: 'node-junction-y',
      toNodeId: 'node-village-d',
      name: 'Adityapur Ward 4 Branch Line',
      lengthMeters: 1100,
      diameterMm: 150,
      material: 'uPVC',
      designVelocityMin: 0.7,
      designVelocityMax: 1.1,
      isAffectedBranch: false,
    },
  ],
  evidenceList: [
    {
      id: 'ev-1',
      evidenceClass: 'OBSERVED',
      title: '25 Citizen Problem Signals Ingested',
      description: '8 reports of severe pressure loss in Kandra Tola; 11 reports of zero supply in Gamharia Basti; 6 reports of turbid water in Chota Gamharia.',
      source: 'Citizen Complaints (Multimodal Voice & Text)',
      timestamp: '08:15–08:56 AM',
      metric: '25 Independent Submissions',
    },
    {
      id: 'ev-2',
      evidenceClass: 'COMPUTED',
      title: 'Common Upstream Infrastructure Alignment',
      description: 'Topological graph traversal indicates 100% of affected habitations are downstream of Feeder Junction X and ESR-North.',
      source: 'Infrastructure Graph Traversal (Deterministic)',
      timestamp: '09:02 AM',
      confidenceOrStrength: 'HIGH (100% Topological Overlap)',
    },
    {
      id: 'ev-3',
      evidenceClass: 'COMPUTED',
      title: 'Branch Differential Isolation Detected',
      description: 'Village D (Adityapur Ward 4) shares the upstream Water Treatment Plant via ESR-South but exhibits zero complaints. Reduces support for a plant-wide treatment failure.',
      source: 'Differential Baseline Analysis',
      timestamp: '09:03 AM',
      confidenceOrStrength: 'STRONG (Negative Baseline Validated)',
    },
    {
      id: 'ev-4',
      evidenceClass: 'OBSERVED',
      title: 'Neutral Community Sentinel Verification',
      description: 'Neutral prompt pushed to Village D: 14/15 responses confirm normal clear water. Neutral prompt pushed to Village C: 12/14 report low pressure/cloudiness.',
      source: 'Proactive Community Sentinel Network',
      timestamp: '09:08 AM',
      metric: '29 Total Sentinel Responses',
    },
    {
      id: 'ev-5',
      evidenceClass: 'COMPUTED',
      title: 'Temporal Propagation Window Coherence',
      description: 'Observed 41-minute sequence of symptom emergence across the 3 villages matches the estimated physical conduit travel-time range of 35–60 minutes.',
      source: 'Hydraulic Parameter Modeling',
      timestamp: '09:10 AM',
      confidenceOrStrength: 'COHERENT (Within 1.1x Nominal)',
    },
    {
      id: 'ev-6',
      evidenceClass: 'HYPOTHESIZED',
      title: 'Potential Cross-Utility Cascading Origin',
      description: 'A 90-minute electrical outage at Gamharia 33kV Substation preceded the water supply cycle by 30 minutes, correlating with back-siphonage depressurization.',
      source: 'Cross-Utility Dependency Graph',
      timestamp: '09:12 AM',
      confidenceOrStrength: 'MODERATE (Temporal Cascade Correlated)',
    },
    {
      id: 'ev-7',
      evidenceClass: 'VALIDATED',
      title: 'Field Investigation Validation Pending',
      description: 'Preliminary inspection ticket dispatched to Assistant Engineer, PHED Gamharia Sub-Division. Physical valve chamber inspection required.',
      source: 'Authorized Departmental Review',
      timestamp: 'Pending Officer Action',
      confidenceOrStrength: 'REQUIRES FIELD CONFIRMATION',
    },
  ],
  hypotheses: [
    {
      id: 'hypo-1',
      hypothesisCode: 'H1',
      title: 'Feeder-Level Infrastructure Disruption (Junction X / Valve V-408)',
      level: 'HIGH',
      summary: 'Mechanical gate failure or sheared spindle pin at Sluice Valve V-408 restricts flow to northern habitations, creating back-siphonage in branch F-3.',
      supportingEvidence: [
        'All 25 citizen complaints map downstream of Junction X / Valve V-408',
        'Parallel branch ESR-South / Village D reports 100% normal clear baseline',
        'Temporal sequence of reports (41-min window) aligns with downstream propagation',
        'Proactive sentinel feedback in Village C corroborates supply degradation',
      ],
      contradictingEvidence: [
        'No direct physical telemetry gauge currently deployed inside Valve Chamber V-408',
      ],
      missingEvidence: [
        'Physical on-site valve spindle inspection',
        'Pressure gauge reading before and after Sluice Valve V-408',
      ],
      whatWouldStrengthen: [
        'Field confirmation of valve spindle detachment or partial blockage',
        'Differential pressure drop > 1.2 bar measured across Valve V-408',
        'Continued clean water baseline verified in southern branch',
      ],
      whatWouldWeaken: [
        'Normal operating pressure measured downstream of Junction X',
        'Sudden emergence of identical complaints in Village D (southern branch)',
      ],
      status: 'UNDER_INVESTIGATION',
    },
    {
      id: 'hypo-2',
      hypothesisCode: 'H2',
      title: 'Plant-Level Treatment / Pumping Disruption at Kandra WTP',
      level: 'MODERATE',
      summary: 'Main treatment plant clarifier failure or post-outage chemical dosing lag affecting treated water output.',
      supportingEvidence: [
        'WTP intake high-lift pumps were offline during the 07:45 AM electrical outage',
        'Total reports (25) exceed single-village threshold',
      ],
      contradictingEvidence: [
        'Village D draws from the same WTP via ESR-South and reports 100% clean baseline (14 confirmed sentinel votes)',
        'WTP treated water reservoir telemetry shows normal residual chlorine (0.45 mg/L)',
      ],
      missingEvidence: [
        'Certified lab titration sample taken directly from WTP clear water pump sump',
      ],
      whatWouldStrengthen: [
        'Reports of discolored water emerging in southern habitations or Adityapur Ward 4',
        'Water quality lab test from MBR-1 showing turbidity > 5 NTU',
      ],
      whatWouldWeaken: [
        'WTP lab report confirming clear water effluent meeting BIS IS 10500 standards',
      ],
      status: 'LESS_SUPPORTED',
    },
    {
      id: 'hypo-3',
      hypothesisCode: 'H3',
      title: 'Environmental Catchment Runoff Contamination',
      level: 'LOW',
      summary: 'Monsoon surface runoff or agricultural pesticide infiltration into the regional Subarnarekha intake basin.',
      supportingEvidence: [
        '6 reports mention unusual brownish sediment and odor',
      ],
      contradictingEvidence: [
        'District rain gauge logged only 0.2mm precipitation over the preceding 48 hours (below 15mm runoff threshold)',
        'Intake raw water monitoring reports normal seasonal baseline parameters',
      ],
      missingEvidence: [
        'Heavy metals and pesticide titration panel from river intake well',
      ],
      whatWouldStrengthen: [
        'Rainfall in upstream catchment exceeding 25mm within 6 hours',
      ],
      whatWouldWeaken: [
        'Continued dry weather in upstream catchment verified by IMD radar',
      ],
      status: 'UNLIKELY',
    },
    {
      id: 'hypo-4',
      hypothesisCode: 'H4',
      title: 'Localized Household Plumbing / Internal Pipeline Defects',
      level: 'LOW',
      summary: 'Isolated corroded service pipes or private overhead tank contamination within individual properties.',
      supportingEvidence: [
        'None identified',
      ],
      contradictingEvidence: [
        'Synchronous emergence across 25 independent households across 3 separate villages in a 41-minute window',
        'Cluster spatial footprint exceeds 3.5 square kilometers',
      ],
      missingEvidence: [
        'Internal plumbing audits from individual complainant premises',
      ],
      whatWouldStrengthen: [
        'Reports confined to a single street or isolated cluster < 50 meters',
      ],
      whatWouldWeaken: [
        'Corroboration across multiple villages sharing the same trunk infrastructure',
      ],
      status: 'UNLIKELY',
    },
  ],
  evidenceGaps: [
    {
      id: 'gap-1',
      label: 'Sluice Valve V-408 Mechanical State',
      category: 'FIELD_INSPECTION',
      status: 'MISSING',
      recommendedAction: 'Dispatch Junior Engineer to Valve Chamber V-408 at Junction X to inspect spindle pin and seating.',
    },
    {
      id: 'gap-2',
      label: 'Feeder Junction X Downstream Pressure Reading',
      category: 'TELEMETRY',
      status: 'MISSING',
      recommendedAction: 'Deploy portable digital pressure transducer on test port T-04 to verify pressure differential.',
    },
    {
      id: 'gap-3',
      label: 'Water Quality Residual Chlorine & Turbidity Titration',
      category: 'LAB_TEST',
      status: 'PENDING_DISPATCH',
      recommendedAction: 'Collect water sample at Gamharia Basti primary tapstand for District PHED Lab titration.',
    },
    {
      id: 'gap-4',
      label: 'Power Grid Recovery Pressure Surge Audit',
      category: 'FIELD_INSPECTION',
      status: 'AVAILABLE',
      recommendedAction: 'Cross-reference JBVNL 33kV substation logbook with pump startup logs.',
    },
  ],
  sentinelInquiry: {
    id: 'sentinel-si-204',
    targetHabitation: 'Chota Gamharia & Adityapur Ward 4',
    question: 'How is the tap water at your home right now?',
    responses: {
      normal: 16,
      unusualCloudyOdor: 11,
      lowPressure: 7,
      noWater: 4,
      notSure: 2,
    },
    totalResponses: 40,
    updatedAt: '12 minutes ago',
  },
  solutionMemoryPrecedent: {
    hasPrecedent: true,
    previousIncidentCode: 'SI-118',
    previousYear: 2024,
    validatedCause: 'Feeder line F-3 valve pin sheared following power-trip hydraulic transient shock.',
    interventionApplied: 'Replacement with motorized resilient-seated gate valve with air-release surge valve.',
    verifiedOutcome: 'Zero pressure drops reported over 180 days; verified by 100% community upvote.',
    institutionalLesson: 'Install dual air-release kinetic valves upstream of Junction X to prevent negative-pressure vacuum during grid trips.',
  },
};

export const SEED_JHARKHAND_CHALLENGES = [
  {
    id: 'ch-gamharia-water',
    title: 'Severe Water Pressure Loss & Discolored Supply across Multiple Habitations',
    description: 'Tap supply completely stopped in Gamharia Basti, with low pressure and sulfur smell in Kandra Tola. Multiple families reporting child fever and gastrointestinal distress.',
    category: 'WATER_SANITATION',
    district: 'Seraikela Kharsawan',
    locality: 'Gamharia Block & Kandra',
    severity: 'CATASTROPHIC',
    status: 'UNDER_GOV_REVIEW',
    priority: 'CRITICAL',
    affectedPopulation: 14200,
    supportCount: 84,
    latitude: 22.7842,
    longitude: 86.1154,
    createdAt: '2026-09-25T08:15:00Z',
    isSystemic: true,
    systemicIncidentCode: 'SI-204',
  },
  {
    id: 'ch-ranchi-drainage',
    title: 'NH-33 Stormwater Trunk Culvert Structural Fracture and Road Inundation',
    description: 'Subterranean runoff backlogged beneath Namkum industrial corridor causing asphalt erosion and 400m waterlogging after light rainfall.',
    category: 'ROADS_INFRASTRUCTURE',
    district: 'Ranchi',
    locality: 'Namkum Industrial Area',
    severity: 'SEVERE',
    status: 'IN_PILOT',
    priority: 'HIGH',
    affectedPopulation: 8500,
    supportCount: 62,
    latitude: 23.3441,
    longitude: 85.3854,
    createdAt: '2026-09-24T11:20:00Z',
    isSystemic: false,
  },
  {
    id: 'ch-dhanbad-siltation',
    title: 'Acid Mine Drainage & Coal Slurry Runoff Choking Irrigation Canal Network',
    description: 'Agricultural feeder canals in Jharia block clogged with coal fine particulates, elevating soil acidity and preventing rabi crop planting.',
    category: 'AGRICULTURE',
    district: 'Dhanbad',
    locality: 'Jharia Block, Sector 4',
    severity: 'SEVERE',
    status: 'ASSIGNED_TO_UNIVERSITY',
    priority: 'HIGH',
    affectedPopulation: 11200,
    supportCount: 118,
    latitude: 23.7412,
    longitude: 86.4124,
    createdAt: '2026-09-23T14:45:00Z',
    isSystemic: true,
    assignedUniversity: 'IIT (ISM) Dhanbad & BIT Sindri',
  },
  {
    id: 'ch-palamu-fluoride',
    title: 'High Fluoride Ground Water Encroachment in Primary School Handpumps',
    description: 'Ground water testing indicates fluoride concentrations > 2.8 mg/L across 6 schools in Daltonganj, risking skeletal fluorosis in students.',
    category: 'HEALTHCARE',
    district: 'Palamu',
    locality: 'Medininagar / Daltonganj',
    severity: 'CATASTROPHIC',
    status: 'IN_RESEARCH',
    priority: 'CRITICAL',
    affectedPopulation: 6800,
    supportCount: 94,
    latitude: 24.0384,
    longitude: 84.0722,
    createdAt: '2026-09-22T09:10:00Z',
    isSystemic: false,
  },
  {
    id: 'ch-dumka-solar',
    title: 'Decentralized Microgrid Inverter Battery Failure in Tribal Residential Hostel',
    description: 'Solar microgrid inverter control unit tripped during monsoon lightning storm, leaving 240 tribal residential students without evening study power.',
    category: 'ELECTRICITY_ENERGY',
    district: 'Dumka',
    locality: 'Kathikund Block',
    severity: 'MODERATE',
    status: 'RESOLVED',
    priority: 'MEDIUM',
    affectedPopulation: 240,
    supportCount: 38,
    latitude: 24.2678,
    longitude: 87.2489,
    createdAt: '2026-09-20T16:30:00Z',
    isSystemic: false,
    verifiedOutcome: 'Remediated via low-cost MOV surge protector module deployed by Sido Kanhu Murmu University innovation team.',
  },
];
