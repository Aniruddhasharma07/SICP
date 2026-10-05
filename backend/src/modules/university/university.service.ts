import bcrypt from 'bcryptjs';
import { prisma } from '../../database/prisma';
import {
  ChallengeStatus,
  MatchStatus,
  UserRole,
  AuditAction,
  ProjectStatus,
} from '@sicp/shared';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../../utils/errors';
import { logger } from '../../utils/logger';
import { FacultyMatchingEngine } from '../../domain/matching/faculty-matching.engine';
import { UniversityMatchingEngine } from '../../domain/matching/university-matching.engine';
import { NotificationService } from '../notification/notification.service';
import { AuditService } from '../audit/audit.service';

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

  /**
   * Register a new Faculty or Student under an existing verified university (status: PENDING)
   */
  public static async registerUniversityMember(params: {
    fullName: string;
    email: string;
    password?: string;
    universityOrgId: string;
    role: UserRole.FACULTY | UserRole.STUDENT;
    department: string;
    designation?: string;
    program?: string;
    yearOrSemester?: string;
    skills?: string[];
    interests?: string[];
    rollNumber?: string;
    bio?: string;
    requestId?: string;
    ipAddress?: string;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: params.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictError('A user with this email address already exists.');
    }

    const org = await prisma.organization.findUnique({
      where: { id: params.universityOrgId },
    });
    if (!org || org.type !== 'UNIVERSITY') {
      throw new NotFoundError('University organization not found.');
    }

    const rawPassword = params.password || 'University@2026';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = await prisma.user.create({
      data: {
        fullName: params.fullName.trim(),
        email: params.email.toLowerCase().trim(),
        passwordHash,
        role: params.role as unknown as import('@prisma/client').$Enums.UserRole,
        organizationId: params.universityOrgId,
        approvalStatus: 'PENDING',
        isActive: true,
      },
    });

    if (params.role === UserRole.FACULTY) {
      await prisma.facultyProfile.create({
        data: {
          userId: user.id,
          department: params.department,
          designation: params.designation || 'Assistant Professor',
          expertiseTags: params.skills || [],
          researchInterests: params.interests || [],
          bio: params.bio || null,
        },
      });
    } else {
      await prisma.studentProfile.create({
        data: {
          userId: user.id,
          department: params.department,
          program: params.program || 'B.Tech',
          yearOrSemester: params.yearOrSemester || '3rd Year',
          rollNumber: params.rollNumber || null,
          skills: params.skills || [],
          interests: params.interests || [],
          bio: params.bio || null,
        },
      });
    }

    // Notify University Admins
    const admins = await prisma.user.findMany({
      where: {
        organizationId: params.universityOrgId,
        role: { in: [UserRole.UNIVERSITY_ADMIN, UserRole.SYSTEM_ADMIN] },
      },
      select: { id: true },
    });

    for (const admin of admins) {
      await NotificationService.create({
        recipientId: admin.id,
        recipientRole: 'UNIVERSITY_ADMIN',
        portal: 'university',
        organizationId: params.universityOrgId,
        title: 'New Member Registration Awaiting Approval',
        message: `${params.fullName} has registered as ${params.role} for ${params.department}. Review registration to grant access.`,
        type: 'REGISTRATION_PENDING',
        actionUrl: '/university?tab=registrations',
        metadata: { applicantId: user.id, role: params.role, department: params.department },
      });
    }

    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      approvalStatus: user.approvalStatus,
      department: params.department,
    };
  }

  /**
   * Get pending registrations for a university
   */
  public static async getPendingRegistrations(universityOrgId: string) {
    return prisma.user.findMany({
      where: {
        organizationId: universityOrgId,
        approvalStatus: 'PENDING',
      },
      include: {
        facultyProfile: true,
        studentProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Review pending registration (Approve or Reject)
   */
  public static async reviewRegistration(params: {
    userId: string;
    universityOrgId: string;
    action: 'APPROVE' | 'REJECT';
    reason?: string;
    adminUserId: string;
  }) {
    const user = await prisma.user.findUnique({
      where: { id: params.userId },
    });

    if (!user) throw new NotFoundError('User not found.');
    if (user.organizationId !== params.universityOrgId) {
      throw new ForbiddenError('You can only review registrations for your own university.');
    }

    const newStatus = params.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

    const updated = await prisma.user.update({
      where: { id: params.userId },
      data: { approvalStatus: newStatus },
      include: { facultyProfile: true, studentProfile: true },
    });

    if (params.action === 'APPROVE') {
      await prisma.organizationMember.upsert({
        where: {
          organizationId_userId: {
            organizationId: params.universityOrgId,
            userId: params.userId,
          },
        },
        create: {
          organizationId: params.universityOrgId,
          userId: params.userId,
          role: user.role === UserRole.FACULTY ? 'FACULTY' : 'STUDENT',
        },
        update: {
          role: user.role === UserRole.FACULTY ? 'FACULTY' : 'STUDENT',
        },
      });

      await NotificationService.create({
        recipientId: user.id,
        recipientRole: user.role,
        portal: 'university',
        organizationId: params.universityOrgId,
        title: 'University Registration Approved',
        message: 'Your institutional registration has been approved. You now have full access to university challenges and research workspaces.',
        type: 'REGISTRATION_APPROVED',
        actionUrl: user.role === UserRole.FACULTY ? '/university?tab=assigned' : '/university?tab=teams',
      });
    } else {
      await NotificationService.create({
        recipientId: user.id,
        recipientRole: user.role,
        portal: 'university',
        organizationId: params.universityOrgId,
        title: 'University Registration Not Approved',
        message: params.reason || 'Your registration request was not approved by the university administrator.',
        type: 'REGISTRATION_REJECTED',
      });
    }

    return updated;
  }

  /**
   * Directly add a student or faculty member by University Admin (APPROVED by default)
   */
  public static async addUserDirectly(params: {
    fullName: string;
    email: string;
    password?: string;
    universityOrgId: string;
    role: UserRole.FACULTY | UserRole.STUDENT;
    department: string;
    designation?: string;
    program?: string;
    yearOrSemester?: string;
    skills?: string[];
    interests?: string[];
    rollNumber?: string;
    bio?: string;
    adminUserId: string;
  }) {
    const existing = await prisma.user.findUnique({
      where: { email: params.email.toLowerCase() },
    });
    if (existing) {
      throw new ConflictError('A user with this email address already exists.');
    }

    const rawPassword = params.password || 'University@2026';
    const passwordHash = await bcrypt.hash(rawPassword, 10);

    const user = await prisma.user.create({
      data: {
        fullName: params.fullName.trim(),
        email: params.email.toLowerCase().trim(),
        passwordHash,
        role: params.role as unknown as import('@prisma/client').$Enums.UserRole,
        organizationId: params.universityOrgId,
        approvalStatus: 'APPROVED',
        isActive: true,
      },
    });

    await prisma.organizationMember.create({
      data: {
        organizationId: params.universityOrgId,
        userId: user.id,
        role: params.role === UserRole.FACULTY ? 'FACULTY' : 'STUDENT',
      },
    });

    if (params.role === UserRole.FACULTY) {
      await prisma.facultyProfile.create({
        data: {
          userId: user.id,
          department: params.department,
          designation: params.designation || 'Assistant Professor',
          expertiseTags: params.skills || [],
          researchInterests: params.interests || [],
          bio: params.bio || null,
        },
      });
    } else {
      await prisma.studentProfile.create({
        data: {
          userId: user.id,
          department: params.department,
          program: params.program || 'B.Tech',
          yearOrSemester: params.yearOrSemester || '3rd Year',
          rollNumber: params.rollNumber || null,
          skills: params.skills || [],
          interests: params.interests || [],
          bio: params.bio || null,
        },
      });
    }

    return user;
  }

  /**
   * List approved students for a university
   */
  public static async getUniversityStudents(universityOrgId: string) {
    return prisma.user.findMany({
      where: {
        organizationId: universityOrgId,
        role: { in: [UserRole.STUDENT, UserRole.RESEARCH_ASSISTANT] },
        approvalStatus: 'APPROVED',
      },
      include: {
        studentProfile: true,
        teamMemberships: {
          include: {
            team: {
              include: {
                challenge: { select: { id: true, title: true, status: true, category: true } },
              },
            },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  /**
   * List approved faculty members for a university
   */
  public static async getUniversityFaculty(universityOrgId: string) {
    return prisma.user.findMany({
      where: {
        organizationId: universityOrgId,
        role: UserRole.FACULTY,
        approvalStatus: 'APPROVED',
      },
      include: {
        facultyProfile: true,
        teamsLed: {
          include: {
            challenge: { select: { id: true, title: true, status: true, category: true } },
            members: { include: { user: { select: { id: true, fullName: true, role: true } } } },
          },
        },
      },
      orderBy: { fullName: 'asc' },
    });
  }

  /**
   * Get user's own profile and associated university data
   */
  public static async getMyUniversityProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: true,
        facultyProfile: true,
        studentProfile: true,
        teamsLed: {
          include: {
            challenge: true,
            members: { include: { user: { select: { id: true, fullName: true, role: true } } } },
            projects: true,
          },
        },
        teamMemberships: {
          include: {
            team: {
              include: {
                challenge: true,
                leadFaculty: { select: { id: true, fullName: true, email: true } },
                projects: true,
              },
            },
          },
        },
      },
    });

    if (!user) throw new NotFoundError('User not found.');
    return user;
  }

  /**
   * Upsert student profile
   */
  public static async upsertStudentProfile(params: {
    userId: string;
    department: string;
    program?: string;
    yearOrSemester?: string;
    rollNumber?: string;
    gpa?: number;
    skills?: string[];
    interests?: string[];
    bio?: string;
  }) {
    return prisma.studentProfile.upsert({
      where: { userId: params.userId },
      create: {
        userId: params.userId,
        department: params.department,
        program: params.program || 'B.Tech',
        yearOrSemester: params.yearOrSemester || '3rd Year',
        rollNumber: params.rollNumber || null,
        gpa: params.gpa || null,
        skills: params.skills || [],
        interests: params.interests || [],
        bio: params.bio || null,
      },
      update: {
        department: params.department,
        program: params.program,
        yearOrSemester: params.yearOrSemester,
        rollNumber: params.rollNumber,
        gpa: params.gpa,
        skills: params.skills,
        interests: params.interests,
        bio: params.bio,
      },
    });
  }
}


