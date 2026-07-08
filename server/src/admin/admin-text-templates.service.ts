import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateTextTemplateDto, UpdateTextTemplateDto } from './text-template-dto';

@Injectable()
export class AdminTextTemplatesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(kind?: string) {
    return this.prisma.textTemplate.findMany({
      where: kind ? { kind } : undefined,
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(adminId: string, dto: CreateTextTemplateDto) {
    const tpl = await this.prisma.textTemplate.create({
      data: {
        kind: dto.kind,
        name: dto.name,
        body: dto.body,
        enabled: dto.enabled ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.record({ userId: adminId, action: 'templates.text.create', entity: 'TextTemplate', entityId: tpl.id, metadata: { kind: tpl.kind, name: tpl.name } });
    return tpl;
  }

  async update(adminId: string, id: string, dto: UpdateTextTemplateDto) {
    await this.assertExists(id);
    const tpl = await this.prisma.textTemplate.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    await this.audit.record({ userId: adminId, action: 'templates.text.update', entity: 'TextTemplate', entityId: id, metadata: { ...dto } });
    return tpl;
  }

  async remove(adminId: string, id: string) {
    await this.assertExists(id);
    await this.prisma.textTemplate.delete({ where: { id } });
    await this.audit.record({ userId: adminId, action: 'templates.text.delete', entity: 'TextTemplate', entityId: id });
    return { ok: true };
  }

  private async assertExists(id: string) {
    const t = await this.prisma.textTemplate.findUnique({ where: { id } });
    if (!t) throw new NotFoundException('Template not found');
    return t;
  }
}
