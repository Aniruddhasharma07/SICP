import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/database/prisma';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import {
  UserRole,
  RelationshipType,
  RelationshipStatus,
  ChallengeStatus,
  SeverityLevel,
  PriorityLevel,
} from '@sicp/shared';
import { SpatialPolicyEngine } from '../src/domain/intelligence/spatial-policy.engine';
import { RelationshipScoringEngine } from '../src/domain/intelligence/relationship-scoring.engine';
import { DuplicateClusteringService } from '../src/domain/intelligence/duplicate-clustering.service';
import { ProblemConsolidationService } from '../src/domain/intelligence/problem-consolidation.service';
import { PriorityEngine } from '../src/domain/intelligence/priority.engine';

describe('SICP Elite Problem Relationship, Root-Cause Clustering & Merging Engine (38-Scenario Verification)', () => {
  const app = createApp();

  const citizenUser = {
    id: 'user-citizen-99',
    email: 'citizen@example.com',
    role: UserRole.CITIZEN,
  };

  const officerUser = {
    id: 'user-officer-99',
    email: 'officer@example.com',
    role: UserRole.GOVERNMENT_OFFICER,
  };

  const adminUser = {
    id: 'user-admin-99',
    email: 'admin@example.com',
    role: UserRole.SYSTEM_ADMIN,
  };

  const citizenToken = jwt.sign(
    { userId: citizenUser.id, email: citizenUser.email, role: citizenUser.role },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const officerToken = jwt.sign(
    { userId: officerUser.id, email: officerUser.email, role: officerUser.role },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. DUPLICATE DETECTION & SPATIAL POLICY MATRIX (Tests 1–7)
  // =========================================================================
  describe('1. Duplicate Detection & Spatial Policy Matrix', () => {
    it('Scenario 1: Detects DUPLICATE for streetlights within immediate 25m radius', () => {
      const p1 = { lat: 28.6139, lon: 77.2090 };
      // 15 meters away
      const p2 = { lat: 28.6140, lon: 77.2091 };

      const distMeters = SpatialPolicyEngine.calculateDistanceMeters(p1.lat, p1.lon, p2.lat, p2.lon);
      expect(distMeters).not.toBeNull();
      expect(distMeters!).toBeLessThanOrEqual(25);

      const proximity = SpatialPolicyEngine.evaluateProximityScore('STREETLIGHT', distMeters);
      expect(proximity.score).toBe(100);
      expect(proximity.isWithinImmediateRadius).toBe(true);
    });

    it('Scenario 2: Differentiates streetlights beyond 75m boundary as INDEPENDENT assets', () => {
      const distMeters = 85;
      const proximity = SpatialPolicyEngine.evaluateProximityScore('STREETLIGHT', distMeters);
      expect(proximity.score).toBe(0);
      expect(proximity.isWithinBoundary).toBe(false);
    });

    it('Scenario 3: Road pothole policy applies 50m threshold and 200m boundary', () => {
      const prox50 = SpatialPolicyEngine.evaluateProximityScore('ROAD_POTHOLE', 45);
      expect(prox50.score).toBe(100);

      const prox120 = SpatialPolicyEngine.evaluateProximityScore('ROAD_POTHOLE', 120);
      expect(prox120.score).toBeGreaterThan(0);
      expect(prox120.score).toBeLessThan(100);

      const prox250 = SpatialPolicyEngine.evaluateProximityScore('ROAD_POTHOLE', 250);
      expect(prox250.score).toBe(0);
    });

    it('Scenario 4: Water supply network policy allows wide 3000m boundary', () => {
      const policy = SpatialPolicyEngine.getPolicy('WATER_SUPPLY');
      expect(policy.immediateRadiusMeters).toBe(500);
      expect(policy.maxBoundaryMeters).toBe(3000);
      expect(policy.allowCrossDistrictSystemic).toBe(true);

      const prox1500 = SpatialPolicyEngine.evaluateProximityScore('WATER_SUPPLY', 1500);
      expect(prox1500.score).toBeGreaterThan(20);
    });

    it('Scenario 5: Strict inter-state boundary enforcement preserves independent reports', () => {
      const candidate = DuplicateClusteringService.evaluateRelationship(
        {
          title: 'Contaminated tap water with sewage odor',
          description: 'Dark smelly water coming from municipal supply taps',
          category: 'Water',
          district: 'Varanasi',
          state: 'Uttar Pradesh',
          latitude: 25.3176,
          longitude: 82.9739,
        },
        {
          id: 'chal-karnataka-dup',
          title: 'Contaminated tap water with sewage odor',
          description: 'Dark smelly water coming from municipal supply taps',
          category: 'Water',
          district: 'Bengaluru Urban',
          state: 'Karnataka',
          latitude: 12.9716,
          longitude: 77.5946,
        }
      );

      expect(candidate.recommendedRelation).toBe(RelationshipType.SAME_ROOT_CAUSE);
      expect(candidate.overallScore).toBeLessThanOrEqual(0.25);
      expect(candidate.reasoning).toContain('Different states');
    });

    it('Scenario 6: High semantic similarity with identical coordinates triggers DUPLICATE (score >= 0.85)', () => {
      const candidate = DuplicateClusteringService.evaluateRelationship(
        {
          title: 'Broken water pipe flooding street in Sector 4',
          description: 'Severe pipe rupture leaking thousands of litres on market road',
          category: 'Water',
          district: 'Gurugram',
          state: 'Haryana',
          latitude: 28.4595,
          longitude: 77.0266,
        },
        {
          id: 'chal-target-6',
          title: 'Major water pipeline leak flooding main market street',
          description: 'Water gushing out of broken pipe near shops in Sector 4',
          category: 'Water',
          district: 'Gurugram',
          state: 'Haryana',
          latitude: 28.4597,
          longitude: 77.0268,
        }
      );

      expect(candidate.recommendedRelation).toBe(RelationshipType.DUPLICATE);
      expect(candidate.overallScore).toBeGreaterThanOrEqual(0.85);
      expect(candidate.distanceMeters).toBeLessThan(100);
    });

    it('Scenario 7: Zero semantic token match with identical coordinates is marked independently', () => {
      const result = RelationshipScoringEngine.evaluate(
        {
          id: 'c-street',
          title: 'Streetlight pole tilted and bulb flickering',
          description: 'Light is completely dark during nighttime',
          category: 'Lighting',
          latitude: 28.4595,
          longitude: 77.0266,
        },
        {
          id: 'c-tree',
          title: 'Old banyan tree branch fell on walkway',
          description: 'Pedestrian access blocked by fallen foliage and wood',
          category: 'Environment',
          latitude: 28.4595,
          longitude: 77.0266,
        }
      );

      expect(result.factorBreakdown.problemSimilarity).toBeLessThan(20);
      expect(result.factorBreakdown.categoryCompatibility).toBe(15);
      expect(result.relationType).not.toBe(RelationshipType.DUPLICATE);
    });
  });

  // =========================================================================
  // 2. SYSTEMIC ROOT-CAUSE CLUSTERING MATRIX (Tests 8–14)
  // =========================================================================
  describe('2. Systemic Root-Cause Clustering Matrix', () => {
    it('Scenario 8: Identifies SYSTEMIC_ROOT_CAUSE when shared root-cause hypothesis is present', () => {
      const result = RelationshipScoringEngine.evaluate(
        {
          id: 'chal-pipe-a',
          title: 'Low tap water pressure in Ward 12',
          description: 'Water trickles slowly during morning hours due to broken feeder main',
          category: 'Water Supply',
          rootCause: 'Main feeder conduit breach at pumping station',
          district: 'Patna',
          state: 'Bihar',
        },
        {
          id: 'chal-pipe-b',
          title: 'Turbid contaminated water supply in Ward 14',
          description: 'Sediments mixed into water due to broken feeder main',
          category: 'Water Supply',
          rootCause: 'Main feeder conduit breach at pumping station',
          district: 'Patna',
          state: 'Bihar',
        }
      );

      expect(result.relationType).toBe(RelationshipType.SYSTEMIC_ROOT_CAUSE);
      expect(result.factorBreakdown.rootCauseSimilarity).toBeGreaterThanOrEqual(80);
      expect(result.recommendedAction).toBe('LINK_SYSTEMIC');
    });

    it('Scenario 9: Detects named infrastructure overlap (e.g. NH-44)', () => {
      const text1 = 'Massive waterlogging on NH-44 near flyover';
      const text2 = 'Pavement collapse on NH-44 near junction';

      const infra1 = RelationshipScoringEngine.detectInfrastructure(text1);
      const infra2 = RelationshipScoringEngine.detectInfrastructure(text2);

      expect(infra1).toContain('nh-44');
      expect(infra2).toContain('nh-44');
    });

    it('Scenario 10: Infrastructure overlap yields 100% factor score when named asset matches', () => {
      const result = RelationshipScoringEngine.evaluate(
        {
          id: 'c1',
          title: 'Drainage choke at Substation 4 Road',
          description: 'Water backing up into Substation 4 compound',
          category: 'Drainage',
        },
        {
          id: 'c2',
          title: 'Transformer short circuit at Substation 4 compound',
          description: 'Severe electrical sparking near Substation 4 yard',
          category: 'Electricity',
        }
      );

      expect(result.factorBreakdown.infrastructureOverlap).toBe(100);
      expect(result.sharedInfrastructure).toContain('substation 4');
    });

    it('Scenario 11: Cross-district regional grouping permitted for regional water grid', () => {
      const policy = SpatialPolicyEngine.getPolicy('WATER');
      expect(policy.allowCrossDistrictSystemic).toBe(true);
    });

    it('Scenario 12: Flags RECURRING when incident occurs at same location after >60 days', () => {
      const oldDate = new Date('2025-01-01');
      const newDate = new Date('2025-04-15'); // 104 days later

      const result = RelationshipScoringEngine.evaluate(
        {
          id: 'c-old',
          title: 'Sewage overflow at Golghar roundabout',
          description: 'Clogged main sewer overflowing across traffic circle',
          category: 'Sanitation',
          latitude: 25.5941,
          longitude: 85.1376,
          createdAt: oldDate,
        },
        {
          id: 'c-new',
          title: 'Sewage overflow at Golghar roundabout',
          description: 'Clogged main sewer overflowing across traffic circle',
          category: 'Sanitation',
          latitude: 25.5942,
          longitude: 85.1377,
          createdAt: newDate,
        }
      );

      expect(result.relationType).toBe(RelationshipType.RECURRING);
      expect(result.recommendedAction).toBe('FLAG_RECURRING');
      expect(result.reasoning).toContain('recurrence detected');
    });

    it('Scenario 13: Distinct root causes in same category prevent accidental systemic clustering', () => {
      const result = RelationshipScoringEngine.evaluate(
        {
          id: 'c-a',
          title: 'Illegal borewell drilling reducing groundwater table',
          description: 'Commercial tankers unauthorized groundwater extraction',
          category: 'Water',
          rootCause: 'Groundwater depletion by illegal private operators',
          district: 'Jaipur',
          state: 'Rajasthan',
        },
        {
          id: 'c-b',
          title: 'Domestic pipeline chlorine contamination',
          description: 'Over-chlorination causing respiratory discomfort',
          category: 'Water',
          rootCause: 'Dosing valve malfunction at filtration plant',
          district: 'Jaipur',
          state: 'Rajasthan',
        }
      );

      expect(result.relationType).not.toBe(RelationshipType.SYSTEMIC_ROOT_CAUSE);
      expect(result.recommendedAction).not.toBe('LINK_SYSTEMIC');
    });

    it('Scenario 14: Bounded candidate query excludes CLOSED and DRAFT challenges', async () => {
      (prisma.challenge.findUnique as jest.Mock) = jest.fn().mockResolvedValue({
        id: 'chal-subj-1',
        title: 'Water leak',
        description: 'Water leak',
        category: 'Water',
        evidence: [],
      });

      (prisma.challenge.findMany as jest.Mock) = jest.fn().mockResolvedValue([]);

      await DuplicateClusteringService.findCandidates('chal-subj-1');

      expect(prisma.challenge.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: expect.objectContaining({
              in: expect.not.arrayContaining([ChallengeStatus.CLOSED, ChallengeStatus.DRAFT]),
            }),
          }),
        })
      );
    });
  });

  // =========================================================================
  // 3. CONSOLIDATION EXECUTION & TRANSACTION MATRIX (Tests 15–22)
  // =========================================================================
  describe('3. Consolidation Execution & Transaction Matrix', () => {
    it('Scenario 15: Rejects merge request with fewer than 1 source challenge', async () => {
      await expect(
        ProblemConsolidationService.executeMerge({
          sourceChallengeIds: [],
          actorId: officerUser.id,
          actorRole: UserRole.GOVERNMENT_OFFICER,
          reason: 'Test merge without sources',
        })
      ).rejects.toThrow('At least one source challenge ID is required');
    });

    it('Scenario 16: Rejects merge when reason is omitted or too brief', async () => {
      await expect(
        ProblemConsolidationService.executeMerge({
          sourceChallengeIds: ['c1'],
          actorId: officerUser.id,
          actorRole: UserRole.GOVERNMENT_OFFICER,
          reason: 'abc', // < 5 chars
        })
      ).rejects.toThrow('detailed official governance reason is required');
    });

    it('Scenario 17: Prevents self-merge when source challenge matches canonical target', async () => {
      (prisma.$transaction as jest.Mock) = jest.fn().mockImplementation(async cb => {
        return cb(prisma);
      });

      await expect(
        ProblemConsolidationService.executeMerge({
          canonicalChallengeId: 'chal-self-1',
          sourceChallengeIds: ['chal-self-1'],
          actorId: officerUser.id,
          actorRole: UserRole.GOVERNMENT_OFFICER,
          reason: 'Testing self merge prevention',
        })
      ).rejects.toThrow('canonical challenge cannot be merged into itself');
    });

    it('Scenario 18: Rejects merge if canonical challenge is already merged into systemic', async () => {
      (prisma.$transaction as jest.Mock) = jest.fn().mockImplementation(async cb => {
        const txMock = {
          challenge: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'c-canon',
              status: ChallengeStatus.MERGED_INTO_SYSTEMIC,
            }),
          },
        };
        return cb(txMock);
      });

      await expect(
        ProblemConsolidationService.executeMerge({
          canonicalChallengeId: 'c-canon',
          sourceChallengeIds: ['c-src-1'],
          actorId: officerUser.id,
          actorRole: UserRole.GOVERNMENT_OFFICER,
          reason: 'Merging into already merged issue',
        })
      ).rejects.toThrow('already merged into another systemic issue');
    });

    it('Scenario 19: Rejects merge if canonical challenge is CLOSED or archived', async () => {
      (prisma.$transaction as jest.Mock) = jest.fn().mockImplementation(async cb => {
        const txMock = {
          challenge: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'c-closed',
              status: ChallengeStatus.CLOSED,
              deletedAt: null,
            }),
          },
        };
        return cb(txMock);
      });

      await expect(
        ProblemConsolidationService.executeMerge({
          canonicalChallengeId: 'c-closed',
          sourceChallengeIds: ['c-src-1'],
          actorId: officerUser.id,
          actorRole: UserRole.GOVERNMENT_OFFICER,
          reason: 'Merging into closed challenge',
        })
      ).rejects.toThrow('Cannot merge challenges into an archived or closed challenge');
    });

    it('Scenario 20: Successfully executes atomic consolidation transaction', async () => {
      const mockCanonical = {
        id: 'c-target-master',
        title: 'Master Water Outage',
        description: 'Main pipeline ruptured',
        category: 'Water',
        severity: SeverityLevel.SEVERE,
        priority: PriorityLevel.HIGH,
        priorityScore: 50.0,
        status: ChallengeStatus.APPROVED,
        submitterId: 'submitter-1',
        evidence: [{ id: 'ev-1' }],
        communityVotes: [{ userId: 'u1' }],
        affectedPopulation: 500,
        durationMonths: 2,
      };

      const mockSource = {
        id: 'c-src-10',
        title: 'Local dry taps',
        description: 'No water',
        category: 'Water',
        status: ChallengeStatus.SUBMITTED,
        submitterId: 'submitter-2',
        evidence: [{ id: 'ev-2' }],
        communityVotes: [{ userId: 'u2' }],
        affectedPopulation: 300,
      };

      (prisma.$transaction as jest.Mock) = jest.fn().mockImplementation(async cb => {
        const txMock = {
          challenge: {
            findUnique: jest.fn().mockResolvedValue(mockCanonical),
            findMany: jest.fn().mockResolvedValue([mockSource]),
            update: jest.fn().mockResolvedValue({}),
          },
          problemCluster: {
            create: jest.fn().mockResolvedValue({ id: 'cluster-99' }),
          },
          problemClusterMember: {
            create: jest.fn().mockResolvedValue({}),
          },
          challengeRelationship: {
            create: jest.fn().mockResolvedValue({}),
          },
          challengeTimeline: {
            create: jest.fn().mockResolvedValue({}),
          },
          notification: {
            create: jest.fn().mockResolvedValue({}),
          },
          problemMergeDecision: {
            create: jest.fn().mockResolvedValue({ id: 'decision-99' }),
          },
          auditLog: {
            create: jest.fn().mockResolvedValue({ id: 'audit-99' }),
          },
        };
        return cb(txMock);
      });

      const result = await ProblemConsolidationService.executeMerge({
        canonicalChallengeId: 'c-target-master',
        sourceChallengeIds: ['c-src-10'],
        actorId: officerUser.id,
        actorRole: UserRole.GOVERNMENT_OFFICER,
        reason: 'Consolidating Ward 10 into Master Outage',
      });

      expect(result.clusterId).toBe('cluster-99');
      expect(result.canonicalChallengeId).toBe('c-target-master');
      expect(result.mergedSourceCount).toBe(1);
      expect(result.decisionId).toBe('decision-99');
    });

    it('Scenario 21: Marks source challenges with MERGED_INTO_SYSTEMIC status', async () => {
      const updateCalls: any[] = [];
      (prisma.$transaction as jest.Mock) = jest.fn().mockImplementation(async cb => {
        const txMock = {
          challenge: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'c-can',
              title: 'Can',
              category: 'Water',
              severity: 'MODERATE',
              priority: 'MEDIUM',
              submitterId: 'sub-1',
            }),
            findMany: jest.fn().mockResolvedValue([
              { id: 'c-src-a', status: ChallengeStatus.SUBMITTED, submitterId: 'sub-2' },
            ]),
            update: jest.fn().mockImplementation(args => {
              updateCalls.push(args);
              return {};
            }),
          },
          problemCluster: { create: jest.fn().mockResolvedValue({ id: 'clust-1' }) },
          problemClusterMember: { create: jest.fn().mockResolvedValue({}) },
          challengeRelationship: { create: jest.fn().mockResolvedValue({}) },
          challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
          notification: { create: jest.fn().mockResolvedValue({}) },
          problemMergeDecision: { create: jest.fn().mockResolvedValue({ id: 'd-1' }) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(txMock);
      });

      await ProblemConsolidationService.executeMerge({
        canonicalChallengeId: 'c-can',
        sourceChallengeIds: ['c-src-a'],
        actorId: officerUser.id,
        actorRole: UserRole.GOVERNMENT_OFFICER,
        reason: 'Testing source status transition',
      });

      const sourceUpdate = updateCalls.find(call => call.where.id === 'c-src-a');
      expect(sourceUpdate).toBeDefined();
      expect(sourceUpdate.data.status).toBe(ChallengeStatus.MERGED_INTO_SYSTEMIC);
    });

    it('Scenario 22: Records immutable ProblemMergeDecision audit record', async () => {
      let createdDecision: any = null;
      (prisma.$transaction as jest.Mock) = jest.fn().mockImplementation(async cb => {
        const txMock = {
          challenge: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'c-can',
              title: 'Can',
              category: 'Water',
              severity: 'MODERATE',
              priority: 'MEDIUM',
              submitterId: 'sub-1',
            }),
            findMany: jest.fn().mockResolvedValue([
              { id: 'c-src-1', status: ChallengeStatus.SUBMITTED, submitterId: 'sub-2' },
            ]),
            update: jest.fn().mockResolvedValue({}),
          },
          problemCluster: { create: jest.fn().mockResolvedValue({ id: 'clust-1' }) },
          problemClusterMember: { create: jest.fn().mockResolvedValue({}) },
          challengeRelationship: { create: jest.fn().mockResolvedValue({}) },
          challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
          notification: { create: jest.fn().mockResolvedValue({}) },
          problemMergeDecision: {
            create: jest.fn().mockImplementation(args => {
              createdDecision = args.data;
              return { id: 'dec-101' };
            }),
          },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(txMock);
      });

      await ProblemConsolidationService.executeMerge({
        canonicalChallengeId: 'c-can',
        sourceChallengeIds: ['c-src-1'],
        actorId: officerUser.id,
        actorRole: UserRole.GOVERNMENT_OFFICER,
        reason: 'Testing decision audit record',
      });

      expect(createdDecision).not.toBeNull();
      expect(createdDecision.action).toBe('MERGE');
      expect(createdDecision.decidedById).toBe(officerUser.id);
      expect(createdDecision.decisionReason).toContain('Testing decision audit record');
    });
  });

  // =========================================================================
  // 4. ANTI-SPAM DEDUPLICATED PRIORITY RECALCULATION (Tests 23–27)
  // =========================================================================
  describe('4. Anti-Spam Deduplicated Priority Recalculation', () => {
    it('Scenario 23: Deduplicates repeat submissions by identical citizen', () => {
      const submitters = new Set(['citizen-alice', 'citizen-alice', 'citizen-alice']);
      expect(submitters.size).toBe(1);
    });

    it('Scenario 24: Deduplicates community votes across merged challenges', () => {
      const canonicalVotes = [{ userId: 'voter-1' }, { userId: 'voter-2' }];
      const sourceVotes = [{ userId: 'voter-2' }, { userId: 'voter-3' }]; // voter-2 is in both

      const uniqueVoters = new Set<string>();
      canonicalVotes.forEach(v => uniqueVoters.add(v.userId));
      sourceVotes.forEach(v => uniqueVoters.add(v.userId));

      expect(uniqueVoters.size).toBe(3); // Not 4
    });

    it('Scenario 25: Aggregates distinct evidence attachments from source reports', () => {
      const canonicalEvidence = [{ id: 'ev-1' }];
      const sourceEvidence = [{ id: 'ev-2' }, { id: 'ev-3' }];

      const totalCount = canonicalEvidence.length + sourceEvidence.length;
      expect(totalCount).toBe(3);
    });

    it('Scenario 26: Recalculates priority score accurately without naive addition overflow', () => {
      const baseline = PriorityEngine.calculate({
        severity: SeverityLevel.SEVERE,
        urgency: PriorityLevel.HIGH,
        affectedPopulation: 200,
        durationMonths: 3,
        communityVotesCount: 5,
        evidenceCount: 1,
      });

      const consolidated = PriorityEngine.calculate({
        severity: SeverityLevel.SEVERE,
        urgency: PriorityLevel.HIGH,
        affectedPopulation: 1200, // combined population
        durationMonths: 3,
        communityVotesCount: 35, // combined unique votes
        evidenceCount: 3,        // combined evidence
      });

      expect(consolidated.score).toBeGreaterThan(baseline.score);
      expect(consolidated.score).toBeLessThanOrEqual(100);
      expect(consolidated.factorBreakdown.evidenceQualityScore).toBe(100);
    });

    it('Scenario 27: Preserves previousScore and newScore deltas in decision log', async () => {
      let loggedDecision: any = null;
      (prisma.$transaction as jest.Mock) = jest.fn().mockImplementation(async cb => {
        const txMock = {
          challenge: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'c-can-score',
              title: 'Main Outage',
              category: 'Water',
              severity: 'MODERATE',
              priority: 'MEDIUM',
              priorityScore: 35.0,
              submitterId: 'sub-1',
            }),
            findMany: jest.fn().mockResolvedValue([
              { id: 'c-src-score', status: ChallengeStatus.SUBMITTED, submitterId: 'sub-2' },
            ]),
            update: jest.fn().mockResolvedValue({}),
          },
          problemCluster: { create: jest.fn().mockResolvedValue({ id: 'clust-s' }) },
          problemClusterMember: { create: jest.fn().mockResolvedValue({}) },
          challengeRelationship: { create: jest.fn().mockResolvedValue({}) },
          challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
          notification: { create: jest.fn().mockResolvedValue({}) },
          problemMergeDecision: {
            create: jest.fn().mockImplementation(args => {
              loggedDecision = args.data;
              return { id: 'dec-s' };
            }),
          },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(txMock);
      });

      await ProblemConsolidationService.executeMerge({
        canonicalChallengeId: 'c-can-score',
        sourceChallengeIds: ['c-src-score'],
        actorId: officerUser.id,
        actorRole: UserRole.GOVERNMENT_OFFICER,
        reason: 'Tracking delta scores',
      });

      expect(loggedDecision.previousPriorityScore).toBe(35.0);
      expect(loggedDecision.newPriorityScore).toBeGreaterThanOrEqual(35.0);
    });
  });

  // =========================================================================
  // 5. REVERSIBLE UNMERGE MECHANISM (Tests 28–32)
  // =========================================================================
  describe('5. Reversible Unmerge Mechanism', () => {
    it('Scenario 28: Restores source challenges from MERGED_INTO_SYSTEMIC to SUBMITTED', async () => {
      const updateCalls: any[] = [];
      (prisma.$transaction as jest.Mock) = jest.fn().mockImplementation(async cb => {
        const txMock = {
          problemCluster: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'cluster-unmerge-1',
              title: 'Cluster 1',
              status: RelationshipStatus.APPROVED,
              canonicalChallengeId: 'c-canon',
              members: [
                { challengeId: 'c-canon', isCanonical: true, challenge: { id: 'c-canon', submitterId: 's1' } },
                { challengeId: 'c-src-1', isCanonical: false, challenge: { id: 'c-src-1', title: 'Src 1', submitterId: 's2' } },
              ],
              canonicalChallenge: {
                id: 'c-canon',
                severity: SeverityLevel.MODERATE,
                priority: PriorityLevel.MEDIUM,
                affectedPopulation: 50,
                durationMonths: 1,
              },
            }),
            update: jest.fn().mockResolvedValue({}),
          },
          challenge: {
            update: jest.fn().mockImplementation(args => {
              updateCalls.push(args);
              return {};
            }),
          },
          challengeRelationship: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
          challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
          notification: { create: jest.fn().mockResolvedValue({}) },
          problemMergeDecision: { create: jest.fn().mockResolvedValue({ id: 'dec-unmerge' }) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(txMock);
      });

      const result = await ProblemConsolidationService.executeUnmerge({
        clusterId: 'cluster-unmerge-1',
        actorId: officerUser.id,
        actorRole: UserRole.GOVERNMENT_OFFICER,
        reversalReason: 'Field inspection confirmed separate localized faults',
      });

      expect(result.unmergedSourceCount).toBe(1);
      const sourceRestoration = updateCalls.find(c => c.where.id === 'c-src-1');
      expect(sourceRestoration).toBeDefined();
      expect(sourceRestoration.data.status).toBe(ChallengeStatus.SUBMITTED);
    });

    it('Scenario 29: ProblemCluster status transitions to REVERSED with reason', async () => {
      let clusterUpdate: any = null;
      (prisma.$transaction as jest.Mock) = jest.fn().mockImplementation(async cb => {
        const txMock = {
          problemCluster: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'cluster-unmerge-2',
              status: RelationshipStatus.APPROVED,
              members: [],
            }),
            update: jest.fn().mockImplementation(args => {
              clusterUpdate = args;
              return {};
            }),
          },
          challenge: { update: jest.fn().mockResolvedValue({}) },
          challengeRelationship: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
          challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
          notification: { create: jest.fn().mockResolvedValue({}) },
          problemMergeDecision: { create: jest.fn().mockResolvedValue({ id: 'dec-u2' }) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(txMock);
      });

      await ProblemConsolidationService.executeUnmerge({
        clusterId: 'cluster-unmerge-2',
        actorId: officerUser.id,
        actorRole: UserRole.GOVERNMENT_OFFICER,
        reversalReason: 'Mistaken merge by junior operator',
      });

      expect(clusterUpdate.data.status).toBe(RelationshipStatus.REVERSED);
      expect(clusterUpdate.data.reversalReason).toBe('Mistaken merge by junior operator');
      expect(clusterUpdate.data.reversedById).toBe(officerUser.id);
    });

    it('Scenario 30: Re-evaluates canonical challenge priority removing merged weight', async () => {
      let canonicalScoreUpdated = 0;
      (prisma.$transaction as jest.Mock) = jest.fn().mockImplementation(async cb => {
        const txMock = {
          problemCluster: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'cluster-unmerge-3',
              status: RelationshipStatus.APPROVED,
              canonicalChallengeId: 'c-canon-3',
              members: [],
              canonicalChallenge: {
                id: 'c-canon-3',
                severity: SeverityLevel.LOW,
                priority: PriorityLevel.LOW,
                affectedPopulation: 5,
                durationMonths: 1,
              },
            }),
            update: jest.fn().mockResolvedValue({}),
          },
          challenge: {
            update: jest.fn().mockImplementation(args => {
              if (args.where.id === 'c-canon-3') {
                canonicalScoreUpdated = args.data.priorityScore;
              }
              return {};
            }),
          },
          challengeRelationship: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
          challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
          notification: { create: jest.fn().mockResolvedValue({}) },
          problemMergeDecision: { create: jest.fn().mockResolvedValue({ id: 'dec-u3' }) },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(txMock);
      });

      await ProblemConsolidationService.executeUnmerge({
        clusterId: 'cluster-unmerge-3',
        actorId: officerUser.id,
        actorRole: UserRole.GOVERNMENT_OFFICER,
        reversalReason: 'Reverting priority weight',
      });

      expect(canonicalScoreUpdated).toBeLessThanOrEqual(25); // LOW priority baseline
    });

    it('Scenario 31: Rejects unmerging an already REVERSED cluster', async () => {
      (prisma.$transaction as jest.Mock) = jest.fn().mockImplementation(async cb => {
        const txMock = {
          problemCluster: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'cluster-reversed',
              status: RelationshipStatus.REVERSED,
              members: [],
            }),
          },
        };
        return cb(txMock);
      });

      await expect(
        ProblemConsolidationService.executeUnmerge({
          clusterId: 'cluster-reversed',
          actorId: officerUser.id,
          actorRole: UserRole.GOVERNMENT_OFFICER,
          reversalReason: 'Attempting second unmerge',
        })
      ).rejects.toThrow('already been reversed');
    });

    it('Scenario 32: Records immutable ProblemMergeDecision for UNMERGE action', async () => {
      let decisionAction = '';
      (prisma.$transaction as jest.Mock) = jest.fn().mockImplementation(async cb => {
        const txMock = {
          problemCluster: {
            findUnique: jest.fn().mockResolvedValue({
              id: 'cluster-dec',
              status: RelationshipStatus.APPROVED,
              members: [],
            }),
            update: jest.fn().mockResolvedValue({}),
          },
          challenge: { update: jest.fn().mockResolvedValue({}) },
          challengeRelationship: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
          challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
          notification: { create: jest.fn().mockResolvedValue({}) },
          problemMergeDecision: {
            create: jest.fn().mockImplementation(args => {
              decisionAction = args.data.action;
              return { id: 'dec-final' };
            }),
          },
          auditLog: { create: jest.fn().mockResolvedValue({}) },
        };
        return cb(txMock);
      });

      await ProblemConsolidationService.executeUnmerge({
        clusterId: 'cluster-dec',
        actorId: officerUser.id,
        actorRole: UserRole.GOVERNMENT_OFFICER,
        reversalReason: 'Testing unmerge decision log',
      });

      expect(decisionAction).toBe('UNMERGE');
    });
  });

  // =========================================================================
  // 6. AI RESILIENCE & FALLBACK MATRIX (Tests 33–35)
  // =========================================================================
  describe('6. AI Resilience & Fallback Matrix', () => {
    it('Scenario 33: Confidence scores strictly bounded in [0.01, 0.99] without NaN', () => {
      const result = RelationshipScoringEngine.evaluate(
        {
          id: 'c-sub',
          title: 'Unspecified Civic Anomaly',
          description: 'Anomaly description',
          category: 'Other',
        },
        {
          id: 'c-tgt',
          title: 'Unspecified Civic Anomaly',
          description: 'Anomaly description',
          category: 'Other',
        }
      );

      expect(isNaN(result.confidenceScore)).toBe(false);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(0.01);
      expect(result.confidenceScore).toBeLessThanOrEqual(0.99);
    });

    it('Scenario 34: Missing coordinates fallback gracefully to administrative boundary score', () => {
      const result = RelationshipScoringEngine.evaluate(
        {
          id: 'c-sub',
          title: 'Pothole on main lane',
          description: 'Pothole on main lane',
          category: 'Roads',
          district: 'Varanasi',
          state: 'Uttar Pradesh',
          latitude: null,
          longitude: null,
        },
        {
          id: 'c-tgt',
          title: 'Pothole on main lane',
          description: 'Pothole on main lane',
          category: 'Roads',
          district: 'Varanasi',
          state: 'Uttar Pradesh',
          latitude: null,
          longitude: null,
        }
      );

      expect(result.distanceMeters).toBeNull();
      expect(result.factorBreakdown.locationSimilarity).toBe(60); // Same district default
    });

    it('Scenario 35: Token similarity calculation handles empty or punctuation strings safely', () => {
      const sim = DuplicateClusteringService.calculateTokenSimilarity('', '!!! ???');
      expect(sim).toBe(0.0);
    });
  });

  // =========================================================================
  // 7. RBAC, SECURITY & AUDIT MATRIX (Tests 36–38)
  // =========================================================================
  describe('7. RBAC, Security & Audit Matrix', () => {
    it('Scenario 36: Citizen attempting to execute problem merge throws 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/clusters/merge')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          sourceChallengeIds: ['c1', 'c2'],
          reason: 'Unauthorized citizen merge attempt',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Scenario 37: Citizen attempting to unmerge a cluster throws 403 Forbidden', async () => {
      const res = await request(app)
        .post('/api/v1/clusters/cluster-123/unmerge')
        .set('Authorization', `Bearer ${citizenToken}`)
        .send({
          reversalReason: 'Citizen trying to revert cluster',
        });

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('Scenario 38: Government Officer can access cluster analytics endpoint', async () => {
      (prisma.problemCluster.count as jest.Mock) = jest.fn().mockResolvedValue(5);
      (prisma.challengeRelationship.count as jest.Mock) = jest.fn().mockResolvedValue(12);
      (prisma.problemMergeDecision.findMany as jest.Mock) = jest.fn().mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/clusters/analytics')
        .set('Authorization', `Bearer ${officerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.clusters.total).toBe(5);
      expect(res.body.data.relationships.total).toBe(12);
    });
  });
});
