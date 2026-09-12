import { ProjectService } from '../src/modules/project/project.service';
import {
  ProjectStatus,
  ChallengeStatus,
  ProposalStatus,
  MilestoneStatus,
  TeamRole,
  InvitationStatus,
  UserRole,
} from '@sicp/shared';
import { prisma } from '../src/database/prisma';
import { ValidationError, NotFoundError } from '../src/utils/errors';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    project: { findUnique: jest.fn(), update: jest.fn() },
    challenge: { update: jest.fn() },
    challengeTimeline: { create: jest.fn() },
    projectMilestone: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    projectRisk: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe('ProjectService - Authoritative Activation Guardrails & Health Cockpit', () => {
  describe('evaluateActivationPrerequisites', () => {
    it('returns canActivate: false with explicit missing prerequisites when team or proposal is missing', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'proj-inactive-1',
        title: 'Project Shell',
        leadingOrgId: 'uni-bhu',
        challenge: {
          id: 'chal-1',
          status: ChallengeStatus.ASSIGNED_TO_UNIVERSITY,
          universityMatches: [{ universityOrgId: 'uni-bhu', status: 'ACCEPTED' }],
        },
        team: null, // Missing team!
        proposals: [], // Missing proposal!
      });

      const checklist = await ProjectService.evaluateActivationPrerequisites('proj-inactive-1');

      expect(checklist.canActivate).toBe(false);
      expect(checklist.isUniversityAccepted).toBe(true);
      expect(checklist.hasValidTeam).toBe(false);
      expect(checklist.hasConfirmedLeadFaculty).toBe(false);
      expect(checklist.isProposalApproved).toBe(false);
      expect(checklist.missingPrerequisites.length).toBeGreaterThan(0);
      expect(checklist.missingPrerequisites.some(p => p.includes('team'))).toBe(true);
      expect(checklist.missingPrerequisites.some(p => p.includes('Proposal'))).toBe(true);
    });

    it('returns canActivate: true when all 5 authoritative conditions are fulfilled', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'proj-ready-1',
        title: 'Project Ready',
        leadingOrgId: 'uni-bhu',
        challenge: {
          id: 'chal-1',
          status: ChallengeStatus.SOLUTION_PROPOSED,
          universityMatches: [{ universityOrgId: 'uni-bhu', status: 'ACCEPTED' }],
        },
        team: {
          id: 'team-1',
          members: [
            { roleInTeam: TeamRole.LEAD_FACULTY, invitationStatus: InvitationStatus.ACCEPTED },
            { roleInTeam: TeamRole.STUDENT_RESEARCHER, invitationStatus: InvitationStatus.ACCEPTED },
          ],
        },
        proposals: [{ id: 'prop-approved', version: 1, status: ProposalStatus.APPROVED }],
      });

      const checklist = await ProjectService.evaluateActivationPrerequisites('proj-ready-1');

      expect(checklist.canActivate).toBe(true);
      expect(checklist.isChallengeApproved).toBe(true);
      expect(checklist.isUniversityAccepted).toBe(true);
      expect(checklist.hasValidTeam).toBe(true);
      expect(checklist.hasConfirmedLeadFaculty).toBe(true);
      expect(checklist.isProposalApproved).toBe(true);
      expect(checklist.missingPrerequisites.length).toBe(0);
    });
  });

  describe('activateProject', () => {
    it('rejects activation if prerequisites are not satisfied', async () => {
      (prisma.project.findUnique as jest.Mock).mockResolvedValue({
        id: 'proj-not-ready',
        leadingOrgId: 'uni-1',
        challenge: {
          id: 'chal-1',
          status: ChallengeStatus.ASSIGNED_TO_UNIVERSITY,
          universityMatches: [], // not accepted
        },
        team: null,
        proposals: [],
      });

      await expect(
        ProjectService.activateProject({
          projectId: 'proj-not-ready',
          actorId: 'admin-1',
          actorRole: UserRole.SYSTEM_ADMIN,
          requestId: 'req-act-err',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('activates project and advances challenge to IN_PILOT when prerequisites met', async () => {
      // Mock for evaluateActivationPrerequisites
      (prisma.project.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'proj-active',
        leadingOrgId: 'uni-1',
        challenge: {
          id: 'chal-1',
          status: ChallengeStatus.SOLUTION_PROPOSED,
          universityMatches: [{ universityOrgId: 'uni-1', status: 'ACCEPTED' }],
        },
        team: {
          members: [
            { roleInTeam: TeamRole.LEAD_FACULTY, invitationStatus: InvitationStatus.ACCEPTED },
            { roleInTeam: TeamRole.CO_FACULTY, invitationStatus: InvitationStatus.ACCEPTED },
          ],
        },
        proposals: [{ id: 'p-app', version: 1, status: ProposalStatus.APPROVED }],
      });

      const mockTx = {
        project: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'proj-active',
            title: 'Water Pilot Project',
            challengeId: 'chal-1',
            status: ProjectStatus.ASSIGNED,
            proposals: [{ id: 'p-app', version: 1 }],
          }),
          update: jest.fn().mockResolvedValue({
            id: 'proj-active',
            status: ProjectStatus.APPROVED,
            activatedAt: new Date(),
          }),
        },
        challenge: { update: jest.fn().mockResolvedValue({}) },
        challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx));

      const result = await ProjectService.activateProject({
        projectId: 'proj-active',
        actorId: 'officer-1',
        actorRole: UserRole.GOVERNMENT_OFFICER,
        requestId: 'req-act-success',
      });

      expect(result.project.status).toBe(ProjectStatus.APPROVED);
      expect(result.checklist.canActivate).toBe(true);
      expect(mockTx.challenge.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: ChallengeStatus.IN_PILOT }),
        })
      );
    });
  });

  describe('updateMilestoneStatus - Zero Dead End Blocked Handling', () => {
    it('requires a detailed reason when rejecting or blocking a milestone', async () => {
      (prisma.projectMilestone.findUnique as jest.Mock).mockResolvedValue({
        id: 'm-1',
        status: MilestoneStatus.IN_PROGRESS,
      });

      await expect(
        ProjectService.updateMilestoneStatus({
          milestoneId: 'm-1',
          status: MilestoneStatus.REJECTED,
          blockedReason: '', // Empty reason
          actorId: 'officer-1',
          actorRole: UserRole.GOVERNMENT_OFFICER,
          requestId: 'req-block-1',
        })
      ).rejects.toThrow(ValidationError);
    });
  });
});
