import { Request, Response, NextFunction } from 'express';
import { UserRole, VerificationStatus } from '@sicp/shared';
import { Permission, hasPermission } from '../../domain/permissions/permissions.matrix';
import { ForbiddenError, UnauthorizedError } from '../../utils/errors';
import { prisma } from '../../database/prisma';

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!hasPermission(req.user.role, permission)) {
      return next(
        new ForbiddenError(
          `Access denied: Role '${req.user.role}' lacks the required permission '${permission}'`
        )
      );
    }

    next();
  };
}

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access denied: Role '${req.user.role}' is not in allowed roles [${allowedRoles.join(', ')}]`
        )
      );
    }

    next();
  };
}

/**
 * Enforces that an institutional user (University Admin, Faculty, Industry Partner, Startup, MSME, CSR)
 * has a VERIFIED organization status before performing protected institutional actions.
 */
export async function requireVerifiedOrganization(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (!req.user) {
    return next(new UnauthorizedError());
  }

  // System Admins and Government Officers are exempt from institution verification requirement
  if (req.user.role === UserRole.SYSTEM_ADMIN || req.user.role === UserRole.GOVERNMENT_OFFICER) {
    return next();
  }

  const institutionRoles: UserRole[] = [
    UserRole.UNIVERSITY_ADMIN,
    UserRole.FACULTY,
    UserRole.STUDENT,
    UserRole.RESEARCH_ASSISTANT,
    UserRole.INDUSTRY_PARTNER,
    UserRole.STARTUP,
    UserRole.MSME,
    UserRole.CSR_ORGANIZATION,
  ];

  if (!institutionRoles.includes(req.user.role)) {
    return next();
  }

  if (!req.user.organizationId) {
    return next(
      new ForbiddenError('Institutional access restricted: User account is not associated with an organization.')
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: req.user.organizationId },
    select: { id: true, name: true, verificationStatus: true },
  });

  if (!org) {
    return next(
      new ForbiddenError('Institutional access restricted: Associated organization record was not found.')
    );
  }

  if (org.verificationStatus !== ('VERIFIED' as unknown as import('@prisma/client').$Enums.VerificationStatus)) {
    return next(
      new ForbiddenError(
        `Institutional access restricted: Organization '${org.name}' verification status is '${org.verificationStatus}'. Government review and verification is required.`
      )
    );
  }

  next();
}
