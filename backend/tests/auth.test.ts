import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserRole } from '@sicp/shared';
import { AuthService } from '../src/modules/auth/auth.service';
import { prisma } from '../src/database/prisma';
import { ConflictError, UnauthorizedError } from '../src/utils/errors';
import { env } from '../src/config/env';

jest.mock('../src/database/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    refreshSession: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

describe('Authentication & Session Management Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Registration', () => {
    it('successfully hashes password with bcrypt, persists user, and returns tokens', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'u-101',
        email: 'citizen@example.com',
        fullName: 'Aarav Patel',
        role: UserRole.CITIZEN,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (prisma.refreshSession.create as jest.Mock).mockResolvedValue({ id: 'sess-1' });

      const result = await AuthService.register(
        {
          email: 'citizen@example.com',
          password: 'Password123!',
          fullName: 'Aarav Patel',
          role: UserRole.CITIZEN,
        },
        { requestId: 'req-reg-1' }
      );

      expect(result.user.email).toBe('citizen@example.com');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();

      const decoded = jwt.verify(result.accessToken, env.JWT_SECRET) as any;
      expect(decoded.userId).toBe('u-101');
      expect(decoded.role).toBe(UserRole.CITIZEN);
    });

    it('rejects duplicate registration with ConflictError', async () => {
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing-user' });

      await expect(
        AuthService.register(
          {
            email: 'duplicate@example.com',
            password: 'Password123!',
            fullName: 'Test User',
            role: UserRole.CITIZEN,
          },
          { requestId: 'req-dup' }
        )
      ).rejects.toThrow(ConflictError);
    });
  });

  describe('Login & Password Verification', () => {
    it('authenticates user with valid bcrypt password and returns token pair', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u-202',
        email: 'officer@gov.in',
        fullName: 'Officer Sharma',
        role: UserRole.GOVERNMENT_OFFICER,
        passwordHash,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      (prisma.refreshSession.create as jest.Mock).mockResolvedValue({ id: 'sess-2' });

      const result = await AuthService.login(
        { email: 'officer@gov.in', password: 'CorrectPassword123!' },
        { requestId: 'req-login' }
      );

      expect(result.user.email).toBe('officer@gov.in');
      expect(result.permissions).toContain('challenge:approve');
      expect(result.accessToken).toBeDefined();
    });

    it('rejects login with incorrect password with UnauthorizedError', async () => {
      const passwordHash = await bcrypt.hash('CorrectPassword123!', 10);
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: 'u-202',
        email: 'officer@gov.in',
        passwordHash,
        isActive: true,
      });

      await expect(
        AuthService.login(
          { email: 'officer@gov.in', password: 'WrongPassword!' },
          { requestId: 'req-fail' }
        )
      ).rejects.toThrow(UnauthorizedError);
    });
  });

  describe('Token Rotation & Session Revocation', () => {
    it('rotates refresh token: revokes old session and creates new session', async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      (prisma.refreshSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'old-session-id',
        revokedAt: null,
        expiresAt: futureDate,
        user: {
          id: 'u-303',
          email: 'citizen@example.com',
          role: UserRole.CITIZEN,
          isActive: true,
        },
      });

      (prisma.refreshSession.update as jest.Mock).mockResolvedValue({ id: 'old-session-id' });
      (prisma.refreshSession.create as jest.Mock).mockResolvedValue({ id: 'new-session-id' });

      const result = await AuthService.refresh('dummy-raw-refresh-token', { requestId: 'req-ref' });

      expect(prisma.refreshSession.update).toHaveBeenCalledWith({
        where: { id: 'old-session-id' },
        data: { revokedAt: expect.any(Date) },
      });
      expect(prisma.refreshSession.create).toHaveBeenCalled();
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
    });

    it('rejects revoked refresh session with UnauthorizedError', async () => {
      (prisma.refreshSession.findUnique as jest.Mock).mockResolvedValue({
        id: 'revoked-session',
        revokedAt: new Date(Date.now() - 10000), // Already revoked!
        expiresAt: new Date(Date.now() + 100000),
        user: { id: 'u-404', isActive: true },
      });

      await expect(
        AuthService.refresh('some-revoked-token', { requestId: 'req-bad' })
      ).rejects.toThrow(UnauthorizedError);
    });

    it('logout revokes session in database', async () => {
      (prisma.refreshSession.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await AuthService.logout('raw-token-to-logout', 'u-505', { requestId: 'req-out' });

      expect(prisma.refreshSession.updateMany).toHaveBeenCalledWith({
        where: { tokenHash: expect.any(String), revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });
});