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
  AuditAction,
} from '@sicp/shared';
import { ChallengeIntelligenceOrchestrator } from '../src/domain/intelligence/challenge-intelligence.orchestrator';
import { ProblemConsolidationService } from '../src/domain/intelligence/problem-consolidation.service';
import { DuplicateClusteringService } from '../src/domain/intelligence/duplicate-clustering.service';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    $transaction: jest.fn(),
    challenge: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    aIAnalysis: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    challengeRelationship: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    problemCluster: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    problemClusterMember: {
      create: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    problemMergeDecision: {
      create: jest.fn(),
      findMany: jest.fn().mockResolvedValue([]),
    },
    challengeTimeline: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
    communityVote: {
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    challengeEvidence: {
      create: jest.fn(),
    },
    challengeSLA: {
      findUnique: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
    },
    solutionMemory: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(0),
    },
  },
}));

describe('E2E AI Intelligence Orchestration & Governance Workflow Suite', () => {
  const app = createApp();

  const officerUser = {
    id: 'user-officer-99',
    email: 'officer@example.com',
    role: UserRole.GOVERNMENT_OFFICER,
  };

  const officerToken = jwt.sign(
    { userId: officerUser.id, email: officerUser.email, role: officerUser.role },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================================
  // 1. END-TO-END AI CATEGORIZATION & FIELD CONFIDENCE BREAKDOWN
  // =========================================================================
  describe('1. Challenge Intelligence Orchestrator - Problem Categorization', () => {
    it('executes AI intelligence orchestration and persists structured domain output with field-level confidences', async () => {
      const mockChallenge = {
        id: 'chal-road-1',
        title: 'Road damaged in my village and water collects there during monsoons',
        description: 'Large potholes on main village road with water pooling after heavy rains',
        category: 'Roads & Transport',
        severity: SeverityLevel.MODERATE,
        priority: PriorityLevel.MEDIUM,
        priorityScore: 60,
        status: ChallengeStatus.SUBMITTED,
        submitterId: 'submitter-citizen-1',
        latitude: 28.6139,
        longitude: 77.2090,
        district: 'New Delhi',
        state: 'Delhi',
        affectedPopulation: 2500,
        durationMonths: 6,
        evidence: [],
        submitter: { id: 'submitter-citizen-1', fullName: 'Citizen Submitter', role: 'CITIZEN' },
      };

      (prisma.challenge.findUnique as jest.Mock).mockResolvedValue(mockChallenge);
      (prisma.challenge.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.aIAnalysis.upsert as jest.Mock).mockResolvedValue({ id: 'ai-1', challengeId: 'chal-road-1' });
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: 'audit-1' });

      await ChallengeIntelligenceOrchestrator.processChallengeIntelligence('chal-road-1', 'REQ-TEST-1');

      // AI Analysis upsert was called
      expect(prisma.aIAnalysis.upsert).toHaveBeenCalledTimes(2); // PROCESSING, then COMPLETED

      const secondCall = (prisma.aIAnalysis.upsert as jest.Mock).mock.calls[1][0];
      expect(secondCall.where.challengeId).toBe('chal-road-1');
      expect(secondCall.create.status).toBe('COMPLETED');

      const structuredAnalysis = secondCall.create.rawResponse.structuredAnalysis;
      expect(structuredAnalysis).toBeDefined();

      // Verify strict domain separation
      expect(structuredAnalysis.primaryProblem.domain).toBe('ROADS_TRANSPORT');
      expect(structuredAnalysis.primaryProblem.category).toBe('Roads & Transport');
      expect(structuredAnalysis.primaryProblem.problemType).toContain('Road Damage');

      // Drainage is NOT primary category, it is in rootCauseHypotheses
      expect(structuredAnalysis.rootCauseHypotheses[0].cause).toContain('drainage');

      // Verify field confidences
      expect(structuredAnalysis.fieldConfidences.categoryConfidence).toBeGreaterThanOrEqual(0.85);
      expect(structuredAnalysis.fieldConfidences.problemTypeConfidence).toBeGreaterThanOrEqual(0.80);
      expect(structuredAnalysis.fieldConfidences.severityConfidence).toBeGreaterThanOrEqual(0.75);
      expect(structuredAnalysis.fieldConfidences.rootCauseConfidence).toBeGreaterThanOrEqual(0.75);
      expect(structuredAnalysis.fieldConfidences.duplicateConfidence).toBeGreaterThanOrEqual(0.75);
    });
  });

  // =========================================================================
  // 2. MULTI-SIGNAL LOCATION-AWARE DUPLICATE DETECTION & PERSISTENCE
  // =========================================================================
  describe('2. Multi-Signal Duplicate Detection & Candidate Persistence', () => {
    it('detects candidate duplicate at close proximity and creates RECOMMENDED relationship', async () => {
      const existingChallenge = {
        id: 'chal-road-existing',
        title: 'Dangerous deep potholes on Sector 4 road',
        description: 'Road surface is broken with deep potholes causing accidents',
        category: 'Roads & Transport',
        severity: SeverityLevel.SEVERE,
        latitude: 28.4595,
        longitude: 77.0266,
        district: 'Gurugram',
        state: 'Haryana',
        createdAt: new Date('2026-09-01'),
        durationMonths: 4,
        evidence: [],
        aiAnalysis: {
          rawResponse: { rootCauseHypothesis: 'Pavement wear and poor asphalt foundation' },
          reasoningSummary: 'Severe road deterioration',
        },
      };

      const newChallenge = {
        id: 'chal-road-new',
        title: 'Large potholes and damaged road in Sector 4',
        description: 'Potholes on road near sector 4 market causing traffic hazard',
        category: 'Roads & Transport',
        severity: SeverityLevel.SEVERE,
        priority: PriorityLevel.HIGH,
        priorityScore: 75,
        status: ChallengeStatus.SUBMITTED,
        submitterId: 'citizen-2',
        latitude: 28.4600, // ~55 meters away
        longitude: 77.0270,
        district: 'Gurugram',
        state: 'Haryana',
        evidence: [],
        submitter: { id: 'citizen-2', fullName: 'Citizen 2', role: 'CITIZEN' },
      };

      (prisma.challenge.findUnique as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === 'chal-road-new') return Promise.resolve(newChallenge);
        if (where.id === 'chal-road-existing') return Promise.resolve(existingChallenge);
        return Promise.resolve(null);
      });

      (prisma.challenge.findMany as jest.Mock).mockResolvedValue([existingChallenge]);
      (prisma.challengeRelationship.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.challengeRelationship.create as jest.Mock).mockResolvedValue({ id: 'rel-dup-1' });
      (prisma.aIAnalysis.upsert as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await ChallengeIntelligenceOrchestrator.processChallengeIntelligence('chal-road-new', 'REQ-DUP-TEST');

      // Verify relationship candidate created
      expect(prisma.challengeRelationship.create).toHaveBeenCalledTimes(1);
      const relCall = (prisma.challengeRelationship.create as jest.Mock).mock.calls[0][0];

      expect(relCall.data.sourceChallengeId).toBe('chal-road-new');
      expect(relCall.data.targetChallengeId).toBe('chal-road-existing');
      expect(relCall.data.relationType).toBe(RelationshipType.DUPLICATE);
      expect(relCall.data.status).toBe(RelationshipStatus.RECOMMENDED);
      expect(relCall.data.confidenceScore).toBeGreaterThanOrEqual(0.70);
      expect(relCall.data.distanceMeters).toBeLessThan(200);
    });
  });

  // =========================================================================
  // 3. GOVERNMENT REVIEW & NON-DESTRUCTIVE DUPLICATE MERGING
  // =========================================================================
  describe('3. Government Duplicate Confirmation & Non-Destructive Merging', () => {
    it('executes atomic non-destructive merge when Government Officer confirms duplicate candidate', async () => {
      const mockRelationship = {
        id: 'rel-to-confirm',
        sourceChallengeId: 'chal-duplicate-src',
        targetChallengeId: 'chal-canonical-target',
        relationType: RelationshipType.DUPLICATE,
        status: RelationshipStatus.RECOMMENDED,
        confidenceScore: 0.88,
        reasoning: 'Immediate geographic proximity with high thematic overlap',
      };

      (prisma.challengeRelationship.findUnique as jest.Mock).mockResolvedValue(mockRelationship);
      (prisma.challengeRelationship.update as jest.Mock).mockResolvedValue({
        ...mockRelationship,
        status: RelationshipStatus.MERGED,
      });

      // Mock executeMerge inside ProblemConsolidationService
      const mockMergeResult = {
        clusterId: 'cluster-merge-1',
        canonicalChallengeId: 'chal-canonical-target',
        mergedSourceCount: 1,
        sourceChallengeIds: ['chal-duplicate-src'],
        decisionId: 'decision-1',
      };
      jest.spyOn(ProblemConsolidationService, 'executeMerge').mockResolvedValue(mockMergeResult as any);

      const res = await request(app)
        .post('/api/v1/relationships/review')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          relationshipId: 'rel-to-confirm',
          action: 'CONFIRM_DUPLICATE_MERGE',
          notes: 'Confirmed by Municipal Field Inspector - duplicate pothole report on Sector 4 main road.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.relationship.status).toBe(RelationshipStatus.MERGED);
      expect(res.body.data.mergeResult).toBeDefined();
      expect(res.body.data.mergeResult.canonicalChallengeId).toBe('chal-canonical-target');

      // Verify executeMerge was called with canonical and source IDs
      expect(ProblemConsolidationService.executeMerge).toHaveBeenCalledWith(
        expect.objectContaining({
          canonicalChallengeId: 'chal-canonical-target',
          sourceChallengeIds: ['chal-duplicate-src'],
          actorRole: UserRole.GOVERNMENT_OFFICER,
        })
      );
    });

    it('allows Government Officer to mark duplicate candidate as RELATED instead of merging', async () => {
      const mockRelationship = {
        id: 'rel-mark-related',
        sourceChallengeId: 'chal-src-2',
        targetChallengeId: 'chal-target-2',
        relationType: RelationshipType.DUPLICATE,
        status: RelationshipStatus.RECOMMENDED,
        reasoning: 'Proximity overlap',
      };

      (prisma.challengeRelationship.findUnique as jest.Mock).mockResolvedValue(mockRelationship);
      (prisma.challengeRelationship.update as jest.Mock).mockResolvedValue({
        ...mockRelationship,
        relationType: RelationshipType.RELATED,
        status: RelationshipStatus.APPROVED,
      });

      const res = await request(app)
        .post('/api/v1/relationships/review')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          relationshipId: 'rel-mark-related',
          action: 'MARK_RELATED',
          notes: 'Inspected on site: One report is pothole damage, second report is water pipeline leak. Distinct problems.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.challengeRelationship.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            relationType: RelationshipType.RELATED,
            status: RelationshipStatus.APPROVED,
          }),
        })
      );
    });

    it('allows Government Officer to REJECT candidate relationship', async () => {
      const mockRelationship = {
        id: 'rel-to-reject',
        sourceChallengeId: 'chal-src-3',
        targetChallengeId: 'chal-target-3',
        relationType: RelationshipType.DUPLICATE,
        status: RelationshipStatus.RECOMMENDED,
        reasoning: 'Weak semantic match',
      };

      (prisma.challengeRelationship.findUnique as jest.Mock).mockResolvedValue(mockRelationship);
      (prisma.challengeRelationship.update as jest.Mock).mockResolvedValue({
        ...mockRelationship,
        status: RelationshipStatus.REJECTED,
      });

      const res = await request(app)
        .post('/api/v1/relationships/review')
        .set('Authorization', `Bearer ${officerToken}`)
        .send({
          relationshipId: 'rel-to-reject',
          action: 'REJECT',
          notes: 'Completely unrelated issues in separate municipal wards.',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(prisma.challengeRelationship.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: RelationshipStatus.REJECTED,
          }),
        })
      );
    });
  });

  // =========================================================================
  // 4. CROSS-DEFECT SYSTEMIC ROOT-CAUSE PROBLEM CLUSTERING
  // =========================================================================
  describe('4. Cross-Defect Systemic Root-Cause Problem Clustering', () => {
    it('creates candidate ProblemCluster in PENDING_REVIEW for distinct problems sharing systemic root causes', async () => {
      // Challenge 1: Drain overflow (Sanitation & Drainage)
      const challengeDrain = {
        id: 'chal-drain-1',
        title: 'Stormwater drain overflow and clogged culvert along MG Road',
        description: 'Silt and debris blocking culvert causing stormwater drain overflow',
        category: 'Sanitation & Drainage',
        severity: SeverityLevel.MODERATE,
        district: 'New Delhi',
        state: 'Delhi',
        latitude: 28.6139,
        longitude: 77.2090,
        evidence: [],
        aiAnalysis: {
          rawResponse: { rootCauseHypothesis: 'Inadequate stormwater drainage infrastructure causing surface overflow' },
          reasoningSummary: 'Stormwater culvert capacity deficit',
        },
        submitter: { id: 'citizen-drain', fullName: 'Citizen Drain', role: 'CITIZEN' },
      };

      // Challenge 2: Road damage at same location (Roads & Transport)
      const challengeRoad = {
        id: 'chal-road-systemic-2',
        title: 'Repeated road pavement damage and asphalt failure on MG Road',
        description: 'Severe road surface erosion and potholes caused by poor drainage runoff',
        category: 'Roads & Transport',
        severity: SeverityLevel.SEVERE,
        district: 'New Delhi',
        state: 'Delhi',
        latitude: 28.6142, // ~40 meters away
        longitude: 77.2092,
        evidence: [],
        submitter: { id: 'citizen-road', fullName: 'Citizen Road', role: 'CITIZEN' },
      };

      (prisma.challenge.findUnique as jest.Mock).mockImplementation(({ where }) => {
        if (where.id === 'chal-road-systemic-2') return Promise.resolve(challengeRoad);
        if (where.id === 'chal-drain-1') return Promise.resolve(challengeDrain);
        return Promise.resolve(null);
      });

      (prisma.challenge.findMany as jest.Mock).mockResolvedValue([challengeDrain]);
      (prisma.challengeRelationship.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.challengeRelationship.create as jest.Mock).mockResolvedValue({ id: 'rel-systemic-1' });
      (prisma.problemCluster.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.problemCluster.create as jest.Mock).mockResolvedValue({
        id: 'cluster-systemic-1',
        status: RelationshipStatus.PENDING_REVIEW,
      });
      (prisma.problemClusterMember.upsert as jest.Mock).mockResolvedValue({});
      (prisma.aIAnalysis.upsert as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await ChallengeIntelligenceOrchestrator.processChallengeIntelligence('chal-road-systemic-2', 'REQ-SYSTEMIC-TEST');

      // ProblemCluster should be created in PENDING_REVIEW
      expect(prisma.problemCluster.create).toHaveBeenCalledTimes(1);
      const clusterCall = (prisma.problemCluster.create as jest.Mock).mock.calls[0][0];

      expect(clusterCall.data.status).toBe(RelationshipStatus.PENDING_REVIEW);
      expect(clusterCall.data.category).toBe('Roads & Transport');
      expect(clusterCall.data.canonicalChallengeId).toBe('chal-road-systemic-2');

      // Both challenges linked as members without deleting either
      expect(prisma.problemClusterMember.upsert).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================================
  // 5. LOCATION INTELLIGENCE GATE ENFORCEMENT
  // =========================================================================
  describe('5. Location Intelligence Gate Enforcement', () => {
    it('strictly prevents geographic duplicate recommendations when location is absent (locationQuality === NONE)', async () => {
      const noLocationChallenge = {
        id: 'chal-no-loc',
        title: 'Road damaged and water pooling in my area',
        description: 'The road near my home is broken and collects water',
        category: 'Roads & Transport',
        severity: SeverityLevel.MODERATE,
        district: null,
        state: null,
        latitude: null,
        longitude: null,
        evidence: [],
        submitter: { id: 'citizen-no-loc', fullName: 'Anonymous Citizen', role: 'CITIZEN' },
      };

      (prisma.challenge.findUnique as jest.Mock).mockResolvedValue(noLocationChallenge);
      (prisma.challenge.findMany as jest.Mock).mockResolvedValue([]);
      (prisma.aIAnalysis.upsert as jest.Mock).mockResolvedValue({});
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await ChallengeIntelligenceOrchestrator.processChallengeIntelligence('chal-no-loc', 'REQ-NOLOC-TEST');

      // AI Analysis was processed
      expect(prisma.aIAnalysis.upsert).toHaveBeenCalled();

      // Zero geographic duplicates or clusters were created
      expect(prisma.challengeRelationship.create).not.toHaveBeenCalled();
      expect(prisma.problemCluster.create).not.toHaveBeenCalled();
    });
  });
});
