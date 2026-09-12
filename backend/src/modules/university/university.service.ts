import { prisma } from '../../database/prisma';
import {
  ChallengeStatus,
  MatchStatus,
  UserRole,
  AuditAction,
  ProjectStatus,
} from '@sicp/shared';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { FacultyMatchingEngine } from '../../domain/matching/faculty-matching.engine';
import { UniversityMatchingEngine } from '../../domain/matching/university-matching.engine';

export interface UniversityAcceptParams {
  challengeId: string;
  universityOrgId: string;
  actorId: string;
  actorRole: UserRole;
  requestId: string;
  ipAddress?: string;
}

export interface UniversityDeclineParams {
  challengeId: string;
  universityOrgId: string;
  reason: string;
  actorId: string;
  actorRole: UserRole;
  requestId: string;
  ipAddress?: string;
}

export interface UpsertFacultyProfileParams {
  userId: string;
  department: string;
  designation: string;
  expertiseTags: string[];
  researchInterests?: string[];
  publicationsCount?: number;
  patentsCount?: number;
  pastProjectsCount?: number;
  maxSimultaneousProjects?: number;
  bio?: string;
}

export class UniversityService {
  /**
   * Accepts university routing assignment for a challenge.
   * Enters IN_RESEARCH status and prepares a non-active draft project shell.
   */
  public static async acceptAssignment(params: UniversityAcceptParams) {
    const { challengeId, universityOrgId, actorId, actorRole, requestId, ipAddress } = params;

    return await prisma.$transaction(async tx => {
      const challenge = await tx.challenge.findUnique({
        where: { id: challengeId },
        include: { universityMatches: true },
      });

      if (!challenge) {
        throw new NotFoundError('Challenge', challengeId);
      }

      if (challenge.status !== ChallengeStatus.ASSIGNED_TO_UNIVERSITY) {
        throw new ValidationError(
          `Cannot accept assignment: Challenge is in '${challenge.status}' status, expected 'ASSIGNED_TO_UNIVERSITY'.`
        );
      }

      // Verify or upsert university match
      const existingMatch = challenge.universityMatches.find(m => m.universityOrgId === universityOrgId);
      const matchId = existingMatch ? existingMatch.id : `${challengeId}-${universityOrgId}`;

      const updatedMatch = await tx.universityMatch.upsert({
        where: { id: matchId },
        create: {
          id: matchId,
          challengeId,
          universityOrgId,
          matchScore: 90.0,
          matchReasons: ['Formally accepted by University Administration'],
          status: MatchStatus.ACCEPTED,
        },
        update: {
          status: MatchStatus.ACCEPTED,
          matchReasons: ['Formally accepted by University Administration'],
        },
      });

      // Advance challenge to IN_RESEARCH
      const updatedChallenge = await tx.challenge.update({
        where: { id: challengeId },
        data: {
          status: ChallengeStatus.IN_RESEARCH,
          version: { increment: 1 },
        },
      });

      // Create non-active draft Project shell (ASSIGNED status - NOT ACTIVE)
      let project = await tx.project.findFirst({
        where: { challengeId, leadingOrgId: universityOrgId },
      });

      if (!project) {
        project = await tx.project.create({
          data: {
            challengeId,
            leadingOrgId: universityOrgId,
            title: `Project: ${challenge.title}`,
            description: `Research, prototyping, and solution development for "${challenge.title}"`,
            status: ProjectStatus.ASSIGNED, // Non-active draft shell
          },
        });
      }

      // Timeline entry
      await tx.challengeTimeline.create({
        data: {
          challengeId,
          fromStatus: ChallengeStatus.ASSIGNED_TO_UNIVERSITY,
          toStatus: ChallengeStatus.IN_RESEARCH,
          actorId,
          reason: 'University accepted civic challenge assignment and initiated research and multidisciplinary team setup.',
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: AuditAction.CHALLENGE_UNIVERSITY_ACCEPTED,
          resource: 'Challenge',
          resourceId: challengeId,
          previousState: { status: challenge.status, matchStatus: existingMatch?.status },
          newState: { status: updatedChallenge.status, matchStatus: updatedMatch.status, projectId: project.id },
          reason: 'University assignment accepted',
          requestId,
          ipAddress: ipAddress || null,
        },
      });

      // Notify citizen submitter
      await tx.notification.create({
        data: {
          recipientId: challenge.submitterId,
          title: 'University Accepted Your Challenge',
          message: `Your reported challenge "${challenge.title}" has been accepted by the university for research and team formation.`,
          type: 'UNIVERSITY_ACCEPTED',
          actionUrl: `/challenges/${challengeId}`,
        },
      });

      logger.info(`University ${universityOrgId} accepted challenge ${challengeId}. Status: IN_RESEARCH. Draft project shell: ${project.id}`);

      return {
        challenge: updatedChallenge,
        match: updatedMatch,
        project,
      };
    });
  }

