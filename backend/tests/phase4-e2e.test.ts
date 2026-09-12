import { UniversityService } from '../src/modules/university/university.service';
import { TeamService } from '../src/modules/team/team.service';
import { ProposalService } from '../src/modules/proposal/proposal.service';
import { FundingService } from '../src/modules/funding/funding.service';
import { ProjectService } from '../src/modules/project/project.service';
import { FacultyMatchingEngine } from '../src/domain/matching/faculty-matching.engine';
import { IndustryMatchingEngine } from '../src/domain/matching/industry-matching.engine';
import {
  ChallengeStatus,
  MatchStatus,
  ProjectStatus,
  ProposalStatus,
  MilestoneStatus,
  TeamRole,
  InvitationStatus,
  UserRole,
  OrganizationType,
} from '@sicp/shared';
import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    challenge: { findUnique: jest.fn(), update: jest.fn() },
    organization: { findMany: jest.fn(), findUnique: jest.fn() },
    user: { findMany: jest.fn(), findUnique: jest.fn() },
    universityMatch: { upsert: jest.fn(), findUnique: jest.fn() },
    multidisciplinaryTeam: { create: jest.fn(), findUnique: jest.fn() },
    teamMember: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    projectProposal: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    proposalReview: { create: jest.fn() },
    fundingRequest: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn(), findMany: jest.fn() },
    projectMilestone: { create: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    projectRisk: { create: jest.fn() },
    project: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    challengeTimeline: { create: jest.fn() },
    auditLog: { create: jest.fn() },
    notification: { create: jest.fn() },
    $transaction: jest.fn(),
  },
}));

