import { PrototypeService } from '../src/modules/prototype/prototype.service';
import { PrototypeStatus, ProjectStatus, UserRole } from '@sicp/shared';
import { prisma } from '../src/database/prisma';
import { ValidationError } from '../src/utils/errors';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    project: { findUnique: jest.fn(), update: jest.fn() },
    projectPrototype: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    user: { findMany: jest.fn() },
    auditLog: { create: jest.fn() },
    notification: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe('PrototypeService - Immutable Versioning, Government Review & Revisions', () => {
  it('creates draft prototype and monotonically increments version', async () => {
    (prisma.project.findUnique as jest.Mock).mockResolvedValue({
      id: 'proj-1',
      title: 'Water Filtration Unit',
      status: ProjectStatus.APPROVED,
      prototypes: [{ id: 'proto-v1', version: 1 }],
      leadingOrg: { name: 'IIT BHU' },
    });

    const mockTx = {
      projectPrototype: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'proto-v2',
            ...data,
            createdBy: { fullName: 'Dr. Ramesh Kumar' },
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
      project: { update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(mockTx));

    const prototype = await PrototypeService.createPrototype({
      projectId: 'proj-1',
      dto: {
        title: 'Electrochemical Coagulation Prototype V2',
        description: 'Enhanced filtration unit with automated backwash',
        prototypeType: 'HARDWARE',
        technicalApproach: 'Electrochemical coagulation with solar feed',
        objectives: ['Filter 2000L/day', 'Reduce turbidity < 1 NTU'],
        components: { filterChamber: 'Stainless Steel 316', electrode: 'Titanium' },
      },
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-proto-1',
    });

    expect(prototype.version).toBe(2);
    expect(prototype.status).toBe(PrototypeStatus.DRAFT);
    expect(prototype.title).toContain('V2');
    expect(mockTx.project.update).toHaveBeenCalledWith({
      where: { id: 'proj-1' },
      data: { status: ProjectStatus.PROTOTYPE },
    });
  });

  it('submits prototype and marks it SUBMITTED (immutable)', async () => {
    (prisma.projectPrototype.findUnique as jest.Mock).mockResolvedValue({
      id: 'proto-v1',
      version: 1,
      status: PrototypeStatus.DRAFT,
      projectId: 'proj-1',
      project: { title: 'Water Filtration Unit' },
      createdBy: { fullName: 'Dr. Ramesh Kumar' },
    });

    const mockTx = {
      projectPrototype: {
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'proto-v1',
            projectId: 'proj-1',
            version: 1,
            title: 'Water Prototype',
            description: 'Desc',
            prototypeType: 'HARDWARE',
            technicalApproach: 'Approach',
            objectives: [],
            status: data.status,
            submittedAt: data.submittedAt,
            createdBy: { fullName: 'Dr. Ramesh Kumar' },
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(mockTx));
    (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 'gov-1' }]);
    (prisma.notification.create as jest.Mock).mockResolvedValue({});

    const submitted = await PrototypeService.submitPrototype({
      prototypeId: 'proto-v1',
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-proto-submit',
    });

    expect(submitted.status).toBe(PrototypeStatus.SUBMITTED);
    expect(submitted.submittedAt).toBeDefined();
  });

  it('reviews prototype with REQUEST_REVISION and preserves required changes without dead ends', async () => {
    (prisma.projectPrototype.findUnique as jest.Mock).mockResolvedValue({
      id: 'proto-v1',
      version: 1,
      status: PrototypeStatus.SUBMITTED,
      projectId: 'proj-1',
      createdById: 'fac-1',
      project: { title: 'Water Filtration Unit', status: ProjectStatus.PROTOTYPE },
      createdBy: { fullName: 'Dr. Ramesh Kumar' },
    });

    const mockTx = {
      projectPrototype: {
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'proto-v1',
            projectId: 'proj-1',
            version: 1,
            title: 'Water Prototype',
            description: 'Desc',
            prototypeType: 'HARDWARE',
            technicalApproach: 'Approach',
            objectives: [],
            status: data.status,
            reviewDecision: data.reviewDecision,
            reviewComments: data.reviewComments,
            requiredChanges: data.requiredChanges,
            reviewedAt: data.reviewedAt,
            createdBy: { fullName: 'Dr. Ramesh Kumar' },
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(mockTx));
    (prisma.notification.create as jest.Mock).mockResolvedValue({});

    const reviewed = await PrototypeService.reviewPrototype({
      prototypeId: 'proto-v1',
      dto: {
        decision: 'REQUEST_REVISION',
        comments: 'Power consumption exceeds rural grid limits. Add solar backup.',
        requiredChanges: ['Incorporate solar power module', 'Add automated turbidity sensor'],
      },
      actorId: 'gov-1',
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-proto-review',
    });

    expect(reviewed.status).toBe(PrototypeStatus.REVISION_REQUESTED);
    expect(reviewed.requiredChanges).toContain('Incorporate solar power module');

    // Now revise to create V2 without modifying V1
    (prisma.projectPrototype.findUnique as jest.Mock).mockResolvedValue({
      id: 'proto-v1',
      projectId: 'proj-1',
      version: 1,
      title: 'Water Prototype',
      description: 'Desc',
      prototypeType: 'HARDWARE',
      technicalApproach: 'Approach',
      objectives: ['Filter water'],
      status: PrototypeStatus.REVISION_REQUESTED,
    });
    (prisma.projectPrototype.findFirst as jest.Mock).mockResolvedValue({ version: 1 });

    const reviseTx = {
      projectPrototype: {
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'proto-v2',
            ...data,
            createdBy: { fullName: 'Dr. Ramesh Kumar' },
            createdAt: new Date(),
            updatedAt: new Date(),
          })
        ),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async cb => cb(reviseTx));

    const revised = await PrototypeService.revisePrototype({
      prototypeId: 'proto-v1',
      dto: {
        title: 'Water Prototype V2 (Solar Powered)',
        technicalApproach: 'Electrochemical coagulation with integrated solar MPPT',
      },
      actorId: 'fac-1',
      actorRole: UserRole.FACULTY,
      requestId: 'req-proto-revise',
    });

    expect(revised.version).toBe(2);
    expect(revised.status).toBe(PrototypeStatus.DRAFT);
  });
});
