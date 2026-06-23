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
