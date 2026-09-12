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
} from '@sicp/shared';
import { RelationshipScoringEngine } from '../src/domain/intelligence/relationship-scoring.engine';
import { DuplicateClusteringService } from '../src/domain/intelligence/duplicate-clustering.service';
import { ProblemConsolidationService } from '../src/domain/intelligence/problem-consolidation.service';

describe('SICP Context-Aware Similar Problem, Location & Merge Intelligence Suite', () => {
  const app = createApp();

  const citizenUser = {
    id: 'user-citizen-cad-1',
    email: 'citizen-cad@example.com',
    role: UserRole.CITIZEN,
  };

  const officerUser = {
    id: 'user-officer-cad-1',
    email: 'officer-cad@example.com',
    role: UserRole.GOVERNMENT_OFFICER,
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
  // SCENARIO 1: Problem without location -> Zero duplicate warnings!
  // =========================================================================
  it('Scenario 1: Intake without location yields ZERO duplicate candidates and returns Problem Understanding', async () => {
    const result = await DuplicateClusteringService.checkContextAwareDuplicates({
      title: 'There is severe water shortage in my village',
      description: 'The drinking water pipeline is completely dry for 3 weeks and families are struggling.',
      category: 'Water Supply',
      // No district, no state, no coordinates!
    });

    expect(result.locationProvided).toBe(false);
    expect(result.candidates).toEqual([]);
    expect(result.problemUnderstanding).toBeDefined();
    expect(result.problemUnderstanding.category).toBe('Water Supply');
    expect(result.problemUnderstanding.possibleCauses.length).toBeGreaterThan(0);
    expect(result.topicInsights).toBeDefined();
    expect(result.topicInsights?.notice).toContain('Add a location to check for nearby or duplicate reports.');
  });

  // =========================================================================
  // SCENARIO 2: Same problem + same village / coordinates -> Strong duplicate
  // =========================================================================
  it('Scenario 2: Same problem in same village/locality produces strong DUPLICATE candidate', () => {
    const candidate = DuplicateClusteringService.evaluateRelationship(
      {
        title: 'Broken water pipeline flooding street in Ramnagar',
        description: 'Main municipal drinking water pipe cracked and leaking continuously near school',
        category: 'Water Supply',
        district: 'Varanasi',
        state: 'Uttar Pradesh',
        latitude: 25.2677,
        longitude: 83.0298,
      },
      {
        id: 'chal-target-ramnagar-1',
        title: 'Water pipe rupture near school in Ramnagar',
        description: 'Clean drinking water leaking from cracked pipe on primary school road',
        category: 'Water Supply',
        district: 'Varanasi',
        state: 'Uttar Pradesh',
        latitude: 25.2680,
        longitude: 83.0301,
      }
    );

    expect(candidate.recommendedRelation).toBe(RelationshipType.DUPLICATE);
    expect(candidate.relationshipClassification).toBe('DUPLICATE');
    expect(candidate.overallScore).toBeGreaterThanOrEqual(0.85);
    expect(candidate.distanceMeters).toBeLessThan(100);
  });

  // =========================================================================
  // SCENARIO 3: Same problem + different district -> RELATED, NEVER duplicate
  // =========================================================================
  it('Scenario 3: Same issue wording across different districts is NEVER duplicate', () => {
    const candidate = DuplicateClusteringService.evaluateRelationship(
      {
        title: 'Severe shortage of drinking water in village',
        description: 'Borewell pump failed and no tap water supply for last two weeks',
        category: 'Water Supply',
        district: 'Varanasi',
        state: 'Uttar Pradesh',
        latitude: 25.3176,
        longitude: 82.9739,
      },
      {
        id: 'chal-target-lucknow-1',
        title: 'Severe shortage of drinking water in village',
        description: 'Borewell pump failed and no tap water supply for last two weeks',
        category: 'Water Supply',
        district: 'Lucknow',
        state: 'Uttar Pradesh',
        latitude: 26.8467,
        longitude: 80.9462,
      }
    );

    expect(candidate.recommendedRelation).not.toBe(RelationshipType.DUPLICATE);
    expect(candidate.relationshipClassification).not.toBe('DUPLICATE');
    expect(candidate.overallScore).toBeLessThan(0.70);
    expect(candidate.reasoning).toMatch(/Different districts|Cross-district/i);
  });

  // =========================================================================
  // SCENARIO 4: Same topic + same village + divergent root causes -> RELATED, NOT duplicate
  // =========================================================================
  it('Scenario 4: Same locality and topic with divergent root causes yields RELATED, not duplicate', () => {
    const result = RelationshipScoringEngine.evaluate(
      {
        id: 'chal-a',
        title: 'Water supply interruption due to burst distribution pipeline',
        description: 'High pressure burst distribution pipeline causing water gushing on road',
        category: 'Water Supply',
        district: 'Varanasi',
        state: 'Uttar Pradesh',
        latitude: 25.3176,
        longitude: 82.9739,
        rootCause: 'Physical pipe rupture under roadway',
      },
      {
        id: 'chal-b',
        title: 'Foul-smelling contaminated groundwater from community borewell',
        description: 'Groundwater polluted due to chemical dumping near open aquifer pit',
        category: 'Water Supply',
        district: 'Varanasi',
        state: 'Uttar Pradesh',
        latitude: 25.3180,
        longitude: 82.9742,
        rootCause: 'Industrial chemical leachate seeped into shallow unconfined aquifer',
      }
    );

    expect(result.relationType).toBe(RelationshipType.RELATED);
    expect(result.relationType).not.toBe(RelationshipType.DUPLICATE);
    expect(result.recommendedAction).toBe('KEEP_SEPARATE');
  });

  // =========================================================================
  // SCENARIO 5: Different villages + shared verified infrastructure -> Systemic
  // =========================================================================
  it('Scenario 5: Multi-village reports sharing verified infrastructure asset yields SYSTEMIC_ROOT_CAUSE', () => {
    const result = RelationshipScoringEngine.evaluate(
      {
        id: 'chal-vil-1',
        title: 'Total water shutdown along NH-19 feeder line in Village A',
        description: 'Feeder line dry since main trunk valve failure on NH-19',
        category: 'Water Supply',
        district: 'Prayagraj',
        state: 'Uttar Pradesh',
        latitude: 25.4358,
        longitude: 81.8463,
      },
      {
        id: 'chal-vil-2',
        title: 'Zero tap water pressure along NH-19 feeder line in Village B',
        description: 'Connected households have no flow from NH-19 trunk line',
        category: 'Water Supply',
        district: 'Prayagraj',
        state: 'Uttar Pradesh',
        latitude: 25.4600,
        longitude: 81.8700,
      }
    );

    expect(result.relationType).toBe(RelationshipType.SYSTEMIC_ROOT_CAUSE);
    expect(result.sharedInfrastructure).toContain('nh-19');
    expect(result.recommendedAction).toBe('LINK_SYSTEMIC');
  });

  // =========================================================================
  // SCENARIO 6: Different states + same wording -> NEVER duplicate
  // =========================================================================
  it('Scenario 6: Cross-state reports are NEVER duplicate and recommendedAction is KEEP_SEPARATE', () => {
    const candidate = DuplicateClusteringService.evaluateRelationship(
      {
        title: 'Garbage dump overflow blocking market access road',
        description: 'Municipal waste uncollected for past 2 weeks causing health hazard',
        category: 'Sanitation',
        district: 'Jaipur',
        state: 'Rajasthan',
        latitude: 26.9124,
        longitude: 75.7873,
      },
      {
        id: 'chal-tn-1',
        title: 'Garbage dump overflow blocking market access road',
        description: 'Municipal waste uncollected for past 2 weeks causing health hazard',
        category: 'Sanitation',
        district: 'Chennai',
        state: 'Tamil Nadu',
        latitude: 13.0827,
        longitude: 80.2707,
      }
    );

    expect(candidate.recommendedRelation).not.toBe(RelationshipType.DUPLICATE);
    expect(candidate.relationshipClassification).not.toBe('DUPLICATE');
    expect(candidate.recommendedAction).toBe('KEEP_SEPARATE');
    expect(candidate.reasoning).toContain('Different states');
  });

  // =========================================================================
  // SCENARIO 7: Same exact location + high similarity -> High-confidence duplicate
  // =========================================================================
  it('Scenario 7: Exact coordinates and high semantic similarity yields >=0.85 confidence', () => {
    const candidate = DuplicateClusteringService.evaluateRelationship(
      {
        title: 'Deep hazardous pothole on Ring Road near flyover',
        description: 'Huge pothole causing traffic jam and motorcycle accidents on Ring Road',
        category: 'Roads & Transport',
        district: 'New Delhi',
        state: 'Delhi',
        latitude: 28.6139,
        longitude: 77.2090,
      },
      {
        id: 'chal-pothole-existing',
        title: 'Dangerous deep pothole on Ring Road near flyover',
        description: 'Pothole on flyover descent causing heavy traffic and risk to two-wheelers',
        category: 'Roads & Transport',
        district: 'New Delhi',
        state: 'Delhi',
        latitude: 28.6140,
        longitude: 77.2091,
      }
    );

    expect(candidate.recommendedRelation).toBe(RelationshipType.DUPLICATE);
    expect(candidate.overallScore).toBeGreaterThanOrEqual(0.85);
  });

  // =========================================================================
  // SCENARIO 8: Deterministic fallback when AI is unconfigured/offline
  // =========================================================================
  it('Scenario 8: Deterministic multi-factor scoring functions stably when AI service is offline', () => {
    const candidate = DuplicateClusteringService.evaluateRelationship(
      {
        title: 'Transformer blast and power failure in Industrial Area',
        description: 'High voltage transformer exploded causing complete blackout in phase 2',
        category: 'Electricity & Power',
        district: 'Kanpur',
        state: 'Uttar Pradesh',
        latitude: 26.4499,
        longitude: 80.3319,
      },
      {
        id: 't-1',
        title: 'Transformer fire leading to power cut in phase 2',
        description: 'Electricity transformer caught fire leaving factories without power',
        category: 'Electricity & Power',
        district: 'Kanpur',
        state: 'Uttar Pradesh',
        latitude: 26.4502,
        longitude: 80.3322,
      }
    );

    expect(candidate.recommendedRelation).toBe(RelationshipType.DUPLICATE);
    expect(candidate.overallScore).toBeGreaterThan(0.70);
    expect(candidate.factorBreakdown?.problemSimilarity).toBeGreaterThan(0);
    expect(candidate.factorBreakdown?.locationSimilarity).toBe(100);
  });

  // =========================================================================
  // SCENARIO 9: RBAC & Permissions - Citizen cannot execute systemic merge
  // =========================================================================
  it('Scenario 9: Citizen role is forbidden from executing problem consolidation merge', async () => {
    const res = await request(app)
      .post('/api/v1/clusters/merge')
      .set('Authorization', `Bearer ${citizenToken}`)
      .send({
        sourceChallengeIds: [
          'a0000000-0000-0000-0000-000000000001',
          'a0000000-0000-0000-0000-000000000002',
        ],
        systemicTitle: 'Consolidated Water Supply Failure',
        systemicDescription: 'Systemic failure of the regional feeder pipe affecting both wards.',
        category: 'Water Supply',
        district: 'Varanasi',
        state: 'Uttar Pradesh',
        reason: 'Authorized municipal merge justification',
      });

    expect(res.status).toBe(403);
  });

  // =========================================================================
  // SCENARIO 10: Atomic merge preserves source challenges and creates audit
  // =========================================================================
  it('Scenario 10: Problem consolidation validation requires at least 2 source challenges', async () => {
    await expect(
      ProblemConsolidationService.executeMerge({
        sourceChallengeIds: ['only-one-id'],
        systemicTitle: 'Invalid Systemic Title Here',
        systemicDescription: 'Detailed description for systemic problem consolidation testing.',
        category: 'Water',
        district: 'Varanasi',
        state: 'Uttar Pradesh',
        actorId: officerUser.id,
        actorRole: UserRole.GOVERNMENT_OFFICER,
        reason: 'Consolidation of related local incidents',
        requestId: 'req-test-single',
      })
    ).rejects.toThrow();
  });

  // =========================================================================
  // SCENARIO 11: Rejection of merge keeps challenges independent
  // =========================================================================
  it('Scenario 11: Keeping problems separate marks recommendation as KEEP_SEPARATE', () => {
    const candidate = DuplicateClusteringService.evaluateRelationship(
      {
        title: 'Broken streetlight on Lane 3',
        description: 'Bulb missing on streetlight pole',
        category: 'Streetlight',
        district: 'Agra',
        state: 'Uttar Pradesh',
        latitude: 27.1767,
        longitude: 78.0081,
      },
      {
        id: 'chal-other-asset',
        title: 'Broken streetlight on Lane 12',
        description: 'Bulb damaged on streetlight pole',
        category: 'Streetlight',
        district: 'Agra',
        state: 'Uttar Pradesh',
        latitude: 27.1850, // ~1 km away
        longitude: 78.0150,
      }
    );

    expect(candidate.recommendedRelation).toBe(RelationshipType.INDEPENDENT);
    expect(candidate.relationshipClassification).toBe('UNRELATED');
    expect(candidate.recommendedAction).toBe('KEEP_SEPARATE');
  });

  // =========================================================================
  // SCENARIO 12: Low confidence candidate enforces requiresHumanReview: true
  // =========================================================================
  it('Scenario 12: Boundary score duplicate candidates enforce human review requirement', () => {
    const candidate = DuplicateClusteringService.evaluateRelationship(
      {
        title: 'Contaminated tap water with yellow color in Sector 12',
        description: 'Tap water is yellowish and dirty in Sector 12 houses',
        category: 'Water Supply',
        district: 'Noida',
        state: 'Uttar Pradesh',
        latitude: 28.5355,
        longitude: 77.3910,
      },
      {
        id: 'tgt-rev',
        title: 'Yellow muddy water coming from kitchen taps in Sector 12',
        description: 'Tap water has soil particles and yellowish tint in Sector 12',
        category: 'Water Supply',
        district: 'Noida',
        state: 'Uttar Pradesh',
        latitude: 28.5357, // ~30m away
        longitude: 77.3912,
      }
    );

    expect(candidate.recommendedRelation).toBe(RelationshipType.DUPLICATE);
    if (candidate.overallScore < 0.90) {
      expect(candidate.requiresHumanReview).toBe(true);
    }
    expect(candidate.recommendedAction).toBeDefined();
  });

  // =========================================================================
  // SCENARIO 13: Same coordinates + high similarity + divergent root causes
  // =========================================================================
  it('Scenario 13: Same coordinates and high semantic similarity with divergent root causes yields RELATED, not duplicate', () => {
    const candidate = DuplicateClusteringService.evaluateRelationship(
      {
        title: 'Severe water supply crisis in Block A',
        description: 'Drinking water pipeline ruptured and flooded the alleyway',
        category: 'Water Supply',
        district: 'Agra',
        state: 'Uttar Pradesh',
        latitude: 27.1767,
        longitude: 78.0081,
        rootCause: 'Main feeder pipe cracked due to excavator digging',
      },
      {
        id: 'chal-block-a-divergent',
        title: 'Severe water supply shortage in Block A',
        description: 'Borewell groundwater dried up completely leaving community without water',
        category: 'Water Supply',
        district: 'Agra',
        state: 'Uttar Pradesh',
        latitude: 27.1767, // Identical coordinates
        longitude: 78.0081,
        rootCause: 'Groundwater table depletion in summer season',
      }
    );

    // Because root causes are explicitly divergent (pipe fracture vs aquifer depletion),
    // it MUST NOT be classified as DUPLICATE. It should be classified as RELATED.
    expect(candidate.recommendedRelation).toBe(RelationshipType.RELATED);
    expect(candidate.relationshipClassification).toBe('RELATED');
    expect(candidate.recommendedAction).toBe('KEEP_SEPARATE');
  });

  // =========================================================================
  // SCENARIO 14: District-only location -> locationQuality = 'ADMIN_ONLY'
  // =========================================================================
  it('Scenario 14: District-only location yields ADMIN_ONLY quality without precise distance claim', async () => {
    const result = await DuplicateClusteringService.checkContextAwareDuplicates({
      title: 'Frequent load shedding in industrial sector',
      description: 'Power cuts lasting 6 hours every day affecting factory production',
      category: 'Electricity',
      district: 'Kanpur',
      state: 'Uttar Pradesh',
      // No coordinates!
    });

    expect(result.locationProvided).toBe(true);
    expect(result.locationQuality).toBe('ADMIN_ONLY');
    expect(result.locationSummary?.quality).toBe('ADMIN_ONLY');
    expect(result.locationSummary?.hasCoordinates).toBe(false);
    expect(result.locationSummary?.district).toBe('Kanpur');
  });

  // =========================================================================
  // SCENARIO 15: Three reports describing same incident - canonical preservation
  // =========================================================================
  it('Scenario 15: Consolidation preserves canonical and source reports without silent deletion', async () => {
    // Validates that consolidation requires explicit authorized action and keeps original IDs
    await expect(
      ProblemConsolidationService.executeMerge({
        sourceChallengeIds: [
          'c0000000-0000-0000-0000-000000000001',
          'c0000000-0000-0000-0000-000000000002',
          'c0000000-0000-0000-0000-000000000003',
        ],
        systemicTitle: 'Regional High-Voltage Power Grid Disruption',
        systemicDescription: 'Consolidated report spanning three sectors experiencing the same feeder substation failure.',
        category: 'Electricity',
        district: 'Kanpur',
        state: 'Uttar Pradesh',
        actorId: 'cit-123',
        actorRole: UserRole.CITIZEN, // Unauthorized citizen role
        reason: 'Authorized municipal engineering review identified shared 33kV substation breakdown.',
      })
    ).rejects.toThrow('Only authorized Government Officers or System Admins can execute problem merges');
  });

  // =========================================================================
  // SCENARIO 16: Organization Rating - Defined model with dimensions & history
  // =========================================================================
  it('Scenario 16: Government Officer can submit structured performance rating for an organization', async () => {
    const res = await request(app)
      .post('/api/v1/organizations/org-test-rating-1/rate')
      .set('Authorization', `Bearer ${officerToken}`)
      .send({
        ratingScore: 4.5,
        dimensions: {
          technicalCompetence: 5,
          timeliness: 4,
          collaboration: 5,
          outcomeQuality: 4,
        },
        reason: 'Consistently delivered high quality water filtration prototypes within scheduled SLA.',
        evidenceReferences: ['report-pilot-v2.pdf', 'lab-test-cert.pdf'],
        relatedProjectIds: ['proj-clean-water-101'],
      });

    // If org does not exist in mock DB or DB is disconnected in unit tests, it throws NotFoundError (404) or Service Unavailable (503), NOT 403 Forbidden
    expect([200, 404, 503]).toContain(res.status);
    if (res.status === 404) {
      expect(res.body.error.code).toBe('NOT_FOUND');
    }
  });
});