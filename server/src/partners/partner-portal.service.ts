// server/src/partners/partner-portal.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { computeDelta, dayKey, emptySeries, kycStatusOf, sparkFromSeries } from '../admin/admin-dashboard.util';
import { generateTxReference } from '../common/reference';
import type { Env } from '../config/env.validation';

type Kyc = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
export interface PartnerClient { id: string; name: string; email: string; country: string | null; kyc: Kyc; createdAt: string }
export interface PartnerDashboard {
  referralCode: string;
  kpis: {
    totalReferred: { value: number; delta: number | null; spark: number[] };
    kycVerified: { value: number; spark: number[] };
    signups30d: { value: number; delta: number | null; spark: number[] };
  };
  series: { date: string; signups: number }[];
  kycDistribution: Record<Kyc, number>;
  recentReferrals: PartnerClient[];
}

export interface PartnerCommissionRow { id: string; amount: number; source: string; reference: string | null; client: string; date: string }
export interface PartnerCommissions { total: number; available: number; count: number; rows: PartnerCommissionRow[] }

const DAYS = 90;
const CLIENT_SELECT = {
  id: true, firstName: true, lastName: true, email: true, country: true, createdAt: true,
  kycProfile: { select: { identityStatus: true, addressStatus: true, selfieStatus: true } },
} as const;

@Injectable()
export class PartnerPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private kycOf(row: { kycProfile: { identityStatus: string; addressStatus: string; selfieStatus: string } | null }): Kyc {
    return row.kycProfile ? kycStatusOf(row.kycProfile) : 'NOT_SUBMITTED';
  }

  private toClient(row: any): PartnerClient {
    return { id: row.id, name: `${row.firstName} ${row.lastName}`, email: row.email, country: row.country, kyc: this.kycOf(row), createdAt: row.createdAt.toISOString() };
  }

  async dashboard(partnerId: string): Promise<PartnerDashboard> {
    const profile = await this.prisma.partnerProfile.findUnique({ where: { userId: partnerId } });
    if (!profile) throw new NotFoundException('Partner profile not found');

    const rows = await this.prisma.user.findMany({
      where: { referredByPartnerId: partnerId },
      orderBy: { createdAt: 'desc' },
      select: CLIENT_SELECT,
    });

    const now = new Date();
    const series = emptySeries(DAYS, now);
    const byDate = new Map(series.map((p) => [p.date, p]));
    for (const r of rows) {
      const point = byDate.get(dayKey(r.createdAt));
      if (point) point.signups += 1;
    }

    const half = Math.floor(DAYS / 2);
    const sum = (arr: typeof series) => arr.reduce((s, p) => s + p.signups, 0);
    const totalSpark = sparkFromSeries(series, 'signups');

    const thirty = new Date(now); thirty.setUTCDate(thirty.getUTCDate() - 30);
    const sixty = new Date(now); sixty.setUTCDate(sixty.getUTCDate() - 60);
    const signupsCurr = rows.filter((r) => r.createdAt >= thirty).length;
    const signupsPrev = rows.filter((r) => r.createdAt >= sixty && r.createdAt < thirty).length;

    const kycDistribution: Record<Kyc, number> = { NOT_SUBMITTED: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const r of rows) kycDistribution[this.kycOf(r)] += 1;

    return {
      referralCode: profile.referralCode,
      kpis: {
        totalReferred: { value: rows.length, delta: computeDelta(sum(series.slice(half)), sum(series.slice(0, half))), spark: totalSpark },
        kycVerified: { value: kycDistribution.APPROVED, spark: totalSpark },
        signups30d: { value: signupsCurr, delta: computeDelta(signupsCurr, signupsPrev), spark: series.slice(-30).map((p) => p.signups) },
      },
      series: series.map((p) => ({ date: p.date, signups: p.signups })),
      kycDistribution,
      recentReferrals: rows.slice(0, 8).map((r) => this.toClient(r)),
    };
  }

  async clients(partnerId: string): Promise<PartnerClient[]> {
    const rows = await this.prisma.user.findMany({
      where: { referredByPartnerId: partnerId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: CLIENT_SELECT,
    });
    return rows.map((r) => this.toClient(r));
  }

  /** The partner's own accrued commissions (newest first) with a running total. */
  async commissions(partnerId: string): Promise<PartnerCommissions> {
    const profile = await this.prisma.partnerProfile.findUnique({ where: { userId: partnerId } });
    if (!profile) throw new NotFoundException('Partner profile not found');

    const rows = await this.prisma.ibCommission.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const clientIds = [...new Set(rows.map((r) => r.clientId))];
    const clients = clientIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: clientIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const nameById = new Map(clients.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));

    const total = rows.reduce((s, r) => s + Number(r.amount), 0);
    // "Available" = commission not yet reserved by a payout request.
    const available = rows.filter((r) => !r.payoutId).reduce((s, r) => s + Number(r.amount), 0);
    return {
      total: Number(total.toFixed(2)),
      available: Number(available.toFixed(2)),
      count: rows.length,
      rows: rows.map((r) => ({
        id: r.id,
        amount: Number(r.amount),
        source: r.source,
        reference: r.reference,
        client: nameById.get(r.clientId) ?? '—',
        date: r.createdAt.toISOString(),
      })),
    };
  }

  /** Request a payout of all currently-available (unreserved) commission. */
  async requestPayout(partnerId: string): Promise<{ reference: string; amount: number; status: 'PENDING' }> {
    const profile = await this.prisma.partnerProfile.findUnique({ where: { userId: partnerId } });
    if (!profile) throw new NotFoundException('Partner profile not found');

    return this.prisma.$transaction(async (tx) => {
      const available = await tx.ibCommission.findMany({
        where: { partnerId, payoutId: null },
        select: { id: true, amount: true },
      });
      const total = available.reduce((s, c) => s + Number(c.amount), 0);
      if (total <= 0) {
        throw new BadRequestException('No commission is available to pay out.');
      }
      const payout = await tx.partnerPayout.create({
        data: { partnerId, amount: total.toFixed(2), reference: generateTxReference() },
      });
      // Reserve exactly the commissions we counted (consistent inside the tx).
      await tx.ibCommission.updateMany({
        where: { id: { in: available.map((c) => c.id) } },
        data: { payoutId: payout.id },
      });
      return { reference: payout.reference, amount: Number(payout.amount), status: 'PENDING' as const };
    });
  }

  async profile(partnerId: string): Promise<{ referralCode: string; referralLink: string }> {
    const profile = await this.prisma.partnerProfile.findUnique({ where: { userId: partnerId } });
    if (!profile) throw new NotFoundException('Partner profile not found');
    const origin = this.config.get('CLIENT_ORIGIN', { infer: true });
    return { referralCode: profile.referralCode, referralLink: `${origin}/register?ref=${profile.referralCode}` };
  }
}
