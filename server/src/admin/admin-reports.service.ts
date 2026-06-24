import { Injectable } from '@nestjs/common';
import {
  JournalKind,
  JournalStatus,
  LeadStatus,
  PostingDirection,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { formatMoney, toMoney } from '../ledger/money';

export interface ReportsSummary {
  deposits: string;
  withdrawals: string;
  netFlow: string;
  totalClients: number;
  funnel: Record<LeadStatus, number>;
}

@Injectable()
export class AdminReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Aggregate financials (posted) + the lead conversion funnel. */
  async summary(): Promise<ReportsSummary> {
    const [depAgg, wdAgg, leadGroups, totalClients] = await Promise.all([
      this.prisma.posting.aggregate({
        _sum: { amount: true },
        where: {
          direction: PostingDirection.CREDIT,
          ledgerAccount: { userId: { not: null } },
          journalEntry: { kind: JournalKind.DEPOSIT, status: JournalStatus.POSTED },
        },
      }),
      this.prisma.posting.aggregate({
        _sum: { amount: true },
        where: {
          direction: PostingDirection.DEBIT,
          ledgerAccount: { userId: { not: null } },
          journalEntry: { kind: JournalKind.WITHDRAWAL, status: JournalStatus.POSTED },
        },
      }),
      this.prisma.lead.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.user.count({ where: { role: UserRole.CLIENT } }),
    ]);

    const deposits = toMoney(depAgg._sum.amount ?? 0);
    const withdrawals = toMoney(wdAgg._sum.amount ?? 0);

    const funnel = Object.values(LeadStatus).reduce(
      (acc, s) => ({ ...acc, [s]: 0 }),
      {} as Record<LeadStatus, number>,
    );
    for (const g of leadGroups) funnel[g.status] = g._count._all;

    return {
      deposits: formatMoney(deposits),
      withdrawals: formatMoney(withdrawals),
      netFlow: formatMoney(deposits.minus(withdrawals)),
      totalClients,
      funnel,
    };
  }
}
