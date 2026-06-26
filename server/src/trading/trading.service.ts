import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  JournalKind,
  OrderSide,
  OrderType,
  type Prisma,
  PositionStatus,
  PostingDirection,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { toMoney } from '../ledger/money';
import { generateTxReference } from '../common/reference';
import { EXECUTION_PROVIDER, type ExecutionProvider, type Fill } from './execution-provider';
import type { PlaceOrderDto } from './trading.dto';

type AccountWithLedger = Prisma.TradingAccountGetPayload<{ include: { ledgerAccount: true } }>;

@Injectable()
export class TradingService {
  private readonly logger = new Logger('TradingService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    @Inject(EXECUTION_PROVIDER) private readonly exec: ExecutionProvider,
  ) {}

  private async ownedAccount(userId: string, accountId: string): Promise<AccountWithLedger> {
    const a = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
      include: { ledgerAccount: true },
    });
    if (!a) throw new NotFoundException('Account not found');
    if (a.userId !== userId) throw new ForbiddenException('Not your account');
    return a;
  }

  /** Parse "1:500" → 500. */
  private leverageOf(leverage: string | null | undefined): number {
    const m = /:(\d+)/.exec(leverage ?? '');
    const n = m ? Number(m[1]) : 100;
    return n > 0 ? n : 100;
  }

  /** Margin tied up by currently-open positions, at the account's leverage. */
  private async usedMargin(accountId: string, leverage: number): Promise<number> {
    const open = await this.prisma.position.findMany({ where: { accountId, status: PositionStatus.OPEN } });
    return open.reduce((s, p) => s + (Number(p.entryPrice) * Number(p.quantity)) / leverage, 0);
  }

  /** Reject an order whose required margin exceeds free margin. */
  private async assertMargin(account: AccountWithLedger, notional: number): Promise<void> {
    if (!account.ledgerAccount) return;
    const leverage = this.leverageOf(account.leverage);
    const required = notional / leverage;
    const used = await this.usedMargin(account.id, leverage);
    const balance = Number(await this.ledger.balanceOf(account.ledgerAccount.id));
    if (used + required > balance + 1e-6) {
      throw new BadRequestException(
        `Insufficient free margin: need ${required.toFixed(2)}, free ${(balance - used).toFixed(2)} (leverage 1:${leverage}).`,
      );
    }
  }

  /** Place a market, limit, or stop order. Market fills now; limit/stop park as PENDING. */
  async placeOrder(userId: string, dto: PlaceOrderDto) {
    const account = await this.ownedAccount(userId, dto.accountId);
    if (this.exec.simulated && account.mode !== 'DEMO') {
      throw new BadRequestException(
        'Live trading requires a connected MT5 venue. Use a demo account for simulated trading.',
      );
    }
    this.exec.assertAvailable();

    const type = dto.type ?? OrderType.MARKET;

    if (type === OrderType.MARKET) {
      const fill = await this.exec.fill(dto.symbol, dto.side, dto.quantity);
      await this.assertMargin(account, fill.price * dto.quantity);
      return this.fillAndOpen(userId, account.id, dto.symbol, dto.side, dto.quantity, fill, OrderType.MARKET);
    }

    // LIMIT / STOP → pending order, filled later by the tick watcher.
    if (!dto.triggerPrice || !(dto.triggerPrice > 0)) {
      throw new BadRequestException('A trigger price is required for limit/stop orders.');
    }
    await this.assertMargin(account, dto.triggerPrice * dto.quantity);
    const order = await this.prisma.order.create({
      data: {
        userId,
        accountId: account.id,
        symbol: dto.symbol,
        side: dto.side,
        type,
        quantity: dto.quantity,
        price: 0,
        triggerPrice: dto.triggerPrice,
        status: 'PENDING',
        simulated: this.exec.simulated,
      },
    });
    await this.audit.record({
      userId,
      action: 'trade.order.pending',
      entity: 'Order',
      entityId: order.id,
      metadata: { type, side: dto.side, symbol: dto.symbol, quantity: dto.quantity, triggerPrice: dto.triggerPrice },
    });
    return order;
  }

  private async fillAndOpen(
    userId: string,
    accountId: string,
    symbol: string,
    side: OrderSide,
    quantity: number,
    fill: Fill,
    type: OrderType,
  ) {
    const order = await this.prisma.order.create({
      data: { userId, accountId, symbol, side, type, quantity, price: fill.price, status: 'FILLED', simulated: fill.simulated },
    });
    const position = await this.prisma.position.create({
      data: { userId, accountId, symbol, side, quantity, entryPrice: fill.price, status: PositionStatus.OPEN },
    });
    await this.audit.record({
      userId,
      action: 'trade.open',
      entity: 'Position',
      entityId: position.id,
      metadata: { symbol, side, quantity, price: fill.price, orderId: order.id },
    });
    return position;
  }

  /** Cancel a pending limit/stop order. */
  async cancelOrder(userId: string, orderId: string) {
    const o = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!o || o.userId !== userId) throw new NotFoundException('Order not found');
    if (o.status !== 'PENDING') throw new BadRequestException('Only pending orders can be cancelled.');
    const updated = await this.prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
    await this.audit.record({ userId, action: 'trade.order.cancel', entity: 'Order', entityId: orderId });
    return updated;
  }

  /** Returns true when a pending order's condition is met at the given price. */
  static isTriggered(type: OrderType, side: OrderSide, trigger: number, price: number): boolean {
    if (type === OrderType.LIMIT) {
      return side === OrderSide.BUY ? price <= trigger : price >= trigger;
    }
    if (type === OrderType.STOP) {
      return side === OrderSide.BUY ? price >= trigger : price <= trigger;
    }
    return false;
  }

  /** Called per market tick: fill any pending orders whose trigger is hit. */
  async triggerPendingForQuote(symbol: string, price: number): Promise<void> {
    if (!(price > 0)) return;
    const pending = await this.prisma.order.findMany({ where: { symbol, status: 'PENDING' } });
    for (const o of pending) {
      const trigger = Number(o.triggerPrice);
      if (!(trigger > 0)) continue;
      if (!TradingService.isTriggered(o.type, o.side, trigger, price)) continue;

      const account = await this.prisma.tradingAccount.findUnique({
        where: { id: o.accountId },
        include: { ledgerAccount: true },
      });
      if (!account) continue;
      try {
        await this.assertMargin(account, price * Number(o.quantity));
      } catch {
        await this.prisma.order.update({ where: { id: o.id }, data: { status: 'REJECTED' } });
        this.logger.warn(`Pending order ${o.id} rejected at trigger (insufficient margin).`);
        continue;
      }

      await this.prisma.order.update({ where: { id: o.id }, data: { status: 'FILLED', price } });
      await this.prisma.position.create({
        data: {
          userId: o.userId,
          accountId: o.accountId,
          symbol: o.symbol,
          side: o.side,
          quantity: o.quantity,
          entryPrice: price,
          status: PositionStatus.OPEN,
        },
      });
      await this.audit.record({
        userId: o.userId,
        action: 'trade.trigger',
        entity: 'Order',
        entityId: o.id,
        metadata: { triggerPrice: trigger, fillPrice: price },
      });
    }
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
