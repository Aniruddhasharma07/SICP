import { prisma } from '../../database/prisma';
import {
  TeamRole,
  InvitationStatus,
  UserRole,
  AuditAction,
  MatchStatus,
} from '@sicp/shared';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors';
import { logger } from '../../utils/logger';

export interface CreateTeamParams {
  name: string;
  challengeId: string;
  leadFacultyId: string;
  actorId: string;
  actorRole: UserRole;
  requestId: string;
  ipAddress?: string;
}

export interface InviteTeamMemberParams {
  teamId: string;
  userId: string;
  roleInTeam: TeamRole;
  actorId: string;
  actorRole: UserRole;
  requestId: string;
  ipAddress?: string;
}

export interface RespondInvitationParams {
  teamId: string;
  userId: string;
  decision: 'ACCEPTED' | 'DECLINED';
  reason?: string;
  requestId: string;
  ipAddress?: string;
}

export interface TeamHealthReport {
  teamId: string;
  teamName: string;
  challengeId?: string | null;
  status: 'HEALTHY' | 'AT_RISK';
  hasConfirmedLeadFaculty: boolean;
  totalMembers: number;
  acceptedMembers: number;
  pendingInvitations: number;
  declinedCount: number;
  rolesPresent: TeamRole[];
  missingRoles: TeamRole[];
  actionRequired?: string;
  recoveryOptions: Array<{ action: string; label: string }>;
}

export class TeamService {
  /**
   * Creates a new multidisciplinary research & innovation team.
   */
  public static async createTeam(params: CreateTeamParams) {
    const { name, challengeId, leadFacultyId, actorId, actorRole, requestId, ipAddress } = params;

    if (!name || name.trim().length < 3) {
      throw new ValidationError('Team name must be at least 3 characters.');
    }

    return await prisma.$transaction(async tx => {
      const challenge = await tx.challenge.findUnique({
        where: { id: challengeId },
      });

      if (!challenge) {
        throw new NotFoundError('Challenge', challengeId);
      }

      const facultyUser = await tx.user.findUnique({
        where: { id: leadFacultyId },
      });

      if (!facultyUser) {
        throw new NotFoundError('User', leadFacultyId);
      }

      if (facultyUser.role !== UserRole.FACULTY && facultyUser.role !== UserRole.SYSTEM_ADMIN && facultyUser.role !== UserRole.UNIVERSITY_ADMIN) {
        throw new ValidationError('Lead faculty must have FACULTY, UNIVERSITY_ADMIN, or SYSTEM_ADMIN role.');
      }

      // Validate that lead faculty belongs to the assigned university
      if (actorRole !== UserRole.SYSTEM_ADMIN && tx.universityMatch) {
        const assignedMatch = await tx.universityMatch.findFirst({
          where: { challengeId, status: MatchStatus.ACCEPTED },
        });
        if (assignedMatch && (!facultyUser.organizationId || assignedMatch.universityOrgId !== facultyUser.organizationId)) {
          throw new ValidationError('Selected lead faculty does not belong to the university assigned to this challenge.');
        }
      }

      // Create team with lead faculty auto-accepted
      const team = await tx.multidisciplinaryTeam.create({
        data: {
          name: name.trim(),
          challengeId,
          leadFacultyId,
          members: {
            create: {
              userId: leadFacultyId,
              roleInTeam: TeamRole.LEAD_FACULTY,
              invitationStatus: InvitationStatus.ACCEPTED,
              joinedAt: new Date(),
            },
          },
        },
        include: {
          members: { include: { user: true } },
          leadFaculty: true,
        },
      });

      // If a draft project shell exists for this challenge, associate team
      const project = await tx.project.findFirst({
        where: { challengeId },
      });

      if (project) {
        await tx.project.update({
          where: { id: project.id },
          data: { teamId: team.id },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: AuditAction.TEAM_CREATED,
          resource: 'MultidisciplinaryTeam',
          resourceId: team.id,
          newState: { teamName: team.name, challengeId, leadFacultyId },
          requestId,
          ipAddress: ipAddress || null,
        },
      });

      logger.info(`Multidisciplinary team "${team.name}" (${team.id}) created for challenge ${challengeId} with lead faculty ${leadFacultyId}`);

      return team;
    });
  }

