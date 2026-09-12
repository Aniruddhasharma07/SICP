import { UserRole } from '@sicp/shared';
import { hasPermission, getUserPermissions } from '../src/domain/permissions/permissions.matrix';
import { requirePermission, requireRole } from '../src/core/middlewares/rbac.middleware';
import { Request, Response, NextFunction } from 'express';
import { ForbiddenError, UnauthorizedError } from '../src/utils/errors';

describe('RBAC Centralized Permission Matrix & Middleware', () => {
  describe('Centralized Role Permissions Matrix', () => {
    it('grants Citizen permission to create, view, and submit challenges', () => {
      expect(hasPermission(UserRole.CITIZEN, 'challenge:create')).toBe(true);
      expect(hasPermission(UserRole.CITIZEN, 'challenge:view')).toBe(true);
      expect(hasPermission(UserRole.CITIZEN, 'challenge:submit')).toBe(true);
      expect(hasPermission(UserRole.CITIZEN, 'evidence:upload')).toBe(true);
    });

    it('denies Citizen permission to approve or reject challenges or review verifications', () => {
      expect(hasPermission(UserRole.CITIZEN, 'challenge:approve')).toBe(false);
      expect(hasPermission(UserRole.CITIZEN, 'challenge:reject')).toBe(false);
      expect(hasPermission(UserRole.CITIZEN, 'challenge:review')).toBe(false);
      expect(hasPermission(UserRole.CITIZEN, 'org:verify_review')).toBe(false);
    });

    it('grants Government Officer permission to review, request info, approve, and reject challenges', () => {
      expect(hasPermission(UserRole.GOVERNMENT_OFFICER, 'challenge:review')).toBe(true);
      expect(hasPermission(UserRole.GOVERNMENT_OFFICER, 'challenge:request_info')).toBe(true);
      expect(hasPermission(UserRole.GOVERNMENT_OFFICER, 'challenge:approve')).toBe(true);
      expect(hasPermission(UserRole.GOVERNMENT_OFFICER, 'challenge:reject')).toBe(true);
      expect(hasPermission(UserRole.GOVERNMENT_OFFICER, 'audit:view')).toBe(true);
    });

    it('grants University Admin permission to manage organization and submit verification', () => {
      expect(hasPermission(UserRole.UNIVERSITY_ADMIN, 'org:view')).toBe(true);
      expect(hasPermission(UserRole.UNIVERSITY_ADMIN, 'org:update')).toBe(true);
      expect(hasPermission(UserRole.UNIVERSITY_ADMIN, 'org:verify_submit')).toBe(true);
      expect(hasPermission(UserRole.UNIVERSITY_ADMIN, 'challenge:approve')).toBe(false);
    });

    it('grants System Admin all system and challenge permissions', () => {
      const adminPermissions = getUserPermissions(UserRole.SYSTEM_ADMIN);
      expect(adminPermissions).toContain('system:manage');
      expect(adminPermissions).toContain('challenge:approve');
      expect(adminPermissions).toContain('org:verify_review');
      expect(adminPermissions).toContain('audit:view');
    });
  });

  describe('RBAC Middlewares', () => {
    let mockReq: Partial<Request>;
    let mockRes: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
      mockReq = {};
      mockRes = { locals: { requestId: 'test-req-123' } };
      mockNext = jest.fn();
    });

    it('allows request when user has the required permission', () => {
      mockReq.user = {
        id: 'user-1',
        email: 'officer@gov.in',
        role: UserRole.GOVERNMENT_OFFICER,
      };

      const middleware = requirePermission('challenge:approve');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith();
    });

    it('rejects with ForbiddenError when user lacks the required permission', () => {
      mockReq.user = {
        id: 'user-2',
        email: 'citizen@example.com',
        role: UserRole.CITIZEN,
      };

      const middleware = requirePermission('challenge:approve');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
      const error = mockNext.mock.calls[0][0] as unknown as ForbiddenError;
      expect(error.statusCode).toBe(403);
      expect(error.message).toContain("lacks the required permission 'challenge:approve'");
    });

    it('rejects with UnauthorizedError when req.user is undefined', () => {
      mockReq.user = undefined;

      const middleware = requirePermission('challenge:view');
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError));
    });

    it('requireRole allows allowed role and denies unlisted role', () => {
      mockReq.user = { id: 'u3', email: 'officer@gov.in', role: UserRole.GOVERNMENT_OFFICER };
      const roleMiddleware = requireRole(UserRole.GOVERNMENT_OFFICER, UserRole.SYSTEM_ADMIN);

      roleMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();

      mockReq.user.role = UserRole.CITIZEN;
      roleMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.any(ForbiddenError));
    });
  });
});