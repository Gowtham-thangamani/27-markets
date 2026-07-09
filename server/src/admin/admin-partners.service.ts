import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminPartnersService {
  constructor(private readonly prisma: PrismaService) {}

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
}
