import { prisma } from '../../database/prisma';
import { AuthenticatedUser } from '../../core/middlewares/auth.middleware';
import { UserRole, ChallengeStatus, SeverityLevel, PriorityLevel, ProjectStatus, SolutionMemoryStatus, OrganizationType, VerificationStatus } from '@sicp/shared';

export interface SearchQueryInput {
  q?: string;
  type?: 'all' | 'challenges' | 'projects' | 'solutions' | 'organizations' | 'faculty';
  category?: string;
  severity?: string;
  priority?: string;
  status?: string;
  district?: string;
  state?: string;
  limit?: number;
  offset?: number;
}

export interface SearchResultItem {
  id: string;
  type: 'challenge' | 'project' | 'solution' | 'organization' | 'faculty';
  title: string;
  subtitle: string;
  snippet: string;
  url: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface GlobalSearchResponse {
  query: string;
  total: number;
  counts: {
    challenges: number;
    projects: number;
    solutions: number;
    organizations: number;
    faculty: number;
  };
  results: SearchResultItem[];
  page: number;
  limit: number;
}

export class SearchService {
  public static async search(params: SearchQueryInput, user?: AuthenticatedUser): Promise<GlobalSearchResponse> {
    const q = (params.q || '').trim();
    const type = params.type || 'all';
    const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 100);
    const offset = Math.max(Number(params.offset) || 0, 0);

    const isGovOrAdmin = user?.role && [
      UserRole.GOVERNMENT_OFFICER,
      UserRole.GOVERNMENT_DEPARTMENT,
      UserRole.SYSTEM_ADMIN,
    ].includes(user.role);

    const isAcademic = user?.role && [
      UserRole.UNIVERSITY_ADMIN,
      UserRole.FACULTY,
      UserRole.STUDENT,
      UserRole.RESEARCH_ASSISTANT,
    ].includes(user.role);

    const searchChallenges = type === 'all' || type === 'challenges';
    const searchProjects = type === 'all' || type === 'projects';
    const searchSolutions = type === 'all' || type === 'solutions';
    const searchOrgs = type === 'all' || type === 'organizations';
    const searchFaculty = type === 'all' || type === 'faculty';

    // 1. Challenge Search Conditions
    const challengeWhere: any = { deletedAt: null };
    if (!isGovOrAdmin) {
      if (user?.id) {
        challengeWhere.OR = [
          { status: { notIn: [ChallengeStatus.DRAFT] } },
          { submitterId: user.id },
        ];
      } else {
        challengeWhere.status = { notIn: [ChallengeStatus.DRAFT] };
      }
    }
    if (params.category) challengeWhere.category = { contains: params.category, mode: 'insensitive' };
    if (params.severity && Object.values(SeverityLevel).includes(params.severity as SeverityLevel)) {
      challengeWhere.severity = params.severity as SeverityLevel;
    }
    if (params.priority && Object.values(PriorityLevel).includes(params.priority as PriorityLevel)) {
      challengeWhere.priority = params.priority as PriorityLevel;
    }
    if (params.status && Object.values(ChallengeStatus).includes(params.status as ChallengeStatus)) {
      challengeWhere.status = params.status as ChallengeStatus;
    }
    if (params.district) challengeWhere.district = { contains: params.district, mode: 'insensitive' };
    if (params.state) challengeWhere.state = { contains: params.state, mode: 'insensitive' };
    if (q) {
      challengeWhere.AND = [
        ...(challengeWhere.AND || []),
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } },
            { category: { contains: q, mode: 'insensitive' } },
            { district: { contains: q, mode: 'insensitive' } },
            { state: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    // 2. Project Search Conditions
    const projectWhere: any = {};
    if (params.status && Object.values(ProjectStatus).includes(params.status as ProjectStatus)) {
      projectWhere.status = params.status as ProjectStatus;
    }
    if (q) {
      projectWhere.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }

    // 3. Solution Memory Search Conditions
    const solutionWhere: any = {};
    if (!isGovOrAdmin && !isAcademic) {
      solutionWhere.status = SolutionMemoryStatus.PUBLISHED;
    } else if (params.status && Object.values(SolutionMemoryStatus).includes(params.status as SolutionMemoryStatus)) {
      solutionWhere.status = params.status as SolutionMemoryStatus;
    }
    if (params.category) {
      solutionWhere.challengeCategory = { contains: params.category, mode: 'insensitive' };
    }
    if (q) {
      solutionWhere.AND = [
        ...(solutionWhere.AND || []),
        {
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { summary: { contains: q, mode: 'insensitive' } },
            { problemSummary: { contains: q, mode: 'insensitive' } },
            { rootCause: { contains: q, mode: 'insensitive' } },
            { technicalApproach: { contains: q, mode: 'insensitive' } },
            { challengeCategory: { contains: q, mode: 'insensitive' } },
          ],
        },
      ];
    }

