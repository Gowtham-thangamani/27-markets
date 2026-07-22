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
import { simulationFooter } from '../documents/pdf-renderer';
import { renderStatement } from './partner-statement';
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
/** Volume-tier (rank) standing for a partner. */
export interface TierProgress {
  /** Are volume tiers configured at all? When false the flat rate applies. */
  tiered: boolean;
  /** Lifetime referred-deposit volume, USD. */
  volume: number;
  /** The direct rate this partner currently earns, %. */
  currentRate: number;
  /** The next tier up, or null when already at the top / no tiers. */
  next: { threshold: number; rate: number } | null;
}
export interface PartnerSettings {
  payoutMethod: PayoutMethod | null;
  payoutDetails: Record<string, string> | null;
  rates: { direct: number; indirect: number };
  tierProgress: TierProgress;
}
export interface PartnerClientDetail extends PartnerClient {
  deposits: { amount: number; reference: string | null; date: string }[];
  commissions: { amount: number; level: number; date: string; status: CommissionStatus }[];
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
   * Full detail for one referred client: profile, trading accounts, deposit
   * history, and the commission that client has generated for this partner.
   * Scoped to the partner's own referrals.
   */
  async clientDetail(partnerId: string, clientId: string): Promise<PartnerClientDetail> {
    const u = await this.prisma.user.findFirst({
      where: { id: clientId, referredByPartnerId: partnerId },
      select: {
        ...CLIENT_LIST_SELECT,
        ledgerAccounts: { select: { id: true } },
      },
    });
    if (!u) throw new NotFoundException('Client not found');

    const ledgerIds = u.ledgerAccounts.map((a) => a.id);
    const [depositRows, commissionRows] = await Promise.all([
      ledgerIds.length
        ? this.prisma.posting.findMany({
            where: {
              ledgerAccountId: { in: ledgerIds },
              direction: PostingDirection.CREDIT,
              journalEntry: { kind: JournalKind.DEPOSIT, status: JournalStatus.POSTED },
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: { amount: true, createdAt: true, journalEntry: { select: { reference: true } } },
          })
        : Promise.resolve([]),
      this.prisma.ibCommission.findMany({
        where: { partnerId, clientId },
        orderBy: { createdAt: 'desc' },
        take: 100,
        include: { payout: { select: { status: true } } },
      }),
    ]);

    const base = {
      ...this.toClient(u),
      phone: u.phone,
      campaign: u.campaignCode,
      accounts: u.tradingAccounts.map((a) => ({ type: a.type, mode: a.mode, status: a.status })),
      canTrade:
        u.status === UserStatus.ACTIVE &&
        u.tradingAccounts.some((a) => a.mode === AccountMode.LIVE && a.status === AccountStatus.ACTIVE),
      conversionStatus: u.conversionStatus,
      convertedAt: u.convertedAt?.toISOString() ?? null,
      salesAgent: u.assignedAgent ? `${u.assignedAgent.firstName} ${u.assignedAgent.lastName}` : null,
      totalDeposits: Number(depositRows.reduce((s, d) => s + Number(d.amount), 0).toFixed(2)),
      lastLoginAt: (await this.lastLogins([clientId])).get(clientId)?.toISOString() ?? null,
    };

    return {
      ...base,
      deposits: depositRows.map((d) => ({
        amount: Number(d.amount),
        reference: d.journalEntry?.reference ?? null,
        date: d.createdAt.toISOString(),
      })),
      commissions: commissionRows.map((c) => ({
        amount: Number(c.amount),
        level: c.level,
        date: c.createdAt.toISOString(),
        status: !c.payoutId ? 'AVAILABLE' : c.payout?.status === 'PAID' ? 'PAID' : 'IN_REVIEW',
      })),
    };
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

  /**
   * A partner's commission statement as a PDF buffer, over an optional date
   * range. Reuses the commissions aggregation, so the numbers match the portal.
   */
  async statementPdf(partnerId: string, range?: { from?: string; to?: string }): Promise<{ buffer: Buffer; filename: string }> {
    const [profile, data] = await Promise.all([
      this.prisma.partnerProfile.findUnique({
        where: { userId: partnerId },
        select: { referralCode: true, user: { select: { firstName: true, lastName: true } } },
      }),
      this.commissions(partnerId, range),
    ]);
    if (!profile) throw new NotFoundException('Partner profile not found');

    const periodLabel = range?.from || range?.to
      ? `${range?.from ?? 'start'} to ${range?.to ?? 'today'}`
      : 'All time';

    const buffer = await renderStatement({
      partnerName: `${profile.user.firstName} ${profile.user.lastName}`,
      referralCode: profile.referralCode,
      periodLabel,
      generatedAt: new Date(),
      rows: data.rows.map((r) => ({ date: r.date, client: r.client, level: r.level, amount: r.amount })),
      totals: { total: data.total, direct: data.direct, indirect: data.indirect, paid: data.paid, available: data.available },
      footerNote: simulationFooter(this.config.get('TRADING_MODE', { infer: true } as never)),
    });
    return { buffer, filename: `27markets-commission-statement-${new Date().toISOString().slice(0, 10)}.pdf` };
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
    const rates = await this.rates();
    return {
      payoutMethod: profile.payoutMethod,
      payoutDetails: (profile.payoutDetails as Record<string, string> | null) ?? null,
      rates,
      tierProgress: await this.tierProgress(partnerId, rates.direct),
    };
  }

  /**
   * The partner's rank in the volume-tier program: their lifetime referred
   * volume, the direct rate it currently earns, and the next tier (if any).
   * When no tiers are configured, `tiered` is false and the flat rate applies.
   */
  private async tierProgress(partnerId: string, flatRate: number): Promise<TierProgress> {
    const setting = await this.prisma.appSetting.findUnique({ where: { key: 'ib_commission_tiers' } });
    let tiers: { minVolume: number; pct: number }[] = [];
    try {
      const parsed = setting?.value ? JSON.parse(setting.value) : [];
      if (Array.isArray(parsed)) {
        tiers = parsed
          .map((t) => ({ minVolume: Number(t?.minVolume), pct: Number(t?.pct) }))
          .filter((t) => Number.isFinite(t.minVolume) && t.minVolume >= 0 && Number.isFinite(t.pct) && t.pct > 0)
          .sort((a, b) => a.minVolume - b.minVolume);
      }
    } catch {
      tiers = [];
    }
    if (!tiers.length) return { tiered: false, volume: 0, currentRate: flatRate, next: null };

    const volume = await this.referredVolume(partnerId);
    let currentRate = flatRate;
    let next: TierProgress['next'] = null;
    for (const t of tiers) {
      if (volume >= t.minVolume) currentRate = t.pct;
      else {
        next = { threshold: t.minVolume, rate: t.pct };
        break;
      }
    }
    return { tiered: true, volume: Number(volume.toFixed(2)), currentRate, next };
  }

  /** Lifetime posted-deposit volume across a partner's referred clients. */
  private async referredVolume(partnerId: string): Promise<number> {
    const clients = await this.prisma.user.findMany({ where: { referredByPartnerId: partnerId }, select: { id: true } });
    if (!clients.length) return 0;
    const accounts = await this.prisma.ledgerAccount.findMany({
      where: { userId: { in: clients.map((c) => c.id) } },
      select: { id: true },
    });
    if (!accounts.length) return 0;
    const agg = await this.prisma.posting.aggregate({
      _sum: { amount: true },
      where: {
        ledgerAccountId: { in: accounts.map((a) => a.id) },
        direction: PostingDirection.CREDIT,
        journalEntry: { kind: JournalKind.DEPOSIT, status: JournalStatus.POSTED },
      },
    });
    return Number(agg._sum.amount ?? 0);
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

  /**
   * The clients of one of this partner's direct sub-IBs. Scoped twice: the sub
   * must be in the caller's downline, and only that sub's clients are returned.
   */
  async subPartnerClients(partnerId: string, subId: string): Promise<{ subPartner: { id: string; name: string }; clients: PartnerClientSummary[] }> {
    const sub = await this.prisma.partnerProfile.findFirst({
      where: { userId: subId, parentPartnerId: partnerId },
      select: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
    if (!sub) throw new NotFoundException('Sub-partner not found');

    const rows = await this.prisma.user.findMany({
      where: { referredByPartnerId: subId },
      orderBy: { createdAt: 'desc' },
      take: CLIENT_LIST_LIMIT,
      select: CLIENT_SELECT,
    });
    return {
      subPartner: { id: sub.user.id, name: `${sub.user.firstName} ${sub.user.lastName}` },
      clients: rows.map((r) => this.toClient(r)),
    };
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
      // Claim FIRST, then count. The reservation is `updateMany ... payoutId:null`,
      // which is the atomic step: two concurrent payout requests serialise on
      // these rows, and the loser re-evaluates `payoutId IS NULL` after the first
      // commits — matching nothing. Reading available rows up front and then
      // reserving them by id would instead let both requests claim the same
      // commissions and mint two full-value payouts. So create a payout shell,
      // claim everything unreserved into it, then set its amount to exactly what
      // it actually captured.
      const payout = await tx.partnerPayout.create({
        data: { partnerId, amount: '0', reference: generateTxReference() },
      });
      await tx.ibCommission.updateMany({
        where: { partnerId, payoutId: null },
        data: { payoutId: payout.id },
      });
      const reserved = await tx.ibCommission.aggregate({
        _sum: { amount: true },
        where: { payoutId: payout.id },
      });
      const total = Number(reserved._sum.amount ?? 0);
      if (total <= 0) {
        // Nothing was available — roll the whole tx back (the shell payout too).
        throw new BadRequestException('No commission is available to pay out.');
      }
      const updated = await tx.partnerPayout.update({
        where: { id: payout.id },
        data: { amount: total.toFixed(2) },
      });
      return { reference: updated.reference, amount: Number(updated.amount), status: 'PENDING' as const };
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
