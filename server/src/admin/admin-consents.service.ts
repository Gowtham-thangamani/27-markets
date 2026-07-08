import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateConsentDto, UpdateConsentDto } from './consent-dto';

@Injectable()
export class AdminConsentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.consent.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  async create(adminId: string, dto: CreateConsentDto) {
    const consent = await this.prisma.consent.create({
      data: {
        label: dto.label,
        body: dto.body,
        required: dto.required ?? true,
        enabled: dto.enabled ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.record({ userId: adminId, action: 'consent.create', entity: 'Consent', entityId: consent.id, metadata: { label: consent.label } });
    return consent;
  }

  async update(adminId: string, id: string, dto: UpdateConsentDto) {
    await this.assertExists(id);
    const consent = await this.prisma.consent.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.body !== undefined ? { body: dto.body } : {}),
        ...(dto.required !== undefined ? { required: dto.required } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    await this.audit.record({ userId: adminId, action: 'consent.update', entity: 'Consent', entityId: id, metadata: { ...dto } });
    return consent;
  }

  async remove(adminId: string, id: string) {
    await this.assertExists(id);
    await this.prisma.consent.delete({ where: { id } });
    await this.audit.record({ userId: adminId, action: 'consent.delete', entity: 'Consent', entityId: id });
    return { ok: true };
  }

  private async assertExists(id: string) {
    const c = await this.prisma.consent.findUnique({ where: { id } });
    if (!c) throw new NotFoundException('Consent not found');
    return c;
  }
}
