import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

// Only these profile fields may be changed via the request/approval flow.
export const CHANGEABLE_FIELDS = ['phone', 'address', 'city', 'postalCode'] as const;

@Injectable()
export class AdminDataChangeRequestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async list(status?: string) {
    const reqs = await this.prisma.dataChangeRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(reqs.map((r) => r.userId))] } },
      select: { id: true, firstName: true, lastName: true, email: true },
    });
    const byId = new Map(users.map((u) => [u.id, u]));
    return reqs.map((r) => {
      const u = byId.get(r.userId);
      return {
        id: r.id,
        field: r.field,
        currentValue: r.currentValue,
        requestedValue: r.requestedValue,
        status: r.status,
        createdAt: r.createdAt,
        reviewedAt: r.reviewedAt,
        client: u ? { id: u.id, name: `${u.firstName} ${u.lastName}`, email: u.email } : null,
      };
    });
  }

  async approve(adminId: string, id: string) {
    const req = await this.prisma.dataChangeRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== 'PENDING') throw new BadRequestException('Request is not pending');
    if (!(CHANGEABLE_FIELDS as readonly string[]).includes(req.field)) {
      throw new BadRequestException(`Field "${req.field}" cannot be changed via this flow.`);
    }

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: req.userId }, data: { [req.field]: req.requestedValue } }),
      this.prisma.dataChangeRequest.update({ where: { id }, data: { status: 'APPROVED', reviewedById: adminId, reviewedAt: new Date() } }),
    ]);
    await this.audit.record({ userId: adminId, action: 'data-change.approve', entity: 'DataChangeRequest', entityId: id, metadata: { field: req.field } });
    return { ok: true, status: 'APPROVED' };
  }

  async reject(adminId: string, id: string, reason?: string) {
    const req = await this.prisma.dataChangeRequest.findUnique({ where: { id } });
    if (!req) throw new NotFoundException('Request not found');
    if (req.status !== 'PENDING') throw new BadRequestException('Request is not pending');
    await this.prisma.dataChangeRequest.update({ where: { id }, data: { status: 'REJECTED', reviewedById: adminId, reviewedAt: new Date() } });
    await this.audit.record({ userId: adminId, action: 'data-change.reject', entity: 'DataChangeRequest', entityId: id, metadata: { reason } });
    return { ok: true, status: 'REJECTED' };
  }
}
