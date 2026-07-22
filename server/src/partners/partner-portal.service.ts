// server/src/partners/partner-portal.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AccountMode, AccountStatus, AccountType, JournalKind, JournalStatus, PartnerPayoutStatus,
  PayoutMethod, PostingDirection, UserStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { computeDelta, dayKey, emptySeries, kycStatusOf, sparkFromSeries } from '../admin/admin-dashboard.util';
import { generateTxReference } from '../common/reference';
import { primaryOrigin } from '../common/origin';
import type { Env } from '../config/env.validation';

type Kyc = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';
export interface PartnerClientAccount { type: AccountType; mode: AccountMode; status: AccountStatus }
/** What the dashboard's "recent referrals" strip needs. */
export interface PartnerClientSummary { id: string; name: string; email: string; country: string | null; kyc: Kyc; createdAt: string }
export type ConversionStatusT = 'NO_ANSWER' | 'ON_BOARDING' | 'CONVERTED' | 'NOT_INTERESTED';
/** The full clients-list row, which also carries accounts, CRM state and financials. */
export interface PartnerClient extends PartnerClientSummary {
  phone: string | null;
  campaign: string | null;
  accounts: PartnerClientAccount[];
  canTrade: boolean;
  conversionStatus: ConversionStatusT;
  convertedAt: string | null;
  salesAgent: string | null;
  /** Lifetime posted deposits, USD. */
  totalDeposits: number;
  lastLoginAt: string | null;
}
export interface PartnerDashboard {
  referralCode: string;
  kpis: {
    totalReferred: { value: number; delta: number | null; spark: number[] };
    kycVerified: { value: number; spark: number[] };
    signups30d: { value: number; delta: number | null; spark: number[] };
  };
  series: { date: string; signups: number }[];
  kycDistribution: Record<Kyc, number>;
  recentReferrals: PartnerClientSummary[];
}

export interface PartnerPayoutRow {
  id: string; reference: string; amount: number; status: PartnerPayoutStatus;
  commissionCount: number; requestedAt: string; reviewedAt: string | null;
}
/** A direct sub-IB, with what their downline has earned *this* partner. */
export interface SubPartner {
  id: string; name: string; email: string; country: string | null; referralCode: string;
  clients: number; commissionEarned: number; joinedAt: string;
}
export interface PartnerSettings {
  payoutMethod: PayoutMethod | null;
  payoutDetails: Record<string, string> | null;
  rates: { direct: number; indirect: number };
}

export type CommissionStatus = 'AVAILABLE' | 'IN_REVIEW' | 'PAID'
export interface PartnerCommissionRow { id: string; amount: number; source: string; reference: string | null; client: string; date: string; status: CommissionStatus; level: number }
/** `direct` is level-1 earnings, `indirect` is everything earned via sub-partners. */
export interface PartnerCommissions { total: number; available: number; paid: number; count: number; direct: number; indirect: number; rates: { direct: number; indirect: number }; rows: PartnerCommissionRow[] }

const DAYS = 90;
const CLIENT_SELECT = {
  id: true, firstName: true, lastName: true, email: true, country: true, createdAt: true,
  kycProfile: { select: { identityStatus: true, addressStatus: true, selfieStatus: true } },
} as const;

/**
 * The clients *list* needs more per row than the dashboard's summary cards do.
 * Kept separate so the dashboard query stays as narrow as it was.
 */
const CLIENT_LIST_SELECT = {
  ...CLIENT_SELECT,
  phone: true,
  status: true,
  conversionStatus: true,
  convertedAt: true,
  campaignCode: true,
  tradingAccounts: { select: { type: true, mode: true, status: true } },
  assignedAgent: { select: { firstName: true, lastName: true } },
} as const;

/** How many clients the list returns; also bounds the aggregate queries below. */
const CLIENT_LIST_LIMIT = 200;