  /**
   * Declines university routing assignment with mandatory reason.
   * Reverts challenge to APPROVED status for government re-routing.
   * Exposes structured Zero-Dead-End DTO with alternatives.
   */
  public static async declineAssignment(params: UniversityDeclineParams) {
    const { challengeId, universityOrgId, reason, actorId, actorRole, requestId, ipAddress } = params;

    if (!reason || reason.trim().length < 10) {
      throw new ValidationError('A detailed reason (minimum 10 characters) is mandatory to decline a university assignment.');
    }

    return await prisma.$transaction(async tx => {
      const challenge = await tx.challenge.findUnique({
        where: { id: challengeId },
        include: { universityMatches: true },
      });

      if (!challenge) {
        throw new NotFoundError('Challenge', challengeId);
      }

      if (challenge.status !== ChallengeStatus.ASSIGNED_TO_UNIVERSITY) {
        throw new ValidationError(
          `Cannot decline assignment: Challenge is in '${challenge.status}' status, expected 'ASSIGNED_TO_UNIVERSITY'.`
        );
      }

      const existingMatch = challenge.universityMatches.find(m => m.universityOrgId === universityOrgId);
      const matchId = existingMatch ? existingMatch.id : `${challengeId}-${universityOrgId}`;

      const updatedMatch = await tx.universityMatch.upsert({
        where: { id: matchId },
        create: {
          id: matchId,
          challengeId,
          universityOrgId,
          matchScore: 0.0,
          matchReasons: [`Declined by institution: ${reason.trim()}`],
          status: MatchStatus.REJECTED,
          rejectionReason: reason.trim(),
        },
        update: {
          status: MatchStatus.REJECTED,
          rejectionReason: reason.trim(),
        },
      });

      // Revert challenge status back to APPROVED
      const updatedChallenge = await tx.challenge.update({
        where: { id: challengeId },
        data: {
          status: ChallengeStatus.APPROVED,
          version: { increment: 1 },
        },
      });

      // Timeline entry
      await tx.challengeTimeline.create({
        data: {
          challengeId,
          fromStatus: ChallengeStatus.ASSIGNED_TO_UNIVERSITY,
          toStatus: ChallengeStatus.APPROVED,
          actorId,
          reason: `University declined assignment: ${reason.trim()}`,
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: AuditAction.CHALLENGE_UNIVERSITY_DECLINED,
          resource: 'Challenge',
          resourceId: challengeId,
          previousState: { status: challenge.status, matchStatus: existingMatch?.status },
          newState: { status: updatedChallenge.status, matchStatus: updatedMatch.status },
          reason: reason.trim(),
          requestId,
          ipAddress: ipAddress || null,
        },
      });

      // Find alternative university recommendations (excluding the declined one)
      let alternativeRecommendations: any[] = [];
      try {
        const allRecommendations = await UniversityMatchingEngine.recommendUniversities(challengeId, 5);
        if (Array.isArray(allRecommendations)) {
          alternativeRecommendations = allRecommendations.filter(r => r.universityOrgId !== universityOrgId);
        }
      } catch (err) {
        alternativeRecommendations = [];
      }

      // Notify government command center / officers
      const officers = await tx.user.findMany({
        where: { role: 'GOVERNMENT_OFFICER', isActive: true },
        take: 5,
      });

      for (const officer of officers) {
        await tx.notification.create({
          data: {
            recipientId: officer.id,
            title: `University Declined Assignment: "${challenge.title}"`,
            message: `Institution declined assignment with reason: "${reason.trim()}". Challenge has returned to APPROVED queue for re-routing.`,
            type: 'UNIVERSITY_DECLINED',
            actionUrl: `/government?tab=queue`,
          },
        });
      }

      logger.info(`University ${universityOrgId} declined challenge ${challengeId}. Reverted to APPROVED.`);

      return {
        challenge: updatedChallenge,
        match: updatedMatch,
        zeroDeadEnd: {
          whatHappened: 'The university declined the assignment request.',
          why: reason.trim(),
          whoActs: 'Government Officer',
          actionRequired: 'Review alternative candidate universities and re-route the challenge, or evaluate systemic cluster aggregation.',
          alternativeRecommendations,
        },
      };
    });
  }

