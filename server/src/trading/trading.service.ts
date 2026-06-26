import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  JournalKind,
  OrderSide,
  OrderType,
  type Position,
  type Prisma,
  PositionStatus,
  PostingDirection,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { AuditService } from '../audit/audit.service';
import { MarketService } from '../market/market.service';
import { toMoney } from '../ledger/money';
import { generateTxReference } from '../common/reference';
import { EXECUTION_PROVIDER, type ExecutionProvider, type Fill } from './execution-provider';
import type { PlaceOrderDto, SetProtectionDto } from './trading.dto';

type AccountWithLedger = Prisma.TradingAccountGetPayload<{ include: { ledgerAccount: true } }>;

/** Margin level (%) at which open positions are force-liquidated. */
const STOP_OUT_LEVEL = 50;

@Injectable()
export class TradingService {
  private readonly logger = new Logger('TradingService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    @Inject(EXECUTION_PROVIDER) private readonly exec: ExecutionProvider,
    private readonly market: MarketService,
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

  private leverageOf(leverage: string | null | undefined): number {
    const m = /:(\d+)/.exec(leverage ?? '');
    const n = m ? Number(m[1]) : 100;
    return n > 0 ? n : 100;
  }

  private async usedMargin(accountId: string, leverage: number): Promise<number> {
    const open = await this.prisma.position.findMany({ where: { accountId, status: PositionStatus.OPEN } });
    return open.reduce((s, p) => s + (Number(p.entryPrice) * Number(p.quantity)) / leverage, 0);
  }

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

  // ── Order placement ──────────────────────────────────────────────────────

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

  async cancelOrder(userId: string, orderId: string) {
    const o = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!o || o.userId !== userId) throw new NotFoundException('Order not found');
    if (o.status !== 'PENDING') throw new BadRequestException('Only pending orders can be cancelled.');
    const updated = await this.prisma.order.update({ where: { id: orderId }, data: { status: 'CANCELLED' } });
    await this.audit.record({ userId, action: 'trade.order.cancel', entity: 'Order', entityId: orderId });
    return updated;
  }

  // ── Position protection (TP/SL) ──────────────────────────────────────────

  async setProtection(userId: string, positionId: string, dto: SetProtectionDto) {
    const pos = await this.prisma.position.findUnique({ where: { id: positionId } });
    if (!pos || pos.userId !== userId) throw new NotFoundException('Position not found');
    if (pos.status !== PositionStatus.OPEN) throw new BadRequestException('Position is closed.');
    const data: Prisma.PositionUpdateInput = {};
    if (dto.takeProfit !== undefined) data.takeProfit = dto.takeProfit;
    if (dto.stopLoss !== undefined) data.stopLoss = dto.stopLoss;
    const updated = await this.prisma.position.update({ where: { id: positionId }, data });
    await this.audit.record({
      userId,
      action: 'trade.protection',
      entity: 'Position',
      entityId: positionId,
      metadata: { takeProfit: dto.takeProfit ?? null, stopLoss: dto.stopLoss ?? null },
    });
    return updated;
  }

  // ── Closing (manual, partial, automatic) ─────────────────────────────────

