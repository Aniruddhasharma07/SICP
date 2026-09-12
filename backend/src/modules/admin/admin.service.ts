import { prisma } from '../../database/prisma';
import { UserRole, OrganizationType, VerificationStatus } from '@sicp/shared';
import { QueueManager } from '../../jobs/queue.manager';
import { AuditService } from '../audit/audit.service';
import { NotFoundError } from '../../utils/errors';

export interface AdminPlatformOverviewDto {
  telemetry: {
    service: string;
    nodeVersion: string;
    platform: string;
    uptimeSeconds: number;
    memoryUsageMb: {
      rss: number;
      heapTotal: number;
      heapUsed: number;
    };
    database: { status: 'CONNECTED' | 'DISCONNECTED'; provider: string };
    redis: { status: 'CONNECTED' | 'UNAVAILABLE' };
    timestamp: string;
  };
  metrics: {
    users: {
      total: number;
      active: number;
      byRole: Record<string, number>;
    };
    organizations: {
      total: number;
      byType: Record<string, number>;
      byVerification: Record<string, number>;
    };
    challenges: {
      total: number;
      systemic: number;
      canonicalClusters: number;
      byStatus: Record<string, number>;
    };
    projects: {
      total: number;
      active: number;
      completed: number;
    };
    solutionMemories: {
      total: number;
      published: number;
    };
    auditLogs: {
      total: number;
    };
  };
}

export class AdminService {
  public static async getOverview(): Promise<AdminPlatformOverviewDto> {
    const mem = process.memoryUsage();
    let dbStatus: 'CONNECTED' | 'DISCONNECTED' = 'DISCONNECTED';
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'CONNECTED';
    } catch {
      dbStatus = 'DISCONNECTED';
    }

