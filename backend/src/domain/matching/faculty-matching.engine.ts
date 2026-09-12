import { prisma } from '../../database/prisma';
import { FacultyMatchScoreDto } from '@sicp/shared';
import { NotFoundError } from '../../utils/errors';

export class FacultyMatchingEngine {
  /**
   * Deterministically scores and ranks faculty members for a given civic challenge.
   * Prioritizes faculty belonging to the assigned university.
   */
  public static async matchFacultyForChallenge(
    challengeId: string,
    preferredUniversityOrgId?: string,
    limit: number = 10
  ): Promise<FacultyMatchScoreDto[]> {
    const challenge = await prisma.challenge.findUnique({
      where: { id: challengeId },
    });

    if (!challenge) {
      throw new NotFoundError('Challenge', challengeId);
    }

    // Query faculty users with their profiles and active project teams
    const facultyUsers = await prisma.user.findMany({
      where: {
        role: 'FACULTY',
        isActive: true,
        ...(preferredUniversityOrgId ? { organizationId: preferredUniversityOrgId } : {}),
      },
      include: {
        facultyProfile: true,
        organization: true,
        teamsLed: {
          include: {
            projects: {
              where: { status: { notIn: ['COMPLETED', 'CANCELLED', 'FAILED'] } },
            },
          },
        },
      },
    });

    // If no faculty found in preferred university, relax to all faculty
    let candidateUsers = facultyUsers;
    if (candidateUsers.length === 0 && preferredUniversityOrgId) {
      candidateUsers = await prisma.user.findMany({
        where: {
          role: 'FACULTY',
          isActive: true,
        },
        include: {
          facultyProfile: true,
          organization: true,
          teamsLed: {
            include: {
              projects: {
                where: { status: { notIn: ['COMPLETED', 'CANCELLED', 'FAILED'] } },
              },
            },
          },
        },
      });
    }

    const challengeKeywords = [
      challenge.category.toLowerCase(),
      ...(challenge.description ? challenge.description.toLowerCase().split(/\W+/).filter(w => w.length > 4) : []),
    ];

    const results: FacultyMatchScoreDto[] = candidateUsers.map(user => {
      const profile = user.facultyProfile;
      const dept = profile?.department || 'Engineering & Technology';
      const designation = profile?.designation || 'Assistant Professor';
      const expertiseTags = profile?.expertiseTags || [];
      const researchInterests = profile?.researchInterests || [];
      const pubCount = profile?.publicationsCount || 0;
      const patentCount = profile?.patentsCount || 0;
      const pastProjectsCount = profile?.pastProjectsCount || 0;
      const maxProjects = profile?.maxSimultaneousProjects || 3;

      const activeProjectsCount = user.teamsLed.reduce(
        (sum, t) => sum + t.projects.length,
        0
      );

      // 1. Department Alignment (35%)
      let departmentScore = 0;
      const deptLower = dept.toLowerCase();
      const catLower = challenge.category.toLowerCase();
      if (
        (catLower.includes('water') && (deptLower.includes('civil') || deptLower.includes('environment') || deptLower.includes('water') || deptLower.includes('hydro'))) ||
        (catLower.includes('sanitation') && (deptLower.includes('environment') || deptLower.includes('bio') || deptLower.includes('public health'))) ||
        (catLower.includes('road') && (deptLower.includes('transport') || deptLower.includes('civil') || deptLower.includes('infrastructure'))) ||
        (catLower.includes('health') && (deptLower.includes('biomed') || deptLower.includes('medicine') || deptLower.includes('informatics'))) ||
        (catLower.includes('agri') && (deptLower.includes('agri') || deptLower.includes('soil') || deptLower.includes('water'))) ||
        (catLower.includes('electric') && (deptLower.includes('electric') || deptLower.includes('power') || deptLower.includes('energy'))) ||
        (catLower.includes('educat') && (deptLower.includes('computer') || deptLower.includes('tech') || deptLower.includes('science')))
      ) {
        departmentScore = 35;
      } else if (deptLower.includes('engineering') || deptLower.includes('technology') || deptLower.includes('science')) {
        departmentScore = 22;
      } else {
        departmentScore = 12;
      }

      // 2. Expertise Tag Overlap (25%)
      let matchedTags: string[] = [];
      let expertiseScore = 0;
      const allFacultyKeywords = [...expertiseTags, ...researchInterests].map(t => t.toLowerCase());

      for (const kw of allFacultyKeywords) {
        if (challengeKeywords.some(ck => ck.includes(kw) || kw.includes(ck))) {
          if (!matchedTags.includes(kw)) {
            matchedTags.push(kw);
          }
        }
      }

      if (matchedTags.length >= 3) {
        expertiseScore = 25;
      } else if (matchedTags.length === 2) {
        expertiseScore = 18;
      } else if (matchedTags.length === 1) {
        expertiseScore = 12;
      } else {
        expertiseScore = 5;
      }

      // 3. Track Record: Publications, Patents, Projects (20%)
      let trackRecordScore = 0;
      const trackPoints = pubCount * 1.5 + patentCount * 4 + pastProjectsCount * 3;
      if (trackPoints >= 30) {
        trackRecordScore = 20;
      } else if (trackPoints >= 15) {
        trackRecordScore = 15;
      } else if (trackPoints >= 5) {
        trackRecordScore = 10;
      } else {
        trackRecordScore = 5;
      }

      // 4. Availability & Workload (20%)
      let workloadScore = 0;
      let availabilityStatus = 'AVAILABLE';
      if (activeProjectsCount === 0) {
        workloadScore = 20;
        availabilityStatus = 'AVAILABLE';
      } else if (activeProjectsCount < maxProjects) {
        workloadScore = 15;
        availabilityStatus = 'COMMITTED';
      } else {
        workloadScore = 5;
        availabilityStatus = 'OVERLOADED';
      }

      // University affiliation bonus (ensure preferred institution gets higher rank)
      let institutionBonus = 0;
      if (preferredUniversityOrgId && user.organizationId === preferredUniversityOrgId) {
        institutionBonus = 5;
      }

      const overallScore = Math.min(
        100,
        Math.round(departmentScore + expertiseScore + trackRecordScore + workloadScore + institutionBonus)
      );

      const explanation = `Department alignment: ${departmentScore}/35 (${dept}); Expertise match: ${expertiseScore}/25 (${matchedTags.length > 0 ? matchedTags.join(', ') : 'broad domain'}); Track record: ${trackRecordScore}/20 (${pubCount} papers, ${patentCount} patents); Workload: ${workloadScore}/20 (${activeProjectsCount}/${maxProjects} active projects).`;

      return {
        facultyId: user.id,
        facultyName: user.fullName,
        department: dept,
        designation,
        universityId: user.organizationId || '',
        universityName: user.organization?.name || 'Academic Institution',
        overallScore,
        breakdown: {
          departmentScore,
          expertiseScore,
          trackRecordScore,
          workloadScore,
        },
        matchedTags,
        explanation,
        availabilityStatus,
        activeProjectCount: activeProjectsCount,
      };
    });

    return results.sort((a, b) => b.overallScore - a.overallScore).slice(0, limit);
  }
}
