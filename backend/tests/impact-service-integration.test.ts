import { ImpactService } from '../src/domain/impact/impact.service';
import { prisma } from '../src/database/prisma';
import {
  ImpactVerificationStatus,
  ProblemType,
  SeverityLevel,
  PriorityLevel,
  UserRole,
  AuditAction,
} from '@sicp/shared';
import { ValidationError } from '../src/utils/errors';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    challenge: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    challengeImpact: {
      upsert: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

describe('ImpactService - Persistence, Government Verification & Priority Recalculation', () => {
  describe('computeAndPersistImpact', () => {
    it('evaluates problem-specific impact, upserts ChallengeImpact, and recalculates challenge priority score', async () => {
      (prisma.challenge.findUnique as jest.Mock).mockResolvedValue({
        id: 'chal-water-1',
        title: 'Broken main drinking water pipeline',
        description: 'Clean drinking water leaking on road, houses without supply',
        category: 'Water Supply',
        severity: SeverityLevel.SEVERE,
        priority: PriorityLevel.HIGH,
        durationMonths: 1,
        affectedPopulation: null,
        impact: null,
      });

      (prisma.challengeImpact.upsert as jest.Mock).mockResolvedValue({
        id: 'impact-water-1',
        challengeId: 'chal-water-1',
        problemType: ProblemType.WATER_SUPPLY,
        metricType: 'AFFECTED_PEOPLE',
        estimatedValue: 1200,
        normalizedMagnitude: 75,
        verificationStatus: ImpactVerificationStatus.ESTIMATED,
      });

      (prisma.challenge.update as jest.Mock).mockResolvedValue({});

      const result = await ImpactService.computeAndPersistImpact('chal-water-1', {
        connectedHouseholds: 250,
      });

      expect(prisma.challengeImpact.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { challengeId: 'chal-water-1' },
          create: expect.objectContaining({
            problemType: ProblemType.WATER_SUPPLY,
            estimatedValue: 1200,
          }),
        })
      );

      // Verifies priority score recalculation incorporated the impact magnitude
      expect(prisma.challenge.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'chal-water-1' },
          data: expect.objectContaining({
            priorityScore: expect.any(Number),
          }),
        })
      );

      expect(result.estimatedValue).toBe(1200);
    });

    it('preserves existing government VERIFIED value and does NOT overwrite it with AI estimate', async () => {
      const verifiedImpact = {
        id: 'impact-verified-1',
        challengeId: 'chal-verified-1',
        problemType: ProblemType.WATER_SUPPLY,
        estimatedValue: 4836,
        verifiedValue: 4500,
        verificationStatus: ImpactVerificationStatus.VERIFIED,
      };

      (prisma.challenge.findUnique as jest.Mock).mockResolvedValue({
        id: 'chal-verified-1',
        category: 'Water Supply',
        impact: verifiedImpact,
      });

      const result = await ImpactService.computeAndPersistImpact('chal-verified-1', {
        villagePopulation: 6000,
      });

      expect(prisma.challengeImpact.upsert).not.toHaveBeenCalled();
      expect(result.verifiedValue).toBe(4500);
      expect(result.verificationStatus).toBe(ImpactVerificationStatus.VERIFIED);
    });
  });

  describe('verifyOrModifyImpact — Government Authoritative Review', () => {
    it('allows government officer to modify estimated value and creates audit log with recalculated priority', async () => {
      const mockTx = {
        challenge: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'chal-road-1',
            title: 'Collapsing bridge approach',
            severity: SeverityLevel.SEVERE,
            priority: PriorityLevel.HIGH,
            priorityScore: 68,
            durationMonths: 2,
            version: 1,
            impact: {
              id: 'impact-road-1',
              estimatedValue: 3200,
              verifiedValue: null,
              unit: 'USERS_PER_DAY',
              normalizedMagnitude: 72,
              verificationStatus: ImpactVerificationStatus.ESTIMATED,
            },
          }),
          update: jest.fn().mockResolvedValue({
            id: 'chal-road-1',
            priorityScore: 78,
            version: 2,
          }),
        },
        challengeImpact: {
          update: jest.fn().mockResolvedValue({
            id: 'impact-road-1',
            verifiedValue: 5500,
            verificationStatus: ImpactVerificationStatus.VERIFIED,
            normalizedMagnitude: 84,
          }),
        },
        auditLog: {
          create: jest.fn().mockResolvedValue({ id: 'audit-impact-1' }),
        },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx));

      const result = await ImpactService.verifyOrModifyImpact({
        challengeId: 'chal-road-1',
        action: 'MODIFY',
        verifiedValue: 5500,
        verificationNotes: 'Ground traffic sensor survey confirmed higher volume',
        actorId: 'officer-1',
        actorRole: UserRole.GOVERNMENT_OFFICER,
        requestId: 'req-impact-audit-1',
      });

      expect(result.impact.verifiedValue).toBe(5500);
      expect(result.impact.verificationStatus).toBe(ImpactVerificationStatus.VERIFIED);
      expect(mockTx.challengeImpact.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { challengeId: 'chal-road-1' },
          data: expect.objectContaining({
            verifiedValue: 5500,
            verificationStatus: ImpactVerificationStatus.VERIFIED,
          }),
        })
      );
      expect(mockTx.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            resource: 'ChallengeImpact',
            actorId: 'officer-1',
            reason: 'Ground traffic sensor survey confirmed higher volume',
          }),
        })
      );
    });

    it('rejects modification with negative values', async () => {
      const mockTx = {
        challenge: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'chal-1',
            impact: { id: 'imp-1', estimatedValue: 100, verificationStatus: 'ESTIMATED' },
          }),
        },
      };
      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx));

      await expect(
        ImpactService.verifyOrModifyImpact({
          challengeId: 'chal-1',
          action: 'MODIFY',
          verifiedValue: -50,
          actorId: 'officer-1',
          actorRole: UserRole.GOVERNMENT_OFFICER,
          requestId: 'req-err-1',
        })
      ).rejects.toThrow(ValidationError);
    });
  });
});
