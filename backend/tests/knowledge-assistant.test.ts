import { KnowledgeAssistantEngine } from '../src/domain/intelligence/knowledge-assistant.engine';
import {
  UserRole,
  SolutionMemoryStatus,
  MemoryOutcomeStatus,
  EvidenceLevel,
  ReusabilityClass,
} from '@sicp/shared';
import { prisma } from '../src/database/prisma';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    solutionMemory: {
      findMany: jest.fn(),
    },
  },
}));

describe('KnowledgeAssistantEngine - Grounded Anti-Hallucinating Knowledge Retrieval', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns honest empty state with INSUFFICIENT_EVIDENCE when no verified solutions exist without fabricating mock cases', async () => {
    (prisma.solutionMemory.findMany as jest.Mock).mockResolvedValue([]);

    const response = await KnowledgeAssistantEngine.askAssistant(
      { query: 'How to remediate uranium groundwater toxicity in deep wells?' },
      UserRole.CITIZEN
    );

    expect(response.evidenceQuality).toBe('INSUFFICIENT_EVIDENCE');
    expect(response.citations).toHaveLength(0);
    expect(response.historicalWarnings).toHaveLength(0);
    expect(response.answer).toContain('strictly does not fabricate unverified case studies');
    expect(response.suggestedFollowUpQuestions.length).toBeGreaterThan(0);
  });

  it('synthesizes grounded answer with verifiable citations and warnings when historical solutions match', async () => {
    (prisma.solutionMemory.findMany as jest.Mock).mockResolvedValue([
      {
        id: 'mem-water-filter',
        title: 'Community Bio-Sand & Activated Charcoal Filter System',
        summary: 'Decentralized multi-layer filtration system for microbial and particulate reduction.',
        challengeCategory: 'WATER_SUPPLY',
        problemSummary: 'High turbidity and bacterial contamination in rural open wells',
        rootCause: 'Surface runoff seepage into unlined village well masonry',
        technicalApproach: 'Layered slow sand and coconut shell activated carbon filter with gravity flow',
        outcomeStatus: MemoryOutcomeStatus.SUCCESSFUL,
        evidenceLevel: EvidenceLevel.VERIFIED,
        reusabilityClass: ReusabilityClass.HIGHLY_REUSABLE,
        lessonsLearned: 'Simple operation with low recurring cost.',
        whatWorked: 'Achieved 98% turbidity reduction and bacterial compliance.',
        whatFailed: 'Top biological layer requires gentle maintenance without chemical disturbance.',
        futureWarnings: 'Never use chlorinated water to wash the top schmutzdecke biological layer.',
        status: SolutionMemoryStatus.PUBLISHED,
        project: { id: 'proj-filter-1', title: 'Rural Water Initiative', status: 'COMPLETED' },
        challenge: { id: 'chal-1', title: 'Open well turbidity', category: 'WATER_SUPPLY' },
      },
    ]);

    const response = await KnowledgeAssistantEngine.askAssistant(
      { query: 'What filtration methods work for turbidity in rural open wells?' },
      UserRole.CITIZEN
    );

    expect(response.evidenceQuality).toBe('HIGH_CONFIDENCE');
    expect(response.citations.length).toBeGreaterThan(0);
    expect(response.citations[0].recordId).toBe('mem-water-filter');
    expect(response.citations[0].actionUrl).toBe('/solutions/mem-water-filter');
    expect(response.answer).toMatch(/Community Bio-Sand (&|and) Activated Charcoal Filter System/i);
    expect(response.historicalWarnings).toContain(
      'Operational Alert [Community Bio-Sand & Activated Charcoal Filter System]: Never use chlorinated water to wash the top schmutzdecke biological layer.'
    );
  });

  it('restricts unreviewed drafts from Citizen knowledge queries', async () => {
    (prisma.solutionMemory.findMany as jest.Mock).mockImplementation(({ where }) => {
      // If where clause restricts status to PUBLISHED
      if (where.status?.in?.includes(SolutionMemoryStatus.DRAFT)) {
        return Promise.resolve([
          {
            id: 'mem-draft-secret',
            title: 'Unreviewed Prototype System',
            status: SolutionMemoryStatus.DRAFT,
          },
        ]);
      }
      return Promise.resolve([]);
    });

    const citizenResponse = await KnowledgeAssistantEngine.askAssistant(
      { query: 'Any prototype solutions available?' },
      UserRole.CITIZEN
    );

    // Citizen only queries PUBLISHED, so receives zero draft results
    expect(citizenResponse.evidenceQuality).toBe('INSUFFICIENT_EVIDENCE');
    expect(citizenResponse.citations).toHaveLength(0);
  });
});