  /**
   * Invites a new multidisciplinary member to the team.
   */
  public static async inviteMember(params: InviteTeamMemberParams) {
    const { teamId, userId, roleInTeam, actorId, actorRole, requestId, ipAddress } = params;

    return await prisma.$transaction(async tx => {
      const team = await tx.multidisciplinaryTeam.findUnique({
        where: { id: teamId },
        include: { members: true, leadFaculty: true },
      });

      if (!team) {
        throw new NotFoundError('MultidisciplinaryTeam', teamId);
      }

      // Verify caller is lead faculty, university admin, or system admin
      if (
        actorRole !== UserRole.SYSTEM_ADMIN &&
        actorRole !== UserRole.UNIVERSITY_ADMIN &&
        team.leadFacultyId !== actorId
      ) {
        throw new ForbiddenError('Only the Lead Faculty or University Admin can invite members.');
      }

      const invitee = await tx.user.findUnique({ where: { id: userId } });
      if (!invitee) {
        throw new NotFoundError('User', userId);
      }

      // Validate that invited student or researcher belongs to the assigned university
      if (actorRole !== UserRole.SYSTEM_ADMIN) {
        if (team.challengeId && tx.universityMatch) {
          const assignedMatch = await tx.universityMatch.findFirst({
            where: { challengeId: team.challengeId, status: MatchStatus.ACCEPTED },
          });
          if (assignedMatch && (!invitee.organizationId || invitee.organizationId !== assignedMatch.universityOrgId)) {
            throw new ValidationError('Invited member must belong to the university assigned to this challenge.');
          }
        }
        if (
          invitee.organizationId &&
          team.leadFaculty?.organizationId &&
          invitee.organizationId !== team.leadFaculty.organizationId
        ) {
          throw new ValidationError('Invited member must belong to the same university as the lead faculty.');
        }
      }

      // Check existing membership
      const existing = team.members.find(m => m.userId === userId);
      let member;
      if (existing) {
        if (existing.invitationStatus === InvitationStatus.ACCEPTED) {
          throw new ValidationError('User is already an active accepted member of this team.');
        }
        // Re-invite
        member = await tx.teamMember.update({
          where: { id: existing.id },
          data: {
            roleInTeam,
            invitationStatus: InvitationStatus.INVITED,
            invitedAt: new Date(),
            respondedAt: null,
            declineReason: null,
          },
          include: { user: true },
        });
      } else {
        member = await tx.teamMember.create({
          data: {
            teamId,
            userId,
            roleInTeam,
            invitationStatus: InvitationStatus.INVITED,
            invitedAt: new Date(),
          },
          include: { user: true },
        });
      }

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId,
          actorRole,
          action: AuditAction.TEAM_MEMBER_INVITED,
          resource: 'TeamMember',
          resourceId: member.id,
          newState: { teamId, userId, roleInTeam },
          requestId,
          ipAddress: ipAddress || null,
        },
      });

      // Notification to invitee
      await tx.notification.create({
        data: {
          recipientId: userId,
          title: `Invited to Team: "${team.name}"`,
          message: `You have been invited as ${roleInTeam} to collaborate on team "${team.name}".`,
          type: 'TEAM_INVITATION',
          actionUrl: `/university?teamId=${teamId}`,
        },
      });

      logger.info(`User ${userId} invited as ${roleInTeam} to team ${teamId} by ${actorId}`);

