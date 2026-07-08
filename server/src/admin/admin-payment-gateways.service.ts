import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { CreatePaymentGatewayDto, UpdatePaymentGatewayDto } from './payment-gateway-dto';

@Injectable()
export class AdminPaymentGatewaysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  list() {
    return this.prisma.paymentGateway.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  async create(adminId: string, dto: CreatePaymentGatewayDto) {
    const gateway = await this.prisma.paymentGateway.create({
      data: {
        name: dto.name,
        type: dto.type,
        enabled: dto.enabled ?? true,
        instructions: dto.instructions ?? null,
        minAmount: dto.minAmount ?? 0,
        maxAmount: dto.maxAmount ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.audit.record({ userId: adminId, action: 'payments.gateway.create', entity: 'PaymentGateway', entityId: gateway.id, metadata: { name: gateway.name } });
    return gateway;
  }

  async update(adminId: string, id: string, dto: UpdatePaymentGatewayDto) {
    await this.assertExists(id);
    const gateway = await this.prisma.paymentGateway.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.enabled !== undefined ? { enabled: dto.enabled } : {}),
        ...(dto.instructions !== undefined ? { instructions: dto.instructions } : {}),
        ...(dto.minAmount !== undefined ? { minAmount: dto.minAmount } : {}),
        ...(dto.maxAmount !== undefined ? { maxAmount: dto.maxAmount } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
      },
    });
    await this.audit.record({ userId: adminId, action: 'payments.gateway.update', entity: 'PaymentGateway', entityId: id, metadata: { ...dto } });
    return gateway;
  }

  async remove(adminId: string, id: string) {
    await this.assertExists(id);
    await this.prisma.paymentGateway.delete({ where: { id } });
    await this.audit.record({ userId: adminId, action: 'payments.gateway.delete', entity: 'PaymentGateway', entityId: id });
    return { ok: true };
  }

  private async assertExists(id: string) {
    const g = await this.prisma.paymentGateway.findUnique({ where: { id } });
    if (!g) throw new NotFoundException('Payment gateway not found');
    return g;
  }
}
