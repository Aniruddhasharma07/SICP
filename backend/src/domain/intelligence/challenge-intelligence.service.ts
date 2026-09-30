import {
  ChallengeIntelligenceDto,
  EvidenceItemDto,
  EvidenceEpistemicClass,
  UserRole,
} from '@sicp/shared';
import { prisma } from '../../database/prisma';
import { NotFoundError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { TopologyProviderFactory } from './topology/topology-provider.factory';
import { SystemicIncidentService } from './systemic-incident.service';
import { SolutionRetrievalEngine } from './solution-retrieval.engine';
import { AuditService } from '../../modules/audit/audit.service';

export class ChallengeIntelligenceService {
  /**
   * Resolves unified structured intelligence for any challenge ID
   * with 5-Level Progressive Disclosure support.
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

    // 2. Fetch associated relationships
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

    // 3. Check for associated Systemic Incident
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

    // 4. Retrieve Solution Memory precedents
    let precedents: any[] = [];
    try {
      precedents = await SolutionRetrievalEngine.retrieveRelevantSolutions({
        challengeId: challenge.id,
        category: challenge.category,
        title: challenge.title,
        description: challenge.description,
        district: challenge.district,
        state: challenge.state,
        limit: 3,
      });
    } catch (err) {
      logger.warn(`Precedent retrieval non-fatal fallback for ${challengeId}: ${(err as Error).message}`);
    }

    // 5. Retrieve Domain Infrastructure Topology via TopologyProvider abstraction
    const topologyProvider = TopologyProviderFactory.getProvider(challenge.category);
    const topology = await topologyProvider.getTopology({
      challengeId: challenge.id,
      category: challenge.category,
      district: challenge.district || undefined,
      state: challenge.state || undefined,
      isDemo: false,
    });

    // 6. Build progressive Level 1 Human Statement
    const isSystemic = !!systemicIncident || dbRelationships.some((r) => r.relationType.includes('SYSTEMIC'));
    let humanStatement = `Individual civic issue recorded for ${challenge.district || 'local area'}. Awaiting field verification.`;
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

    let relationshipExplanation = 'No correlating incidents detected within the immediate spatial and temporal cluster.';
    if (systemicIncident) {
      relationshipExplanation = `Correlated with ${systemicIncident.signals?.length || 1} reported signals within the municipal service boundary.`;
    } else if (dbRelationships.length > 0) {
      relationshipExplanation = `Spatial proximity and symptom patterns align with ${dbRelationships.length} neighbouring incident report(s).`;
    }

    // 8. Assemble Level 3 Evidence with strict Epistemic Provenance
    const supportingEvidence: EvidenceItemDto[] = [];
    const contradictingEvidence: EvidenceItemDto[] = [];
    const unknownEvidence: EvidenceItemDto[] = [];

    // Challenge citizen attachments
    for (const ev of challenge.evidence) {
      supportingEvidence.push({
        id: ev.id,
        epistemicClass: EvidenceEpistemicClass.OBSERVED,
        title: ev.originalName || 'Citizen Uploaded Media',
        description: `Direct photo/document verification submitted by community reporter (${ev.mimeType}).`,
        sourceName: 'Citizen Narrative & Media Upload',
        provenance: 'CITIZEN_ATTACHMENT',
        diagnosticWeight: 0.8,
        observedAt: ev.createdAt.toISOString(),
        timestamp: ev.createdAt.toISOString(),
        fileKey: ev.fileKey,
        originalName: ev.originalName,
      });
    }

    // Text observation from submission
    supportingEvidence.push({
      id: `ev-narrative-${challenge.id}`,
      epistemicClass: EvidenceEpistemicClass.OBSERVED,
      title: 'Citizen Narrative Statement',
      description: challenge.description.slice(0, 300),
      sourceName: challenge.submitter?.email || 'Anonymous Citizen Reporter',
      provenance: 'PORTAL_SUBMISSION',
      diagnosticWeight: 0.75,
      observedAt: challenge.createdAt.toISOString(),
      timestamp: challenge.createdAt.toISOString(),
    });

    // Baseline epistemic classifications for unverified fields
    if (!challenge.latitude || !challenge.longitude) {
      unknownEvidence.push({
        id: `ev-unloc-${challenge.id}`,
        epistemicClass: EvidenceEpistemicClass.INFERRED,
        title: 'Precise GPS Coordinates Pending',
        description: 'Location inferred from citizen municipal district text. Precise latitude/longitude pin awaiting officer confirmation.',
        sourceName: 'Address Parser',
        diagnosticWeight: 0,
        timestamp: new Date().toISOString(),
      });
    }

    // 9. Root Cause Hypotheses
    const hypotheses: ChallengeIntelligenceDto['hypotheses'] = [];
    if (systemicIncident?.hypotheses && systemicIncident.hypotheses.length > 0) {
      for (const h of systemicIncident.hypotheses) {
        hypotheses.push({
          id: h.id,
          title: h.title,
          failureMode: h.failureMode,
          score: h.diagnosticSupportScore || 75,
          status: h.status,
          provenance: 'SYSTEMIC_INCIDENT_INVESTIGATION',
        });
      }
    } else {
      hypotheses.push({
        id: `hyp-std-${challenge.id}`,
        title: `Asset Deterioration / Preventive Maintenance Deficit`,
        failureMode: `${challenge.category} standard service degradation`,
        score: 70,
        status: 'AI_HYPOTHESIS',
        provenance: 'CIVIC_ENGINE_TAXONOMY',
      });
    }

    // 10. Single dominant Primary Action (Level 5)
    let nextAction: ChallengeIntelligenceDto['nextAction'] = {
      label: 'Review Evidence',
      action: 'REVIEW_EVIDENCE',
      description: 'Review field documentation and community reports.',
      primary: true,
    };

    if (challenge.status === 'UNDER_GOV_REVIEW' || challenge.status === 'SUBMITTED') {
      nextAction = {
        label: 'Validate Investigation',
        action: 'VALIDATE_INVESTIGATION',
        description: 'Authorize technical analysis and approve routing to institutional solvers.',
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
        status: challenge.status,
        confidence,
        epistemicBadge: isSystemic ? 'SYSTEMIC RELATIONSHIP DETECTED' : 'HEURISTIC ANALYSIS',
        isSystemic,
      },
      relationships: {
        relatedCount,
        duplicateCount,
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
          };
        }),
      },
      evidence: {
        supporting: supportingEvidence,
        contradicting: contradictingEvidence,
        unknown: unknownEvidence,
      },
      hypotheses,
      topology,
      memory: {
        precedentCount: precedents.length,
        matches: precedents.map((p) => ({
          id: p.id,
          title: p.title,
          domain: p.domain || challenge.category,
          similarityScore: p.similarityScore || 0.8,
          outcome: p.outcome || 'SUCCESS',
          reusableComponents: p.reusableComponents || ['Engineering Blueprint', 'Budget Framework'],
        })),
      },
      governance: {
        validationRequired: true,
        validated: challenge.status === 'APPROVED' || challenge.status === 'ASSIGNED_TO_UNIVERSITY',
        validatedByName: challenge.status === 'APPROVED' ? 'Statutory Municipal Officer' : null,
        validatedAt: challenge.status === 'APPROVED' ? challenge.updatedAt.toISOString() : null,
        statutoryRoleRequired: 'GOVERNMENT_OFFICER',
      },
      nextAction,
    };
  }

  /**
   * Assembles the controlled demonstration scenario for rapid verification
   */
  private static async buildControlledDemoIntelligence(challengeId: string): Promise<ChallengeIntelligenceDto> {
    const demo = SystemicIncidentService.getControlledDemoScenario();
    const topology = await TopologyProviderFactory.getProvider('WATER').getTopology({
      challengeId,
      category: 'WATER',
      district: 'Bhopal',
      isDemo: true,
    });

    const leadHypothesis = demo.hypotheses[0];

    return {
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
        status: demo.status,
        confidence: demo.systemicScore,
        epistemicBadge: 'CONTROLLED SIH DEMO — HIGH CONFIDENCE',
        isSystemic: true,
      },
      relationships: {
        relatedCount: demo.signals.length,
        duplicateCount: 0,
        systemicPatternDetected: true,
        explanation: 'Reports originate from adjacent wards (11, 12, 13) within 48 hours, all supplied downstream of Trunk Feeder Line 4.',
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
        })),
      },
      evidence: {
        supporting: (leadHypothesis?.supportingEvidence || []).map((e) => ({
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
        unknown: [
          {
            id: 'ev-demo-chlorine',
            epistemicClass: EvidenceEpistemicClass.HYPOTHESIZED,
            title: 'Residual Chlorine at MBR-2 Outlet',
            description: 'Laboratory testing kit dispatched. Result pending field telemetry.',
            sourceName: 'PHED Lab Team',
            diagnosticWeight: 0,
            timestamp: new Date().toISOString(),
          },
        ],
      },
      hypotheses: demo.hypotheses.map((h) => ({
        id: h.id,
        title: h.title,
        failureMode: h.failureMode,
        score: h.diagnosticSupportScore,
        status: h.status,
        provenance: 'CONTROLLED_AMCH_EVALUATION',
      })),
      topology,
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
        message: 'Investigation validated successfully (Controlled Demo Scenario updated).',
        validatedAt,
      };
    }

    const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } });
    if (!challenge) {
      throw new NotFoundError('Challenge', challengeId);
    }

    // Advance challenge state if in review
    if (challenge.status === 'SUBMITTED' || challenge.status === 'UNDER_GOV_REVIEW') {
      await prisma.challenge.update({
        where: { id: challengeId },
        data: {
          status: 'APPROVED',
          updatedAt: new Date(),
        },
      });

      await prisma.challengeTimeline.create({
        data: {
          challengeId,
          fromStatus: challenge.status,
          toStatus: 'APPROVED',
          actorId: officerId,
          reason: notes || 'Diagnostic evidence confirmed.',
        },
      });
    }

    await AuditService.record({
      actorId: officerId,
      actorRole: UserRole.GOVERNMENT_OFFICER,
      action: 'CHALLENGE_INVESTIGATION_VALIDATED',
      resource: 'Challenge',
      resourceId: challengeId,
      reason: notes || null,
      requestId: 'req-validate-investigation',
    });

    return {
      success: true,
      message: 'Challenge investigation validated and approved for institutional collaboration.',
      validatedAt,
    };
  }
}
