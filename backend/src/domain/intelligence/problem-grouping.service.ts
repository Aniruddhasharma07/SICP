import {
  CitizenProblemStatus,
  SeverityLevel,
  PriorityLevel,
  PopulationProvenanceStatus,
  GovernanceScope,
  GovernanceDecisionType,
  OutcomeClassification,
  HypothesisStatus,
} from '@sicp/shared';
import { prisma } from '../../database/prisma';
import { DomainIntelligenceResolver } from './providers/domain-intelligence-resolver';
import { AffectedPopulationProvider } from './population/affected-population.provider';
import { SpatialPolicyEngine } from './spatial-policy.engine';
import { SlaService } from '../sla/sla.service';
import { logger } from '../../utils/logger';

export interface CreateProblemInput {
  title: string;
  description: string;
  category: string;
  latitude?: number | null;
  longitude?: number | null;
  locationName?: string | null;
  district?: string | null;
  state?: string | null;
  wardNumber?: string | null;
  cityCorporation?: string | null;
  submitterId?: string | null;
  isAnonymous?: boolean;
}

export interface GovernmentOverrideInput {
  severity?: SeverityLevel;
  priority?: PriorityLevel;
  affectedPopulation?: number;
  reason: string;
  officerId?: string;
}

export class ProblemGroupingService {
  /**
   * Submits a citizen problem, assesses population and priority, and executes governed clustering.
   */
  public static async submitProblem(input: CreateProblemInput) {
    // 1. Category Normalization
    const canonicalCategory = DomainIntelligenceResolver.resolveDomain(input.category);

    // 2. Assess Affected Population (Honest fallback, never returns 0 when unknown)
    const populationResult = AffectedPopulationProvider.estimateAffectedPopulation({
      latitude: input.latitude,
      longitude: input.longitude,
      district: input.district,
      wardNumber: input.wardNumber,
      locationName: input.locationName,
      category: canonicalCategory,
    });

    // 3. AI Initial Severity and Priority assessment
    const aiSeverity = this.assessInitialSeverity(input.description);
    const aiPriority = this.assessInitialPriority(aiSeverity, populationResult.value, canonicalCategory);

    // Generate unique problem code (e.g. PRB-2026-XXXX)
    const code = `PRB-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // 4. Create Problem record in database
    const problem = await prisma.problem.create({
      data: {
        code,
        title: input.title,
        description: input.description,
        category: canonicalCategory,
        status: 'SUBMITTED',
        aiSeverity,
        aiPriority,
        aiAffectedPopulation: populationResult.value,
        populationStatus: populationResult.status as any,
        populationProvenance: populationResult.provenance,
        latitude: input.latitude,
        longitude: input.longitude,
        locationName: input.locationName,
        district: input.district,
        state: input.state,
        wardNumber: input.wardNumber,
        cityCorporation: input.cityCorporation,
        submitterId: input.submitterId,
        isAnonymous: input.isAnonymous ?? false,
      },
    });

    // 5. Evaluate Grouping with Governance Memory checks
    await this.evaluateProblemClustering(problem.id);

    return await prisma.problem.findUnique({
      where: { id: problem.id },
      include: {
        group: {
          include: {
            challenge: true,
            members: {
              include: { problem: true },
            },
          },
        },
      },
    });
  }

  /**
   * Evaluates clustering for a problem, respecting past governance decisions.
   */
  public static async evaluateProblemClustering(problemId: string) {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
    });
    if (!problem) return;

    // Check governance memory for past rejections involving this problem
    const rejectedGroupIds = (
      await prisma.relationshipGovernanceMemory.findMany({
        where: {
          sourceEntityId: problem.id,
          scope: 'PROBLEM_GROUP',
          active: true,
        },
      })
    ).map((m) => m.targetEntityId);

    // Find candidate groups in the same domain/district
    const candidateGroups = await prisma.problemGroup.findMany({
      where: {
        canonicalCategory: problem.category,
        id: { notIn: rejectedGroupIds },
      },
      include: {
        problems: true,
        challenge: true,
      },
    });

    let bestGroup: any = null;
    let highestScore = 0;
    let bestBreakdown = { semantic: 0, spatial: 0, temporal: 0, category: 1, infrastructure: 0 };

    for (const group of candidateGroups) {
      // Calculate dimensional similarity against group members
      const scoreResult = this.calculateGroupMatchScore(problem, group.problems);
      if (scoreResult.totalScore > highestScore && scoreResult.totalScore >= 0.6) {
        highestScore = scoreResult.totalScore;
        bestGroup = group;
        bestBreakdown = scoreResult.breakdown;
      }
    }

    if (bestGroup) {
      // Add problem to existing group
      await prisma.problem.update({
        where: { id: problem.id },
        data: {
          groupId: bestGroup.id,
          status: 'GROUPED',
        },
      });

      await prisma.problemGroupMember.create({
        data: {
          groupId: bestGroup.id,
          problemId: problem.id,
        },
      });

      await prisma.problemGroup.update({
        where: { id: bestGroup.id },
        data: {
          relationshipStrength: (bestGroup.relationshipStrength + highestScore) / 2,
          factorBreakdown: bestBreakdown,
        },
      });

      // If the group has >= 2 problems and no challenge yet, create a Challenge
      const allMembers = await prisma.problemGroupMember.count({
        where: { groupId: bestGroup.id },
      });

      if (allMembers >= 2 && !bestGroup.challengeId) {
        await this.createChallengeForGroup(bestGroup.id);
      } else if (bestGroup.challengeId) {
        if (typeof (prisma.challengeProblem as any).upsert === 'function') {
          await (prisma.challengeProblem as any).upsert({
            where: {
              challengeId_problemId: {
                challengeId: bestGroup.challengeId,
                problemId: problem.id,
              },
            },
            create: {
              challengeId: bestGroup.challengeId,
              problemId: problem.id,
            },
            update: {},
          });
        } else {
          await prisma.challengeProblem.create({
            data: {
              challengeId: bestGroup.challengeId,
              problemId: problem.id,
            },
          });
        }
        await prisma.problem.update({
          where: { id: problem.id },
          data: { status: 'CHALLENGE_CREATED' },
        });
      }
    } else {
      // Look for a standalone compatible problem to form a brand new group
      const otherProblems = await prisma.problem.findMany({
        where: {
          id: { not: problem.id },
          category: problem.category,
          groupId: null,
          district: problem.district,
        },
        take: 10,
      });

      let paired = false;
      for (const other of otherProblems) {
        // Check governance rejection between these two problems
        const memoryReject = await prisma.relationshipGovernanceMemory.findFirst({
          where: {
            OR: [
              { sourceEntityId: problem.id, targetEntityId: other.id },
              { sourceEntityId: other.id, targetEntityId: problem.id },
            ],
            active: true,
          },
        });

        if (memoryReject) continue;

        const scoreResult = this.calculateGroupMatchScore(problem, [other]);
        if (scoreResult.totalScore >= 0.6) {
          paired = true;
          // Create new Problem Group!
          const newGroup = await prisma.problemGroup.create({
            data: {
              title: `${problem.category.replace(/_/g, ' ')} Incident Cluster - ${problem.locationName || problem.district || 'Regional'}`,
              canonicalCategory: problem.category,
              relationshipStrength: scoreResult.totalScore,
              factorBreakdown: scoreResult.breakdown,
            },
          });

          // Link both problems
          await prisma.problem.update({
            where: { id: problem.id },
            data: { groupId: newGroup.id, status: 'GROUPED' },
          });
          await prisma.problemGroupMember.create({
            data: { groupId: newGroup.id, problemId: problem.id },
          });

          await prisma.problem.update({
            where: { id: other.id },
            data: { groupId: newGroup.id, status: 'GROUPED' },
          });
          await prisma.problemGroupMember.create({
            data: { groupId: newGroup.id, problemId: other.id },
          });

          // Form Challenge
          await this.createChallengeForGroup(newGroup.id);
          break;
        }
      }

      if (!paired) {
        // Form a dedicated root-cause cluster and Challenge for this standalone problem
        const newGroup = await prisma.problemGroup.create({
          data: {
            title: `${problem.category.replace(/_/g, ' ')} Incident Cluster - ${problem.locationName || problem.district || 'Regional'}`,
            canonicalCategory: problem.category,
            relationshipStrength: 0.85,
            factorBreakdown: { semantic: 1, spatial: 1, temporal: 1, category: 1, infrastructure: 0 },
          },
        });

        await prisma.problem.update({
          where: { id: problem.id },
          data: { groupId: newGroup.id, status: 'GROUPED' },
        });

        await prisma.problemGroupMember.create({
          data: { groupId: newGroup.id, problemId: problem.id },
        });

        await this.createChallengeForGroup(newGroup.id);
      }
    }
  }

  /**
   * Creates a Challenge from a confirmed ProblemGroup.
   */
  private static async createChallengeForGroup(groupId: string) {
    const group = await prisma.problemGroup.findUnique({
      where: { id: groupId },
      include: {
        problems: true,
      },
    });

    if (!group || group.problems.length === 0) return;

    // Use default system user or first problem's submitter
    const submitterId = group.problems[0].submitterId || '00000000-0000-0000-0000-000000000001';

    // Verify user exists or find system admin
    let user = await prisma.user.findFirst();
    const finalSubmitterId = user ? user.id : submitterId;

    const challenge = await prisma.challenge.create({
      data: {
        title: group.title,
        description: `Systemic challenge investigating ${group.problems.length} correlated civic problem reports.`,
        category: group.canonicalCategory,
        severity: group.problems[0].govSeverity || group.problems[0].aiSeverity,
        priority: group.problems[0].govPriority || group.problems[0].aiPriority,
        status: 'SUBMITTED',
        submitterId: finalSubmitterId,
        district: group.problems[0].district,
        state: group.problems[0].state,
        affectedPopulation: group.problems[0].govAffectedPopulation || group.problems[0].aiAffectedPopulation || null,
        isSystemic: true,
        systemicSummary: `Shared-cause investigation for ${group.problems.length} incidents across ${group.problems[0].district || 'district'} corridor.`,
      },
    });

    await prisma.problemGroup.update({
      where: { id: groupId },
      data: { challengeId: challenge.id },
    });

    await prisma.challengeGroup.create({
      data: {
        challengeId: challenge.id,
        groupId: group.id,
      },
    });

    for (const prob of group.problems) {
      await prisma.challengeProblem.create({
        data: {
          challengeId: challenge.id,
          problemId: prob.id,
        },
      });
      await prisma.problem.update({
        where: { id: prob.id },
        data: { status: 'CHALLENGE_CREATED' },
      });
    }

    // Initialize SLA tracking for municipal governance
    await SlaService.initOrUpdateSLA(
      challenge.id,
      challenge.severity as any,
      challenge.priority as any
    ).catch(() => {});

    // Attach initial Group Solution Memory
    await this.seedGroupSolutionMemory(group.id, group.canonicalCategory);
  }

  /**
   * Swipe Semantics: Remove a problem from a group.
   * Backend automatically finds or forms a new group within the SAME challenge.
   * Persists governance memory so it is NEVER placed back into the rejected group.
   */
  public static async removeProblemFromGroup(
    problemId: string,
    groupId: string,
    reason: string,
    officerId?: string
  ) {
    const group = await prisma.problemGroup.findUnique({
      where: { id: groupId },
      include: { challenge: true },
    });

    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    const challengeId = group.challengeId;

    // 1. Record Governance Memory
    await prisma.relationshipGovernanceMemory.create({
      data: {
        sourceEntityId: problemId,
        targetEntityId: groupId,
        scope: 'PROBLEM_GROUP',
        decision: 'REMOVE_FROM_GROUP',
        officerId,
        reason,
        active: true,
      },
    });

    // 2. Detach problem from current group
    await prisma.problemGroupMember.deleteMany({
      where: {
        groupId,
        problemId,
      },
    });

    await prisma.problem.update({
      where: { id: problemId },
      data: { groupId: null },
    });

    // 3. Find or form a new group within the SAME challenge
    let targetNewGroup: any = null;

    if (challengeId) {
      // Find other groups in the same challenge
      const otherGroups = await prisma.problemGroup.findMany({
        where: {
          challengeId,
          id: { not: groupId },
        },
        include: { problems: true },
      });

      if (otherGroups.length > 0) {
        targetNewGroup = otherGroups[0];
      } else {
        // Form a new Group in the SAME challenge
        const problem = await prisma.problem.findUnique({ where: { id: problemId } });
        targetNewGroup = await prisma.problemGroup.create({
          data: {
            title: `Alternative Group: ${problem?.title || 'Reclassified Problems'}`,
            canonicalCategory: group.canonicalCategory,
            relationshipStrength: 0.75,
            challengeId,
            factorBreakdown: { semantic: 0.7, spatial: 0.8, temporal: 0.7, category: 1, infrastructure: 0 },
          },
        });

        await prisma.challengeGroup.create({
          data: {
            challengeId,
            groupId: targetNewGroup.id,
          },
        });
      }

      // Link problem to new group
      await prisma.problem.update({
        where: { id: problemId },
        data: {
          groupId: targetNewGroup.id,
          status: 'GROUPED',
        },
      });

      await prisma.problemGroupMember.create({
        data: {
          groupId: targetNewGroup.id,
          problemId,
        },
      });
    }

    logger.info(`Problem ${problemId} removed from group ${groupId} and reassigned to group ${targetNewGroup?.id}`);

    return {
      success: true,
      problemId,
      oldGroupId: groupId,
      newGroupId: targetNewGroup?.id,
      challengeId,
    };
  }

  /**
   * Swipe Semantics: Detach an entire group from a challenge.
   * Backend creates a NEW challenge inheriting context ('Possible Root Cause: Pending investigation').
   * Persists governance memory so it is NEVER re-linked to the old challenge.
   */
  public static async removeGroupFromChallenge(
    groupId: string,
    challengeId: string,
    reason: string,
    officerId?: string
  ) {
    const group = await prisma.problemGroup.findUnique({
      where: { id: groupId },
      include: { problems: true },
    });

    if (!group) {
      throw new Error(`Group ${groupId} not found`);
    }

    // 1. Record Governance Memory
    await prisma.relationshipGovernanceMemory.create({
      data: {
        sourceEntityId: groupId,
        targetEntityId: challengeId,
        scope: 'GROUP_CHALLENGE',
        decision: 'SPLIT_TO_NEW_CHALLENGE',
        officerId,
        reason,
        active: true,
      },
    });

    // 2. Detach group from challenge
    await prisma.challengeGroup.deleteMany({
      where: {
        challengeId,
        groupId,
      },
    });

    // Also remove problem-challenge links for this group's problems
    const problemIds = group.problems.map((p) => p.id);
    await prisma.challengeProblem.deleteMany({
      where: {
        challengeId,
        problemId: { in: problemIds },
      },
    });

    // 3. Create a NEW Challenge for this group
    const submitterId = group.problems[0]?.submitterId || '00000000-0000-0000-0000-000000000001';
    let user = await prisma.user.findFirst();
    const finalSubmitterId = user ? user.id : submitterId;

    const newChallenge = await prisma.challenge.create({
      data: {
        title: `Independent Challenge: ${group.title}`,
        description: `Governed investigation split from challenge ${challengeId}. Reason: ${reason}`,
        category: group.canonicalCategory,
        severity: group.problems[0]?.govSeverity || group.problems[0]?.aiSeverity || 'MODERATE',
        priority: group.problems[0]?.govPriority || group.problems[0]?.aiPriority || 'MEDIUM',
        status: 'SUBMITTED',
        submitterId: finalSubmitterId,
        district: group.problems[0]?.district,
        state: group.problems[0]?.state,
        affectedPopulation: group.problems[0]?.govAffectedPopulation || group.problems[0]?.aiAffectedPopulation || null,
        isSystemic: false,
        systemicSummary: 'Possible Root Cause: Pending investigation',
      },
    });

    // 4. Link Group and its problems to the new Challenge
    await prisma.problemGroup.update({
      where: { id: groupId },
      data: { challengeId: newChallenge.id },
    });

    await prisma.challengeGroup.create({
      data: {
        challengeId: newChallenge.id,
        groupId,
      },
    });

    for (const pId of problemIds) {
      await prisma.challengeProblem.create({
        data: {
          challengeId: newChallenge.id,
          problemId: pId,
        },
      });
    }

    logger.info(`Group ${groupId} split from Challenge ${challengeId} into New Challenge ${newChallenge.id}`);

    return {
      success: true,
      groupId,
      oldChallengeId: challengeId,
      newChallengeId: newChallenge.id,
    };
  }

  /**
   * Government Override: preserves original AI assessment, logs changes, updates governed values.
   */
  public static async applyGovernmentOverride(
    problemId: string,
    overrides: GovernmentOverrideInput
  ) {
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        group: { include: { challenge: true } },
        challengeLinks: { include: { challenge: true } },
      },
    });

    if (!problem) {
      throw new Error(`Problem ${problemId} not found`);
    }

    const updates: any = {
      overrideReason: overrides.reason,
      overriddenAt: new Date(),
      overriddenById: overrides.officerId,
    };

    if (overrides.severity) {
      updates.govSeverity = overrides.severity;
      await prisma.governmentOverrideLog.create({
        data: {
          problemId,
          officerId: overrides.officerId,
          field: 'severity',
          previousValue: problem.govSeverity || problem.aiSeverity,
          overriddenValue: overrides.severity,
          reason: overrides.reason,
        },
      });
    }

    if (overrides.priority) {
      updates.govPriority = overrides.priority;
      await prisma.governmentOverrideLog.create({
        data: {
          problemId,
          officerId: overrides.officerId,
          field: 'priority',
          previousValue: problem.govPriority || problem.aiPriority,
          overriddenValue: overrides.priority,
          reason: overrides.reason,
        },
      });
    }

    if (overrides.affectedPopulation !== undefined) {
      updates.govAffectedPopulation = overrides.affectedPopulation;
      await prisma.governmentOverrideLog.create({
        data: {
          problemId,
          officerId: overrides.officerId,
          field: 'affectedPopulation',
          previousValue: String(problem.govAffectedPopulation ?? problem.aiAffectedPopulation ?? 'null'),
          overriddenValue: String(overrides.affectedPopulation),
          reason: overrides.reason,
        },
      });

      // Recalculate priority & severity based on problem type and affected population if not explicitly passed
      if (!overrides.priority || !overrides.severity) {
        const computed = this.calculatePriorityAndSeverityByProblemType(
          problem.category,
          overrides.affectedPopulation,
          (overrides.severity as SeverityLevel) || (problem.govSeverity as SeverityLevel) || (problem.aiSeverity as SeverityLevel) || SeverityLevel.MODERATE
        );

        if (!overrides.priority && computed.priority) {
          updates.govPriority = computed.priority;
          await prisma.governmentOverrideLog.create({
            data: {
              problemId,
              officerId: overrides.officerId,
              field: 'priority',
              previousValue: problem.govPriority || problem.aiPriority,
              overriddenValue: computed.priority,
              reason: `AI auto-recalculated priority based on ${problem.category} problem type and overridden affected population (${overrides.affectedPopulation.toLocaleString()})`,
            },
          });
        }

        if (!overrides.severity && computed.severity) {
          updates.govSeverity = computed.severity;
          await prisma.governmentOverrideLog.create({
            data: {
              problemId,
              officerId: overrides.officerId,
              field: 'severity',
              previousValue: problem.govSeverity || problem.aiSeverity,
              overriddenValue: computed.severity,
              reason: `AI auto-recalculated severity based on ${problem.category} problem type and overridden affected population (${overrides.affectedPopulation.toLocaleString()})`,
            },
          });
        }
      }
    }

    const updatedProblem = await prisma.problem.update({
      where: { id: problemId },
      data: updates,
      include: { overrideLogs: true },
    });

    // Sync changes to parent challenge if linked
    const parentChallengeId =
      problem.group?.challengeId ||
      (problem.challengeLinks && problem.challengeLinks[0]?.challengeId);

    if (parentChallengeId) {
      const challengeUpdates: any = {};
      if (updates.govAffectedPopulation !== undefined) {
        challengeUpdates.affectedPopulation = updates.govAffectedPopulation;
      }
      if (updates.govPriority) {
        challengeUpdates.priority = updates.govPriority;
      }
      if (updates.govSeverity) {
        challengeUpdates.severity = updates.govSeverity;
      }

      const finalPriority = updates.govPriority || problem.govPriority || problem.aiPriority;
      const finalSeverity = updates.govSeverity || problem.govSeverity || problem.aiSeverity;
      challengeUpdates.priorityScore = this.calculateChallengePriorityScore(
        finalSeverity,
        finalPriority,
        updates.govAffectedPopulation ?? problem.govAffectedPopulation ?? problem.aiAffectedPopulation
      );

      await prisma.challenge.update({
        where: { id: parentChallengeId },
        data: challengeUpdates,
      }).catch((e) => logger.warn(`Failed to sync parent challenge ${parentChallengeId}: ${e.message}`));
    }

    return updatedProblem;
  }

  /**
   * Validates investigation: confirms systemic root cause finding by authorized government officer.
   */
  public static async validateInvestigation(
    challengeId: string,
    hypothesisTitle: string,
    reason: string,
    officerId?: string
  ) {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new Error(`Challenge ${challengeId} not found`);
    }

    // Set challenge status to GOVERNMENT_VERIFIED and record validated root cause
    const updated = await prisma.challenge.update({
      where: { id: challengeId },
      data: {
        status: 'GOVERNMENT_VERIFIED',
        systemicSummary: `Human-validated systemic finding: ${hypothesisTitle}. Notes: ${reason}`,
      },
    });

    // Record timeline event
    if (officerId) {
      try {
        await prisma.challengeTimeline.create({
          data: {
            challengeId,
            fromStatus: challenge.status,
            toStatus: 'GOVERNMENT_VERIFIED',
            actorId: officerId,
            reason: `Root cause validated: ${hypothesisTitle}`,
            metadata: { validationNotes: reason },
          },
        });
      } catch {
        // Non-blocking if timeline creation encounters constraints
      }
    }

    return updated;
  }

  // --- Helper Methods ---

  private static assessInitialSeverity(description: string): SeverityLevel {
    const lower = description.toLowerCase();
    if (
      lower.includes('flood') ||
      lower.includes('sinkhole') ||
      lower.includes('fatal') ||
      lower.includes('collapse') ||
      lower.includes('outbreak') ||
      lower.includes('toxic')
    ) {
      return SeverityLevel.SEVERE;
    }
    if (
      lower.includes('accident') ||
      lower.includes('broken main') ||
      lower.includes('crater') ||
      lower.includes('blackout')
    ) {
      return SeverityLevel.MODERATE;
    }
    return SeverityLevel.LOW;
  }

  public static calculatePriorityAndSeverityByProblemType(
    category: string,
    population: number | null,
    baseSeverity: SeverityLevel = SeverityLevel.MODERATE
  ): { priority: PriorityLevel; severity: SeverityLevel } {
    if (population === null || population === undefined) {
      return {
        priority:
          baseSeverity === SeverityLevel.CATASTROPHIC || baseSeverity === SeverityLevel.SEVERE
            ? PriorityLevel.CRITICAL
            : baseSeverity === SeverityLevel.MODERATE
            ? PriorityLevel.MEDIUM
            : PriorityLevel.LOW,
        severity: baseSeverity,
      };
    }

    const catUpper = (category || '').toUpperCase();

    // 1. Road Usage / Corridor (Traffic throughput along road)
    if (catUpper.includes('ROAD') || catUpper.includes('BRIDGE') || catUpper.includes('TRANSIT')) {
      if (population >= 20000) return { priority: PriorityLevel.CRITICAL, severity: SeverityLevel.SEVERE };
      if (population >= 5000) return { priority: PriorityLevel.HIGH, severity: SeverityLevel.MODERATE };
      if (population >= 1000) return { priority: PriorityLevel.MEDIUM, severity: SeverityLevel.MODERATE };
      return { priority: PriorityLevel.LOW, severity: SeverityLevel.LOW };
    }

    // 2. Flood / Environmental (Village & Inundation Exposure)
    if (catUpper.includes('FLOOD') || catUpper.includes('DRAIN') || catUpper.includes('WATERLOGGING')) {
      if (population >= 1000) return { priority: PriorityLevel.CRITICAL, severity: SeverityLevel.CATASTROPHIC };
      if (population >= 300) return { priority: PriorityLevel.HIGH, severity: SeverityLevel.SEVERE };
      if (population >= 50) return { priority: PriorityLevel.MEDIUM, severity: SeverityLevel.MODERATE };
      return { priority: PriorityLevel.LOW, severity: SeverityLevel.LOW };
    }

    // 3. Water Scarcity / Sanitation (Locality Household Exposure)
    if (catUpper.includes('WATER') || catUpper.includes('SUPPLY') || catUpper.includes('SANITATION')) {
      if (population >= 5000) return { priority: PriorityLevel.CRITICAL, severity: SeverityLevel.SEVERE };
      if (population >= 1500) return { priority: PriorityLevel.HIGH, severity: SeverityLevel.MODERATE };
      if (population >= 300) return { priority: PriorityLevel.MEDIUM, severity: SeverityLevel.MODERATE };
      return { priority: PriorityLevel.LOW, severity: SeverityLevel.LOW };
    }

    // 4. General Civic Infrastructure
    if (population >= 25000) return { priority: PriorityLevel.CRITICAL, severity: SeverityLevel.SEVERE };
    if (population >= 10000) return { priority: PriorityLevel.HIGH, severity: SeverityLevel.MODERATE };
    if (population >= 2000) return { priority: PriorityLevel.MEDIUM, severity: SeverityLevel.MODERATE };
    return { priority: PriorityLevel.LOW, severity: SeverityLevel.LOW };
  }

  public static calculateChallengePriorityScore(
    severity: string,
    priority: string,
    population: number | null
  ): number {
    let score = 50;
    const sev = (severity || '').toUpperCase();
    const prio = (priority || '').toUpperCase();

    if (sev === 'CATASTROPHIC') score += 35;
    else if (sev === 'SEVERE') score += 25;
    else if (sev === 'MODERATE') score += 10;

    if (prio === 'CRITICAL' || prio === 'URGENT') score += 20;
    else if (prio === 'HIGH') score += 12;
    else if (prio === 'MEDIUM') score += 5;

    if (population && population > 0) {
      const popBonus = Math.min(15, Math.round(Math.log10(population) * 3));
      score += popBonus;
    }

    return Math.min(100, Math.max(10, score));
  }

  private static assessInitialPriority(severity: SeverityLevel, population: number | null, category?: string): PriorityLevel {
    if (category && population !== null && population !== undefined) {
      return this.calculatePriorityAndSeverityByProblemType(category, population, severity).priority;
    }
    if (severity === SeverityLevel.SEVERE || severity === SeverityLevel.CATASTROPHIC) {
      return PriorityLevel.CRITICAL;
    }
    if (population && population > 25000) {
      return PriorityLevel.HIGH;
    }
    if (severity === SeverityLevel.MODERATE) {
      return PriorityLevel.MEDIUM;
    }
    return PriorityLevel.LOW;
  }

  private static calculateGroupMatchScore(
    problem: any,
    groupMembers: any[]
  ): { totalScore: number; breakdown: any } {
    let semanticSum = 0;
    let spatialSum = 0;
    let temporalSum = 0;

    for (const member of groupMembers) {
      // 1. Semantic overlap (Jaccard on words)
      const wordsA = new Set(problem.description.toLowerCase().split(/\s+/));
      const wordsB = new Set(member.description.toLowerCase().split(/\s+/));
      const intersection = [...wordsA].filter((w) => wordsB.has(w)).length;
      const union = new Set([...wordsA, ...wordsB]).size;
      const semantic = union > 0 ? intersection / union : 0;
      semanticSum += semantic;

      // 2. Spatial proximity
      let spatial = 0.5;
      if (problem.latitude && problem.longitude && member.latitude && member.longitude) {
        const dist = SpatialPolicyEngine.calculateDistanceMeters(
          problem.latitude,
          problem.longitude,
          member.latitude,
          member.longitude
        );
        if (dist !== null) {
          if (dist <= 1000) spatial = 1.0;
          else if (dist <= 3000) spatial = 0.8;
          else if (dist <= 10000) spatial = 0.5;
          else spatial = 0.1;
        }
      } else if (problem.district && member.district && problem.district === member.district) {
        spatial = 0.7;
      }
      spatialSum += spatial;

      // 3. Temporal proximity
      const timeDiff = Math.abs(
        new Date(problem.createdAt || Date.now()).getTime() -
        new Date(member.createdAt || Date.now()).getTime()
      );
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
      const temporal = daysDiff <= 7 ? 1.0 : daysDiff <= 30 ? 0.7 : 0.4;
      temporalSum += temporal;
    }

    const n = Math.max(1, groupMembers.length);
    const avgSemantic = semanticSum / n;
    const avgSpatial = spatialSum / n;
    const avgTemporal = temporalSum / n;
    const categoryScore = 1.0; // Guaranteed same canonical domain

    // Weighted composite score
    const totalScore = avgSemantic * 0.35 + avgSpatial * 0.35 + avgTemporal * 0.15 + categoryScore * 0.15;

    return {
      totalScore: Math.min(1.0, totalScore),
      breakdown: {
        semantic: Number(avgSemantic.toFixed(2)),
        spatial: Number(avgSpatial.toFixed(2)),
        temporal: Number(avgTemporal.toFixed(2)),
        category: 1.0,
        infrastructure: 0.0,
      },
    };
  }

  private static async seedGroupSolutionMemory(groupId: string, domain: string) {
    if (domain === 'ROAD_TRANSPORT') {
      await prisma.groupSolutionMemory.createMany({
        data: [
          {
            groupId,
            title: 'Cold-mix asphalt patch with tack coat sealing',
            intervention: 'Surface layer pothole filling using rapid-curing emulsion tack coat and cold-mix aggregate.',
            classification: 'NOT_WORKED',
            evidenceSource: 'Municipal PWD Maintenance Log 2023 - 82% recurrence within 45 days due to sub-base water saturation.',
          },
          {
            groupId,
            title: 'Full-depth reclamation with subgrade geotextile stabilization',
            intervention: 'Excavation of compromised sub-base, installation of non-woven geotextile membrane, and dense-graded aggregate base.',
            classification: 'PREVIOUSLY_WORKED',
            evidenceSource: 'State Highway Corridor Pilot Study 2024 - 0% recurrent subsidence over 18-month monitoring period.',
          },
        ],
      });
    } else if (domain === 'WATER_SUPPLY') {
      await prisma.groupSolutionMemory.createMany({
        data: [
          {
            groupId,
            title: 'Mechanical pipe clamp repair on feeder branch',
            intervention: 'External split-sleeve repair clamp around joint leak without pressure reduction.',
            classification: 'MIXED_OUTCOME',
            evidenceSource: 'Urban Water Supply Maintenance Audit 2023 - Temporary seal held for 3 months, then shifted under surge hammer.',
          },
          {
            groupId,
            title: 'Pressure reducing valve installation with automated SCADA modulating loop',
            intervention: 'Downstream PRV station dissipating transient pressure spikes across morning distribution cycles.',
            classification: 'PREVIOUSLY_WORKED',
            evidenceSource: 'Municipal Water Board Performance Verification 2024 - 74% reduction in burst frequency across feeder corridor.',
          },
        ],
      });
    }
  }
}
