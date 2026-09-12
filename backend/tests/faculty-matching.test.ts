import { FacultyMatchingEngine } from '../src/domain/matching/faculty-matching.engine';
import { prisma } from '../src/database/prisma';
import { NotFoundError } from '../src/utils/errors';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    challenge: {
      findUnique: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  },
}));

describe('FacultyMatchingEngine - Capabilities, Track Record & Workload', () => {
  it('throws NotFoundError if challenge does not exist', async () => {
    (prisma.challenge.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(
      FacultyMatchingEngine.matchFacultyForChallenge('nonexistent-chal')
    ).rejects.toThrow(NotFoundError);
  });

  it('ranks faculty based on department alignment, expertise tags, publications, and workload', async () => {
    (prisma.challenge.findUnique as jest.Mock).mockResolvedValue({
      id: 'chal-water-1',
      title: 'Groundwater Arsenic Removal in Rural Wells',
      category: 'Water Supply',
      description: 'Filtration and chemical purification needed for community water supply',
    });

    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'fac-1',
        fullName: 'Dr. Ramesh Sharma',
        role: 'FACULTY',
        organizationId: 'uni-bhu',
        organization: { name: 'IIT BHU' },
        facultyProfile: {
          department: 'Civil & Environmental Engineering',
          designation: 'Professor',
          expertiseTags: ['water', 'filtration', 'arsenic'],
          researchInterests: ['groundwater treatment', 'membrane filtration'],
          publicationsCount: 25,
          patentsCount: 3,
          pastProjectsCount: 5,
          maxSimultaneousProjects: 3,
        },
        teamsLed: [], // 0 active projects -> full availability (20 pts)
      },
      {
        id: 'fac-2',
        fullName: 'Dr. Ananya Sen',
        role: 'FACULTY',
        organizationId: 'uni-bhu',
        organization: { name: 'IIT BHU' },
        facultyProfile: {
          department: 'Computer Science',
          designation: 'Associate Professor',
          expertiseTags: ['algorithms', 'ai'],
          researchInterests: ['neural networks'],
          publicationsCount: 10,
          patentsCount: 0,
          pastProjectsCount: 2,
          maxSimultaneousProjects: 3,
        },
        teamsLed: [{ projects: [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }] }], // 3 active projects -> overloaded
      },
    ]);

    const results = await FacultyMatchingEngine.matchFacultyForChallenge('chal-water-1', 'uni-bhu');

    expect(results.length).toBe(2);
    // Dr. Ramesh Sharma should be #1 due to department alignment + 3 matched tags + patents + available capacity
    expect(results[0].facultyId).toBe('fac-1');
    expect(results[0].breakdown.departmentScore).toBe(35);
    expect(results[0].breakdown.expertiseScore).toBe(25);
    expect(results[0].breakdown.workloadScore).toBe(20);
    expect(results[0].overallScore).toBeGreaterThan(90);
    expect(results[0].matchedTags).toContain('water');
    expect(results[0].matchedTags).toContain('filtration');

    // Dr. Ananya Sen should have lower score
    expect(results[1].facultyId).toBe('fac-2');
    expect(results[1].breakdown.departmentScore).toBeLessThan(35);
    expect(results[1].availabilityStatus).toBe('OVERLOADED');
  });
});
