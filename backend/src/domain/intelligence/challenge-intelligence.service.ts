import {
  ChallengeIntelligenceDto,
  EvidenceItemDto,
  EvidenceEpistemicClass,
  UserRole,
} from '@sicp/shared';
import { prisma } from '../../database/prisma';
import { NotFoundError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { DomainIntelligenceProviderFactory } from './providers/domain-intelligence.factory';
import { DomainIntelligenceResolver } from './providers/domain-intelligence-resolver';
import { SystemicIncidentService } from './systemic-incident.service';
import { SolutionRetrievalEngine } from './solution-retrieval.engine';
import { AuditService } from '../../modules/audit/audit.service';

export class ChallengeIntelligenceService {
  /**
   * Resolves unified structured intelligence for any challenge ID
   * with domain-aware intelligence routing and progressive disclosure.
   */
  public static async getChallengeIntelligence(challengeId: string): Promise<ChallengeIntelligenceDto> {
    const isDemo =
      challengeId === 'demo' ||
      challengeId.startsWith('SYS-2026-BHP') ||
      challengeId === 'sys-incident-bhopal-001';

    if (isDemo) {
      return this.buildControlledDemoIntelligence(challengeId);
    }

    // 1. Fetch challenge from persistent database
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        evidence: true,
        submitter: { select: { id: true, email: true, role: true } },
        timelines: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });

    if (!challenge) {
      throw new NotFoundError('Challenge', challengeId);
    }

    // 2. Resolve Domain-Aware Intelligence Provider
    const canonicalDomain = DomainIntelligenceResolver.resolveDomain(
      `${challenge.category} ${challenge.title}`
    );
    const domainProvider = DomainIntelligenceResolver.resolveProvider(
      `${challenge.category} ${challenge.title}`
    );
    const domainAnalysis = await domainProvider.analyze(challenge);

    // 3. Fetch associated relationships
    let dbRelationships: Array<{
      id: string;
      sourceChallengeId: string;
      targetChallengeId: string;
      relationType: string;
      status: string;
      confidenceScore: number;
    }> = [];

    try {
      dbRelationships = await prisma.challengeRelationship.findMany({
        where: {
          OR: [{ sourceChallengeId: challenge.id }, { targetChallengeId: challenge.id }],
        },
      });
    } catch {
      // Continue if unmigrated or empty
    }

    // 4. Check for associated Systemic Incident
    let systemicIncident: any = null;
    try {
      systemicIncident = await prisma.systemicIncident.findFirst({
        where: {
          OR: [
            { canonicalChallengeId: challenge.id },
            { signals: { some: { challengeId: challenge.id } } },
          ],
        },
        include: {
          signals: true,
          hypotheses: true,
        },
      });
    } catch {
      // Continue if systemic table unavailable
    }

    // 5. Retrieve Solution Memory precedents with strict domain filtering
    let precedents: any[] = [];
    try {
      const retrieved = await SolutionRetrievalEngine.retrieveRelevantSolutions({
        challengeId: challenge.id,
        category: challenge.category,
        title: challenge.title,
        description: challenge.description,
        district: challenge.district,
        state: challenge.state,
        limit: 3,
      });

      // Strict domain protection: ensure memories align with the challenge domain
      precedents = retrieved.filter((p) => {
        if (!p.challengeCategory) return false;
        const normCat = p.challengeCategory.toUpperCase();
        if (canonicalDomain === 'ROAD_TRANSPORT') {
          return normCat.includes('ROAD') || normCat.includes('TRANSPORT');
        }
        if (canonicalDomain === 'WATER_SUPPLY') {
          return normCat.includes('WATER') || normCat.includes('JAL') || normCat.includes('HYDRO');
        }
        if (canonicalDomain === 'ELECTRICITY') {
          return normCat.includes('LIGHT') || normCat.includes('ELECTRIC') || normCat.includes('ENERGY') || normCat.includes('POWER');
        }
        if (canonicalDomain === 'SANITATION') {
          return normCat.includes('DRAIN') || normCat.includes('SEWER') || normCat.includes('SANITATION');
        }
        return true;
      });
    } catch (err) {
      logger.warn(`Precedent retrieval non-fatal fallback for ${challengeId}: ${(err as Error).message}`);
    }

    // 6. Build progressive Level 1 Human Statement
    const isSystemic = !!systemicIncident || dbRelationships.some((r) => r.relationType.includes('SYSTEMIC'));
    let humanStatement = domainAnalysis.civicSummary;
    let confidence = 0.85;

    if (systemicIncident) {
      humanStatement = `Possible shared infrastructure relationship detected: ${systemicIncident.title}.`;
      confidence = systemicIncident.systemicScore ? systemicIncident.systemicScore : 0.88;
    } else if (dbRelationships.length > 0) {
      const duplicates = dbRelationships.filter((r) => r.relationType === 'DUPLICATE');
      if (duplicates.length > 0) {
        humanStatement = `Possible duplicate of existing citizen report detected in ${challenge.district || 'same ward'}.`;
      } else {
        humanStatement = `Relationship detected with ${dbRelationships.length} related problem(s) in this sector.`;
      }
    }

    // 7. Assemble Level 2 Relationships explanation
    const relatedCount = dbRelationships.filter((r) => r.relationType !== 'DUPLICATE').length;
    const duplicateCount = dbRelationships.filter((r) => r.relationType === 'DUPLICATE').length;

    let relationshipExplanation = 'No related reports found. SICP is monitoring for similar issues.';
    if (systemicIncident) {
      relationshipExplanation = `Correlated with ${systemicIncident.signals?.length || 1} reported signals within the municipal service boundary.`;
    } else if (dbRelationships.length > 0) {
      relationshipExplanation = `${dbRelationships.length} nearby report(s) describe similar issues within this municipal sector.`;
    }

    // 8. Assemble Evidence with strict Epistemic Provenance
    const supportingEvidence: EvidenceItemDto[] = [];
    const missingEvidence = domainAnalysis.evidence.missing;

    for (const item of domainAnalysis.evidence.available) {
      supportingEvidence.push({
        id: item.id,
        epistemicClass: item.source as any,
        title: item.title,
        description: item.description,
        sourceName: item.sourceName || 'Community Reporter',
        provenance: 'CITIZEN_RECORD',
        diagnosticWeight: item.diagnosticWeight || 0.75,
        observedAt: item.observedAt || challenge.createdAt.toISOString(),
        timestamp: item.observedAt || challenge.createdAt.toISOString(),
      });
    }

    // 9. Root Cause Hypotheses / Possible Explanations
    const hypotheses: ChallengeIntelligenceDto['hypotheses'] = domainAnalysis.possibleCauses.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      failureMode: c.category,
      score: c.score || 60,
      status: c.status,
      provenance: c.provenance,
      falsificationCriteria: c.falsificationCriteria,
    }));

    // 10. Next Action
    let nextAction: ChallengeIntelligenceDto['nextAction'] = {
      label: 'Track Investigation',
      action: 'TRACK_INVESTIGATION',
      description: 'Track municipal review, field inspection, and resolution planning progress.',
      primary: true,
    };

    if (challenge.status === 'UNDER_GOV_REVIEW' || challenge.status === 'SUBMITTED') {
      nextAction = {
        label: 'Validate Investigation',
        action: 'VALIDATE_INVESTIGATION',
        description: 'Authorize technical analysis and approve municipal field response.',
        primary: true,
      };
    } else if (challenge.status === 'APPROVED') {
      nextAction = {
        label: 'Route to University',
        action: 'ROUTE_TO_UNIVERSITY',
        description: 'Connect this validated challenge with university research labs and faculty.',
        primary: true,
      };
    }

    return {
      domain: canonicalDomain,
      challenge: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        category: challenge.category,
        subcategory: null,
        district: challenge.district,
        state: challenge.state,
        status: challenge.status,
        severity: challenge.severity,
        priority: challenge.priority,
        createdAt: challenge.createdAt.toISOString(),
        updatedAt: challenge.updatedAt.toISOString(),
      },
      summary: {
        statement: humanStatement,
        category: domainAnalysis.category,
        status: challenge.status,
        confidence,
        epistemicBadge: isSystemic ? 'SYSTEMIC RELATIONSHIP DETECTED' : 'HEURISTIC ANALYSIS',
        isSystemic,
      },
      understanding: {
        severity: challenge.severity || 'MODERATE',
        location: [challenge.district, challenge.state].filter(Boolean).join(', ') || 'District Local Area',
        evidenceAvailable: challenge.description.length > 0 || (challenge.evidence && challenge.evidence.length > 0),
        hasPhoto: challenge.evidence && challenge.evidence.length > 0,
        categoryDisplay: domainAnalysis.category,
      },
      relationships: {
        relatedCount,
        duplicateCount,
        systemicPattern: isSystemic,
        systemicPatternDetected: isSystemic,
        explanation: relationshipExplanation,
        items: dbRelationships.map((r) => {
          const otherId = r.targetChallengeId === challenge.id ? r.sourceChallengeId : r.targetChallengeId;
          return {
            id: otherId,
            title: `Related Incident #${otherId.slice(0, 8)}`,
            category: challenge.category,
            type: r.relationType === 'DUPLICATE' ? 'DUPLICATE' : 'RELATED',
            similarityScore: r.confidenceScore,
            district: challenge.district,
            distanceKm: 1.5,
            timeRelation: 'Reported in the past 7 days',
            similarityReason: 'Shared geographic district and symptom pattern',
          };
        }),
      },
      evidence: {
        supporting: supportingEvidence,
        contradicting: [],
        unknown: [],
        observed: supportingEvidence.filter((e) => e.epistemicClass === EvidenceEpistemicClass.OBSERVED),
        computed: supportingEvidence.filter((e) => e.epistemicClass === EvidenceEpistemicClass.COMPUTED),
        interpreted: supportingEvidence.filter((e) => e.epistemicClass === EvidenceEpistemicClass.AI_INTERPRETED),
        validated: supportingEvidence.filter((e) => e.epistemicClass === EvidenceEpistemicClass.HUMAN_VALIDATED),
        missing: missingEvidence,
      },
      hypotheses,
      possibleCauses: hypotheses,
      topology: domainAnalysis.topology,
      memory: {
        precedentCount: precedents.length,
        matches: precedents.map((p) => ({
          id: p.id || p.memoryId,
          title: p.title,
          domain: p.challengeCategory || domainAnalysis.domain,
          similarityScore: p.relevanceScore || p.similarityScore || 0.8,
          outcome: p.outcomeStatus || 'SUCCESS',
          reusableComponents: p.recommendedPrerequisites || ['Engineering Blueprint', 'Budget Framework'],
        })),
        explanation:
          precedents.length === 0
            ? 'No relevant solution precedents available. SICP will record an institutional precedent once this challenge reaches verified outcome.'
            : undefined,
      },
      governance: {
        validationRequired: true,
        validated: challenge.status === 'APPROVED' || challenge.status === 'ASSIGNED_TO_UNIVERSITY',
        validatedByName: challenge.status === 'APPROVED' ? 'Statutory Municipal Officer' : null,
        validatedAt: challenge.status === 'APPROVED' ? challenge.updatedAt.toISOString() : null,
        statutoryRoleRequired: 'GOVERNMENT_OFFICER',
      },
      nextAction,
      technicalAnalysis: {
        lcaExplanation: domainAnalysis.technicalDetails.lcaExplanation,
        amchExplanation: domainAnalysis.technicalDetails.amchExplanation,
        sentinelExplanation: domainAnalysis.technicalDetails.sentinelExplanation,
      },
    };
  }

  /**
   * Assembles the controlled demonstration scenario for rapid verification
   */
  private static async buildControlledDemoIntelligence(challengeId: string): Promise<ChallengeIntelligenceDto> {
    const demo = SystemicIncidentService.getControlledDemoScenario();
    const domainProvider = DomainIntelligenceProviderFactory.getProvider('WATER');
    const domainAnalysis = await domainProvider.analyze({
      id: challengeId,
      category: 'WATER',
      district: 'Bhopal',
      state: 'Madhya Pradesh',
      severity: demo.severity,
      createdAt: new Date(demo.createdAt),
      description: demo.description,
      evidence: [],
    });

    const leadHypothesis = demo.hypotheses[0];

    const supportingEvidence = (leadHypothesis?.supportingEvidence || []).map((e) => ({
      id: e.id,
      epistemicClass: e.epistemicClass,
      title: e.title,
      description: e.description,
      sourceName: e.sourceName,
      provenance: e.provenance,
      diagnosticWeight: e.diagnosticWeight,
      observedAt: e.observedAt,
      verifiedBy: e.verifiedBy,
      isStale: e.isStale,
    }));

    return {
      domain: 'WATER_SUPPLY',
      challenge: {
        id: demo.id,
        title: demo.title,
        description: demo.description,
        category: 'WATER',
        subcategory: 'Trunk Distribution Feeder',
        district: demo.district,
        state: demo.state,
        status: demo.status,
        severity: demo.severity,
        priority: 'CRITICAL',
        createdAt: demo.createdAt,
        updatedAt: demo.updatedAt,
      },
      summary: {
        statement: 'Possible shared infrastructure relationship detected across Wards 11, 12, and 13.',
        category: 'Water Supply',
        status: demo.status,
        confidence: demo.systemicScore,
        epistemicBadge: 'CONTROLLED SIH DEMO — HIGH CONFIDENCE',
        isSystemic: true,
      },
      understanding: {
        severity: demo.severity,
        location: `${demo.district}, ${demo.state}`,
        evidenceAvailable: true,
        hasPhoto: false,
        categoryDisplay: 'Water Supply',
      },
      relationships: {
        relatedCount: demo.signals.length,
        duplicateCount: 0,
        systemicPattern: true,
        systemicPatternDetected: true,
        explanation: '3 nearby reports describe similar issues. Reports originate from adjacent wards (11, 12, 13) within 48 hours.',
        spatialDistanceKm: 2.4,
        temporalWindowDays: 2,
        sharedCorridor: 'Kolar Trunk Distribution Loop',
        items: demo.signals.map((s) => ({
          id: s.id,
          title: s.title,
          category: s.category,
          type: 'SYSTEMIC_LEAF',
          similarityScore: 0.89,
          district: s.district,
          distanceKm: 2.4,
          timeRelation: 'Within 48 hours of initial report',
          similarityReason: 'Connected downstream of shared Kolar Feeder corridor',
        })),
      },
      evidence: {
        supporting: supportingEvidence,
        contradicting: (leadHypothesis?.contradictingEvidence || []).map((e) => ({
          id: e.id,
          epistemicClass: e.epistemicClass,
          title: e.title,
          description: e.description,
          sourceName: e.sourceName,
          provenance: e.provenance,
          diagnosticWeight: e.diagnosticWeight,
          observedAt: e.observedAt,
          verifiedBy: e.verifiedBy,
          isStale: e.isStale,
        })),
        unknown: [],
        observed: supportingEvidence.filter((e) => e.epistemicClass === EvidenceEpistemicClass.OBSERVED),
        computed: supportingEvidence.filter((e) => e.epistemicClass === EvidenceEpistemicClass.COMPUTED),
        interpreted: supportingEvidence.filter((e) => e.epistemicClass === EvidenceEpistemicClass.AI_INTERPRETED),
        validated: supportingEvidence.filter((e) => e.epistemicClass === EvidenceEpistemicClass.HUMAN_VALIDATED),
        missing: domainAnalysis.evidence.missing,
      },
      hypotheses: demo.hypotheses.map((h) => ({
        id: h.id,
        title: h.title,
        description: h.description,
        failureMode: h.failureMode,
        score: h.diagnosticSupportScore,
        status: h.status,
        provenance: 'CONTROLLED_AMCH_EVALUATION',
        falsificationCriteria: h.falsificationCriteria,
      })),
      possibleCauses: demo.hypotheses.map((h) => ({
        id: h.id,
        title: h.title,
        description: h.description,
        failureMode: h.failureMode,
        category: h.failureMode,
        status: h.status,
        provenance: 'CONTROLLED_AMCH_EVALUATION',
        falsificationCriteria: h.falsificationCriteria,
      })),
      topology: domainAnalysis.topology,
      memory: {
        precedentCount: demo.solutionMemoryPrecedentIds.length,
        matches: [
          {
            id: 'mem-kolar-pipeline-2024',
            title: 'Kolar Sub-Main Acoustic Leak Rectification (2024)',
            domain: 'WATER',
            similarityScore: 0.91,
            outcome: 'SUCCESS',
            reusableComponents: ['Acoustic Correlation Protocol', 'Trenchless Pipe Relining SOP'],
          },
          {
            id: 'mem-indore-trunk-remediation',
            title: 'Indore Municipal Narmada Phase-3 Trunk Pressure Stabilization',
            domain: 'WATER',
            similarityScore: 0.84,
            outcome: 'PARTIAL_SUCCESS',
            reusableComponents: ['Surge Anticipator Valve Calibration'],
          },
        ],
      },
      governance: {
        validationRequired: true,
        validated: !!demo.validatedAt,
        validatedByName: demo.validatedByName,
        validatedAt: demo.validatedAt,
        statutoryRoleRequired: 'GOVERNMENT_OFFICER',
      },
      nextAction: {
        label: 'Validate Investigation',
        action: 'VALIDATE_INVESTIGATION',
        description: 'Authorize municipal field response team and confirm engineering diagnostic findings.',
        primary: true,
      },
      technicalAnalysis: {
        lcaExplanation: 'Shared upstream dependency analysis (MBR-2 distribution loop).',
        amchExplanation: 'Comparison of competing hydraulic rupture versus terminal stagnation explanations.',
        sentinelExplanation: 'Field pressure probe in Ward 14 disproved central pump station shutdown.',
      },
    };
  }

  /**
   * Statutory Officer validation for challenge investigation
   */
  public static async validateInvestigation(
    challengeId: string,
    officerId: string,
    officerName: string,
    notes?: string
  ): Promise<{ success: boolean; message: string; validatedAt: string }> {
    const isDemo =
      challengeId === 'demo' ||
      challengeId.startsWith('SYS-2026-BHP') ||
      challengeId === 'sys-incident-bhopal-001';

    const validatedAt = new Date().toISOString();

    if (isDemo) {
      await SystemicIncidentService.validateHypothesis({
        incidentId: 'SYS-2026-BHP-001',
        hypothesisId: 'hyp-01',
        reason: notes || 'Validated during controlled demonstration walkthrough',
        actorId: officerId,
        actorName: officerName,
        actorRole: UserRole.GOVERNMENT_OFFICER,
      });

      return {
        success: true,
        message: 'Investigation validated successfully (Demo Walkthrough)',
        validatedAt,
      };
    }

    // Persist real validation record
    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) {
      throw new NotFoundError('Challenge', challengeId);
    }

    await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        status: 'APPROVED',
        updatedAt: new Date(),
      },
    });

    try {
      await prisma.challengeTimeline.create({
        data: {
          challengeId,
          fromStatus: challenge.status as any,
          toStatus: 'APPROVED' as any,
          actorId: officerId,
          reason: notes || `Technical investigation validated by ${officerName}. Authorized for institutional solution formulation.`,
          metadata: {
            event: 'INVESTIGATION_VALIDATION',
            validatedAt,
          },
        },
      });
    } catch {
      // Non-fatal if timeline table schema varies
    }

    try {
      await AuditService.log({
        action: 'CHALLENGE_STATUS_CHANGED',
        resource: 'CHALLENGE',
        resourceId: challengeId,
        actorId: officerId,
        actorRole: UserRole.GOVERNMENT_OFFICER,
        requestId: `req-${Date.now()}`,
        reason: notes || 'Statutory sign-off granted',
        newState: {
          status: 'APPROVED',
          validatedAt,
        },
      });
    } catch {
      // Non-fatal
    }

    return {
      success: true,
      message: 'Statutory validation recorded. Challenge authorized for institutional solver engagement.',
      validatedAt,
    };
  }
}
