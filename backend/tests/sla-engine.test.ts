import { SlaService } from '../src/domain/sla/sla.service';
import { SeverityLevel, PriorityLevel, ChallengeStatus } from '@sicp/shared';
import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    challenge: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    challengeSLA: {
      upsert: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    notification: {
      create: jest.fn(),
    },
  },
}));

describe('SlaService - Civic SLA Deadlines & Escalations', () => {
  const baseDate = new Date('2026-03-01T12:00:00.000Z');

  describe('calculateDeadline', () => {
    it('calculates 48-hour deadline for catastrophic civic emergencies', () => {
      const deadline = SlaService.calculateDeadline(
        SeverityLevel.CATASTROPHIC,
        PriorityLevel.LOW,
        baseDate
      );
      const diffHours = (deadline.getTime() - baseDate.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBe(48);
    });

    it('calculates 48-hour deadline for critical priority issues regardless of severity', () => {
      const deadline = SlaService.calculateDeadline(
        SeverityLevel.LOW,
        PriorityLevel.CRITICAL,
        baseDate
      );
      const diffHours = (deadline.getTime() - baseDate.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBe(48);
    });

    it('calculates 120-hour (5 days) deadline for severe civic issues', () => {
      const deadline = SlaService.calculateDeadline(
        SeverityLevel.SEVERE,
        PriorityLevel.MEDIUM,
        baseDate
      );
      const diffHours = (deadline.getTime() - baseDate.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBe(120);
    });

    it('calculates 240-hour (10 days) deadline for low and moderate civic issues', () => {
      const deadline = SlaService.calculateDeadline(
        SeverityLevel.MODERATE,
        PriorityLevel.LOW,
        baseDate
      );
      const diffHours = (deadline.getTime() - baseDate.getTime()) / (1000 * 60 * 60);
      expect(diffHours).toBe(240);
    });
  });

  describe('getEscalationStatus', () => {
    it('returns NORMAL when more than 24 hours remain before deadline', () => {
      const deadline = new Date(baseDate.getTime() + 48 * 60 * 60 * 1000);
      const status = SlaService.getEscalationStatus(deadline, baseDate);
      expect(status).toBe('NORMAL');
    });

    it('returns WARNING when 24 hours or less remain before deadline', () => {
      const deadline = new Date(baseDate.getTime() + 18 * 60 * 60 * 1000);
      const status = SlaService.getEscalationStatus(deadline, baseDate);
      expect(status).toBe('WARNING');
    });

    it('returns ESCALATED when deadline has lapsed (SLA breached)', () => {
      const deadline = new Date(baseDate.getTime() - 2 * 60 * 60 * 1000);
      const status = SlaService.getEscalationStatus(deadline, baseDate);
      expect(status).toBe('ESCALATED');
    });
  });

  describe('initOrUpdateSLA', () => {
    it('upserts SLA record with computed review deadline and escalation status', async () => {
      const mockSla = {
        id: 'sla-1',
        challengeId: 'chal-1',
        reviewDeadline: new Date(baseDate.getTime() + 48 * 60 * 60 * 1000),
        escalationStatus: 'NORMAL',
        assignedOfficerId: null,
      };
      (prisma.challengeSLA.upsert as jest.Mock).mockResolvedValue(mockSla);

      const result = await SlaService.initOrUpdateSLA(
        'chal-1',
        SeverityLevel.CATASTROPHIC,
        PriorityLevel.CRITICAL
      );

      expect(prisma.challengeSLA.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { challengeId: 'chal-1' },
          create: expect.objectContaining({
            challengeId: 'chal-1',
            escalationStatus: 'NORMAL',
          }),
        })
      );
      expect(result).toEqual(mockSla);
    });
  });

  describe('assignOfficer', () => {
    it('assigns designated government officer and creates notification', async () => {
      (prisma.challenge.findUnique as jest.Mock).mockResolvedValue({
        id: 'chal-1',
        title: 'Bridge collapse hazard',
        severity: SeverityLevel.CATASTROPHIC,
        priority: PriorityLevel.CRITICAL,
      });

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'officer-1',
        name: 'Officer Sharma',
        email: 'sharma@gov.in',
      });

      (prisma.challengeSLA.upsert as jest.Mock).mockResolvedValue({
        id: 'sla-1',
        challengeId: 'chal-1',
        assignedOfficerId: 'officer-1',
        reviewDeadline: new Date(),
      });

      (prisma.notification.create as jest.Mock).mockResolvedValue({ id: 'notif-1' });

      const result = await SlaService.assignOfficer('chal-1', 'officer-1', 'admin-1');

      expect(result.assignedOfficerId).toBe('officer-1');
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientId: 'officer-1',
            type: 'OFFICER_ASSIGNED',
          }),
        })
      );
    });
  });

  describe('checkAndTriggerEscalations', () => {
    it('identifies overdue SLAs, updates status to ESCALATED, and notifies assigned officer', async () => {
      const overdueDate = new Date(Date.now() - 3600 * 1000); // 1 hour ago
      (prisma.challengeSLA.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'sla-overdue-1',
          challengeId: 'chal-overdue-1',
          reviewDeadline: overdueDate,
          escalationStatus: 'NORMAL',
          assignedOfficerId: 'officer-9',
          challenge: {
            title: 'Hazardous Chemical Leakage',
            status: ChallengeStatus.SUBMITTED,
          },
        },
      ]);

      (prisma.challengeSLA.update as jest.Mock).mockResolvedValue({});
      (prisma.notification.create as jest.Mock).mockResolvedValue({});

      const escalatedCount = await SlaService.checkAndTriggerEscalations();

      expect(escalatedCount).toBe(1);
      expect(prisma.challengeSLA.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'sla-overdue-1' },
          data: expect.objectContaining({
            escalationStatus: 'ESCALATED',
          }),
        })
      );
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            recipientId: 'officer-9',
            type: 'SLA_BREACH_ALERT',
          }),
        })
      );
    });
  });
});