@Injectable()
export class PartnerPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  private kycOf(row: { kycProfile: { identityStatus: string; addressStatus: string; selfieStatus: string } | null }): Kyc {
    return row.kycProfile ? kycStatusOf(row.kycProfile) : 'NOT_SUBMITTED';
  }

  private toClient(row: any): PartnerClientSummary {
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
      take: CLIENT_LIST_LIMIT,
      select: CLIENT_LIST_SELECT,
    });
    if (!rows.length) return [];

    const ids = rows.map((r) => r.id);
    const [depositsByUser, lastLoginByUser] = await Promise.all([
      this.depositTotals(ids),
      this.lastLogins(ids),
    ]);

    return rows.map((r) => ({
      ...this.toClient(r),
      phone: r.phone,
      campaign: r.campaignCode,
      accounts: r.tradingAccounts.map((a) => ({ type: a.type, mode: a.mode, status: a.status })),
      // No dedicated trading lock exists: a client can trade when neither the
      // account nor the user is suspended/closed.
      canTrade:
        r.status === UserStatus.ACTIVE &&
        r.tradingAccounts.some((a) => a.mode === AccountMode.LIVE && a.status === AccountStatus.ACTIVE),
      conversionStatus: r.conversionStatus,
      convertedAt: r.convertedAt?.toISOString() ?? null,
      salesAgent: r.assignedAgent ? `${r.assignedAgent.firstName} ${r.assignedAgent.lastName}` : null,
      totalDeposits: depositsByUser.get(r.id) ?? 0,
      lastLoginAt: lastLoginByUser.get(r.id)?.toISOString() ?? null,
    }));
  }

  /**
   * Update a referred client's conversion status from the IB portal. Scoped to
   * the partner's own referrals — a partner can only touch clients they own.
   * Stamps convertedAt the first time the status reaches CONVERTED.
   */
  async setConversionStatus(partnerId: string, clientId: string, status: ConversionStatusT): Promise<{ ok: true }> {
    const client = await this.prisma.user.findFirst({
      where: { id: clientId, referredByPartnerId: partnerId },
      select: { id: true, convertedAt: true },
    });
    if (!client) throw new NotFoundException('Client not found');

    await this.prisma.user.update({
      where: { id: clientId },
      data: {
        conversionStatus: status,
        ...(status === 'CONVERTED' && !client.convertedAt ? { convertedAt: new Date() } : {}),
      },
    });
    return { ok: true };
  }

  /**
   * Lifetime deposits per client, from the ledger rather than DepositRequest —
   * card deposits post straight through the PSP webhook and never create a
   * request row, so the request table would silently under-report.
   */
  private async depositTotals(userIds: string[]): Promise<Map<string, number>> {
    const accounts = await this.prisma.ledgerAccount.findMany({
      where: { userId: { in: userIds } },
      select: { id: true, userId: true },
    });
    if (!accounts.length) return new Map();

    const groups = await this.prisma.posting.groupBy({
      by: ['ledgerAccountId'],
      _sum: { amount: true },
      where: {
        ledgerAccountId: { in: accounts.map((a) => a.id) },
        direction: PostingDirection.CREDIT,
        journalEntry: { kind: JournalKind.DEPOSIT, status: JournalStatus.POSTED },
      },
    });

    const userByAccount = new Map(accounts.map((a) => [a.id, a.userId]));
    const totals = new Map<string, number>();
    for (const g of groups) {
      const userId = userByAccount.get(g.ledgerAccountId);
      if (!userId) continue;
      totals.set(userId, Number(((totals.get(userId) ?? 0) + Number(g._sum.amount ?? 0)).toFixed(2)));
    }
    return totals;
  }

  /** Last successful sign-in per client, from the audit trail. */
  private async lastLogins(userIds: string[]): Promise<Map<string, Date>> {
    const groups = await this.prisma.auditLog.groupBy({
      by: ['userId'],
      _max: { createdAt: true },
      where: { userId: { in: userIds }, action: 'auth.login' },
    });
    return new Map(
      groups.flatMap((g) => (g.userId && g._max.createdAt ? [[g.userId, g._max.createdAt] as const] : [])),
    );
  }

  /**
   * The partner's own accrued commissions (newest first) with a running total.
   * Optional inclusive `from`/`to` (ISO dates) bound the range for statements.
   */
  async commissions(partnerId: string, range?: { from?: string; to?: string }): Promise<PartnerCommissions> {
    const profile = await this.prisma.partnerProfile.findUnique({ where: { userId: partnerId } });
    if (!profile) throw new NotFoundException('Partner profile not found');

    const createdAt = this.dateRange(range);
    const [rows, rates] = await Promise.all([
      this.prisma.ibCommission.findMany({
        where: { partnerId, ...(createdAt ? { createdAt } : {}) },
        orderBy: { createdAt: 'desc' },
        take: 1000,
        include: { payout: { select: { status: true } } },
      }),
      this.rates(),
    ]);
    const clientIds = [...new Set(rows.map((r) => r.clientId))];
    const clients = clientIds.length
      ? await this.prisma.user.findMany({ where: { id: { in: clientIds } }, select: { id: true, firstName: true, lastName: true } })
      : [];
    const nameById = new Map(clients.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));

    // Per-commission status: no payout → available; reserved by a paid payout →
    // paid; reserved by a still-pending payout → in review.
    const statusOf = (r: (typeof rows)[number]): CommissionStatus =>
      !r.payoutId ? 'AVAILABLE' : r.payout?.status === 'PAID' ? 'PAID' : 'IN_REVIEW';

    const sumWhere = (pred: (r: (typeof rows)[number]) => boolean) =>
      Number(rows.filter(pred).reduce((s, r) => s + Number(r.amount), 0).toFixed(2));

    return {
      total: sumWhere(() => true),
      available: sumWhere((r) => statusOf(r) === 'AVAILABLE'),
      paid: sumWhere((r) => statusOf(r) === 'PAID'),
      count: rows.length,
      direct: sumWhere((r) => r.level === 1),
      indirect: sumWhere((r) => r.level > 1),
      rates,
      rows: rows.map((r) => ({
        id: r.id,
        amount: Number(r.amount),
        source: r.source,
        reference: r.reference,
        client: nameById.get(r.clientId) ?? '—',
        date: r.createdAt.toISOString(),
        status: statusOf(r),
        level: r.level,
      })),
    };
  }

  /** Build a Prisma createdAt filter from optional inclusive ISO from/to. */
  private dateRange(range?: { from?: string; to?: string }): { gte?: Date; lte?: Date } | null {
    if (!range?.from && !range?.to) return null;
    const filter: { gte?: Date; lte?: Date } = {};
    if (range.from) {
      const d = new Date(range.from);
      if (!isNaN(d.getTime())) filter.gte = d;
    }
    if (range.to) {
      const d = new Date(range.to);
      // Inclusive of the whole `to` day.
      if (!isNaN(d.getTime())) filter.lte = new Date(d.getTime() + 24 * 60 * 60 * 1000 - 1);
    }
    return Object.keys(filter).length ? filter : null;
  }

  /** The partner's payout requests, newest first, so they can track the money. */
  async payouts(partnerId: string): Promise<PartnerPayoutRow[]> {
    const rows = await this.prisma.partnerPayout.findMany({
      where: { partnerId },
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: { _count: { select: { commissions: true } } },
    });
    return rows.map((p) => ({
      id: p.id,
      reference: p.reference,
      amount: Number(p.amount),
      status: p.status,
      commissionCount: p._count.commissions,
      requestedAt: p.createdAt.toISOString(),
      reviewedAt: p.reviewedAt?.toISOString() ?? null,
    }));
  }

  /**
   * The partner's direct sub-IBs, with what each has actually earned them.
   *
   * `commissionEarned` is this partner's own indirect (level > 1) commission
   * attributable to clients the sub-partner referred — i.e. what the downline
   * is worth to them, not what the sub-partner themselves earned.
   */
  async subPartners(partnerId: string): Promise<SubPartner[]> {
    const profiles = await this.prisma.partnerProfile.findMany({
      where: { parentPartnerId: partnerId },
      orderBy: { createdAt: 'desc' },
      take: 200,
      select: {
        referralCode: true,
        createdAt: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true, country: true } },
      },
    });
    if (!profiles.length) return [];

    const subIds = profiles.map((p) => p.user.id);
    const [clientCounts, indirect] = await Promise.all([
      this.prisma.user.groupBy({
        by: ['referredByPartnerId'],
        _count: { _all: true },
        where: { referredByPartnerId: { in: subIds } },
      }),
      // IbCommission.clientId has no relation, so fetch the rows and resolve the
      // referrer separately below.
      this.prisma.ibCommission.findMany({
        where: { partnerId, level: { gt: 1 } },
        select: { amount: true, clientId: true },
      }),
    ]);

    const clientsBySub = new Map(clientCounts.map((c) => [c.referredByPartnerId, c._count._all]));
    const earnedBySub = new Map<string, number>();
    if (indirect.length) {
      const referrers = await this.prisma.user.findMany({
        where: { id: { in: [...new Set(indirect.map((r) => r.clientId))] } },
        select: { id: true, referredByPartnerId: true },
      });
      const subByClient = new Map(referrers.map((u) => [u.id, u.referredByPartnerId]));
      for (const row of indirect) {
        const sub = subByClient.get(row.clientId);
        if (!sub) continue;
        earnedBySub.set(sub, (earnedBySub.get(sub) ?? 0) + Number(row.amount));
      }
    }

    return profiles.map((p) => ({
      id: p.user.id,
      name: `${p.user.firstName} ${p.user.lastName}`,
      email: p.user.email,
      country: p.user.country,
      referralCode: p.referralCode,
      clients: clientsBySub.get(p.user.id) ?? 0,
      commissionEarned: Number((earnedBySub.get(p.user.id) ?? 0).toFixed(2)),
      joinedAt: p.createdAt.toISOString(),
    }));
  }

  /** Commission rates this partner earns, read from the global settings. */
  private async rates(): Promise<{ direct: number; indirect: number }> {
    const settings = await this.prisma.appSetting.findMany({
      where: { key: { in: ['ib_commission_pct', 'ib_commission_pct_l2'] } },
      select: { key: true, value: true },
    });
    const byKey = new Map(settings.map((s) => [s.key, Number(s.value) || 0]));
    return { direct: byKey.get('ib_commission_pct') ?? 0, indirect: byKey.get('ib_commission_pct_l2') ?? 0 };
  }

  /** Partner settings: payout destination + the commission rates they earn. */
  async settings(partnerId: string): Promise<PartnerSettings> {
    const profile = await this.prisma.partnerProfile.findUnique({ where: { userId: partnerId } });
    if (!profile) throw new NotFoundException('Partner profile not found');
    return {
      payoutMethod: profile.payoutMethod,
      payoutDetails: (profile.payoutDetails as Record<string, string> | null) ?? null,
      rates: await this.rates(),
    };
  }

  /** Save the partner's payout destination. */
  async updatePayoutMethod(partnerId: string, method: PayoutMethod, details: Record<string, string>): Promise<{ ok: true }> {
    const profile = await this.prisma.partnerProfile.findUnique({ where: { userId: partnerId }, select: { id: true } });
    if (!profile) throw new NotFoundException('Partner profile not found');

    // Whitelist the fields we render, so the JSON column can't be used as
    // arbitrary storage. Values are trimmed and length-bounded.
    const allowed = method === PayoutMethod.BANK
      ? ['accountName', 'bankName', 'iban', 'swift']
      : ['network', 'address'];
    const clean: Record<string, string> = {};
    for (const key of allowed) {
      const v = details?.[key];
      if (typeof v === 'string' && v.trim()) clean[key] = v.trim().slice(0, 120);
    }
    if (!Object.keys(clean).length) {
      throw new BadRequestException('Provide the payout details for the selected method.');
    }

    await this.prisma.partnerProfile.update({
      where: { userId: partnerId },
      data: { payoutMethod: method, payoutDetails: clean },
    });
    return { ok: true };
  }

  /** Request a payout of all currently-available (unreserved) commission. */
  async requestPayout(partnerId: string): Promise<{ reference: string; amount: number; status: 'PENDING' }> {
    const profile = await this.prisma.partnerProfile.findUnique({ where: { userId: partnerId } });
    if (!profile) throw new NotFoundException('Partner profile not found');
    // Never create a payout with nowhere to send it — finance can't action it.
    if (!profile.payoutMethod) {
      throw new BadRequestException('Add a payout method in Settings before requesting a payout.');
    }

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

  async profile(partnerId: string): Promise<{ referralCode: string; referralLink: string; partnerLink: string }> {
    const profile = await this.prisma.partnerProfile.findUnique({ where: { userId: partnerId } });
    if (!profile) throw new NotFoundException('Partner profile not found');
    const origin = primaryOrigin(this.config.get('CLIENT_ORIGIN', { infer: true }));
    return {
      referralCode: profile.referralCode,
      // Clients sign up; sub-partners apply and are credited to this partner as
      // their upline once an admin approves the application.
      referralLink: `${origin}/register?ref=${profile.referralCode}`,
      partnerLink: `${origin}/partner/apply?ref=${profile.referralCode}`,
    };
  }
}
