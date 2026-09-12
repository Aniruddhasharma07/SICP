import { UniversityService } from '../src/modules/university/university.service';
import { ChallengeStatus, MatchStatus, ProjectStatus, UserRole } from '@sicp/shared';
import { prisma } from '../src/database/prisma';
import { ValidationError, NotFoundError } from '../src/utils/errors';

import { UniversityMatchingEngine } from '../src/domain/matching/university-matching.engine';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    challenge: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('UniversityService - Acceptance & Routing Workflow', () => {
  describe('acceptAssignment', () => {
    it('accepts university routing, transitions challenge to IN_RESEARCH, and creates draft project shell', async () => {
      const mockTx = {
        challenge: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'chal-100',
            title: 'Water pipe rupture in Sector 4',
            status: ChallengeStatus.ASSIGNED_TO_UNIVERSITY,
            submitterId: 'citizen-1',
            universityMatches: [{ id: 'm-1', universityOrgId: 'uni-1', status: MatchStatus.OFFERED }],
          }),
          update: jest.fn().mockResolvedValue({
            id: 'chal-100',
            status: ChallengeStatus.IN_RESEARCH,
            version: 2,
          }),
        },
        universityMatch: {
          upsert: jest.fn().mockResolvedValue({
            id: 'm-1',
            status: MatchStatus.ACCEPTED,
          }),
        },
        project: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn().mockResolvedValue({
            id: 'proj-100',
            title: 'Project: Water pipe rupture in Sector 4',
            status: ProjectStatus.ASSIGNED, // non-active draft shell
            leadingOrgId: 'uni-1',
          }),
        },
        challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
        notification: { create: jest.fn().mockResolvedValue({}) },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx));

      const result = await UniversityService.acceptAssignment({
        challengeId: 'chal-100',
        universityOrgId: 'uni-1',
        actorId: 'admin-1',
        actorRole: UserRole.UNIVERSITY_ADMIN,
        requestId: 'req-acc-1',
      });

      expect(result.challenge.status).toBe(ChallengeStatus.IN_RESEARCH);
      expect(result.match.status).toBe(MatchStatus.ACCEPTED);
      expect(result.project.status).toBe(ProjectStatus.ASSIGNED);
      expect(mockTx.challengeTimeline.create).toHaveBeenCalled();
      expect(mockTx.auditLog.create).toHaveBeenCalled();
    });

    it('rejects acceptance if challenge is not in ASSIGNED_TO_UNIVERSITY status', async () => {
      const mockTx = {
        challenge: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'chal-draft',
            status: ChallengeStatus.DRAFT,
            universityMatches: [],
          }),
        },
      };
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx));

      await expect(
        UniversityService.acceptAssignment({
          challengeId: 'chal-draft',
          universityOrgId: 'uni-1',
          actorId: 'admin-1',
          actorRole: UserRole.UNIVERSITY_ADMIN,
          requestId: 'req-err-1',
        })
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('declineAssignment', () => {
    it('requires minimum 10-character reason to decline assignment', async () => {
      await expect(
        UniversityService.declineAssignment({
          challengeId: 'chal-100',
          universityOrgId: 'uni-1',
          reason: 'Short', // Less than 10 chars
          actorId: 'admin-1',
          actorRole: UserRole.UNIVERSITY_ADMIN,
          requestId: 'req-dec-1',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('declines assignment, reverts challenge to APPROVED, and provides Zero-Dead-End alternatives', async () => {
      const mockTx = {
        challenge: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'chal-100',
            title: 'Water contamination',
            status: ChallengeStatus.ASSIGNED_TO_UNIVERSITY,
            universityMatches: [{ id: 'm-1', universityOrgId: 'uni-bhu', status: MatchStatus.OFFERED }],
          }),
          update: jest.fn().mockResolvedValue({
            id: 'chal-100',
            status: ChallengeStatus.APPROVED,
            version: 3,
          }),
        },
        universityMatch: {
          upsert: jest.fn().mockResolvedValue({
            id: 'm-1',
            status: MatchStatus.REJECTED,
            rejectionReason: 'Lab capacity is currently fully booked with ongoing clean energy projects.',
          }),
        },
        challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
        user: {
          findMany: jest.fn().mockResolvedValue([{ id: 'gov-off-1' }]),
        },
        notification: { create: jest.fn().mockResolvedValue({}) },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx));

      jest.spyOn(UniversityMatchingEngine, 'recommendUniversities').mockResolvedValue([
        { universityOrgId: 'uni-alt-1', universityName: 'NIT Varanasi', matchScore: 82, matchReasons: [], activeProjectsCount: 1, location: 'Varanasi' },
        { universityOrgId: 'uni-bhu', universityName: 'IIT BHU', matchScore: 90, matchReasons: [], activeProjectsCount: 2, location: 'Varanasi' },
      ]);

      const result = await UniversityService.declineAssignment({
        challengeId: 'chal-100',
        universityOrgId: 'uni-bhu',
        reason: 'Lab capacity is currently fully booked with ongoing clean energy projects.',
        actorId: 'admin-1',
        actorRole: UserRole.UNIVERSITY_ADMIN,
        requestId: 'req-dec-2',
      });

      expect(result.challenge.status).toBe(ChallengeStatus.APPROVED);
      expect(result.zeroDeadEnd).toBeDefined();
      expect(result.zeroDeadEnd.whoActs).toBe('Government Officer');
      expect(result.zeroDeadEnd.alternativeRecommendations.length).toBe(1);
      expect(result.zeroDeadEnd.alternativeRecommendations[0].universityOrgId).toBe('uni-alt-1'); // excluded uni-bhu
    });
  });
});
