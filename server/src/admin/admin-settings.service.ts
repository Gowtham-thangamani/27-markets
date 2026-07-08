import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { UpdateSettingsDto } from './settings-dto';

@Injectable()
export class AdminSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.appSetting.findMany({ orderBy: [{ group: 'asc' }, { sortOrder: 'asc' }] });
  }

  async update(adminId: string, dto: UpdateSettingsDto) {
    // updateMany is a no-op for unknown keys, so bad keys can't error the batch.
    await this.prisma.$transaction(
      dto.updates.map((u) => this.prisma.appSetting.updateMany({ where: { key: u.key }, data: { value: u.value } })),
    );
    await this.audit.record({
      userId: adminId,
      action: 'settings.update',
      entity: 'AppSetting',
      metadata: { keys: dto.updates.map((u) => u.key) },
    });
    return this.list();
  }
}
