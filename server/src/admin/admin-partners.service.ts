import { BadRequestException, Injectable } from '@nestjs/common';
import { PartnerPayoutStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

@Injectable()
export class AdminPartnersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Partner list with referral code, referral count, and total IB commission earned. */
  async listPartners() {
    const partners = await this.prisma.user.findMany({
      where: { role: UserRole.PARTNER },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        id: true, firstName: true, lastName: true, email: true, country: true, status: true, createdAt: true,
        partnerProfile: { select: { referralCode: true } },
        _count: { select: { referredClients: true } },
      },
    });

    const totals = await this.prisma.ibCommission.groupBy({
      by: ['partnerId'],
      where: { partnerId: { in: partners.map((p) => p.id) } },
      _sum: { amount: true },
    });
    const byId = new Map(totals.map((t) => [t.partnerId, Number(t._sum.amount ?? 0)]));

    return partners.map((p) => ({
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      email: p.email,
      country: p.country,
      status: p.status,
      createdAt: p.createdAt,
      referralCode: p.partnerProfile?.referralCode ?? null,
      referredCount: p._count.referredClients,
      commissionTotal: byId.get(p.id) ?? 0,
    }));
  }

  /** A partner's commission entries (most recent first). */
  async partnerCommissions(partnerId: string) {
    const rows = await this.prisma.ibCommission.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const clientIds = [...new Set(rows.map((r) => r.clientId))];
    const clients = await this.prisma.user.findMany({
      where: { id: { in: clientIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const byId = new Map(clients.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));
    return rows.map((r) => ({
      id: r.id,
      client: byId.get(r.clientId) ?? '(unknown)',
      amount: Number(r.amount),
      source: r.source,
      reference: r.reference,
      createdAt: r.createdAt,
    }));
  }

  /** Partner payout requests, filtered by status (default PENDING), newest first. */
  async listPartnerPayouts(status: PartnerPayoutStatus = PartnerPayoutStatus.PENDING) {
    const rows = await this.prisma.partnerPayout.findMany({ where: { status }, orderBy: { createdAt: 'desc' }, take: 200 });
    const partnerIds = [...new Set(rows.map((r) => r.partnerId))];
    const partners = partnerIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: partnerIds } }, select: { id: true, firstName: true, lastName: true, email: true } })
      : [];
    const byId = new Map(partners.map((p) => [p.id, { name: `${p.firstName} ${p.lastName}`, email: p.email }]));
    return rows.map((r) => ({
      id: r.id,
      reference: r.reference,
      amount: Number(r.amount),
      status: r.status,
      createdAt: r.createdAt,
      partner: byId.get(r.partnerId) ?? null,
    }));
  }

  /** Mark a pending payout PAID. Atomic claim so it can't be double-approved. */
  async approvePartnerPayout(adminId: string, id: string) {
    const claimed = await this.prisma.partnerPayout.updateMany({
      where: { id, status: PartnerPayoutStatus.PENDING },
      data: { status: PartnerPayoutStatus.PAID, reviewedById: adminId, reviewedAt: new Date() },
    });
    if (claimed.count === 0) throw new BadRequestException('Payout is not pending.');
    await this.audit.record({ userId: adminId, action: 'partner.payout.approve', entity: 'PartnerPayout', entityId: id });
    return { ok: true as const, status: PartnerPayoutStatus.PAID };
  }

  /** Reject a pending payout and release its reserved commissions back to available. */
  async rejectPartnerPayout(adminId: string, id: string, reason?: string) {
    const payout = await this.prisma.partnerPayout.findUnique({ where: { id } });
    if (!payout || payout.status !== PartnerPayoutStatus.PENDING) throw new BadRequestException('Payout is not pending.');
    await this.prisma.$transaction(async (tx) => {
      await tx.partnerPayout.update({ where: { id }, data: { status: PartnerPayoutStatus.REJECTED, reviewedById: adminId, reviewedAt: new Date() } });
      await tx.ibCommission.updateMany({ where: { payoutId: id }, data: { payoutId: null } });
    });
    await this.audit.record({ userId: adminId, action: 'partner.payout.reject', entity: 'PartnerPayout', entityId: id, metadata: { reason } });
    return { ok: true as const, status: PartnerPayoutStatus.REJECTED };
  }
}
