import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreatePaymentMethodTypeDto, UpdatePaymentMethodTypeDto } from './payment-method-type-dto';

@Injectable()
export class AdminPaymentMethodTypesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list(category?: string) {
    return this.prisma.paymentMethodType.findMany({
      where: category ? { category } : undefined,
      orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(adminId: string, dto: CreatePaymentMethodTypeDto) {
    const item = await this.prisma.paymentMethodType.create({
      data: {
        category: dto.category,
        name: dto.name,
        enabled: dto.enabled ?? true,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.record({ userId: adminId, action: 'payments.method-type.create', entity: 'PaymentMethodType', entityId: item.id, metadata: { category: item.category, name: item.name } });
    return item;
  }

  async update(adminId: string, id: string, dto: UpdatePaymentMethodTypeDto) {
    await this.assertExists(id);
    const item = await this.prisma.paymentMethodType.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    await this.audit.record({ userId: adminId, action: 'payments.method-type.update', entity: 'PaymentMethodType', entityId: id, metadata: { ...dto } });
    return item;
  }

  async remove(adminId: string, id: string) {
    await this.assertExists(id);
    await this.prisma.paymentMethodType.delete({ where: { id } });
    await this.audit.record({ userId: adminId, action: 'payments.method-type.delete', entity: 'PaymentMethodType', entityId: id });
    return { ok: true };
  }

  private async assertExists(id: string) {
    const item = await this.prisma.paymentMethodType.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('Payment method type not found');
    return item;
  }
}
