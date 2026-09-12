import { prisma } from '../../database/prisma';
import { AuditAction, AuditLogDto } from '@sicp/shared';
import { logger } from '../../utils/logger';

export interface RecordAuditParams {
  actorId?: string | null;
  actorRole?: string | null;
  action: AuditAction | string;
  resource: string;
  resourceId: string;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  reason?: string | null;
  requestId: string;
  ipAddress?: string | null;
}

export class AuditService {
  public static async log(params: RecordAuditParams) {
    return this.record(params);
  }

  public static async record(params: RecordAuditParams) {
    try {
      const log = await prisma.auditLog.create({
        data: {
          actorId: params.actorId || null,
          actorRole: params.actorRole || null,
          action: params.action,
          resource: params.resource,
          resourceId: params.resourceId,
          previousState: (params.previousState as object) || null,
          newState: (params.newState as object) || null,
          reason: params.reason || null,
          requestId: params.requestId,
          ipAddress: params.ipAddress || null,
        },
      });
      return log;
    } catch (err: unknown) {
      logger.error(`Failed to record audit log: ${(err as Error).message}`, {
        requestId: params.requestId,
        action: params.action,
        resource: params.resource,
      });
      // Do not rethrow; audit logging should never crash the main transaction unless required
      return null;
    }
  }

  public static async queryLogs(filter: {
    resource?: string;
    resourceId?: string;
    actorId?: string;
    limit?: number;
    offset?: number;
  }): Promise<AuditLogDto[]> {
    const logs = await prisma.auditLog.findMany({
      where: {
        resource: filter.resource,
        resourceId: filter.resourceId,
        actorId: filter.actorId,
      },
      orderBy: { createdAt: 'desc' },
      take: filter.limit || 50,
      skip: filter.offset || 0,
    });

    return logs.map(l => ({
      id: l.id,
      actorId: l.actorId,
      actorRole: l.actorRole,
      action: l.action,
      resource: l.resource,
      resourceId: l.resourceId,
      previousState: l.previousState as Record<string, unknown> | null,
      newState: l.newState as Record<string, unknown> | null,
      reason: l.reason,
      requestId: l.requestId,
      ipAddress: l.ipAddress,
      createdAt: l.createdAt.toISOString(),
    }));
  }
}
