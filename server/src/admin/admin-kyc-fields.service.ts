import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreateKycFieldDto, UpdateKycFieldDto } from './kyc-field-dto';

@Injectable()
export class AdminKycFieldsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(kind?: string) {
    return this.prisma.kycFieldDefinition.findMany({
      where: kind ? { kind } : undefined,
      orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(adminId: string, dto: CreateKycFieldDto) {
    const field = await this.prisma.kycFieldDefinition.create({
      data: {
        kind: dto.kind,
        label: dto.label,
        fieldType: dto.fieldType ?? 'TEXT',
        required: dto.required ?? false,
        enabled: dto.enabled ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.record({ userId: adminId, action: 'kyc.field.create', entity: 'KycFieldDefinition', entityId: field.id, metadata: { kind: field.kind, label: field.label } });
    return field;
  }

  async update(adminId: string, id: string, dto: UpdateKycFieldDto) {
    await this.assertExists(id);
    const field = await this.prisma.kycFieldDefinition.update({
      where: { id },
      data: {
        ...(dto.label !== undefined ? { label: dto.label } : {}),
        ...(dto.fieldType !== undefined ? { fieldType: dto.fieldType } : {}),
        ...(dto.required !== undefined ? { required: dto.required } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    await this.audit.record({ userId: adminId, action: 'kyc.field.update', entity: 'KycFieldDefinition', entityId: id, metadata: { ...dto } });
    return field;
  }

  async remove(adminId: string, id: string) {
    await this.assertExists(id);
    await this.prisma.kycFieldDefinition.delete({ where: { id } });
    await this.audit.record({ userId: adminId, action: 'kyc.field.delete', entity: 'KycFieldDefinition', entityId: id });
    return { ok: true };
  }

  private async assertExists(id: string) {
    const f = await this.prisma.kycFieldDefinition.findUnique({ where: { id } });
    if (!f) throw new NotFoundException('KYC field not found');
    return f;
  }
}
