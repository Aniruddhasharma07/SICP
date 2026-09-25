import { SystemicScoringEngine } from '../src/domain/intelligence/systemic-scoring.engine';
import {
  InfrastructureGraphEngine,
  GraphNodeDefinition,
  GraphEdgeDefinition,
} from '../src/domain/intelligence/infrastructure-graph.engine';
import { CompetingHypothesesEngine } from '../src/domain/intelligence/competing-hypotheses.engine';
import { ProactiveSentinelService } from '../src/domain/intelligence/proactive-sentinel.service';
import { SystemicIncidentService } from '../src/domain/intelligence/systemic-incident.service';
import {
  InfrastructureNodeType,
  InfrastructureProvenance,
  InfrastructureEdgeType,
  InfrastructureImpactStatus,
  HypothesisStatus,
  EvidenceEpistemicClass,
  SentinelChoice,
  BranchDifferentialStatus,
  UserRole,
} from '@sicp/shared';

describe('SICP Systemic Intelligence Subsystem', () => {
  describe('SystemicScoringEngine', () => {
    it('should compute 7-factor score and dynamically renormalize when factors are unavailable', () => {
      const sigA = {
        id: 's1',
        title: 'Severe water discoloration and low pressure in Ward 12',
        description: 'Residents report brown muddy water flowing from domestic taps with negligible pressure.',
        category: 'WATER',
        latitude: 23.193,
        longitude: 77.451,
        district: 'Bhopal',
        state: 'Madhya Pradesh',
        reportedAt: new Date('2026-09-20T08:00:00Z'),
        infrastructureEntity: 'Trunk Line 4',
      };

      const sigB = {
        id: 's2',
        title: 'Dirty contaminated drinking water in Ward 13',
        description: 'Muddy turbidity and foul odor in municipal pipeline supply during morning cycle.',
        category: 'WATER',
        latitude: 23.196,
        longitude: 77.454,
        district: 'Bhopal',
        state: 'Madhya Pradesh',
        reportedAt: new Date('2026-09-20T09:30:00Z'),
        infrastructureEntity: 'Trunk Line 4',
      };

      const result = SystemicScoringEngine.evaluatePair(sigA, sigB);

      expect(result.systemicScore).toBeGreaterThan(0.70);
      expect(result.evidenceStrength).toBe('STRONG');
      expect(result.classification).toBe('SYSTEMIC_FAILURE');
      expect(result.factorBreakdown.scoringModelVersion).toBe('Heuristic Evidence Assessment v1.0');
      expect(result.factorBreakdown.availableFactors).toContain('semantic');
      expect(result.factorBreakdown.availableFactors).toContain('spatial');
      expect(result.factorBreakdown.availableFactors).toContain('temporal');
      expect(result.factorBreakdown.availableFactors).toContain('symptom');
      expect(result.factorBreakdown.availableFactors).toContain('infrastructure');
    });

    it('should correctly distinguish RECURRING incidents with a chronic time gap', () => {
      const pastIncident = {
        id: 's-past',
        title: 'Main pipeline leak at Arera junction',
        description: 'Severe pipe rupture leaking water onto the road.',
        category: 'WATER',
        latitude: 23.218,
        longitude: 77.428,
        district: 'Bhopal',
        state: 'Madhya Pradesh',
        reportedAt: new Date('2026-05-01T08:00:00Z'), // 140+ days ago
        infrastructureEntity: 'Arera Main',
      };

      const currentIncident = {
        id: 's-curr',
        title: 'Main pipeline leak recurring at Arera junction',
        description: 'Water spraying from pipe joint at same junction again.',
        category: 'WATER',
        latitude: 23.218,
        longitude: 77.428,
        district: 'Bhopal',
        state: 'Madhya Pradesh',
        reportedAt: new Date('2026-09-20T08:00:00Z'),
        infrastructureEntity: 'Arera Main',
      };

      const result = SystemicScoringEngine.evaluatePair(pastIncident, currentIncident);
      expect(result.classification).toBe('RECURRING');
      expect(result.requiresInvestigation).toBe(true);
    });

    it('should classify distant unrelated reports as INDEPENDENT', () => {
      const sigA = {
        id: 's-bhopal',
        title: 'Water pipe leak in Bhopal',
        description: 'Low water pressure at Ward 1',
        category: 'WATER',
        latitude: 23.25,
        longitude: 77.41,
        district: 'Bhopal',
        state: 'Madhya Pradesh',
        reportedAt: new Date('2026-09-20T08:00:00Z'),
      };

      const sigB = {
        id: 's-indore',
        title: 'Streetlight pole broken in Indore',
        description: 'Dark road near highway',
        category: 'LIGHTING',
        latitude: 22.71,
        longitude: 75.85,
        district: 'Indore',
        state: 'Madhya Pradesh',
        reportedAt: new Date('2026-09-20T08:00:00Z'),
      };

      const result = SystemicScoringEngine.evaluatePair(sigA, sigB);
      expect(result.classification).toBe('INDEPENDENT');
      expect(result.requiresInvestigation).toBe(false);
    });
  });

  describe('InfrastructureGraphEngine', () => {
    let graph: InfrastructureGraphEngine;

    beforeEach(() => {
      const nodes: GraphNodeDefinition[] = [
        {
          id: 'wtp',
          code: 'WTP',
          name: 'Treatment Plant',
          type: InfrastructureNodeType.TREATMENT_PLANT,
          category: 'WATER',
          provenance: InfrastructureProvenance.MUNICIPAL_SCHEMATIC,
        },
        {
          id: 'mbr',
          code: 'MBR',
          name: 'Balancing Reservoir',
          type: InfrastructureNodeType.RESERVOIR,
          category: 'WATER',
          provenance: InfrastructureProvenance.MUNICIPAL_SCHEMATIC,
        },
        {
          id: 'trunk-a',
          code: 'TRUNK-A',
          name: 'Trunk Branch A',
          type: InfrastructureNodeType.TRUNK_LINE,
          category: 'WATER',
          provenance: InfrastructureProvenance.MUNICIPAL_SCHEMATIC,
        },
        {
          id: 'trunk-b',
          code: 'TRUNK-B',
          name: 'Trunk Branch B',
          type: InfrastructureNodeType.TRUNK_LINE,
          category: 'WATER',
          provenance: InfrastructureProvenance.MUNICIPAL_SCHEMATIC,
        },
        {
          id: 'zone-a',
          code: 'ZONE-A',
          name: 'Service Zone A',
          type: InfrastructureNodeType.SERVICE_AREA,
          category: 'WATER',
          provenance: InfrastructureProvenance.MUNICIPAL_SCHEMATIC,
        },
        {
          id: 'zone-b',
          code: 'ZONE-B',
          name: 'Service Zone B',
          type: InfrastructureNodeType.SERVICE_AREA,
          category: 'WATER',
          provenance: InfrastructureProvenance.MUNICIPAL_SCHEMATIC,
        },
      ];

      const edges: GraphEdgeDefinition[] = [
        {
          id: 'e1',
          sourceNodeId: 'wtp',
          targetNodeId: 'mbr',
          edgeType: InfrastructureEdgeType.GRAVITY_MAIN,
        },
        {
          id: 'e2',
          sourceNodeId: 'mbr',
          targetNodeId: 'trunk-a',
          edgeType: InfrastructureEdgeType.FEEDER_BRANCH,
        },
        {
          id: 'e3',
          sourceNodeId: 'mbr',
          targetNodeId: 'trunk-b',
          edgeType: InfrastructureEdgeType.FEEDER_BRANCH,
        },
        {
          id: 'e4',
          sourceNodeId: 'trunk-a',
          targetNodeId: 'zone-a',
          edgeType: InfrastructureEdgeType.FLOW_SUPPLY,
        },
        {
          id: 'e5',
          sourceNodeId: 'trunk-b',
          targetNodeId: 'zone-b',
          edgeType: InfrastructureEdgeType.FLOW_SUPPLY,
        },
      ];

      graph = new InfrastructureGraphEngine(nodes, edges);
    });

    it('should detect cycles safely and not loop indefinitely', () => {
      // Add a cyclic feedback loop
      graph.addEdge({
        id: 'cycle-edge',
        sourceNodeId: 'zone-a',
        targetNodeId: 'mbr',
        edgeType: InfrastructureEdgeType.RETURN_LOOP,
      });

      expect(graph.hasCycles()).toBe(true);

      // Traversal must terminate safely with cycle
      const ancestors = graph.getUpstreamAncestors('zone-a');
      expect(ancestors.has('wtp')).toBe(true);
      expect(ancestors.has('mbr')).toBe(true);
      expect(ancestors.has('trunk-a')).toBe(true);
    });

    it('should trace common upstream dependencies', () => {
      const common = graph.findCommonUpstreamDependencies(['zone-a', 'zone-b']);
      expect(common).toContain('mbr');
      expect(common).toContain('wtp');
      // Neither branch trunk should be a common ancestor
      expect(common).not.toContain('trunk-a');
      expect(common).not.toContain('trunk-b');
    });

    it('should correctly project downstream impact states', () => {
      const impact = graph.projectDownstreamImpact(
        'trunk-a',
        ['zone-a'], // Observed failure
        ['zone-b']  // Observed normal
      );

      expect(impact.get('zone-a')).toBe(InfrastructureImpactStatus.OBSERVED_AFFECTED);
      expect(impact.get('zone-b')).toBe(InfrastructureImpactStatus.OBSERVED_NORMAL);
      expect(impact.get('trunk-a')).toBe(InfrastructureImpactStatus.ROOT_CAUSE_CANDIDATE);
      expect(impact.get('wtp')).toBe(InfrastructureImpactStatus.UNKNOWN);
    });

    it('should execute branch differential without naively forcing 0% unless physically impossible', () => {
      const hypotheses = [
        { id: 'h-wtp', targetNodeId: 'wtp', title: 'WTP Failure' },
        { id: 'h-trunk-a', targetNodeId: 'trunk-a', title: 'Trunk A Break' },
      ];

      const diff = graph.evaluateBranchDifferential(
        'mbr',
        ['zone-a'],
        ['zone-b'],
        hypotheses
      );

      expect(diff.status).toBe(BranchDifferentialStatus.BRANCH_UNAFFECTED_DISPROVED_UPSTREAM);
      expect(diff.weakenedHypothesisIds).toContain('h-wtp');
      expect(diff.weakenedHypothesisIds).not.toContain('h-trunk-a');
      expect(diff.deduction).toContain('Branch Differential Confirmed');
    });
  });

  describe('CompetingHypothesesEngine', () => {
    it('should evaluate diagnostic support and weaken refuted hypotheses upon contradicting evidence', () => {
      const hypotheses = [
        {
          id: 'h1',
          incidentId: 'inc-1',
          title: 'Trunk A Rupture',
          description: 'Pipe sheared on Trunk A',
          failureMode: 'RUPTURE',
          initialScore: 60,
          supportingEvidence: [
            {
              id: 'ev-1',
              epistemicClass: EvidenceEpistemicClass.OBSERVED,
              title: 'Citizen low pressure report',
              description: 'Terminal node low pressure',
              sourceName: 'Citizen App',
              diagnosticWeight: 20,
            },
          ],
          contradictingEvidence: [],
          missingEvidence: [],
          falsificationCriteria: 'Falsified if Branch B fails identically.',
        },
        {
          id: 'h2',
          incidentId: 'inc-1',
          title: 'Treatment Plant Disruption',
          description: 'Plant coagulant failure',
          failureMode: 'TREATMENT',
          initialScore: 45,
          supportingEvidence: [],
          contradictingEvidence: [
            {
              id: 'ev-2',
              epistemicClass: EvidenceEpistemicClass.SOURCE_DERIVED,
              title: 'SCADA clear log',
              description: 'Outlet turbidity normal',
              sourceName: 'SCADA',
              diagnosticWeight: 30,
            },
          ],
          missingEvidence: ['Branch East telemetry'],
          falsificationCriteria: 'Falsified if any parallel branch is normal.',
        },
      ];

      const evaluated = CompetingHypothesesEngine.evaluateMatrix(hypotheses, ['h2']);

      const h1Result = evaluated.find(h => h.id === 'h1');
      const h2Result = evaluated.find(h => h.id === 'h2');

      expect(h1Result).toBeDefined();
      expect(h2Result).toBeDefined();

      expect(h1Result!.status).toBe(HypothesisStatus.LEADING_HYPOTHESIS);
      expect(h1Result!.diagnosticSupportScore).toBeGreaterThan(65);

      expect(h2Result!.status).toBe(HypothesisStatus.REFUTED);
      expect(h2Result!.diagnosticSupportScore).toBeLessThan(20);
    });
  });

  describe('ProactiveSentinelService', () => {
    it('should generate strictly non-leading, neutral inquiries', () => {
      const inquiry = ProactiveSentinelService.generateNeutralInquiry('WATER', 'Ward 14 East');
      expect(inquiry.title).toContain('Ward 14 East');
      expect(inquiry.text).toContain('How is the tap water pressure and clarity at your premises today?');
      // Must NOT contain leading/biased phrases
      expect(inquiry.text).not.toContain('broken');
      expect(inquiry.text).not.toContain('contaminated');
      expect(inquiry.text).not.toContain('failure');
    });

    it('should aggregate sentinel responses and classify unaffected branch status', () => {
      const responses = [
        {
          id: 'r1',
          probeRequestId: 'p1',
          responseChoice: SentinelChoice.NORMAL_SERVICE,
          isVerifiedLocation: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'r2',
          probeRequestId: 'p1',
          responseChoice: SentinelChoice.NORMAL_SERVICE,
          isVerifiedLocation: true,
          createdAt: new Date().toISOString(),
        },
        {
          id: 'r3',
          probeRequestId: 'p1',
          responseChoice: SentinelChoice.DEGRADED_PRESSURE,
          isVerifiedLocation: true,
          createdAt: new Date().toISOString(),
        },
      ];

      const result = ProactiveSentinelService.aggregateResponses(responses);
      expect(result.totalResponses).toBe(3);
      expect(result.breakdown[SentinelChoice.NORMAL_SERVICE]).toBe(2);
      expect(result.outcome).toBe(BranchDifferentialStatus.BRANCH_UNAFFECTED_DISPROVED_UPSTREAM);
    });
  });

  describe('SystemicIncidentService (End-to-End)', () => {
    beforeEach(() => {
      SystemicIncidentService.initControlledDemoScenario();
    });

    it('should provide the controlled demonstration scenario with explicit labeling', async () => {
      const incident = await SystemicIncidentService.getIncidentById('SYS-2026-BHP-001');
      expect(incident.isControlledDemo).toBe(true);
      expect(incident.code).toBe('SYS-2026-001');
      expect(incident.signals.length).toBe(4);
      expect(incident.hypotheses.length).toBe(3);
      expect(incident.graph.nodes.length).toBe(7);
      expect(incident.sentinelProbes.length).toBe(1);
    });

    it('should update branch differential and weaken upstream hypothesis upon receiving normal sentinel responses', async () => {
      // Submit 2 normal responses from Ward 14 sentinel probe
      await SystemicIncidentService.submitSentinelResponse({
        probeRequestId: 'probe-01',
        choice: SentinelChoice.NORMAL_SERVICE,
        feedbackText: 'Water is completely clear and good pressure.',
      });

      const secondSubmit = await SystemicIncidentService.submitSentinelResponse({
        probeRequestId: 'probe-01',
        choice: SentinelChoice.NORMAL_SERVICE,
        feedbackText: 'Everything normal in Ward 14.',
      });

      expect(secondSubmit.branchDifferential).not.toBeNull();
      expect(secondSubmit.branchDifferential?.status).toBe(BranchDifferentialStatus.BRANCH_UNAFFECTED_DISPROVED_UPSTREAM);

      // Verify that Treatment Plant hypothesis is refuted
      const wtp = secondSubmit.updatedHypotheses.find(h => h.id === 'hyp-02');
      expect(wtp?.status).toBe(HypothesisStatus.REFUTED);

      // Verify that Trunk Line 4 hypothesis remains the leading hypothesis
      const trunk = secondSubmit.updatedHypotheses.find(h => h.id === 'hyp-01');
      expect(trunk?.status).toBe(HypothesisStatus.LEADING_HYPOTHESIS);
      expect(trunk?.diagnosticSupportScore).toBeGreaterThan(80);
    });

    it('should block unauthorized users from validating a hypothesis', async () => {
      await expect(
        SystemicIncidentService.validateHypothesis({
          incidentId: 'SYS-2026-BHP-001',
          hypothesisId: 'hyp-01',
          reason: 'I am a citizen and I think this is true.',
          actorId: 'cit-01',
          actorName: 'Citizen User',
          actorRole: UserRole.CITIZEN,
        })
      ).rejects.toThrow('Only authorized Government Officers');
    });

    it('should allow authorized Government Officers to validate leading hypothesis with audit trail', async () => {
      const validated = await SystemicIncidentService.validateHypothesis({
        incidentId: 'SYS-2026-BHP-001',
        hypothesisId: 'hyp-01',
        reason: 'Confirmed based on Branch Differential, acoustic leak sounding, and verified normal Ward 14 water.',
        actorId: 'gov-officer-01',
        actorName: 'Er. Rajesh Varma (Executive Engineer)',
        actorRole: UserRole.GOVERNMENT_OFFICER,
      });

      expect(validated.status).toBe('HUMAN_VALIDATED');
      expect(validated.validatedByName).toBe('Er. Rajesh Varma (Executive Engineer)');
      expect(validated.validationReason).toContain('Branch Differential');

      const hyp1 = validated.hypotheses.find(h => h.id === 'hyp-01');
      expect(hyp1?.status).toBe(HypothesisStatus.HUMAN_VALIDATED);
    });

    it('should convert validated incident to university and industry intervention project', async () => {
      const result = await SystemicIncidentService.createProjectIntervention({
        incidentId: 'SYS-2026-BHP-001',
        projectTitle: 'Kolar Trunk Line 4 Acoustic Leak Remediation',
        projectDescription: 'Deploy hydrodynamic acoustic leak sensor array and execute pipe joint remediation.',
        targetDomain: 'WATER_DISTRIBUTION',
        actorId: 'gov-01',
        actorRole: UserRole.GOVERNMENT_OFFICER,
      });

      expect(result.incident.status).toBe('INTERVENTION_ACTIVE');
      expect(result.interventionOpportunity.eligibleUniversityDomains.length).toBeGreaterThan(0);
      expect(result.interventionOpportunity.eligibleCsrThemes.length).toBeGreaterThan(0);
    });
  });
});
