import { prisma } from '../../database/prisma';
import { NotificationDto } from '@sicp/shared';

export interface CreateNotificationParams {
  recipientId: string;
  title: string;
  message: string;
  type: string;
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  public static async create(params: CreateNotificationParams): Promise<NotificationDto> {
    const notif = await prisma.notification.create({
      data: {
        recipientId: params.recipientId,
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
    onlyUnread: boolean = false
  ): Promise<NotificationDto[]> {
    const items = await prisma.notification.findMany({
      where: {
        recipientId: userId,
        ...(onlyUnread ? { isRead: false } : {}),
      },
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