    // 4. Organization Search Conditions
    const orgWhere: any = {};
    if (params.status && Object.values(OrganizationType).includes(params.status as OrganizationType)) {
      orgWhere.type = params.status as OrganizationType;
    }
    if (q) {
      orgWhere.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { slug: { contains: q, mode: 'insensitive' } },
      ];
    }

    // 5. Faculty Profile Search Conditions
    const facultyWhere: any = {};
    if (params.category) {
      facultyWhere.department = { contains: params.category, mode: 'insensitive' };
    }
    if (q) {
      facultyWhere.OR = [
        { department: { contains: q, mode: 'insensitive' } },
        { designation: { contains: q, mode: 'insensitive' } },
        { user: { fullName: { contains: q, mode: 'insensitive' } } },
      ];
    }

    // Execute counts and queries in parallel
    const [
      challengeCount,
      projectCount,
      solutionCount,
      orgCount,
      facultyCount,
      challenges,
      projects,
      solutions,
      organizations,
      facultyProfiles,
    ] = await Promise.all([
      searchChallenges ? prisma.challenge.count({ where: challengeWhere }) : 0,
      searchProjects ? prisma.project.count({ where: projectWhere }) : 0,
      searchSolutions ? prisma.solutionMemory.count({ where: solutionWhere }) : 0,
      searchOrgs ? prisma.organization.count({ where: orgWhere }) : 0,
      searchFaculty ? prisma.facultyProfile.count({ where: facultyWhere }) : 0,

      searchChallenges
        ? prisma.challenge.findMany({
            where: challengeWhere,
            orderBy: { createdAt: 'desc' },
            take: type === 'challenges' ? limit : 10,
            skip: type === 'challenges' ? offset : 0,
            select: {
              id: true,
              title: true,
              description: true,
              category: true,
              severity: true,
              priority: true,
              status: true,
              district: true,
              state: true,
              createdAt: true,
            },
          })
        : [],

      searchProjects
        ? prisma.project.findMany({
            where: projectWhere,
            orderBy: { createdAt: 'desc' },
            take: type === 'projects' ? limit : 10,
            skip: type === 'projects' ? offset : 0,
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              createdAt: true,
              leadingOrg: {
                select: { id: true, name: true, type: true },
              },
            },
          })
        : [],

      searchSolutions
        ? prisma.solutionMemory.findMany({
            where: solutionWhere,
            orderBy: { createdAt: 'desc' },
            take: type === 'solutions' ? limit : 10,
            skip: type === 'solutions' ? offset : 0,
            select: {
              id: true,
              title: true,
              summary: true,
              problemSummary: true,
              challengeCategory: true,
              reusabilityClass: true,
              evidenceLevel: true,
              outcomeStatus: true,
              status: true,
              createdAt: true,
            },
          })
        : [],

      searchOrgs
        ? prisma.organization.findMany({
            where: orgWhere,
            orderBy: { name: 'asc' },
            take: type === 'organizations' ? limit : 10,
            skip: type === 'organizations' ? offset : 0,
            select: {
              id: true,
              name: true,
              slug: true,
              type: true,
              verificationStatus: true,
              createdAt: true,
            },
          })
        : [],

      searchFaculty
        ? prisma.facultyProfile.findMany({
            where: facultyWhere,
            orderBy: { publicationsCount: 'desc' },
            take: type === 'faculty' ? limit : 10,
            skip: type === 'faculty' ? offset : 0,
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          })
        : [],
    ]);

    const results: SearchResultItem[] = [];

    // Map challenges
    for (const c of challenges) {
      results.push({
        id: c.id,
        type: 'challenge',
        title: c.title,
        subtitle: `${c.category} • ${c.district ? `${c.district}, ${c.state || ''}` : 'Regional'}`,
        snippet: c.description.slice(0, 180) + (c.description.length > 180 ? '...' : ''),
        url: `/challenges/${c.id}`,
        metadata: {
          category: c.category,
          severity: c.severity,
          priority: c.priority,
          status: c.status,
          district: c.district,
          state: c.state,
        },
        createdAt: c.createdAt.toISOString(),
      });
    }

    // Map projects
    for (const p of projects) {
      results.push({
        id: p.id,
        type: 'project',
        title: p.title,
        subtitle: `Led by ${p.leadingOrg?.name || 'Institution'} • Status: ${p.status}`,
        snippet: p.description.slice(0, 180) + (p.description.length > 180 ? '...' : ''),
        url: `/projects/${p.id}`,
        metadata: {
          status: p.status,
          leadingOrg: p.leadingOrg?.name,
        },
        createdAt: p.createdAt.toISOString(),
      });
    }

    // Map solutions
    for (const s of solutions) {
      results.push({
        id: s.id,
        type: 'solution',
        title: s.title,
        subtitle: `${s.challengeCategory} • Reusability: ${s.reusabilityClass}`,
        snippet: (s.summary || s.problemSummary || '').slice(0, 180) + '...',
        url: `/solutions/${s.id}`,
        metadata: {
          category: s.challengeCategory,
          outcomeStatus: s.outcomeStatus,
          reusabilityClass: s.reusabilityClass,
          evidenceLevel: s.evidenceLevel,
          status: s.status,
        },
        createdAt: s.createdAt.toISOString(),
      });
    }

    // Map organizations
    for (const o of organizations) {
      results.push({
        id: o.id,
        type: 'organization',
        title: o.name,
        subtitle: `${o.type} • ${o.verificationStatus}`,
        snippet: `Verified partner organisation: ${o.name} (${o.slug})`,
        url: `/organizations?id=${o.id}`,
        metadata: {
          type: o.type,
          verificationStatus: o.verificationStatus,
        },
        createdAt: o.createdAt.toISOString(),
      });
    }

    // Map faculty
    for (const f of facultyProfiles) {
      results.push({
        id: f.id,
        type: 'faculty',
        title: f.user.fullName,
        subtitle: `${f.designation}, ${f.department}`,
        snippet: `${f.expertiseTags.slice(0, 4).join(', ') || 'Academic Expert'} • ${f.publicationsCount} publications`,
        url: `/university?facultyId=${f.id}`,
        metadata: {
          department: f.department,
          designation: f.designation,
          expertiseTags: f.expertiseTags,
          publicationsCount: f.publicationsCount,
          availabilityStatus: f.availabilityStatus,
        },
        createdAt: f.createdAt.toISOString(),
      });
    }

    const total = challengeCount + projectCount + solutionCount + orgCount + facultyCount;

    return {
      query: q,
      total,
      counts: {
        challenges: challengeCount,
        projects: projectCount,
        solutions: solutionCount,
        organizations: orgCount,
        faculty: facultyCount,
      },
      results: type === 'all' ? results.slice(0, limit) : results,
      page: Math.floor(offset / limit) + 1,
      limit,
    };
  }
}
