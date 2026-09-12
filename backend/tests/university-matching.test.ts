import { UniversityMatchingEngine } from '../src/domain/matching/university-matching.engine';
import { ChallengeStatus, OrganizationType, UserRole } from '@sicp/shared';
import { prisma } from '../src/database/prisma';
import { ValidationError, NotFoundError } from '../src/utils/errors';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    challenge: {
      findUnique: jest.fn(),
    },
    organization: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('UniversityMatchingEngine - Capabilities, Proximity & Routing', () => {
  describe('recommendUniversities', () => {
    it('scores and ranks universities based on category, district proximity, and lab capacity', async () => {
      (prisma.challenge.findUnique as jest.Mock).mockResolvedValue({
        id: 'chal-water-1',
        title: 'Severe Arsenic Contamination in Wells',
        category: 'Water Supply',
        district: 'Varanasi',
        state: 'Uttar Pradesh',
      });

      (prisma.organization.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'uni-bhu',
          name: 'IIT BHU Varanasi',
          type: OrganizationType.UNIVERSITY,
          status: 'ACTIVE',
          metadata: { district: 'Varanasi', state: 'Uttar Pradesh' },
          ledProjects: [{ id: 'p1' }], // 1 active project: high capacity
        },
        {
          id: 'uni-kanpur',
          name: 'IIT Kanpur',
          type: OrganizationType.UNIVERSITY,
          status: 'ACTIVE',
          metadata: { district: 'Kanpur', state: 'Uttar Pradesh' }, // Same state, different district
          ledProjects: [{ id: 'p2' }, { id: 'p3' }, { id: 'p4' }, { id: 'p5' }], // 4 projects
        },
        {
          id: 'uni-delhi',
          name: 'IIT Delhi',
          type: OrganizationType.UNIVERSITY,
          status: 'ACTIVE',
          metadata: { district: 'New Delhi', state: 'Delhi' }, // Different state
          ledProjects: [{ id: 'p6' }, { id: 'p7' }], // 2 projects
        },
      ]);

      const recommendations = await UniversityMatchingEngine.recommendUniversities('chal-water-1');

      expect(recommendations.length).toBe(3);
      // IIT BHU should rank #1 because of category alignment + district proximity + high capacity
      expect(recommendations[0].universityName).toBe('IIT BHU Varanasi');
      expect(recommendations[0].matchScore).toBeGreaterThanOrEqual(90);
      expect(recommendations[0].matchReasons.some(r => r.includes('Varanasi district'))).toBe(true);

      // IIT Kanpur should rank above IIT Delhi because of state alignment
      expect(recommendations[1].universityName).toBe('IIT Kanpur');
      expect(recommendations[1].matchScore).toBeGreaterThan(recommendations[2].matchScore);
    });

    it('throws NotFoundError if challenge is not found', async () => {
      (prisma.challenge.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        UniversityMatchingEngine.recommendUniversities('nonexistent-challenge')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('assignToUniversity', () => {
    it('rejects routing if challenge is in DRAFT state', async () => {
      const mockTx = {
        challenge: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'chal-draft-1',
            status: ChallengeStatus.DRAFT,
          }),
        },
      };
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx));

      await expect(
        UniversityMatchingEngine.assignToUniversity({
          challengeId: 'chal-draft-1',
          universityOrgId: 'uni-org-1',
          actorId: 'gov-officer-1',
          actorRole: UserRole.GOVERNMENT_OFFICER,
          requestId: 'req-assign-1',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('successfully assigns challenge to university with timeline, audit, and admin notifications', async () => {
      const mockTx = {
        challenge: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'chal-approved-1',
            title: 'Contaminated Lake Water',
            category: 'Water Supply',
            district: 'Varanasi',
            status: ChallengeStatus.APPROVED,
            version: 2,
          }),
          update: jest.fn().mockResolvedValue({
            id: 'chal-approved-1',
            status: ChallengeStatus.ASSIGNED_TO_UNIVERSITY,
            version: 3,
          }),
        },
        organization: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'uni-org-1',
            name: 'IIT BHU',
            members: [
              { userId: 'uni-admin-1', user: { email: 'admin@bhu.ac.in' } },
            ],
          }),
        },
        universityMatch: {
          upsert: jest.fn().mockResolvedValue({ id: 'match-1' }),
        },
        challengeTimeline: {
          create: jest.fn().mockResolvedValue({ id: 'time-1' }),
        },
        auditLog: {
          create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
        },
        notification: {
          create: jest.fn().mockResolvedValue({ id: 'notif-1' }),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx));

      const result = await UniversityMatchingEngine.assignToUniversity({
        challengeId: 'chal-approved-1',
        universityOrgId: 'uni-org-1',
        actorId: 'gov-officer-1',
        actorRole: UserRole.GOVERNMENT_OFFICER,
        reason: 'Exceptional hydrology lab facilities',
        requestId: 'req-assign-2',
      });

      expect(result.challenge.status).toBe(ChallengeStatus.ASSIGNED_TO_UNIVERSITY);
      expect(result.universityName).toBe('IIT BHU');
      expect(mockTx.challenge.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'chal-approved-1' },
          data: expect.objectContaining({
            status: ChallengeStatus.ASSIGNED_TO_UNIVERSITY,
          }),
        })
      );
      expect(mockTx.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientId: 'uni-admin-1',
            type: 'UNIVERSITY_ASSIGNMENT',
          }),
        })
      );
    });
  });
});
