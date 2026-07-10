import { Injectable } from '@nestjs/common';
import { NotificationKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface NotificationView { id: string; title: string; body: string; kind: 'info' | 'success' | 'warning'; read: boolean; date: string }

/** Per-user in-app notifications. Creation is best-effort (never blocks the action). */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, input: { title: string; body: string; kind?: NotificationKind }): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: { userId, title: input.title, body: input.body, kind: input.kind ?? NotificationKind.INFO },
      });
    } catch {
      // Notifications must never fail the underlying action.
    }
  }

  async list(userId: string): Promise<NotificationView[]> {
    const rows = await this.prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 });
    return rows.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      kind: n.kind.toLowerCase() as NotificationView['kind'],
      read: n.read,
      date: n.createdAt.toISOString(),
    }));
  }

  async markAllRead(userId: string): Promise<{ ok: true }> {
    await this.prisma.notification.updateMany({ where: { userId, read: false }, data: { read: true } });
    return { ok: true };
  }
}
