import { prisma } from '../../database/prisma';
import { NotificationDto } from '@sicp/shared';

export interface CreateNotificationParams {
  recipientId: string;
  recipientRole?: string;
  portal?: string;
  organizationId?: string;
  eventType?: string;
  entityType?: string;
  entityId?: string;
  title: string;
  message: string;
  type: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface GetNotificationOptions {
  onlyUnread?: boolean;
  role?: string;
  portal?: string;
  organizationId?: string;
}

export class NotificationService {
  public static async create(params: CreateNotificationParams): Promise<NotificationDto> {
    const notif = await prisma.notification.create({
      data: {
        recipientId: params.recipientId,
        recipientRole: params.recipientRole || null,
        portal: params.portal || null,
        organizationId: params.organizationId || null,
        eventType: params.eventType || null,
        entityType: params.entityType || null,
        entityId: params.entityId || null,
        title: params.title,
        message: params.message,
        type: params.type,
        actionUrl: params.actionUrl || null,
        metadata: (params.metadata as object) || null,
      },
    });

    return {
      id: notif.id,
      recipientId: notif.recipientId,
      title: notif.title,
      message: notif.message,
      type: notif.type,
      actionUrl: notif.actionUrl,
      isRead: notif.isRead,
      metadata: notif.metadata as Record<string, unknown> | null,
      createdAt: notif.createdAt.toISOString(),
    };
  }

  public static async getUserNotifications(
    userId: string,
    options: boolean | GetNotificationOptions = false
  ): Promise<NotificationDto[]> {
    const isBool = typeof options === 'boolean';
    const onlyUnread = isBool ? options : Boolean(options.onlyUnread);
    const portal = !isBool ? options.portal : undefined;
    const role = !isBool ? options.role : undefined;
    const organizationId = !isBool ? options.organizationId : undefined;

    const where: any = {
      recipientId: userId,
      ...(onlyUnread ? { isRead: false } : {}),
    };

    const conditions: any[] = [];
    if (portal) {
      conditions.push({
        OR: [{ portal: null }, { portal: portal }],
      });
    }
    if (role) {
      conditions.push({
        OR: [{ recipientRole: null }, { recipientRole: role }],
      });
    }
    if (organizationId) {
      conditions.push({
        OR: [{ organizationId: null }, { organizationId: organizationId }],
      });
    }

    if (conditions.length > 0) {
      where.AND = conditions;
    }

    const items = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return items.map(n => ({
      id: n.id,
      recipientId: n.recipientId,
      title: n.title,
      message: n.message,
      type: n.type,
      actionUrl: n.actionUrl,
      isRead: n.isRead,
      metadata: n.metadata as Record<string, unknown> | null,
      createdAt: n.createdAt.toISOString(),
    }));
  }

  public static async markAsRead(id: string, userId: string): Promise<boolean> {
    const updated = await prisma.notification.updateMany({
      where: { id, recipientId: userId },
      data: { isRead: true },
    });
    return updated.count > 0;
  }
}