describe('SICP Phase 4 — End-to-End Institutional Collaboration & Project Lifecycle Pipeline', () => {
  const challengeId = 'chal-arsenic-101';
  const universityOrgId = 'uni-iit-bhu';
  const facultyId = 'fac-prof-sharma';
  const studentId = 'stud-rahul';
  const govOfficerId = 'officer-singh';
  const projectId = 'proj-clean-water-101';
  const proposalIdV1 = 'prop-v1';
  const proposalIdV2 = 'prop-v2';

  it('executes full pipeline: Routing -> Acceptance -> Faculty Match -> Team -> Proposal V1/V2 -> Approval -> Funding -> Activation -> Cockpit', async () => {
    // -------------------------------------------------------------
    // Step 1: University Acceptance Workflow
    // -------------------------------------------------------------
    const mockTxAccept = {
      challenge: {
        findUnique: jest.fn().mockResolvedValue({
          id: challengeId,
          title: 'Arsenic Contamination in Ballia Groundwater',
          status: ChallengeStatus.ASSIGNED_TO_UNIVERSITY,
          submitterId: 'citizen-ramesh',
          universityMatches: [{ id: 'm-1', universityOrgId, status: MatchStatus.OFFERED }],
        }),
        update: jest.fn().mockResolvedValue({
          id: challengeId,
          status: ChallengeStatus.IN_RESEARCH,
          version: 2,
        }),
      },
      universityMatch: {
        upsert: jest.fn().mockResolvedValue({ id: 'm-1', status: MatchStatus.ACCEPTED }),
      },
      project: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({
          id: projectId,
          challengeId,
          leadingOrgId: universityOrgId,
          title: 'Project: Arsenic Contamination in Ballia Groundwater',
          status: ProjectStatus.ASSIGNED, // Non-active draft shell
        }),
      },
      challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
      notification: { create: jest.fn().mockResolvedValue({}) },
    };

    (prisma.$transaction as jest.Mock).mockImplementationOnce(async (cb: (tx: typeof mockTxAccept) => unknown) => cb(mockTxAccept));

    const acceptResult = await UniversityService.acceptAssignment({
      challengeId,
      universityOrgId,
      actorId: 'uni-admin-1',
      actorRole: UserRole.UNIVERSITY_ADMIN,
      requestId: 'req-e2e-accept',
    });

    expect(acceptResult.challenge.status).toBe(ChallengeStatus.IN_RESEARCH);
    expect(acceptResult.project.status).toBe(ProjectStatus.ASSIGNED);

    // -------------------------------------------------------------
    // Step 2: Faculty Expert Intelligence
    // -------------------------------------------------------------
    (prisma.challenge.findUnique as jest.Mock).mockResolvedValueOnce({
      id: challengeId,
      title: 'Arsenic Contamination in Ballia Groundwater',
      category: 'Water Supply',
      description: 'Filtration and chemical purification needed',
    });

    (prisma.user.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: facultyId,
        fullName: 'Prof. Ramesh Sharma',
        role: UserRole.FACULTY,
        organizationId: universityOrgId,
        organization: { name: 'IIT BHU' },
        facultyProfile: {
          department: 'Civil & Environmental Engineering',
          designation: 'Professor & Head',
          expertiseTags: ['water', 'filtration', 'arsenic'],
          researchInterests: ['groundwater treatment'],
          publicationsCount: 28,
          patentsCount: 4,
          pastProjectsCount: 6,
        },
        teamsLed: [],
      },
    ]);

    const facultyMatches = await FacultyMatchingEngine.matchFacultyForChallenge(challengeId, universityOrgId);
    expect(facultyMatches.length).toBe(1);
    expect(facultyMatches[0].facultyId).toBe(facultyId);
    expect(facultyMatches[0].overallScore).toBeGreaterThan(85);

    // -------------------------------------------------------------
    // Step 3: Multidisciplinary Team Formation
    // -------------------------------------------------------------
    const mockTxTeam = {
      challenge: { findUnique: jest.fn().mockResolvedValue({ id: challengeId }) },
      user: { findUnique: jest.fn().mockResolvedValue({ id: facultyId, role: UserRole.FACULTY }) },
      multidisciplinaryTeam: {
        create: jest.fn().mockResolvedValue({
          id: 'team-ballia',
          name: 'Ballia Water Innovation Group',
          challengeId,
          leadFacultyId: facultyId,
          members: [
            { userId: facultyId, roleInTeam: TeamRole.LEAD_FACULTY, invitationStatus: InvitationStatus.ACCEPTED },
          ],
        }),
      },
      project: { findFirst: jest.fn().mockResolvedValue({ id: projectId }), update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };

    (prisma.$transaction as jest.Mock).mockImplementationOnce(async (cb: (tx: typeof mockTxTeam) => unknown) => cb(mockTxTeam));

    const team = await TeamService.createTeam({
      name: 'Ballia Water Innovation Group',
      challengeId,
      leadFacultyId: facultyId,
      actorId: facultyId,
      actorRole: UserRole.FACULTY,
      requestId: 'req-e2e-team',
    });

    expect(team.id).toBe('team-ballia');

    // -------------------------------------------------------------
    // Step 4: Solution Proposal Engine (V1 -> Revision -> V2 -> Approved)
    // -------------------------------------------------------------
    // V1 Creation
    const mockTxProp1 = {
      project: {
        findUnique: jest.fn().mockResolvedValue({
          id: projectId,
          challengeId,
          proposals: [],
        }),
      },
      projectProposal: {
        create: jest.fn().mockResolvedValue({
          id: proposalIdV1,
          projectId,
          version: 1,
          status: ProposalStatus.DRAFT,
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementationOnce(async (cb: (tx: typeof mockTxProp1) => unknown) => cb(mockTxProp1));

    const propV1 = await ProposalService.createProposal({
      projectId,
      problemUnderstanding: 'Arsenic ppm exceeds WHO safety limits by 8x in Ballia tube-wells',
      rootCauseHypothesis: 'Geological sedimentary arsenic leaching compounded by flood table fluctuations',
      technicalApproach: 'Electrochemical arsenic precipitation filter with automated IoT fluoride/arsenic sensor',
      expectedImpact: 'Guaranteed safe drinking water for 12,000 residents across 3 gram panchayats',
      risksAndMitigations: 'Sludge disposal protocol established with district pollution board',
      sustainabilityPlan: 'Panchayat water committee community tariff model',
      actorId: facultyId,
      actorRole: UserRole.FACULTY,
      requestId: 'req-prop-v1',
    });

    expect(propV1.version).toBe(1);

    // V1 Government Review: Revision Requested
    const mockTxReviewRev = {
      projectProposal: {
        findUnique: jest.fn().mockResolvedValue({
          id: proposalIdV1,
          version: 1,
          status: ProposalStatus.SUBMITTED,
          authorId: facultyId,
          project: { id: projectId, challengeId, title: 'Ballia Water Project' },
        }),
        update: jest.fn().mockResolvedValue({
          id: proposalIdV1,
          status: ProposalStatus.REVISION_REQUESTED,
        }),
      },
      proposalReview: { create: jest.fn().mockResolvedValue({ id: 'rev-1' }) },
      challenge: {
        findUnique: jest.fn().mockResolvedValue({ id: challengeId, status: ChallengeStatus.SOLUTION_PROPOSED }),
        update: jest.fn().mockResolvedValue({ id: challengeId, status: ChallengeStatus.IN_RESEARCH }),
      },
      challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
      notification: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementationOnce(async (cb: (tx: typeof mockTxReviewRev) => unknown) => cb(mockTxReviewRev));

    const reviewRev = await ProposalService.reviewProposal({
      proposalId: proposalIdV1,
      decision: 'REVISION_REQUESTED',
      comments: 'Please detail sludge containment and power backup during monsoon outages',
      requiredChanges: ['Provide secondary containment spec', 'Add solar backup power calculation'],
      actorId: govOfficerId,
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-e2e-rev',
    });

    expect(reviewRev.proposal.status).toBe(ProposalStatus.REVISION_REQUESTED);

    // V2 Proposal Creation (Immutable Next Version)
    const mockTxProp2 = {
      project: {
        findUnique: jest.fn().mockResolvedValue({
          id: projectId,
          challengeId,
          proposals: [{ id: proposalIdV1, version: 1 }],
        }),
      },
      projectProposal: {
        create: jest.fn().mockResolvedValue({
          id: proposalIdV2,
          projectId,
          version: 2,
          status: ProposalStatus.DRAFT,
        }),
      },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementationOnce(async (cb: (tx: typeof mockTxProp2) => unknown) => cb(mockTxProp2));

    const propV2 = await ProposalService.createProposal({
      projectId,
      problemUnderstanding: 'Arsenic ppm exceeds WHO safety limits by 8x in Ballia tube-wells',
      rootCauseHypothesis: 'Geological sedimentary arsenic leaching compounded by flood table fluctuations',
      technicalApproach: 'Electrochemical filter + 2kW rooftop solar battery backup + sealed vitrified sludge container',
      expectedImpact: 'Safe water for 12,000 residents across 3 gram panchayats with 99.9% uptime',
      risksAndMitigations: 'Sludge solidified in concrete blocks per Central Pollution Control Board standards',
      sustainabilityPlan: 'Community maintenance model',
      actorId: facultyId,
      actorRole: UserRole.FACULTY,
      requestId: 'req-prop-v2',
    });

    expect(propV2.version).toBe(2);

    // V2 Government Review: APPROVED
    const mockTxReviewApp = {
      projectProposal: {
        findUnique: jest.fn().mockResolvedValue({
          id: proposalIdV2,
          version: 2,
          status: ProposalStatus.SUBMITTED,
          authorId: facultyId,
          project: { id: projectId, challengeId, title: 'Ballia Water Project' },
        }),
        update: jest.fn().mockResolvedValue({
          id: proposalIdV2,
          status: ProposalStatus.APPROVED,
        }),
      },
      proposalReview: { create: jest.fn().mockResolvedValue({ id: 'rev-2' }) },
      challenge: {
        findUnique: jest.fn().mockResolvedValue({ id: challengeId, status: ChallengeStatus.SOLUTION_PROPOSED }),
        update: jest.fn().mockResolvedValue({ id: challengeId, status: ChallengeStatus.SOLUTION_PROPOSED }),
      },
      challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
      notification: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementationOnce(async (cb: (tx: typeof mockTxReviewApp) => unknown) => cb(mockTxReviewApp));

    const reviewApp = await ProposalService.reviewProposal({
      proposalId: proposalIdV2,
      decision: 'APPROVED',
      comments: 'Excellent revisions on solar backup and concrete sludge solidification. Approved for activation.',
      actorId: govOfficerId,
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-e2e-app',
    });

    expect(reviewApp.proposal.status).toBe(ProposalStatus.APPROVED);

    // -------------------------------------------------------------
    // Step 5: Industry Partner Intelligence & CSR Funding Engine
    // -------------------------------------------------------------
    (prisma.challenge.findUnique as jest.Mock).mockResolvedValueOnce({
      id: challengeId,
      category: 'Water Supply',
      description: 'Arsenic water purification with IoT monitoring',
      state: 'Uttar Pradesh',
    });

    (prisma.organization.findMany as jest.Mock).mockResolvedValueOnce([
      {
        id: 'org-csr-water',
        name: 'Jal Clean India Foundation (CSR)',
        type: OrganizationType.CSR,
        status: 'ACTIVE',
        industryProfile: {
          sector: 'Water Supply & Public Health',
          capabilities: ['water filtration', 'solar pumping'],
          technologies: ['iot', 'filtration', 'arsenic'],
          fundingCapacity: 2500000,
          csrFocusAreas: ['Water Supply'],
          supportedStages: ['PILOT', 'SCALE'],
          geographicCoverage: ['All India'],
          activeProjectsCount: 2,
        },
      },
    ]);

    const partnerMatches = await IndustryMatchingEngine.matchPartnersForProject(challengeId);
    expect(partnerMatches.length).toBe(1);
    expect(partnerMatches[0].overallScore).toBeGreaterThan(85);

    // Stage Funding Request: Partial Approval + Gap Handling
    const mockTxFund = {
      fundingRequest: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'fr-ballia',
          projectId,
          stage: 'PILOT',
          totalAmount: 1500000, // ₹15,00,000 requested
          project: { id: projectId, budget: 0 },
        }),
        update: jest.fn().mockResolvedValue({
          id: 'fr-ballia',
          status: 'PARTIALLY_APPROVED',
          approvedAmount: 1000000, // ₹10,00,000 sanctioned
        }),
      },
      project: { update: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementationOnce(async (cb: (tx: typeof mockTxFund) => unknown) => cb(mockTxFund));

    const fundResult = await FundingService.reviewFunding({
      fundingRequestId: 'fr-ballia',
      status: 'PARTIALLY_APPROVED',
      approvedAmount: 1000000,
      decisionNotes: '₹10,00,000 sanctioned under State Rural Water Mission. Balance ₹5,00,000 to be matched via CSR.',
      actorId: govOfficerId,
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-fund-rev',
    });

    expect(fundResult.gapResolution).toBeDefined();
    expect(fundResult.gapResolution?.fundingGap).toBe(500000); // Shortfall ₹5,00,000
    expect(fundResult.gapResolution?.recoveryOptions.length).toBeGreaterThanOrEqual(2);

    // -------------------------------------------------------------
    // Step 6: Project Activation Guardrails & Execution
    // -------------------------------------------------------------
    // Mock prerequisites check
    (prisma.project.findUnique as jest.Mock).mockResolvedValueOnce({
      id: projectId,
      title: 'Project: Arsenic Contamination in Ballia Groundwater',
      leadingOrgId: universityOrgId,
      challenge: {
        id: challengeId,
        status: ChallengeStatus.SOLUTION_PROPOSED,
        universityMatches: [{ universityOrgId, status: 'ACCEPTED' }],
      },
      team: {
        id: 'team-ballia',
        members: [
          { roleInTeam: TeamRole.LEAD_FACULTY, invitationStatus: InvitationStatus.ACCEPTED },
          { roleInTeam: TeamRole.STUDENT_RESEARCHER, invitationStatus: InvitationStatus.ACCEPTED },
        ],
      },
      proposals: [{ id: proposalIdV2, version: 2, status: ProposalStatus.APPROVED }],
    });

    const checklist = await ProjectService.evaluateActivationPrerequisites(projectId);
    expect(checklist.canActivate).toBe(true);
    expect(checklist.isChallengeApproved).toBe(true);
    expect(checklist.isUniversityAccepted).toBe(true);
    expect(checklist.hasValidTeam).toBe(true);
    expect(checklist.hasConfirmedLeadFaculty).toBe(true);
    expect(checklist.isProposalApproved).toBe(true);

    // Mock Activation transaction
    (prisma.project.findUnique as jest.Mock).mockResolvedValueOnce({
      id: projectId,
      title: 'Project: Arsenic Contamination in Ballia Groundwater',
      leadingOrgId: universityOrgId,
      challenge: {
        id: challengeId,
        status: ChallengeStatus.SOLUTION_PROPOSED,
        universityMatches: [{ universityOrgId, status: 'ACCEPTED' }],
      },
      team: {
        id: 'team-ballia',
        members: [
          { roleInTeam: TeamRole.LEAD_FACULTY, invitationStatus: InvitationStatus.ACCEPTED },
          { roleInTeam: TeamRole.STUDENT_RESEARCHER, invitationStatus: InvitationStatus.ACCEPTED },
        ],
      },
      proposals: [{ id: proposalIdV2, version: 2, status: ProposalStatus.APPROVED }],
    });

    const mockTxActivate = {
      project: {
        findUnique: jest.fn().mockResolvedValue({
          id: projectId,
          title: 'Project: Arsenic Contamination in Ballia Groundwater',
          challengeId,
          status: ProjectStatus.ASSIGNED,
          proposals: [{ id: proposalIdV2, version: 2, status: ProposalStatus.APPROVED }],
        }),
        update: jest.fn().mockResolvedValue({
          id: projectId,
          status: ProjectStatus.APPROVED,
          activatedAt: new Date(),
        }),
      },
      challenge: { update: jest.fn().mockResolvedValue({}) },
      challengeTimeline: { create: jest.fn().mockResolvedValue({}) },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    (prisma.$transaction as jest.Mock).mockImplementationOnce(async (cb: (tx: typeof mockTxActivate) => unknown) => cb(mockTxActivate));

    const activated = await ProjectService.activateProject({
      projectId,
      actorId: govOfficerId,
      actorRole: UserRole.GOVERNMENT_OFFICER,
      requestId: 'req-e2e-activate',
    });

    expect(activated.project.status).toBe(ProjectStatus.APPROVED);
    expect(activated.checklist.canActivate).toBe(true);
    expect(mockTxActivate.challenge.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: ChallengeStatus.IN_PILOT }),
      })
    );
  });
});
