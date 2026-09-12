import { TeamService } from '../src/modules/team/team.service';
import { TeamRole, InvitationStatus, UserRole } from '@sicp/shared';
import { prisma } from '../src/database/prisma';
import { ValidationError, NotFoundError } from '../src/utils/errors';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    challenge: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    multidisciplinaryTeam: { findUnique: jest.fn(), create: jest.fn() },
    teamMember: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    project: { findFirst: jest.fn(), update: jest.fn() },
    auditLog: { create: jest.fn() },
    notification: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe('TeamService - Multidisciplinary Team Formation & Vacancy Health', () => {
  it('creates team and automatically confirms Lead Faculty as ACCEPTED', async () => {
    const mockTx = {
      challenge: { findUnique: jest.fn().mockResolvedValue({ id: 'chal-1' }) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'fac-1', role: UserRole.FACULTY }) },
      multidisciplinaryTeam: {
        create: jest.fn().mockResolvedValue({
          id: 'team-1',
          name: 'Water Innovations Group',
          challengeId: 'chal-1',
          leadFacultyId: 'fac-1',
          members: [
            { userId: 'fac-1', roleInTeam: TeamRole.LEAD_FACULTY, invitationStatus: InvitationStatus.ACCEPTED },
          ],
        }),
      },
      project: { findFirst: jest.fn().mockResolvedValue(null) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx));

    const team = await TeamService.createTeam({
      name: 'Water Innovations Group',
      challengeId: 'chal-1',
      leadFacultyId: 'fac-1',
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-team-1',
    });

    expect(team.id).toBe('team-1');
    expect(team.members[0].roleInTeam).toBe(TeamRole.LEAD_FACULTY);
    expect(team.members[0].invitationStatus).toBe(InvitationStatus.ACCEPTED);
  });

  it('invites a student researcher with INVITED status and notifies student', async () => {
    const mockTx = {
      multidisciplinaryTeam: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'team-1',
          name: 'Water Group',
          leadFacultyId: 'fac-1',
          members: [],
        }),
      },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'stud-1', role: UserRole.STUDENT }) },
      teamMember: {
        create: jest.fn().mockResolvedValue({
          id: 'tm-stud-1',
          teamId: 'team-1',
          userId: 'stud-1',
          roleInTeam: TeamRole.STUDENT_RESEARCHER,
          invitationStatus: InvitationStatus.INVITED,
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      notification: { create: jest.fn().mockResolvedValue({}) },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx));

    const member = await TeamService.inviteMember({
      teamId: 'team-1',
      userId: 'stud-1',
      roleInTeam: TeamRole.STUDENT_RESEARCHER,
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-inv-1',
    });

    expect(member.roleInTeam).toBe(TeamRole.STUDENT_RESEARCHER);
    expect(member.invitationStatus).toBe(InvitationStatus.INVITED);
    expect(mockTx.notification.create).toHaveBeenCalled();
  });

  it('evaluates team health as AT_RISK when missing lead faculty or multidisciplinary roles', async () => {
    (prisma.multidisciplinaryTeam.findUnique as jest.Mock).mockResolvedValue({
      id: 'team-2',
      name: 'Solo Team',
      challengeId: 'chal-1',
      leadFacultyId: 'fac-unconfirmed',
      members: [
        {
          id: 'tm-1',
          userId: 'fac-unconfirmed',
          roleInTeam: TeamRole.LEAD_FACULTY,
          invitationStatus: InvitationStatus.DECLINED, // Declined!
          declineReason: 'On sabbatical',
          user: { fullName: 'Dr. Absent' },
        },
      ],
    });

    const health = await TeamService.getTeamHealth('team-2');

    expect(health.status).toBe('AT_RISK');
    expect(health.hasConfirmedLeadFaculty).toBe(false);
    expect(health.declinedCount).toBe(1);
    expect(health.actionRequired).toContain('Lead Faculty assignment is missing or unconfirmed');
    expect(health.recoveryOptions.some(o => o.action === 'CONFIRM_LEAD_FACULTY')).toBe(true);
  });
});
