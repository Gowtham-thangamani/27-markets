import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateKycFormDto, UpdateKycFormDto } from './kyc-form-dto';

@Injectable()
export class AdminKycFormsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.kycForm.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  async create(adminId: string, dto: CreateKycFormDto) {
    const form = await this.prisma.kycForm.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        enabled: dto.enabled ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.record({ userId: adminId, action: 'kyc.form.create', entity: 'KycForm', entityId: form.id, metadata: { name: form.name } });
    return form;
  }

  async update(adminId: string, id: string, dto: UpdateKycFormDto) {
    await this.assertExists(id);
    const form = await this.prisma.kycForm.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined ? { description: dto.description } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    await this.audit.record({ userId: adminId, action: 'kyc.form.update', entity: 'KycForm', entityId: id, metadata: { ...dto } });
    return form;
  }

  async remove(adminId: string, id: string) {
    await this.assertExists(id);
    await this.prisma.kycForm.delete({ where: { id } });
    await this.audit.record({ userId: adminId, action: 'kyc.form.delete', entity: 'KycForm', entityId: id });
    return { ok: true };
  }

  private async assertExists(id: string) {
    const f = await this.prisma.kycForm.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('KYC form not found');
    return f;
  }
}
