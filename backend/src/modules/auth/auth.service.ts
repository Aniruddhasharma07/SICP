import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../database/prisma';
import { env } from '../../config/env';
import { ConflictError, UnauthorizedError, NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors';
import { AuditService } from '../audit/audit.service';
import { NotificationService } from '../notification/notification.service';
import { AuditAction, UserDto, UserRole, OrganizationType, VerificationStatus, OrganizationDto } from '@sicp/shared';
import { getUserPermissions } from '../../domain/permissions/permissions.matrix';
import { z } from 'zod';
import { registerSchema, loginSchema } from './auth.schemas';

export class AuthService {
  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  private static generateTokens(userId: string, email: string, role: string, orgId?: string | null) {
    const signOptions: SignOptions = {
      expiresIn: '15m',
    };

    const accessToken = jwt.sign(
      { userId, email, role, organizationId: orgId },
      env.JWT_SECRET,
      signOptions
    );
    const rawRefreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000);

    return { accessToken, rawRefreshToken, tokenHash, expiresAt };
  }

  private static toUserDto(user: any, org?: any): UserDto {
    let orgDto: OrganizationDto | null = null;
    const o = org || user.organization;
    if (o) {
      orgDto = {
        id: o.id,
        name: o.name,
        slug: o.slug,
        type: o.type as OrganizationType,
        status: o.status,
        verificationStatus: o.verificationStatus as VerificationStatus,
        metadata: (o.metadata as Record<string, unknown>) || null,
        createdAt: o.createdAt ? new Date(o.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: o.updatedAt ? new Date(o.updatedAt).toISOString() : new Date().toISOString(),
      };
    }

    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone || null,
      role: user.role as UserRole,
      organizationId: user.organizationId || null,
      organization: orgDto,
      isActive: user.isActive,
      createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: user.updatedAt ? new Date(user.updatedAt).toISOString() : new Date().toISOString(),
    };
  }

  public static async register(
    data: z.infer<typeof registerSchema>,
    context: { requestId: string; ipAddress?: string }
  ): Promise<{ user: UserDto; accessToken: string; refreshToken: string }> {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictError(`An account with email '${data.email}' already exists. Please sign in instead.`);
    }

    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(data.password, salt);

    // Handle registration with or without institutional organization
    let user: any;
    let createdOrg: any = null;

    if (data.organization && data.organization.name && data.organization.name.trim().length > 0) {
      const executeTransaction = typeof (prisma as any).$transaction === 'function'
        ? (fn: any) => (prisma as any).$transaction(fn)
        : async (fn: any) => fn(prisma);

      const result = await executeTransaction(async (tx: any) => {
        let orgIdToAssign: string | null = data.organizationId ? data.organizationId : null;
        let newOrg: any = null;

        let orgType: import('@prisma/client').$Enums.OrganizationType =
          'UNIVERSITY' as import('@prisma/client').$Enums.OrganizationType;

        if (data.organization?.type) {
          orgType = data.organization.type as unknown as import('@prisma/client').$Enums.OrganizationType;
        } else if (data.role === UserRole.UNIVERSITY_ADMIN) {
          orgType = 'UNIVERSITY' as import('@prisma/client').$Enums.OrganizationType;
        } else if (data.role === UserRole.STARTUP) {
          orgType = 'STARTUP' as import('@prisma/client').$Enums.OrganizationType;
        } else if (data.role === UserRole.MSME) {
          orgType = 'MSME' as import('@prisma/client').$Enums.OrganizationType;
        } else if (data.role === UserRole.CSR_ORGANIZATION) {
          orgType = 'CSR' as import('@prisma/client').$Enums.OrganizationType;
        } else if (data.role === UserRole.INDUSTRY_PARTNER) {
          orgType = 'INDUSTRY' as import('@prisma/client').$Enums.OrganizationType;
        }

        const baseSlug = data.organization!.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '') || 'org';
        const uniqueSlug = `${baseSlug}-${Date.now().toString(36)}`;

        const orgMetadata = {
          sector: data.organization!.sector || null,
          category: data.organization!.category || null,
          address: data.organization!.address || null,
          city: data.organization!.city || null,
          district: data.organization!.district || null,
          state: data.organization!.state || null,
          website: data.organization!.website || null,
          officialEmail: data.organization!.officialEmail || null,
          contactPhone: data.organization!.contactPhone || null,
          accreditationDetails: data.organization!.accreditationDetails || null,
          registrationNumber: data.organization!.registrationNumber || null,
          departments: data.organization!.departments || [],
          researchDomains: data.organization!.researchDomains || [],
          facilities: data.organization!.facilities || [],
          capabilities: data.organization!.capabilities || [],
          supportingDocuments: data.organization!.supportingDocuments || [],
          submittedAt: new Date().toISOString(),
          adminContactName: data.fullName,
          adminContactEmail: data.email,
        };

        newOrg = await tx.organization.create({
          data: {
            name: data.organization!.name.trim(),
            slug: uniqueSlug,
            type: orgType,
            status: 'ACTIVE',
            verificationStatus: 'PENDING_REVIEW' as import('@prisma/client').$Enums.VerificationStatus,
            metadata: orgMetadata,
            verificationDetails: {
              submittedAt: new Date().toISOString(),
              submissionNotes: 'Initial institutional registration awaiting government review',
              documents: data.organization!.supportingDocuments || [],
            },
          },
        });

        orgIdToAssign = newOrg.id;

        // Record initial OrganizationVerification entry
        await tx.organizationVerification.create({
          data: {
            organizationId: newOrg.id,
            status: 'PENDING_REVIEW' as import('@prisma/client').$Enums.VerificationStatus,
            reviewNotes: 'Initial registration submitted by organization admin. Pending government accreditation review.',
            evidenceReferences: data.organization!.supportingDocuments || [],
          },
        });

        // Create the user
        const createdUser = await tx.user.create({
          data: {
            email: data.email.toLowerCase(),
            passwordHash,
            fullName: data.fullName,
            phone: data.phone || null,
            role: data.role as unknown as import('@prisma/client').$Enums.UserRole,
            organizationId: orgIdToAssign,
          },
        });

        // If an organization was created, link user as ADMIN member
        if (orgIdToAssign) {
          await tx.organizationMember.create({
            data: {
              organizationId: orgIdToAssign,
              userId: createdUser.id,
              role: 'ADMIN',
            },
          });
        }

        return { user: createdUser, createdOrg: newOrg };
      });

      user = result.user;
      createdOrg = result.createdOrg;
    } else {
      // Standard registration without inline organization creation
      user = await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          passwordHash,
          fullName: data.fullName,
          phone: data.phone || null,
          role: data.role as unknown as import('@prisma/client').$Enums.UserRole,
          organizationId: data.organizationId || null,
        },
      });
    }

    const { accessToken, rawRefreshToken, tokenHash, expiresAt } = this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.organizationId
    );

    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash,
        ipAddress: context.ipAddress || null,
        expiresAt,
      },
    });

    await AuditService.record({
      actorId: user.id,
      actorRole: user.role,
      action: AuditAction.AUTH_REGISTER,
      resource: 'User',
      resourceId: user.id,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    });

    // Notify government officers if an organization was registered
    if (createdOrg) {
      await AuditService.record({
        actorId: user.id,
        actorRole: user.role,
        action: AuditAction.ORG_CREATE,
        resource: 'Organization',
        resourceId: createdOrg.id,
        newState: { name: createdOrg.name, type: createdOrg.type, status: 'PENDING_REVIEW' },
        requestId: context.requestId,
        ipAddress: context.ipAddress,
      });

      try {
        const govOfficers = await prisma.user.findMany({
          where: {
            role: { in: [UserRole.GOVERNMENT_OFFICER, UserRole.SYSTEM_ADMIN] },
            isActive: true,
          },
          select: { id: true },
          take: 10,
        });

        for (const gov of govOfficers) {
          await NotificationService.create({
            recipientId: gov.id,
            title: `New ${createdOrg.type} Registration: ${createdOrg.name}`,
            message: `A new ${createdOrg.type.toLowerCase()} registration has been submitted by ${user.fullName} and is awaiting official review.`,
            type: 'ORG_VERIFICATION_QUEUE',
            actionUrl: '/government',
            metadata: { organizationId: createdOrg.id, organizationType: createdOrg.type },
          }).catch(() => {});
        }
      } catch {
        // Notification failure should not abort registration
      }
    }

    return {
      user: this.toUserDto(user, createdOrg),
      accessToken,
      refreshToken: rawRefreshToken,
    };
  }

  public static async login(
    data: z.infer<typeof loginSchema>,
    context: { requestId: string; userAgent?: string; ipAddress?: string }
  ): Promise<{ user: UserDto; accessToken: string; refreshToken: string; permissions: readonly string[] }> {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
      include: { organization: true },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedError('Your account is awaiting verification or has been deactivated');
    }

    const isMatch = await bcrypt.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const { accessToken, rawRefreshToken, tokenHash, expiresAt } = this.generateTokens(
      user.id,
      user.email,
      user.role,
      user.organizationId
    );

    await prisma.refreshSession.create({
      data: {
        userId: user.id,
        tokenHash,
        userAgent: context.userAgent || null,
        ipAddress: context.ipAddress || null,
        expiresAt,
      },
    });

    await AuditService.record({
      actorId: user.id,
      actorRole: user.role,
      action: AuditAction.AUTH_LOGIN,
      resource: 'User',
      resourceId: user.id,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    });

    return {
      user: this.toUserDto(user),
      accessToken,
      refreshToken: rawRefreshToken,
      permissions: getUserPermissions(user.role as unknown as UserRole),
    };
  }

  public static async refresh(
    rawRefreshToken: string,
    context: { requestId: string; ipAddress?: string }
  ): Promise<{ accessToken: string; refreshToken: string }> {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string' || rawRefreshToken.trim().length === 0) {
      throw new UnauthorizedError('No refresh token provided');
    }

    const tokenHash = this.hashToken(rawRefreshToken.trim());

    const session = await prisma.refreshSession.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    await prisma.refreshSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    const { accessToken, rawRefreshToken: newRawRefreshToken, tokenHash: newTokenHash, expiresAt } =
      this.generateTokens(
        session.user.id,
        session.user.email,
        session.user.role,
        session.user.organizationId
      );

    await prisma.refreshSession.create({
      data: {
        userId: session.user.id,
        tokenHash: newTokenHash,
        ipAddress: context.ipAddress || null,
        expiresAt,
      },
    });

    await AuditService.record({
      actorId: session.user.id,
      actorRole: session.user.role,
      action: AuditAction.AUTH_TOKEN_REFRESH,
      resource: 'User',
      resourceId: session.user.id,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    });

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
    };
  }

  public static async logout(
    rawRefreshToken?: string,
    userId?: string,
    context?: { requestId: string; ipAddress?: string }
  ): Promise<void> {
    if (rawRefreshToken && typeof rawRefreshToken === 'string') {
      const tokenHash = this.hashToken(rawRefreshToken.trim());
      await prisma.refreshSession.updateMany({
        where: { tokenHash, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }

    if (userId && context) {
      await AuditService.record({
        actorId: userId,
        action: AuditAction.AUTH_LOGOUT,
        resource: 'User',
        resourceId: userId,
        requestId: context.requestId,
        ipAddress: context.ipAddress,
      });
    }
  }

  public static async getMe(userId: string): Promise<{ user: UserDto; permissions: readonly string[] }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { organization: true },
    });

    if (!user) {
      throw new NotFoundError('User', userId);
    }

    return {
      user: this.toUserDto(user),
      permissions: getUserPermissions(user.role as unknown as UserRole),
    };
  }

  public static async demoSwitch(
    data: { universityOrgId?: string; organizationId?: string; role?: UserRole },
    context: { requestId: string; userAgent?: string; ipAddress?: string }
  ): Promise<{ user: UserDto; accessToken: string; refreshToken: string; permissions: readonly string[] }> {
    const isDemoEnabled = process.env.DEMO_MODE === 'true' || process.env.NODE_ENV !== 'production';
    if (!isDemoEnabled) {
      throw new ForbiddenError('Demo institution switching is disabled in this environment.');
    }

    const orgId = data.universityOrgId || data.organizationId;
    if (!orgId) {
      throw new ValidationError('Organization ID is required for demo switching.');
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        users: {
          where: {
            isActive: true,
            role: { in: [UserRole.UNIVERSITY_ADMIN, UserRole.FACULTY, UserRole.INDUSTRY_PARTNER, UserRole.CSR_ORGANIZATION, UserRole.SYSTEM_ADMIN] },
          },
          take: 1,
        },
      },
    });

    if (!org) {
      throw new NotFoundError('Organization', orgId);
    }

    if (org.status !== 'ACTIVE' || org.verificationStatus !== 'VERIFIED') {
      throw new ForbiddenError(`Institutional access denied: Organization '${org.name}' is not verified.`);
    }

    let user = org.users[0];
    if (!user) {
      const member = await prisma.organizationMember.findFirst({
        where: { organizationId: org.id },
        include: { user: true },
      });
      user = member?.user as any;
    }

    if (!user) {
      throw new NotFoundError('Verified institutional administrator for', org.name);
    }

    if (user.organizationId !== org.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: { organizationId: org.id },
      });
    }

    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: { organization: true },
    });

    const { accessToken, rawRefreshToken, tokenHash, expiresAt } = this.generateTokens(
      fullUser!.id,
      fullUser!.email,
      fullUser!.role,
      org.id
    );

    await prisma.refreshSession.create({
      data: {
        userId: fullUser!.id,
        tokenHash,
        userAgent: context.userAgent || null,
        ipAddress: context.ipAddress || null,
        expiresAt,
      },
    });

    await AuditService.record({
      actorId: fullUser!.id,
      actorRole: fullUser!.role,
      action: AuditAction.AUTH_LOGIN,
      resource: 'User',
      resourceId: fullUser!.id,
      reason: `Demo switched to institutional profile for ${org.name}`,
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    });

    return {
      user: this.toUserDto(fullUser!),
      accessToken,
      refreshToken: rawRefreshToken,
      permissions: getUserPermissions(fullUser!.role as unknown as UserRole),
    };
  }
}
