import { Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { formatMoney, toMoney } from '../ledger/money';

@Injectable()
export class AdminAccountsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
  ) {}

  /** All trading accounts across clients, with owner + derived balance. */
  async listAll() {
    const accounts = await this.prisma.tradingAccount.findMany({
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: {
        ledgerAccount: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    return Promise.all(
      accounts.map(async (a) => ({
        id: a.id,
        number: a.number,
        type: a.type,
        mode: a.mode,
        currency: a.currency,
        leverage: a.leverage,
        status: a.status,
        createdAt: a.createdAt,
        balance: formatMoney(a.ledgerAccount ? await this.ledger.balanceOf(a.ledgerAccount.id) : toMoney(0)),
        owner: { id: a.user.id, name: `${a.user.firstName} ${a.user.lastName}`, email: a.user.email },
      })),
    );
  }

  /**
   * Client trading accounts with no ledger activity (deposits/trades/withdrawals)
   * in the last `days` days — falling back to the account's creation date when it
   * has never had any activity. Derived from existing posting data (no new model).
   */
  async listDormant(days = 90) {
    const cutoff = new Date(Date.now() - days * 86_400_000);

    const accounts = await this.prisma.tradingAccount.findMany({
      take: 1000,
      include: {
        ledgerAccount: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    });

    const ledgerIds = accounts.map((a) => a.ledgerAccount?.id).filter((id): id is string => !!id);
    const lastByLedger = await this.prisma.posting.groupBy({
      by: ['ledgerAccountId'],
      where: { ledgerAccountId: { in: ledgerIds } },
      _max: { createdAt: true },
    });
    const lastMap = new Map(lastByLedger.map((g) => [g.ledgerAccountId, g._max.createdAt ?? null]));

    const dormant = [];
    for (const a of accounts) {
      const lastActivityAt = a.ledgerAccount ? lastMap.get(a.ledgerAccount.id) ?? null : null;
      const reference = lastActivityAt ?? a.createdAt;
      if (reference >= cutoff) continue; // still active within the window

      const balance = a.ledgerAccount ? await this.ledger.balanceOf(a.ledgerAccount.id) : toMoney(0);
      dormant.push({
        id: a.id,
        number: a.number,
        type: a.type,
        mode: a.mode,
        status: a.status,
        currency: a.currency,
        createdAt: a.createdAt,
        lastActivityAt,
        daysInactive: Math.floor((Date.now() - reference.getTime()) / 86_400_000),
        balance: formatMoney(balance),
        owner: { id: a.user.id, name: `${a.user.firstName} ${a.user.lastName}`, email: a.user.email },
      });
    }
    return dormant;
  }

  /** Live accounts awaiting approval (the Account Requests queue). */
  async listRequests() {
    const accounts = await this.prisma.tradingAccount.findMany({
      where: { status: AccountStatus.PENDING },
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
    });
    return accounts.map((a) => ({
      id: a.id,
      number: a.number,
      type: a.type,
      mode: a.mode,
      currency: a.currency,
      leverage: a.leverage,
      status: a.status,
      createdAt: a.createdAt,
      owner: { id: a.user.id, name: `${a.user.firstName} ${a.user.lastName}`, email: a.user.email },
    }));
  }

  private async assertExists(id: string) {
    const a = await this.prisma.tradingAccount.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Account not found');
    return a;
  }

  async setStatus(adminId: string, id: string, status: AccountStatus) {
    await this.assertExists(id);
    const updated = await this.prisma.tradingAccount.update({ where: { id }, data: { status } });
    await this.audit.record({
      userId: adminId,
      action: 'accounts.status',
      entity: 'TradingAccount',
      entityId: id,
      metadata: { status },
    });
    return { id: updated.id, status: updated.status };
  }

  async setLeverage(adminId: string, id: string, leverage: string) {
    await this.assertExists(id);
    const updated = await this.prisma.tradingAccount.update({ where: { id }, data: { leverage } });
    await this.audit.record({
      userId: adminId,
      action: 'accounts.leverage',
      entity: 'TradingAccount',
      entityId: id,
      metadata: { leverage },
    });
    return { id: updated.id, leverage: updated.leverage };
  }
}
