import { Injectable } from '@nestjs/common';
import { NotificationKind } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

export interface NotificationView { id: string; title: string; body: string; kind: 'info' | 'success' | 'warning'; read: boolean; date: string }

/** Per-user in-app notifications. Creation is best-effort (never blocks the action). */
@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /**
   * Create an in-app notification, and — when `email: true` — also send it as a
   * transactional email. Both are best-effort: neither ever fails the action.
   */
  async create(
    userId: string,
    input: { title: string; body: string; kind?: NotificationKind; email?: boolean },
  ): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: { userId, title: input.title, body: input.body, kind: input.kind ?? NotificationKind.INFO },
      });
    } catch {
      // Notifications must never fail the underlying action.
    }
    if (input.email) {
      try {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { email: true, firstName: true },
        });
        if (user?.email) {
          await this.email.sendNotification(user.email, {
            firstName: user.firstName,
            title: input.title,
            body: input.body,
          });
        }
      } catch {
        // Email delivery is best-effort too.
      }
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
