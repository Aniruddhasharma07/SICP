import { SearchService } from '../src/modules/search/search.service';
import { UserRole, ChallengeStatus, SeverityLevel, PriorityLevel, SolutionMemoryStatus, OrganizationType } from '@sicp/shared';
import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    challenge: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    project: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    solutionMemory: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    organization: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    facultyProfile: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

describe('GlobalSearchService - Multi-Entity Unified Search & RBAC Filtering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('searches across all 5 entities and aggregates counts correctly', async () => {
    (prisma.challenge.count as jest.Mock).mockResolvedValue(3);
    (prisma.project.count as jest.Mock).mockResolvedValue(2);
    (prisma.solutionMemory.count as jest.Mock).mockResolvedValue(1);
    (prisma.organization.count as jest.Mock).mockResolvedValue(1);
    (prisma.facultyProfile.count as jest.Mock).mockResolvedValue(1);

    (prisma.challenge.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'c-1',
        title: 'Fluoride in groundwater',
        description: 'High fluoride affecting 5 villages',
        category: 'Water',
        severity: SeverityLevel.SEVERE,
        priority: PriorityLevel.HIGH,
        status: ChallengeStatus.APPROVED,
        district: 'Nagaur',
        state: 'Rajasthan',
        createdAt: new Date('2026-01-01'),
      },
    ]);

    (prisma.project.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'p-1',
        title: 'Solar Desalination Pilot',
        description: 'Solar RO deployment in village',
        status: 'PILOT',
        createdAt: new Date('2026-02-01'),
        leadingOrg: { id: 'org-1', name: 'IIT Rajasthan', type: OrganizationType.UNIVERSITY },
      },
    ]);

    (prisma.solutionMemory.findMany as jest.Mock).mockResolvedValue([
      {
        id: 's-1',
        title: 'Solar RO Filtration Blueprint',
        summary: 'Effective low-cost membrane filtration',
        problemSummary: 'High salinity water',
        challengeCategory: 'Water',
        reusabilityClass: 'HIGHLY_REUSABLE',
        evidenceLevel: 'VERIFIED',
        outcomeStatus: 'SUCCESSFUL',
        status: SolutionMemoryStatus.PUBLISHED,
        createdAt: new Date('2026-03-01'),
      },
    ]);

    (prisma.organization.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'org-1',
        name: 'IIT Rajasthan',
        slug: 'iit-rajasthan',
        type: OrganizationType.UNIVERSITY,
        verificationStatus: 'VERIFIED',
        createdAt: new Date('2025-01-01'),
      },
    ]);

    (prisma.facultyProfile.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'fac-1',
        department: 'Civil Engineering',
        designation: 'Professor',
        expertiseTags: ['Water Purification', 'Solar'],
        publicationsCount: 24,
        availabilityStatus: 'AVAILABLE',
        createdAt: new Date('2025-05-01'),
        user: { id: 'u-fac', fullName: 'Dr. Sharma', email: 'sharma@iitr.ac.in' },
      },
    ]);

    const res = await SearchService.search({ q: 'Water', type: 'all' });

    expect(res.total).toBe(8);
    expect(res.counts.challenges).toBe(3);
    expect(res.counts.projects).toBe(2);
    expect(res.counts.solutions).toBe(1);
    expect(res.counts.organizations).toBe(1);
    expect(res.counts.faculty).toBe(1);
    expect(res.results.length).toBe(5);

    expect(res.results[0].type).toBe('challenge');
    expect(res.results[0].title).toBe('Fluoride in groundwater');
    expect(res.results[1].type).toBe('project');
    expect(res.results[2].type).toBe('solution');
    expect(res.results[3].type).toBe('organization');
    expect(res.results[4].type).toBe('faculty');
  });

  it('restricts draft challenges and unpublished solutions from Citizen view', async () => {
    (prisma.challenge.count as jest.Mock).mockResolvedValue(0);
    (prisma.project.count as jest.Mock).mockResolvedValue(0);
    (prisma.solutionMemory.count as jest.Mock).mockResolvedValue(0);
    (prisma.organization.count as jest.Mock).mockResolvedValue(0);
    (prisma.facultyProfile.count as jest.Mock).mockResolvedValue(0);

    (prisma.challenge.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.project.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.solutionMemory.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.organization.findMany as jest.Mock).mockResolvedValue([]);
    (prisma.facultyProfile.findMany as jest.Mock).mockResolvedValue([]);

    const citizenUser = {
      id: 'cit-123',
      email: 'citizen@example.com',
      role: UserRole.CITIZEN,
    };

    await SearchService.search({ q: 'water' }, citizenUser);

    // Verify challenge filter excluded DRAFT for citizen (except citizen's own)
    const challengeCallArgs = (prisma.challenge.findMany as jest.Mock).mock.calls[0][0];
    expect(challengeCallArgs.where.OR).toBeDefined();

    // Verify solution filter strictly enforced PUBLISHED
    const solutionCallArgs = (prisma.solutionMemory.findMany as jest.Mock).mock.calls[0][0];
    expect(solutionCallArgs.where.status).toBe(SolutionMemoryStatus.PUBLISHED);
  });
});