  /**
   * Expresses institutional interest in a challenge.
   * Sets or updates UniversityMatch to OFFERED status, logs timeline, records audit log, and notifies government officers.
   */
  public static async expressInterest(params: {
    challengeId: string;
    universityOrgId: string;
    notes?: string;
    actorId: string;
    actorRole: UserRole;
    requestId: string;
    ipAddress?: string;
  }) {
    const { challengeId, universityOrgId, notes, actorId, actorRole, requestId, ipAddress } = params;

    return await prisma.$transaction(async tx => {
      const challenge = await tx.challenge.findUnique({
        where: { id: challengeId },
        include: { universityMatches: true },
      });

      if (!challenge) {
        throw new NotFoundError('Challenge', challengeId);
      }

      const existingMatch = challenge.universityMatches.find(m => m.universityOrgId === universityOrgId);
      const matchId = existingMatch ? existingMatch.id : `${challengeId}-${universityOrgId}`;

      const updatedMatch = await tx.universityMatch.upsert({
        where: { id: matchId },
        create: {
          id: matchId,
          challengeId,
          universityOrgId,
          matchScore: 85.0,
          matchReasons: [
            'EXPRESSED_INTEREST: University officially declared institutional readiness to solve this problem.',
            ...(notes ? [notes.trim()] : []),
          ],
          status: MatchStatus.OFFERED,
        },
        update: {
          matchReasons: [
            'EXPRESSED_INTEREST: University officially declared institutional readiness to solve this problem.',
            ...(notes ? [notes.trim()] : []),
          ],
          status: MatchStatus.OFFERED,
        },
      });

      // Challenge timeline entry
      await tx.challengeTimeline.create({
        data: {
          challengeId,
          fromStatus: challenge.status,
          toStatus: challenge.status,
          actorId,
          reason: `University expressed institutional interest in solving this challenge${notes ? `: ${notes.trim()}` : ''}`,
          metadata: {
            action: 'UNIVERSITY_EXPRESSED_INTEREST',
            universityOrgId,
            matchId: updatedMatch.id,
          },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: AuditAction.CHALLENGE_UNIVERSITY_INTEREST_EXPRESSED,
          resource: 'Challenge',
          resourceId: challengeId,
          previousState: { status: challenge.status, matchStatus: existingMatch?.status },
          newState: { status: challenge.status, matchStatus: updatedMatch.status, interested: true },
          reason: notes || 'University expressed institutional interest',
          requestId,
          ipAddress: ipAddress || null,
        },
      });

      // Notify government officers
      const officers = await tx.user.findMany({
        where: { role: { in: [UserRole.GOVERNMENT_OFFICER, UserRole.GOVERNMENT_DEPARTMENT, UserRole.SYSTEM_ADMIN] } },
        select: { id: true },
        take: 10,
      });

      if (officers.length > 0) {
        await tx.notification.createMany({
          data: officers.map(off => ({
            recipientId: off.id,
            title: 'University Expressed Interest in Civic Challenge',
            message: `An accredited university has expressed interest in researching challenge: "${challenge.title}".`,
            type: 'UNIVERSITY_INTEREST_EXPRESSED',
            actionUrl: `/government?challengeId=${challengeId}`,
          })),
        });
      }

      logger.info(`University ${universityOrgId} expressed interest in challenge ${challengeId}.`);

      return {
        challenge,
        match: updatedMatch,
      };
    });
  }

  /**
   * Retrieves challenges assigned or offered to a university.
   */
  public static async getAssignedChallenges(universityOrgId: string) {
    const matches = await prisma.universityMatch.findMany({
      where: { universityOrgId },
      include: {
        challenge: {
          include: {
            impact: true,
            sla: true,
            teams: {
              include: {
                leadFaculty: true,
                members: { include: { user: true } },
              },
            },
            projects: {
              include: {
                proposals: true,
                milestones: true,
                risks: true,
                fundingRequests: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return matches;
  }

  /**
   * Recommends ranked faculty experts for a challenge.
   */
  public static async getFacultyMatches(challengeId: string, universityOrgId?: string) {
    return await FacultyMatchingEngine.matchFacultyForChallenge(challengeId, universityOrgId);
  }

  /**
   * Upserts faculty profile for a faculty member.
   */
  public static async upsertFacultyProfile(params: UpsertFacultyProfileParams) {
    const {
      userId,
      department,
      designation,
      expertiseTags,
      researchInterests = [],
      publicationsCount = 0,
      patentsCount = 0,
      pastProjectsCount = 0,
      maxSimultaneousProjects = 3,
      bio,
    } = params;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    return await prisma.facultyProfile.upsert({
      where: { userId },
      create: {
        userId,
        department,
        designation,
        expertiseTags,
        researchInterests,
        publicationsCount,
        patentsCount,
        pastProjectsCount,
        maxSimultaneousProjects,
        bio,
      },
      update: {
        department,
        designation,
        expertiseTags,
        researchInterests,
        publicationsCount,
        patentsCount,
        pastProjectsCount,
        maxSimultaneousProjects,
        bio,
      },
    });
  }

  /**
   * Returns list of verified registered universities for institutional selection and routing
   */
  public static async getRegisteredUniversities() {
    const orgs = await prisma.organization.findMany({
      where: {
        type: 'UNIVERSITY',
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
      },
      orderBy: { name: 'asc' },
    });

    return orgs.map(org => {
      const meta = (org.metadata as any) || {};
      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        district: meta.district || '',
        state: meta.state || '',
        aisheCode: meta.aisheCode || '',
        naacGrade: meta.naacGrade || 'A+',
        category: meta.category || 'UNIVERSITY',
        researchDomains: meta.researchDomains || [],
        departments: meta.departments || [],
        facilities: meta.facilities || [],
        ratingScore: meta.currentRatingScore || 92.0,
        deanEmail: meta.deanEmail || '',
        representativeTitle: meta.representativeTitle || 'Dean of Academic Research',
      };
    });
  }
}

