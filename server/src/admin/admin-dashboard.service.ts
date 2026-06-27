import { Injectable } from '@nestjs/common';
import {
  JournalKind,
  JournalStatus,
  KycStepStatus,
  LeadStatus,
  PostingDirection,
  TicketStatus,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { formatMoney, toMoney } from '../ledger/money';
import {
  emptySeries,
  computeDelta,
  sparkFromSeries,
  dayKey,
  kycStatusOf,
  type DailyPoint,
} from './admin-dashboard.util';

export interface KpiTrend { value: number; delta: number | null; spark: number[] }
export interface KpiCount { value: number; spark: number[] }
export interface AdminDashboard {
  kpis: {
    totalClients: KpiTrend;
    netFlow: { value: string; delta: number | null; spark: number[] };
    pendingKyc: KpiCount;
    pendingWithdrawals: KpiCount;
    openTickets: KpiCount;
  };
  series: DailyPoint[];
  distributions: {
    funnel: Record<LeadStatus, number>;
    kyc: Record<'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED', number>;
  };
  recentSignups: { id: string; name: string; email: string; country: string | null; createdAt: string }[];
  recentActivity: { id: string; action: string; entity: string | null; createdAt: string; actor: string | null }[];
  recentWithdrawals: { id: string; reference: string; client: string | null; amount: string; createdAt: string }[];
}

const DAYS = 90;

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(): Promise<AdminDashboard> {
    const now = new Date();
    const windowStart = new Date(now);
    windowStart.setUTCDate(windowStart.getUTCDate() - (DAYS - 1));
    windowStart.setUTCHours(0, 0, 0, 0);

    const [
      totalClients,
      pendingKyc,
      pendingWithdrawals,
      openTickets,
      leadGroups,
      kycProfiles,
      depositEntries,
      withdrawalEntries,
      newClients,
      recentSignupRows,
      recentAuditRows,
      recentWithdrawalRows,
    ] = await Promise.all([
      this.prisma.user.count({ where: { role: UserRole.CLIENT } }),
      this.prisma.kycProfile.count({
        where: {
          OR: [
            { identityStatus: KycStepStatus.PENDING },
            { addressStatus: KycStepStatus.PENDING },
            { selfieStatus: KycStepStatus.PENDING },
          ],
        },
      }),
      this.prisma.journalEntry.count({
        where: { kind: JournalKind.WITHDRAWAL, status: JournalStatus.PENDING },
      }),
      this.prisma.ticket.count({ where: { status: TicketStatus.OPEN } }),
      this.prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.kycProfile.findMany({
        select: { identityStatus: true, addressStatus: true, selfieStatus: true },
      }),
      this.prisma.journalEntry.findMany({
        where: { kind: JournalKind.DEPOSIT, status: JournalStatus.POSTED, createdAt: { gte: windowStart } },
        select: {
          createdAt: true,
          postings: { where: { ledgerAccount: { userId: { not: null } }, direction: PostingDirection.CREDIT }, select: { amount: true } },
        },
      }),
      this.prisma.journalEntry.findMany({
        where: { kind: JournalKind.WITHDRAWAL, status: JournalStatus.POSTED, createdAt: { gte: windowStart } },
        select: {
          createdAt: true,
          postings: { where: { ledgerAccount: { userId: { not: null } }, direction: PostingDirection.DEBIT }, select: { amount: true } },
        },
      }),
      this.prisma.user.findMany({
        where: { role: UserRole.CLIENT, createdAt: { gte: windowStart } },
        select: { createdAt: true },
      }),
      this.prisma.user.findMany({
        where: { role: UserRole.CLIENT },
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: { id: true, firstName: true, lastName: true, email: true, country: true, createdAt: true },
      }),
      this.prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: { user: { select: { firstName: true, lastName: true } } },
      }),
      this.prisma.journalEntry.findMany({
        where: { kind: JournalKind.WITHDRAWAL, status: JournalStatus.PENDING },
        orderBy: { createdAt: 'desc' },
        take: 8,
        include: {
          postings: {
            where: { ledgerAccount: { userId: { not: null } } },
            include: { ledgerAccount: { include: { user: { select: { firstName: true, lastName: true } } } } },
          },
        },
      }),
    ]);

    // ---- Build the daily series (zero-filled) ----
    const byDate = new Map<string, DailyPoint>();
    const series = emptySeries(DAYS, now);
    for (const p of series) byDate.set(p.date, p);

    for (const e of depositEntries) {
      const k = dayKey(e.createdAt);
      const point = byDate.get(k);
      if (point) for (const post of e.postings) point.deposits += toMoney(post.amount).toNumber();
    }
    for (const e of withdrawalEntries) {
      const k = dayKey(e.createdAt);
      const point = byDate.get(k);
      if (point) for (const post of e.postings) point.withdrawals += toMoney(post.amount).toNumber();
    }
    for (const u of newClients) {
      const point = byDate.get(dayKey(u.createdAt));
      if (point) point.signups += 1;
    }

    // ---- KPI deltas: current half-window vs previous half-window ----
    const half = Math.floor(DAYS / 2);
    const sum = (arr: DailyPoint[], key: 'deposits' | 'withdrawals' | 'signups') =>
      arr.reduce((s, p) => s + p[key], 0);
    const prev = series.slice(0, half);
    const curr = series.slice(half);

    const depTotal = sum(series, 'deposits');
    const wdTotal = sum(series, 'withdrawals');
    const netFlow = depTotal - wdTotal;
    const netPrev = sum(prev, 'deposits') - sum(prev, 'withdrawals');
    const netCurr = sum(curr, 'deposits') - sum(curr, 'withdrawals');

    // ---- Distributions ----
    const funnel = Object.values(LeadStatus).reduce(
      (acc, s) => ({ ...acc, [s]: 0 }),
      {} as Record<LeadStatus, number>,
    );
    for (const g of leadGroups) funnel[g.status] = g._count._all;

    const kyc = { NOT_SUBMITTED: 0, PENDING: 0, APPROVED: 0, REJECTED: 0 };
    for (const p of kycProfiles) kyc[kycStatusOf(p)] += 1;

    return {
      kpis: {
        totalClients: {
          value: totalClients,
          delta: computeDelta(sum(curr, 'signups'), sum(prev, 'signups')),
          spark: sparkFromSeries(series, 'signups'),
        },
        netFlow: {
          value: formatMoney(toMoney(netFlow)),
          delta: computeDelta(netCurr, netPrev),
          spark: series.slice(-14).map((p) => p.deposits - p.withdrawals),
        },
        pendingKyc: { value: pendingKyc, spark: sparkFromSeries(series, 'signups') },
        pendingWithdrawals: { value: pendingWithdrawals, spark: sparkFromSeries(series, 'withdrawals') },
        openTickets: { value: openTickets, spark: sparkFromSeries(series, 'signups') },
      },
      series,
      distributions: { funnel, kyc },
      recentSignups: recentSignupRows.map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        country: u.country,
        createdAt: u.createdAt.toISOString(),
      })),
      recentActivity: recentAuditRows.map((a) => ({
        id: a.id,
        action: a.action,
        entity: a.entity,
        createdAt: a.createdAt.toISOString(),
        actor: a.user ? `${a.user.firstName} ${a.user.lastName}` : null,
      })),
      recentWithdrawals: recentWithdrawalRows.map((e) => {
        const leg = e.postings[0];
        const u = leg?.ledgerAccount.user;
        return {
          id: e.id,
          reference: e.reference,
          client: u ? `${u.firstName} ${u.lastName}` : null,
          amount: formatMoney(leg ? toMoney(leg.amount) : toMoney(0)),
          createdAt: e.createdAt.toISOString(),
        };
      }),
    };
  }
}
