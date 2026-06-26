import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JournalKind, OrderSide, PositionStatus, PostingDirection } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { toMoney } from '../ledger/money';
import { generateTxReference } from '../common/reference';
import { EXECUTION_PROVIDER, type ExecutionProvider } from './execution-provider';
import type { PlaceOrderDto } from './trading.dto';

@Injectable()
export class TradingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    @Inject(EXECUTION_PROVIDER) private readonly exec: ExecutionProvider,
  ) {}

  private async ownedAccount(userId: string, accountId: string) {
    const a = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
      include: { ledgerAccount: true },
    });
    if (!a) throw new NotFoundException('Account not found');
    if (a.userId !== userId) throw new ForbiddenException('Not your account');
    return a;
  }

  /** Open a position via a market order, filled at the live price. */
  async openPosition(userId: string, dto: PlaceOrderDto) {
    const account = await this.ownedAccount(userId, dto.accountId);
    // Simulation venue trades demo accounts only; live needs MT5.
    if (this.exec.simulated && account.mode !== 'DEMO') {
      throw new BadRequestException(
        'Live trading requires a connected MT5 venue. Use a demo account for simulated trading.',
      );
    }
    this.exec.assertAvailable();

    const fill = await this.exec.fill(dto.symbol, dto.side, dto.quantity);

    const order = await this.prisma.order.create({
      data: {
        userId,
        accountId: account.id,
        symbol: dto.symbol,
        side: dto.side,
        quantity: dto.quantity,
        price: fill.price,
        status: 'FILLED',
        simulated: fill.simulated,
      },
    });
    const position = await this.prisma.position.create({
      data: {
        userId,
        accountId: account.id,
        symbol: dto.symbol,
        side: dto.side,
        quantity: dto.quantity,
        entryPrice: fill.price,
        status: PositionStatus.OPEN,
      },
    });
    await this.audit.record({
      userId,
      action: 'trade.open',
      entity: 'Position',
      entityId: position.id,
      metadata: { symbol: dto.symbol, side: dto.side, quantity: dto.quantity, price: fill.price, orderId: order.id },
    });
    return position;
  }

  /** Close an open position at the live price and realize P&L to the ledger. */
  async closePosition(userId: string, positionId: string) {
    const pos = await this.prisma.position.findUnique({ where: { id: positionId } });
    if (!pos || pos.userId !== userId) throw new NotFoundException('Position not found');
    if (pos.status !== PositionStatus.OPEN) throw new BadRequestException('Position already closed');
    const account = await this.ownedAccount(userId, pos.accountId);

    const closeSide: OrderSide = pos.side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY;
    const qty = Number(pos.quantity);
    const fill = await this.exec.fill(pos.symbol, closeSide, qty);
    const entry = Number(pos.entryPrice);
    const pnl = (fill.price - entry) * qty * (pos.side === OrderSide.BUY ? 1 : -1);
    const pnlRounded = Number(pnl.toFixed(2));

    await this.prisma.order.create({
      data: {
        userId,
        accountId: account.id,
        symbol: pos.symbol,
        side: closeSide,
        quantity: qty,
        price: fill.price,
        status: 'FILLED',
        simulated: fill.simulated,
      },
    });
    const updated = await this.prisma.position.update({
      where: { id: positionId },
      data: {
        status: PositionStatus.CLOSED,
        exitPrice: fill.price,
        realizedPnl: toMoney(pnlRounded.toFixed(2)),
        closedAt: new Date(),
      },
    });

    // Realize P&L on the (demo) ledger against the adjustments account.
    if (account.ledgerAccount && Math.abs(pnlRounded) >= 0.01) {
      const adj = await this.ledger.getSystemAccount('SYSTEM:ADJUSTMENTS');
      const amount = toMoney(Math.abs(pnlRounded).toFixed(2));
      const clientId = account.ledgerAccount.id;
      const postings =
        pnlRounded > 0
          ? [
              { ledgerAccountId: adj.id, direction: PostingDirection.DEBIT, amount },
              { ledgerAccountId: clientId, direction: PostingDirection.CREDIT, amount },
            ]
          : [
              { ledgerAccountId: clientId, direction: PostingDirection.DEBIT, amount },
              { ledgerAccountId: adj.id, direction: PostingDirection.CREDIT, amount },
            ];
      await this.ledger.post({
        kind: JournalKind.ADJUSTMENT,
        reference: generateTxReference(),
        idempotencyKey: `pnl:${positionId}`,
        simulated: true,
        createdById: userId,
        memo: `Realized P&L · ${pos.symbol}`,
        postings,
      });
    }

    await this.audit.record({
      userId,
      action: 'trade.close',
      entity: 'Position',
      entityId: positionId,
      metadata: { exitPrice: fill.price, realizedPnl: pnlRounded },
    });
    return updated;
  }

  listOrders(userId: string) {
    return this.prisma.order.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  listPositions(userId: string, status?: PositionStatus) {
    return this.prisma.position.findMany({
      where: { userId, ...(status ? { status } : {}) },
      orderBy: [{ status: 'asc' }, { openedAt: 'desc' }],
      take: 200,
    });
  }
}