  /** Post a closing order + realized P&L to the ledger for a closed quantity. */
  private async realizePnl(
    account: AccountWithLedger,
    position: Position,
    closeQty: number,
    fillPrice: number,
    reason: string,
  ): Promise<number> {
    const entry = Number(position.entryPrice);
    const pnl = (fillPrice - entry) * closeQty * (position.side === OrderSide.BUY ? 1 : -1);
    const pnlRounded = Number(pnl.toFixed(2));
    const closeSide: OrderSide = position.side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY;

    await this.prisma.order.create({
      data: {
        userId: position.userId,
        accountId: account.id,
        symbol: position.symbol,
        side: closeSide,
        quantity: closeQty,
        price: fillPrice,
        status: 'FILLED',
        simulated: this.exec.simulated,
      },
    });

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
        idempotencyKey: `pnl:${position.id}:${randomUUID()}`,
        simulated: true,
        createdById: position.userId,
        memo: `Realized P&L · ${position.symbol}${reason ? ` (${reason})` : ''}`,
        postings,
      });
    }
    return pnlRounded;
  }

  /** Close a position at the live price. Pass a quantity below the position size for a partial close. */
  async closePosition(userId: string, positionId: string, quantity?: number) {
    const pos = await this.prisma.position.findUnique({ where: { id: positionId } });
    if (!pos || pos.userId !== userId) throw new NotFoundException('Position not found');
    if (pos.status !== PositionStatus.OPEN) throw new BadRequestException('Position already closed');
    const account = await this.ownedAccount(userId, pos.accountId);

    const posQty = Number(pos.quantity);
    const closeQty = quantity && quantity > 0 && quantity < posQty ? quantity : posQty;
    const closeSide: OrderSide = pos.side === OrderSide.BUY ? OrderSide.SELL : OrderSide.BUY;
    const fill = await this.exec.fill(pos.symbol, closeSide, closeQty);
    const pnl = await this.realizePnl(account, pos, closeQty, fill.price, '');
    const prevRealized = Number(pos.realizedPnl ?? 0);

    if (closeQty < posQty) {
      const updated = await this.prisma.position.update({
        where: { id: positionId },
        data: { quantity: posQty - closeQty, realizedPnl: toMoney((prevRealized + pnl).toFixed(2)) },
      });
      await this.audit.record({
        userId,
        action: 'trade.close.partial',
        entity: 'Position',
        entityId: positionId,
        metadata: { closedQty: closeQty, exitPrice: fill.price, realizedPnl: pnl },
      });
      return updated;
    }

    const updated = await this.prisma.position.update({
      where: { id: positionId },
      data: {
        status: PositionStatus.CLOSED,
        exitPrice: fill.price,
        realizedPnl: toMoney((prevRealized + pnl).toFixed(2)),
        closedAt: new Date(),
      },
    });
    await this.audit.record({
      userId,
      action: 'trade.close',
      entity: 'Position',
      entityId: positionId,
      metadata: { exitPrice: fill.price, realizedPnl: pnl },
    });
    return updated;
  }

  /** Force-close a full position at a given price (TP/SL hit or stop-out). */
  private async autoClose(position: Position, price: number, reason: string): Promise<void> {
    const account = await this.prisma.tradingAccount.findUnique({
      where: { id: position.accountId },
      include: { ledgerAccount: true },
    });
    if (!account) return;
    const pnl = await this.realizePnl(account, position, Number(position.quantity), price, reason);
    const prevRealized = Number(position.realizedPnl ?? 0);
    await this.prisma.position.update({
      where: { id: position.id },
      data: {
        status: PositionStatus.CLOSED,
        exitPrice: price,
        realizedPnl: toMoney((prevRealized + pnl).toFixed(2)),
        closedAt: new Date(),
      },
    });
    await this.audit.record({
      userId: position.userId,
      action: `trade.autoclose.${reason}`,
      entity: 'Position',
      entityId: position.id,
      metadata: { price, reason, realizedPnl: pnl },
    });
    this.logger.log(`Auto-closed ${position.symbol} (${reason}) @ ${price} — P&L ${pnl}`);
  }

  // ── Trigger logic (pure, unit-testable) ──────────────────────────────────

  static isTriggered(type: OrderType, side: OrderSide, trigger: number, price: number): boolean {
    if (type === OrderType.LIMIT) return side === OrderSide.BUY ? price <= trigger : price >= trigger;
    if (type === OrderType.STOP) return side === OrderSide.BUY ? price >= trigger : price <= trigger;
    return false;
  }

  static hitsTakeProfit(side: OrderSide, tp: number, price: number): boolean {
    return side === OrderSide.BUY ? price >= tp : price <= tp;
  }

  static hitsStopLoss(side: OrderSide, sl: number, price: number): boolean {
    return side === OrderSide.BUY ? price <= sl : price >= sl;
  }

  // ── Live tick processing ─────────────────────────────────────────────────

  /** Called per market tick: fill pending orders, trigger TP/SL, then run stop-out. */
  async processTick(symbol: string, price: number): Promise<void> {
    if (!(price > 0)) return;
    await this.triggerPendingForQuote(symbol, price);

    const open = await this.prisma.position.findMany({ where: { symbol, status: PositionStatus.OPEN } });
    for (const p of open) {
      const tp = p.takeProfit != null ? Number(p.takeProfit) : null;
      const sl = p.stopLoss != null ? Number(p.stopLoss) : null;
      if (tp != null && TradingService.hitsTakeProfit(p.side, tp, price)) {
        await this.autoClose(p, price, 'tp');
        continue;
      }
      if (sl != null && TradingService.hitsStopLoss(p.side, sl, price)) {
        await this.autoClose(p, price, 'sl');
      }
    }

    const accountIds = [...new Set(open.map((p) => p.accountId))];
    for (const accId of accountIds) await this.checkStopOut(accId);
  }

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

  /** Account margin snapshot using live prices: equity, used margin, margin level (%). */
  async marginSnapshot(account: AccountWithLedger) {
    const leverage = this.leverageOf(account.leverage);
    const open = await this.prisma.position.findMany({ where: { accountId: account.id, status: PositionStatus.OPEN } });
    const symbols = [...new Set(open.map((p) => p.symbol))];
    const quotes = symbols.length ? await this.market.getQuotes(symbols) : [];
    const priceOf = (s: string) => quotes.find((q) => q.symbol === s)?.price;

    let used = 0;
    let unrealized = 0;
    const enriched = open.map((p) => {
      const entry = Number(p.entryPrice);
      const qty = Number(p.quantity);
      used += (entry * qty) / leverage;
      const cur = priceOf(p.symbol);
      const pnl = cur != null ? (cur - entry) * qty * (p.side === OrderSide.BUY ? 1 : -1) : 0;
      unrealized += pnl;
      return { position: p, cur, pnl };
    });
    const balance = account.ledgerAccount ? Number(await this.ledger.balanceOf(account.ledgerAccount.id)) : 0;
    const equity = balance + unrealized;
    const marginLevel = used > 0 ? (equity / used) * 100 : Infinity;
    return { leverage, used, unrealized, balance, equity, marginLevel, enriched };
  }

  /** Liquidate worst-losing positions while margin level is below the stop-out threshold. */
  private async checkStopOut(accountId: string): Promise<void> {
    const account = await this.prisma.tradingAccount.findUnique({
      where: { id: accountId },
      include: { ledgerAccount: true },
    });
    if (!account || !account.ledgerAccount) return;

    for (let guard = 0; guard < 25; guard++) {
      const snap = await this.marginSnapshot(account);
      if (snap.used <= 0 || snap.marginLevel >= STOP_OUT_LEVEL) return;
      const candidates = snap.enriched.filter((e) => e.cur != null).sort((a, b) => a.pnl - b.pnl);
      const worst = candidates[0];
      if (!worst || worst.cur == null) return;
      this.logger.warn(`Stop-out on ${accountId}: margin ${snap.marginLevel.toFixed(0)}% < ${STOP_OUT_LEVEL}% — liquidating ${worst.position.symbol}`);
      await this.autoClose(worst.position, worst.cur, 'stopout');
    }
  }

  // ── Queries ──────────────────────────────────────────────────────────────

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