      return member;
    });
  }

  /**
   * Member responds to invitation (Accept or Decline).
   */
  public static async respondInvitation(params: RespondInvitationParams) {
    const { teamId, userId, decision, reason, requestId, ipAddress } = params;

    return await prisma.$transaction(async tx => {
      const member = await tx.teamMember.findUnique({
        where: { teamId_userId: { teamId, userId } },
        include: { team: true, user: true },
      });

      if (!member) {
        throw new NotFoundError('TeamMember invitation', `${teamId}/${userId}`);
      }

      if (decision === 'DECLINED' && (!reason || reason.trim().length === 0)) {
        throw new ValidationError('A reason must be provided when declining an invitation.');
      }

      const newStatus = decision === 'ACCEPTED' ? InvitationStatus.ACCEPTED : InvitationStatus.DECLINED;

      const updated = await tx.teamMember.update({
        where: { id: member.id },
        data: {
          invitationStatus: newStatus,
          respondedAt: new Date(),
          declineReason: decision === 'DECLINED' ? reason?.trim() : null,
        },
        include: { user: true },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          actorId: userId,
          actorRole: member.user.role,
          action: AuditAction.TEAM_MEMBER_RESPONDED,
          resource: 'TeamMember',
          resourceId: member.id,
          newState: { decision, reason: reason?.trim() },
          requestId,
          ipAddress: ipAddress || null,
        },
      });

      // Notify Lead Faculty
      await tx.notification.create({
        data: {
          recipientId: member.team.leadFacultyId,
          title: `Team Invitation ${decision}: ${member.user.fullName}`,
          message: `${member.user.fullName} (${member.roleInTeam}) has ${decision.toLowerCase()} the invitation${reason ? `: "${reason}"` : '.'}`,
          type: 'TEAM_RESPONSE',
          actionUrl: `/university?teamId=${teamId}`,
        },
      });

      logger.info(`User ${userId} ${decision} invitation for team ${teamId}`);

      return updated;
    });
  }

  /**
   * Evaluates team health, role coverage, vacancies, and Zero-Dead-End recovery.
   */
  public static async getTeamHealth(teamId: string): Promise<TeamHealthReport> {
    const team = await prisma.multidisciplinaryTeam.findUnique({
      where: { id: teamId },
      include: {
        members: { include: { user: true } },
      },
    });

    if (!team) {
      throw new NotFoundError('MultidisciplinaryTeam', teamId);
    }

    const leadFaculty = team.members.find(
      m => m.roleInTeam === TeamRole.LEAD_FACULTY && m.invitationStatus === InvitationStatus.ACCEPTED
    );

    const hasConfirmedLeadFaculty = !!leadFaculty;
    const acceptedMembers = team.members.filter(m => m.invitationStatus === InvitationStatus.ACCEPTED);
    const pendingInvitations = team.members.filter(m => m.invitationStatus === InvitationStatus.INVITED);
    const declinedMembers = team.members.filter(m => m.invitationStatus === InvitationStatus.DECLINED);

    const rolesPresent = Array.from(new Set(acceptedMembers.map(m => m.roleInTeam as TeamRole)));

    // Minimum recommended multidisciplinary roles: Lead Faculty + Student or Co-Faculty
    const standardRoles: TeamRole[] = [
      TeamRole.LEAD_FACULTY,
      TeamRole.STUDENT_RESEARCHER,
      TeamRole.CO_FACULTY,
    ];
    const missingRoles = standardRoles.filter(r => !rolesPresent.includes(r));

    const isHealthy = hasConfirmedLeadFaculty && acceptedMembers.length >= 2;
    const status: 'HEALTHY' | 'AT_RISK' = isHealthy ? 'HEALTHY' : 'AT_RISK';

    const recoveryOptions: Array<{ action: string; label: string }> = [];
    let actionRequired: string | undefined = undefined;

    if (!hasConfirmedLeadFaculty) {
      actionRequired = 'Lead Faculty assignment is missing or unconfirmed.';
      recoveryOptions.push({
        action: 'CONFIRM_LEAD_FACULTY',
        label: 'Confirm or Replace Lead Faculty',
      });
    }

    if (declinedMembers.length > 0) {
      actionRequired = actionRequired || `${declinedMembers.length} invited member(s) declined. Replacement required.`;
      recoveryOptions.push({
        action: 'INVITE_REPLACEMENT',
        label: 'Invite Replacement Members',
      });
    }

    if (!rolesPresent.includes(TeamRole.STUDENT_RESEARCHER)) {
      recoveryOptions.push({
        action: 'INVITE_STUDENT',
        label: 'Invite Student Researchers',
      });
    }

    if (!rolesPresent.includes(TeamRole.INDUSTRY_MENTOR)) {
      recoveryOptions.push({
        action: 'INVITE_INDUSTRY_MENTOR',
        label: 'Connect Industry / MSME Mentor',
      });
    }

    return {
      teamId: team.id,
      teamName: team.name,
      challengeId: team.challengeId,
      status,
      hasConfirmedLeadFaculty,
      totalMembers: team.members.length,
      acceptedMembers: acceptedMembers.length,
      pendingInvitations: pendingInvitations.length,
      declinedCount: declinedMembers.length,
      rolesPresent,
      missingRoles,
      actionRequired,
      recoveryOptions,
    };
  }

  /**
   * Retrieves team details with members and health report.
   */
  public static async getTeam(teamId: string) {
    const team = await prisma.multidisciplinaryTeam.findUnique({
      where: { id: teamId },
      include: {
        leadFaculty: { include: { facultyProfile: true } },
        members: { include: { user: { include: { facultyProfile: true } } } },
        projects: true,
      },
    });

    if (!team) {
      throw new NotFoundError('MultidisciplinaryTeam', teamId);
    }

    const health = await this.getTeamHealth(teamId);

    return {
      ...team,
      health,
    };
  }
}