    const [
      totalUsers,
      activeUsers,
      usersByRoleRaw,
      totalOrgs,
      orgsByTypeRaw,
      orgsByVerifRaw,
      totalChallenges,
      systemicChallenges,
      totalClusters,
      challengesByStatusRaw,
      totalProjects,
      activeProjects,
      completedProjects,
      totalMemories,
      publishedMemories,
      totalAuditLogs,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.groupBy({ by: ['role'], _count: { role: true } }),
      prisma.organization.count(),
      prisma.organization.groupBy({ by: ['type'], _count: { type: true } }),
      prisma.organization.groupBy({ by: ['verificationStatus'], _count: { verificationStatus: true } }),
      prisma.challenge.count({ where: { deletedAt: null } }),
      prisma.challenge.count({ where: { isSystemic: true, deletedAt: null } }),
      prisma.problemCluster.count(),
      prisma.challenge.groupBy({ by: ['status'], _count: { status: true }, where: { deletedAt: null } }),
      prisma.project.count(),
      prisma.project.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED', 'FAILED'] } } }),
      prisma.project.count({ where: { status: 'COMPLETED' } }),
      prisma.solutionMemory.count(),
      prisma.solutionMemory.count({ where: { status: 'PUBLISHED' } }),
      prisma.auditLog.count(),
    ]);

    const usersByRole: Record<string, number> = {};
    usersByRoleRaw.forEach(r => {
      usersByRole[r.role] = r._count.role;
    });

    const orgsByType: Record<string, number> = {};
    orgsByTypeRaw.forEach(r => {
      orgsByType[r.type] = r._count.type;
    });

    const orgsByVerification: Record<string, number> = {};
    orgsByVerifRaw.forEach(r => {
      orgsByVerification[r.verificationStatus] = r._count.verificationStatus;
    });

    const challengesByStatus: Record<string, number> = {};
    challengesByStatusRaw.forEach(r => {
      challengesByStatus[r.status] = r._count.status;
    });

    return {
      telemetry: {
        service: 'sicp-core-api',
        nodeVersion: process.version,
        platform: process.platform,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageMb: {
          rss: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
          heapTotal: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
          heapUsed: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
        },
        database: { status: dbStatus, provider: 'PostgreSQL + PostGIS + pgvector' },
        redis: { status: QueueManager.isRedisReady() ? 'CONNECTED' : 'UNAVAILABLE' },
        timestamp: new Date().toISOString(),
      },
      metrics: {
        users: {
          total: totalUsers,
          active: activeUsers,
          byRole: usersByRole,
        },
        organizations: {
          total: totalOrgs,
          byType: orgsByType,
          byVerification: orgsByVerification,
        },
        challenges: {
          total: totalChallenges,
          systemic: systemicChallenges,
          canonicalClusters: totalClusters,
          byStatus: challengesByStatus,
        },
        projects: {
          total: totalProjects,
          active: activeProjects,
          completed: completedProjects,
        },
        solutionMemories: {
          total: totalMemories,
          published: publishedMemories,
        },
        auditLogs: {
          total: totalAuditLogs,
        },
      },
    };
  }

  public static async getUsers(params: {
    role?: UserRole;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(params.limit || 20, 100);
    const offset = params.offset || 0;

    const whereClause: any = {};
    if (params.role) {
      whereClause.role = params.role;
    }
    if (params.search) {
      whereClause.OR = [
        { email: { contains: params.search, mode: 'insensitive' } },
        { fullName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerified: true,
          organizationId: true,
          organization: {
            select: {
              id: true,
              name: true,
              type: true,
              verificationStatus: true,
            },
          },
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.user.count({ where: whereClause }),
    ]);

    return {
      users: users.map(u => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
      total,
      limit,
      offset,
    };
  }

  public static async updateUserStatus(
    userId: string,
    data: { isActive?: boolean; role?: UserRole },
    actorId: string,
    context: { requestId: string; ipAddress?: string }
  ) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User', userId);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
        ...(data.role ? { role: data.role } : {}),
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });

    await AuditService.record({
      actorId,
      action: 'USER_STATUS_UPDATED',
      resource: 'User',
      resourceId: userId,
      previousState: { isActive: user.isActive, role: user.role },
      newState: { isActive: updated.isActive, role: updated.role },
      reason: 'Admin updated user state or role',
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    });

    return updated;
  }

  public static async getOrganizations(params: {
    type?: OrganizationType;
    verificationStatus?: VerificationStatus;
    search?: string;
    limit?: number;
    offset?: number;
  }) {
    const limit = Math.min(params.limit || 20, 100);
    const offset = params.offset || 0;

    const whereClause: any = {};
    if (params.type) whereClause.type = params.type;
    if (params.verificationStatus) whereClause.verificationStatus = params.verificationStatus;
    if (params.search) {
      whereClause.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { slug: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const [orgs, total] = await Promise.all([
      prisma.organization.findMany({
        where: whereClause,
        include: {
          _count: {
            select: {
              users: true,
              members: true,
              ledProjects: true,
              partnerships: true,
            },
          },
          verifications: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.organization.count({ where: whereClause }),
    ]);

    return {
      organizations: orgs.map(o => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        type: o.type,
        status: o.status,
        verificationStatus: o.verificationStatus,
        metadata: o.metadata as Record<string, unknown> | null,
        counts: o._count,
        latestVerification: o.verifications[0] || null,
        createdAt: o.createdAt.toISOString(),
        updatedAt: o.updatedAt.toISOString(),
      })),
      total,
      limit,
      offset,
    };
  }

  public static async updateOrganizationStatus(
    orgId: string,
    data: { status: 'ACTIVE' | 'SUSPENDED'; notes?: string },
    actorId: string,
    context: { requestId: string; ipAddress?: string }
  ) {
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    if (!org) {
      throw new NotFoundError('Organization', orgId);
    }

    const updated = await prisma.organization.update({
      where: { id: orgId },
      data: { status: data.status },
    });

    await AuditService.record({
      actorId,
      action: 'ORG_STATUS_UPDATED',
      resource: 'Organization',
      resourceId: orgId,
      previousState: { status: org.status },
      newState: { status: updated.status },
      reason: data.notes || ('Admin set organization status to ' + data.status),
      requestId: context.requestId,
      ipAddress: context.ipAddress,
    });

    return updated;
  }
}
