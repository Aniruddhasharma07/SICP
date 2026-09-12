import { prisma } from '../../database/prisma';
import { IndustryMatchScoreDto, OrganizationType } from '@sicp/shared';
import { NotFoundError } from '../../utils/errors';

export class IndustryMatchingEngine {
  /**
   * Deterministically evaluates and ranks verified industry partners, startups, MSMEs,
   * and CSR organizations for a project or challenge.
   */
  public static async matchPartnersForProject(
    projectIdOrChallengeId: string,
    limit: number = 10
  ): Promise<IndustryMatchScoreDto[]> {
    // Determine challenge
    let challenge = await prisma.challenge.findUnique({
      where: { id: projectIdOrChallengeId },
    });

    if (!challenge) {
      const project = await prisma.project.findUnique({
        where: { id: projectIdOrChallengeId },
        include: { challenge: true },
      });
      if (project) {
        challenge = project.challenge;
      }
    }

    if (!challenge) {
      throw new NotFoundError('Challenge/Project', projectIdOrChallengeId);
    }

    const partnerOrgs = await prisma.organization.findMany({
      where: {
        type: { in: [OrganizationType.INDUSTRY, OrganizationType.STARTUP, OrganizationType.MSME, OrganizationType.CSR] },
        status: 'ACTIVE',
      },
      include: {
        industryProfile: true,
      },
    });

    const challengeKeywords = [
      challenge.category.toLowerCase(),
      ...(challenge.description ? challenge.description.toLowerCase().split(/\W+/).filter(w => w.length > 4) : []),
    ];

    const results: IndustryMatchScoreDto[] = partnerOrgs.map(org => {
      const profile = org.industryProfile;
      const sector = profile?.sector || 'Technology & Innovation';
      const capabilities = profile?.capabilities || [];
      const technologies = profile?.technologies || [];
      const fundingCapacity = profile?.fundingCapacity ? Number(profile.fundingCapacity) : 500000;
      const csrFocusAreas = profile?.csrFocusAreas || [];
      const geographicCoverage = profile?.geographicCoverage || [];
      const activeProjectsCount = profile?.activeProjectsCount || 0;

      // 1. Technology Fit (30%)
      let matchedCapabilities: string[] = [];
      let technologyFit = 0;
      const allTech = [...technologies, ...capabilities].map(t => t.toLowerCase());
      for (const t of allTech) {
        if (challengeKeywords.some(ck => ck.includes(t) || t.includes(ck))) {
          if (!matchedCapabilities.includes(t)) {
            matchedCapabilities.push(t);
          }
        }
      }
      if (matchedCapabilities.length >= 3) {
        technologyFit = 30;
      } else if (matchedCapabilities.length >= 2) {
        technologyFit = 22;
      } else if (matchedCapabilities.length >= 1) {
        technologyFit = 15;
      } else {
        technologyFit = 8;
      }

      // 2. Domain Fit (20%)
      let domainFit = 0;
      const sectorLower = sector.toLowerCase();
      const catLower = challenge.category.toLowerCase();
      if (
        (catLower.includes('water') && (sectorLower.includes('water') || sectorLower.includes('clean') || sectorLower.includes('env'))) ||
        (catLower.includes('sanitation') && (sectorLower.includes('waste') || sectorLower.includes('env') || sectorLower.includes('infra'))) ||
        (catLower.includes('road') && (sectorLower.includes('transport') || sectorLower.includes('mobility') || sectorLower.includes('infra'))) ||
        (catLower.includes('health') && (sectorLower.includes('health') || sectorLower.includes('med') || sectorLower.includes('bio'))) ||
        (catLower.includes('agri') && (sectorLower.includes('agri') || sectorLower.includes('food') || sectorLower.includes('rural'))) ||
        (catLower.includes('electric') && (sectorLower.includes('energy') || sectorLower.includes('solar') || sectorLower.includes('power')))
      ) {
        domainFit = 20;
      } else if (csrFocusAreas.some(area => area.toLowerCase().includes(catLower) || catLower.includes(area.toLowerCase()))) {
        domainFit = 18;
      } else {
        domainFit = 10;
      }

      // 3. Resource Fit (15%)
      let resourceFit = 0;
      if (capabilities.length >= 4) {
        resourceFit = 15;
      } else if (capabilities.length >= 2) {
        resourceFit = 10;
      } else {
        resourceFit = 6;
      }

      // 4. Funding Fit (15%)
      let fundingFit = 0;
      if (fundingCapacity >= 2000000) {
        fundingFit = 15;
      } else if (fundingCapacity >= 500000) {
        fundingFit = 11;
      } else {
        fundingFit = 6;
      }

      // 5. Deployment Capability (10%)
      let deploymentCapability = 0;
      if (org.type === OrganizationType.INDUSTRY || org.type === OrganizationType.CSR) {
        deploymentCapability = 10;
      } else if (org.type === OrganizationType.STARTUP || org.type === OrganizationType.MSME) {
        deploymentCapability = 8;
      } else {
        deploymentCapability = 5;
      }

      // 6. Geographic Proximity (5%)
      let geographicFit = 0;
      if (
        challenge.state &&
        (geographicCoverage.includes('All India') ||
          geographicCoverage.some(g => g.toLowerCase() === challenge.state?.toLowerCase()))
      ) {
        geographicFit = 5;
      } else {
        geographicFit = 2;
      }

      // 7. Past Innovation Track Record (5%)
      let experienceFit = 0;
      if (activeProjectsCount >= 1 && activeProjectsCount <= 5) {
        experienceFit = 5;
      } else if (activeProjectsCount === 0) {
        experienceFit = 4;
      } else {
        experienceFit = 3;
      }

      const overallScore = Math.min(
        100,
        Math.round(
          technologyFit +
            domainFit +
            resourceFit +
            fundingFit +
            deploymentCapability +
            geographicFit +
            experienceFit
        )
      );

      const explanation = `Tech fit: ${technologyFit}/30; Domain fit: ${domainFit}/20 (${sector}); Resource fit: ${resourceFit}/15; Funding fit: ${fundingFit}/15 (₹${fundingCapacity.toLocaleString('en-IN')}); Deployment: ${deploymentCapability}/10; Proximity: ${geographicFit}/5.`;

      return {
        partnerOrgId: org.id,
        partnerName: org.name,
        sector,
        overallScore,
        breakdown: {
          technologyFit,
          domainFit,
          resourceFit,
          fundingFit,
          deploymentCapability,
          geographicFit,
          experienceFit,
        },
        matchedCapabilities,
        explanation,
      };
    });

    return results.sort((a, b) => b.overallScore - a.overallScore).slice(0, limit);
  }
}
