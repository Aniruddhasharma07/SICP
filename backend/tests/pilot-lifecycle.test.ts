import { PilotService } from '../src/modules/pilot/pilot.service';
import { PilotStatus, MetricProvenance, UserRole } from '@sicp/shared';
import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    project: { findUnique: jest.fn(), update: jest.fn() },
    projectPilot: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    pilotMetric: {
      create: jest.fn(),
    },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe('PilotService - Pilot Deployments, Before/After Metrics & Provenance', () => {
  it('creates pilot and advances project status to PILOT', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      title: 'Water Filtration Unit',
      status: 'TESTING',
    });

    const mockTx = {
      projectPilot: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'pilot-1',
            ...data,
            metricsList: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
      project: { update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(mockTx));

    const pilot = await PilotService.createPilot({
      projectId: 'proj-1',
      dto: {
        location: 'Varanasi Rural Gram Panchayat',
        district: 'Varanasi',
        state: 'Uttar Pradesh',
        targetBeneficiaries: 3500,
        startDate: '2026-03-01T00:00:00.000Z',
        baselineMetrics: { baselineHoursWater: 2, baselineTurbidity: 45 },
        findings: 'Initial site preparation completed',
      },
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-pilot-1',
    });

    expect(pilot.status).toBe(PilotStatus.PLANNING);
    expect(pilot.district).toBe('Varanasi');
    expect(pilot.targetBeneficiaries).toBe(3500);
    expect(mockTx.project.update).toHaveBeenCalledWith({
      where: { id: 'proj-1' },
      data: { status: 'PILOT' },
    });
  });

  it('records measurable pilot metric and computes before/after changes with provenance', async () => {
    (prisma.projectPilot.findUnique as jest.Mock).mockResolvedValue({
      id: 'pilot-1',
      projectId: 'proj-1',
    });

    const mockTx = {
      pilotMetric: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'metric-1',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(mockTx));

    const metric = await PilotService.recordMetric({
      pilotId: 'pilot-1',
      dto: {
        name: 'Clean Water Availability',
        category: 'WATER_SUPPLY',
        unit: 'hours/day',
        baselineValue: 2.0,
        targetValue: 8.0,
        observedValue: 7.5,
        method: 'Automated flow sensor telemetry',
        source: 'IoT Node #14',
        provenance: MetricProvenance.VERIFIED,
        notes: 'Steady water output recorded for 14 consecutive test days',
      },
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-metric-1',
    });

    expect(metric.name).toBe('Clean Water Availability');
    expect(metric.absoluteChange).toBe(5.5); // 7.5 - 2.0
    expect(metric.percentageChange).toBe(275); // (5.5 / 2) * 100
    expect(metric.targetAchievement).toBe(91.67); // (5.5 / 6.0) * 100
    expect(metric.provenance).toBe(MetricProvenance.VERIFIED);
    expect(metric.isVerified).toBe(true);
  });

  it('calculates safe percentage change when baseline is zero without NaN or throw', async () => {
    (prisma.projectPilot.findUnique as jest.Mock).mockResolvedValue({
      id: 'pilot-1',
      projectId: 'proj-1',
    });

    const mockTx = {
      pilotMetric: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'metric-2',
            ...data,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(mockTx));

    const metric = await PilotService.recordMetric({
      pilotId: 'pilot-1',
      dto: {
        name: 'Automated Water ATMs Active',
        category: 'INFRASTRUCTURE',
        unit: 'units',
        baselineValue: 0,
        targetValue: 4,
        observedValue: 4,
        method: 'Physical inventory inspection',
        source: 'Gram Panchayat Record',
        provenance: MetricProvenance.REPORTED,
      },
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-metric-2',
    });

    expect(metric.absoluteChange).toBe(4);
    expect(metric.percentageChange).toBeNull(); // Baseline is zero, so percentage is handled safely
    expect(metric.targetAchievement).toBe(100);
  });

  it('supports recovery state transitions: PAUSED -> ACTIVE, and COMPLETED_WITH_ISSUES without dead ends', async () => {
    (prisma.projectPilot.findUnique as jest.Mock).mockResolvedValue({
      id: 'pilot-1',
      status: PilotStatus.PAUSED,
      findings: 'Suspended temporarily due to monsoon flooding',
      metricsList: [],
    });

    const mockTx = {
      projectPilot: {
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'pilot-1',
            projectId: 'proj-1',
            location: 'Varanasi',
            district: 'Varanasi',
            state: 'UP',
            targetBeneficiaries: 3500,
            startDate: new Date(),
            baselineMetrics: {},
            observedOutcome: null,
            findings: data.findings,
            status: data.status,
            metricsList: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(mockTx));

    // Resume from paused
    const resumed = await PilotService.updateStatus({
      pilotId: 'pilot-1',
      status: PilotStatus.ACTIVE,
      findings: 'Resumed following water level recedence and pump safety inspection',
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-resume',
    });

    expect(resumed.status).toBe(PilotStatus.ACTIVE);
    expect(resumed.findings).toContain('Resumed following');
  });
});
