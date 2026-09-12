import { prisma } from '../../database/prisma';
import {
  OrganizationType,
  ChallengeStatus,
  MatchStatus,
  AuditAction,
  UserRole,
} from '@sicp/shared';
import { NotFoundError, ValidationError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export interface UniversityMatchRecommendation {
  universityOrgId: string;
  universityName: string;
  matchScore: number; // 0 to 100
  matchReasons: string[];
  activeProjectsCount: number;
  location: string;
}

const CATEGORY_DEPARTMENT_MAP: Record<string, string[]> = {
  'Water Supply': ['Civil & Environmental Engineering', 'Water Resources', 'Hydrology & Fluid Dynamics', 'Biotechnology'],
  'Sanitation': ['Environmental Engineering', 'Public Health', 'Biochemical Engineering', 'Municipal Infrastructure'],
  'Roads & Transport': ['Transportation Engineering', 'Urban Planning', 'Civil Infrastructure', 'Geotechnical Engineering'],
  'Healthcare Access': ['Biomedical Engineering', 'Health Informatics', 'Community Medicine', 'Telemedicine Technologies'],
  'Education Infrastructure': ['Educational Technology', 'Computer Science & Engineering', 'Social Sciences & Pedagogy'],
  'Agriculture & Irrigation': ['Agricultural Engineering', 'Agronomy & Soil Sciences', 'Water Resources', 'Precision Agriculture'],
  'Air Quality': ['Environmental Sciences', 'Chemical Engineering', 'Atmospheric Physics', 'Sensor Networks'],
};

export class UniversityMatchingEngine {
  /**
   * Evaluates and scores verified university organizations against a specific challenge
   */
  public static async recommendUniversities(
    challengeId: string,
    limit: number = 5
  ): Promise<UniversityMatchRecommendation[]> {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
      include: {
        universityMatches: true,
      },
    });

    if (!challenge) {
      throw new NotFoundError('Challenge', challengeId);
    }

    const declinedOrgIds = new Set(
      challenge.universityMatches
        .filter(m => m.status === MatchStatus.REJECTED)
        .map(m => m.universityOrgId)
    );

    // Query all verified universities, prioritizing active alternatives
    const universities = await prisma.organization.findMany({
      where: {
        type: OrganizationType.UNIVERSITY,
        status: 'ACTIVE',
        verificationStatus: 'VERIFIED',
        id: { notIn: Array.from(declinedOrgIds) },
      },
      include: {
        ledProjects: {
          where: {
            status: { notIn: ['COMPLETED', 'CANCELLED', 'FAILED'] },
          },
        },
      },
    });

    const recommendations: UniversityMatchRecommendation[] = universities.map(uni => {
      let score = 40; // baseline score for verified academic research institute
      const reasons: string[] = [];

      // 1. Category / Domain relevance
      const relevantDepts = CATEGORY_DEPARTMENT_MAP[challenge.category] || ['Applied Sciences', 'Technology Innovation'];
      score += 30;
      reasons.push(`Core capabilities aligned with ${challenge.category} (${relevantDepts.slice(0, 2).join(', ')})`);

      // 2. Geographic proximity for field implementation
      const meta = (uni.metadata as Record<string, unknown>) || {};
      const uniDistrict = (meta.district as string) || '';
      const uniState = (meta.state as string) || '';

      if (challenge.district && uniDistrict && challenge.district.toLowerCase() === uniDistrict.toLowerCase()) {
        score += 20;
        reasons.push(`Direct local presence in ${challenge.district} district facilitates immediate field prototyping`);
      } else if (challenge.state && uniState && challenge.state.toLowerCase() === uniState.toLowerCase()) {
        score += 10;
        reasons.push(`State-level institutional alignment in ${challenge.state}`);
      }

      // 3. Workload capacity
      const activeCount = uni.ledProjects.length;
      if (activeCount < 3) {
        score += 10;
        reasons.push('High research bandwidth and lab capacity available');
      } else if (activeCount <= 6) {
        score += 5;
        reasons.push('Active innovation hub with ongoing pilot projects');
      }

      const finalScore = Math.min(Math.round(score), 100);

      return {
        universityOrgId: uni.id,
        universityName: uni.name,
        matchScore: finalScore,
        matchReasons: reasons,
        activeProjectsCount: activeCount,
        location: `${uniDistrict || 'Regional'}, ${uniState || 'National'}`,
      };
    });

    return recommendations.sort((a, b) => b.matchScore - a.matchScore).slice(0, limit);
  }

  /**
   * Formally assigns / routes an approved challenge to a selected university organization
   */
  public static async assignToUniversity(params: {
    challengeId: string;
    universityOrgId: string;
    actorId: string;
    actorRole: UserRole;
    reason?: string;
    requestId: string;
    ipAddress?: string;
  }) {
    const { challengeId, universityOrgId, actorId, actorRole, reason, requestId, ipAddress } = params;

    return await prisma.$transaction(async tx => {
      const challenge = await tx.challenge.findUnique({
        where: { id: challengeId },
      });

      if (!challenge) {
        throw new NotFoundError('Challenge', challengeId);
      }

      const eligibleStatuses = [
        ChallengeStatus.SUBMITTED,
        ChallengeStatus.UNDER_GOV_REVIEW,
        ChallengeStatus.APPROVED,
      ];
      if (!eligibleStatuses.includes(challenge.status as ChallengeStatus)) {
        throw new ValidationError(
          `Challenge with status '${challenge.status}' cannot be routed to a university. Eligible statuses: SUBMITTED, UNDER_GOV_REVIEW, APPROVED.`
        );
      }

      const university = await tx.organization.findUnique({
        where: { id: universityOrgId },
        include: { members: { where: { role: 'ADMIN' }, include: { user: true } } },
      });

      if (!university) {
        throw new NotFoundError('Organization', universityOrgId);
      }

      // 1. Upsert UniversityMatch record
      const match = await tx.universityMatch.upsert({
        where: { id: `${challengeId}-${universityOrgId}` },
        create: {
          id: `${challengeId}-${universityOrgId}`,
          challengeId,
          universityOrgId,
          matchScore: 85.0,
          matchReasons: [`Routed by government officer (${actorRole}). Justification: ${reason || 'High domain expertise'}`],
          status: MatchStatus.OFFERED,
        },
        update: {
          status: MatchStatus.OFFERED,
          matchReasons: [`Re-routed by government authority. Justification: ${reason || 'High domain expertise'}`],
        },
      });

      // 2. Transition challenge status to ASSIGNED_TO_UNIVERSITY
      const updatedChallenge = await tx.challenge.update({
        where: { id: challengeId },
        data: {
          status: ChallengeStatus.ASSIGNED_TO_UNIVERSITY,
          version: { increment: 1 },
        },
      });

      // 3. Create Timeline entry
      await tx.challengeTimeline.create({
        data: {
          challengeId,
          fromStatus: challenge.status,
          toStatus: ChallengeStatus.ASSIGNED_TO_UNIVERSITY,
          actorId,
          reason: `Formally routed to ${university.name}. Reason: ${reason || 'Assigned for academic research and solution prototyping.'}`,
        },
      });

      // 4. Create Audit Log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: AuditAction.CHALLENGE_STATE_TRANSITION,
          resource: 'Challenge',
          resourceId: challengeId,
          previousState: { status: challenge.status, version: challenge.version },
          newState: { status: updatedChallenge.status, assignedUniversityId: universityOrgId, version: updatedChallenge.version },
          reason: reason || 'Assigned to university',
          requestId,
          ipAddress: ipAddress || null,
        },
      });

      // 5. Notify University Admins
      for (const member of university.members) {
        await tx.notification.create({
          data: {
            recipientId: member.userId,
            title: `New Civic Problem Assigned: "${challenge.title}"`,
            message: `${challenge.category} issue in ${challenge.district || 'district'} has been assigned to ${university.name} for research and team formation.`,
            type: 'UNIVERSITY_ASSIGNMENT',
            actionUrl: `/challenges/${challengeId}`,
          },
        });
      }

      logger.info(`Challenge ${challengeId} assigned to university ${university.name} (${universityOrgId}) by ${actorRole}`);

      return {
        challenge: updatedChallenge,
        match,
        universityName: university.name,
      };
    });
  }
}
