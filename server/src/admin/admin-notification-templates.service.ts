import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { UpdateNotificationTemplateDto } from './notification-template-dto';

@Injectable()
export class AdminNotificationTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.notificationTemplate.findMany({ orderBy: { name: 'asc' } });
  }

  async update(adminId: string, id: string, dto: UpdateNotificationTemplateDto) {
    const existing = await this.prisma.notificationTemplate.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Template not found');

    const template = await this.prisma.notificationTemplate.update({
      where: { id },
      data: {
        ...(dto.subject !== undefined ? { subject: dto.subject } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
      },
    });
    await this.audit.record({
      userId: adminId,
      action: 'notifications.template.update',
      entity: 'NotificationTemplate',
      entityId: id,
      metadata: { key: existing.key },
    });
    return template;
  }
}
