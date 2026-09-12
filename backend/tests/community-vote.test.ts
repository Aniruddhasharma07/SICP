import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/database/prisma';
import jwt from 'jsonwebtoken';
import { env } from '../src/config/env';
import { UserRole, ChallengeStatus, SeverityLevel, PriorityLevel } from '@sicp/shared';

describe('Community Support Voting & Priority Integration', () => {
  const app = createApp();

  const mockUser = {
    id: 'citizen-vote-test-1',
    email: 'voter@example.com',
    role: UserRole.CITIZEN,
  };

  const authToken = jwt.sign(
    { userId: mockUser.id, email: mockUser.email, role: mockUser.role },
    env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects unauthenticated users attempting to support a challenge with 401', async () => {
    const res = await request(app).post('/api/v1/challenges/chal-100/vote');
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('allows authenticated citizen to cast a vote and updates challenge priority score', async () => {
    const mockChallenge = {
      id: 'chal-100',
      title: 'Water pipe leak',
      severity: SeverityLevel.MODERATE,
      priority: PriorityLevel.MEDIUM,
      affectedPopulation: 50,
      durationMonths: 2,
      evidence: [],
    };

    // Mock prisma responses
    (prisma.challenge.findUnique as jest.Mock) = jest.fn().mockResolvedValue(mockChallenge);
    (prisma.communityVote.findUnique as jest.Mock) = jest.fn().mockResolvedValue(null); // not voted yet
    (prisma.communityVote.create as jest.Mock) = jest.fn().mockResolvedValue({ id: 'vote-1', challengeId: 'chal-100', userId: mockUser.id });
    (prisma.communityVote.count as jest.Mock) = jest.fn().mockResolvedValue(1);
    (prisma.challenge.update as jest.Mock) = jest.fn().mockResolvedValue({ ...mockChallenge, priorityScore: 35.0 });

    const res = await request(app)
      .post('/api/v1/challenges/chal-100/vote')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.voted).toBe(true);
    expect(res.body.data.totalVotes).toBe(1);
    expect(prisma.communityVote.create).toHaveBeenCalledTimes(1);
    expect(prisma.challenge.update).toHaveBeenCalledTimes(1);
  });

  it('toggles vote to unvoted when user clicks support again', async () => {
    const mockChallenge = {
      id: 'chal-100',
      title: 'Water pipe leak',
      severity: SeverityLevel.MODERATE,
      priority: PriorityLevel.MEDIUM,
      affectedPopulation: 50,
      durationMonths: 2,
      evidence: [],
    };

    (prisma.challenge.findUnique as jest.Mock) = jest.fn().mockResolvedValue(mockChallenge);
    (prisma.communityVote.findUnique as jest.Mock) = jest.fn().mockResolvedValue({ id: 'vote-1' }); // already voted
    (prisma.communityVote.delete as jest.Mock) = jest.fn().mockResolvedValue({ id: 'vote-1' });
    (prisma.communityVote.count as jest.Mock) = jest.fn().mockResolvedValue(0);
    (prisma.challenge.update as jest.Mock) = jest.fn().mockResolvedValue({ ...mockChallenge, priorityScore: 30.0 });

    const res = await request(app)
      .post('/api/v1/challenges/chal-100/vote')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.voted).toBe(false);
    expect(res.body.data.totalVotes).toBe(0);
    expect(prisma.communityVote.delete).toHaveBeenCalledTimes(1);
  });
});
