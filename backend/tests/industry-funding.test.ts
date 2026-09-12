import { IndustryMatchingEngine } from '../src/domain/matching/industry-matching.engine';
import { FundingService } from '../src/modules/funding/funding.service';
import { OrganizationType, UserRole } from '@sicp/shared';
import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    challenge: { findUnique: jest.fn() },
    project: { findUnique: jest.fn(), update: jest.fn() },
    organization: { findMany: jest.fn() },
    fundingRequest: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    auditLog: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe('Industry Matching Engine & Funding Engine', () => {
  describe('IndustryMatchingEngine - 7-Factor explainable matching', () => {
    it('scores and ranks industry partners based on technology fit, funding capacity, and domain fit', async () => {
      (prisma.challenge.findUnique as jest.Mock).mockResolvedValue({
        id: 'chal-water-1',
        title: 'Solar Water Purification Units for Remote Hamlets',
        category: 'Water Supply',
        description: 'Need solar powered filtration units with IoT water quality telemetry',
        state: 'Uttar Pradesh',
      });

      (prisma.organization.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'org-tata',
          name: 'Tata Community Initiatives (CSR)',
          type: OrganizationType.CSR,
          status: 'ACTIVE',
          industryProfile: {
            sector: 'Water, Sanitation & Renewable Energy',
            capabilities: ['solar pumping', 'community water filtration', 'IoT sensors'],
            technologies: ['solar', 'filtration', 'iot', 'telemetry'],
            fundingCapacity: 5000000,
            csrFocusAreas: ['Water Supply', 'Rural Electrification'],
            supportedStages: ['PROTOTYPE', 'PILOT', 'SCALE'],
            geographicCoverage: ['All India'],
            activeProjectsCount: 3,
          },
        },
        {
          id: 'org-startup',
          name: 'FinTech Labs',
          type: OrganizationType.STARTUP,
          status: 'ACTIVE',
          industryProfile: {
            sector: 'Financial Technology',
            capabilities: ['payments', 'mobile app'],
            technologies: ['blockchain', 'react'],
            fundingCapacity: 200000,
            csrFocusAreas: ['Digital Literacy'],
            supportedStages: ['PROTOTYPE'],
            geographicCoverage: ['Karnataka'],
            activeProjectsCount: 1,
          },
        },
      ]);

      const matches = await IndustryMatchingEngine.matchPartnersForProject('chal-water-1');

      expect(matches.length).toBe(2);
      expect(matches[0].partnerName).toContain('Tata Community Initiatives');
      expect(matches[0].overallScore).toBeGreaterThan(85);
      expect(matches[0].matchedCapabilities).toContain('solar');
      expect(matches[0].matchedCapabilities).toContain('filtration');
      expect(matches[0].breakdown.technologyFit).toBe(30);

      expect(matches[1].partnerName).toBe('FinTech Labs');
      expect(matches[1].overallScore).toBeLessThan(50);
    });
  });

  describe('FundingService - Partial Approval & Gap Resolution', () => {
    it('calculates funding gap and returns structured resolution strategies on partial approval', async () => {
      const mockTx = {
        fundingRequest: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'fr-1',
            projectId: 'proj-1',
            stage: 'PILOT',
            totalAmount: 1000000, // ₹10,00,000 requested
            project: { id: 'proj-1', budget: 200000 },
          }),
          update: jest.fn().mockResolvedValue({
            id: 'fr-1',
            status: 'PARTIALLY_APPROVED',
            approvedAmount: 600000, // ₹6,00,000 approved
          }),
        },
        project: { update: jest.fn().mockResolvedValue({}) },
        auditLog: { create: jest.fn().mockResolvedValue({}) },
      };

      (prisma.$transaction as jest.Mock).mockImplementation(async (cb: (tx: typeof mockTx) => unknown) => cb(mockTx));

      const result = await FundingService.reviewFunding({
        fundingRequestId: 'fr-1',
        status: 'PARTIALLY_APPROVED',
        approvedAmount: 600000,
        decisionNotes: 'Phase 1 pilot approved with matching grant required for Phase 2.',
        actorId: 'gov-officer-1',
        actorRole: UserRole.GOVERNMENT_OFFICER,
        requestId: 'req-fund-1',
      });

      expect(result.fundingRequest.status).toBe('PARTIALLY_APPROVED');
      expect(result.gapResolution).toBeDefined();
      expect(result.gapResolution?.fundingGap).toBe(400000); // 1,000,000 - 600,000
      expect(result.gapResolution?.recoveryOptions.length).toBe(3);
      expect(result.gapResolution?.recoveryOptions[0].strategy).toBe('CSR_CO_FUNDING');
    });
  });
});
