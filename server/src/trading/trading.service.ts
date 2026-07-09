import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  AccountStatus,
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
import { EXECUTION_PROVIDER, SimulationExecutionProvider, type ExecutionProvider, type Fill } from './execution-provider';
import { Mt5ConnectionService } from './mt5-connection.service';
import type { PlaceOrderDto, SetProtectionDto } from './trading.dto';

type AccountWithLedger = Prisma.TradingAccountGetPayload<{ include: { ledgerAccount: true } }>;

/** Margin level (%) at which open positions are force-liquidated. */
const STOP_OUT_LEVEL = 50;
/** Balance a demo account is reset to. */
const DEMO_RESET_BALANCE = 50000;

const round2 = (n: number) => Number(n.toFixed(2));

@Injectable()
export class TradingService {
  private readonly logger = new Logger('TradingService');

  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    @Inject(EXECUTION_PROVIDER) private readonly exec: ExecutionProvider,
    private readonly market: MarketService,
    private readonly mt5: Mt5ConnectionService,
    @Optional() private readonly simExecProvider?: SimulationExecutionProvider,
  ) {}

  /** Always-simulated venue, used for DEMO accounts even when the live MT5 venue is active. */
  private get simExec(): ExecutionProvider {
    return this.simExecProvider ?? this.exec;
  }

  /**
   * The execution venue for an account. DEMO accounts ALWAYS use the simulated
   * venue — a demo trade must never send a real order — regardless of the
   * globally configured provider (H-4).
   */
  private execFor(account: { mode: string }): ExecutionProvider {
    return account.mode === 'DEMO' ? this.simExec : this.exec;
  }

  /** The client's linked MT5 account id, only when the given venue is the MT5 venue. */
  private mt5AccountFor(venue: ExecutionProvider, userId: string): Promise<string | undefined> {
    return venue.name === 'mt5' ? this.mt5.accountIdFor(userId) : Promise.resolve(undefined);
  }

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

  /** Mark-to-market unrealized P&L across open positions (0 for any without a live quote). */
  private async unrealizedPnl(open: Position[]): Promise<number> {
    const symbols = [...new Set(open.map((p) => p.symbol))];
    if (!symbols.length) return 0;
    const quotes = await this.market.getQuotes(symbols);
    const priceOf = (s: string) => quotes.find((q) => q.symbol === s)?.price;
    let u = 0;
    for (const p of open) {
      const cur = priceOf(p.symbol);
      if (cur == null) continue;
      u += (cur - Number(p.entryPrice)) * Number(p.quantity) * (p.side === OrderSide.BUY ? 1 : -1);
    }
    return u;
  }

  private async assertMargin(account: AccountWithLedger, notional: number): Promise<void> {
    if (!account.ledgerAccount) return;
    const leverage = this.leverageOf(account.leverage);
    const required = notional / leverage;
    const open = await this.prisma.position.findMany({ where: { accountId: account.id, status: PositionStatus.OPEN } });
    const used = open.reduce((s, p) => s + (Number(p.entryPrice) * Number(p.quantity)) / leverage, 0);
    const balance = Number(await this.ledger.balanceOf(account.ledgerAccount.id));
    // Free margin is measured against equity (balance + unrealized P&L), so a book
    // sitting on unrealized losses cannot keep opening new positions until stop-out.
    const equity = balance + (await this.unrealizedPnl(open));
    if (used + required > equity + 1e-6) {
      throw new BadRequestException(
        `Insufficient free margin: need ${required.toFixed(2)}, free ${(equity - used).toFixed(2)} (leverage 1:${leverage}).`,
      );
    }
  }

  private async currentPrice(symbol: string): Promise<number | undefined> {
    const [q] = await this.market.getQuotes([symbol]);
    return q && q.price > 0 ? q.price : undefined;
  }

  /** A pending order must trigger on the correct side of the market (else it would fill instantly). */
  private assertTriggerDirection(type: OrderType, side: OrderSide, trigger: number, ref: number | undefined): void {
    if (ref == null) return;
    // LIMIT+BUY and STOP+SELL trigger below the price; LIMIT+SELL and STOP+BUY trigger above.
    const below = (type === OrderType.LIMIT) === (side === OrderSide.BUY);
    const valid = below ? trigger < ref : trigger > ref;
    if (!valid) {
      throw new BadRequestException(
        `A ${side} ${type.toLowerCase()} order must trigger ${below ? 'below' : 'above'} the current price (${ref.toFixed(2)}).`,
      );
    }
  }

  // ── Order placement ──────────────────────────────────────────────────────

  async placeOrder(userId: string, dto: PlaceOrderDto) {
    const account = await this.ownedAccount(userId, dto.accountId);
    if (account.status !== AccountStatus.ACTIVE) {
      throw new BadRequestException('This account is not active. Live accounts require admin approval before trading.');
    }
    // Only allow instruments in the configured tradable universe — a client must
    // not be able to submit arbitrary tickers (esp. once they reach the MT5 gateway).
    if (!this.market.isTradable(dto.symbol)) {
      throw new BadRequestException(`${dto.symbol} is not a tradable instrument.`);
    }

    const venue = this.execFor(account);
    // A LIVE account can only trade when a real venue is configured; DEMO always
    // routes to the simulated venue (venue === simExec), so it's never blocked here.
    if (account.mode !== 'DEMO' && venue.simulated) {
      throw new BadRequestException(
        'Live trading requires a connected MT5 venue. Use a demo account for simulated trading.',
      );
    }
    venue.assertAvailable();
    const type = dto.type ?? OrderType.MARKET;

    if (type === OrderType.MARKET) {
      const fill = await venue.fill(dto.symbol, dto.side, dto.quantity, await this.mt5AccountFor(venue, userId));
      return this.openMarketPosition(userId, account, dto.symbol, dto.side, dto.quantity, fill);
    }

    if (!dto.triggerPrice || !(dto.triggerPrice > 0)) {
      throw new BadRequestException('A trigger price is required for limit/stop orders.');
    }
    this.assertTriggerDirection(type, dto.side, dto.triggerPrice, await this.currentPrice(dto.symbol));
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
        simulated: venue.simulated,
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

  /**
   * Open a market position: check margin and insert the order + position inside
   * ONE transaction that locks the account's ledger row. Concurrent opens on the
   * same account serialize on that lock, so racing orders can't each pass the
   * same free-margin check and over-leverage the account (H-6).
   */
  private async openMarketPosition(
    userId: string,
    account: AccountWithLedger,
    symbol: string,
    side: OrderSide,
    quantity: number,
    fill: Fill,
  ): Promise<Position> {
    const position = await this.prisma.$transaction(async (tx) => {
      if (account.ledgerAccount) {
        await tx.$queryRaw`SELECT id FROM "LedgerAccount" WHERE id = ${account.ledgerAccount.id} FOR UPDATE`;
      }
      await this.assertMarginTx(tx, account, fill.price * quantity);
      await tx.order.create({
        data: { userId, accountId: account.id, symbol, side, type: OrderType.MARKET, quantity, price: fill.price, status: 'FILLED', simulated: fill.simulated },
      });
      return tx.position.create({
        data: { userId, accountId: account.id, symbol, side, quantity, entryPrice: fill.price, status: PositionStatus.OPEN },
      });
    });
    await this.audit.record({
      userId,
      action: 'trade.open',
      entity: 'Position',
      entityId: position.id,
      metadata: { symbol, side, quantity, price: fill.price },
    });
    return position;
  }

  /** Free-margin check using a transaction client, so it can run under a row lock. */
  private async assertMarginTx(tx: Prisma.TransactionClient, account: AccountWithLedger, notional: number): Promise<void> {
    if (!account.ledgerAccount) return;
    const leverage = this.leverageOf(account.leverage);
    const required = notional / leverage;
    const open = await tx.position.findMany({ where: { accountId: account.id, status: PositionStatus.OPEN } });
    const used = open.reduce((s, p) => s + (Number(p.entryPrice) * Number(p.quantity)) / leverage, 0);
    const balance = Number(await this.ledger.balanceOf(account.ledgerAccount.id));
    const equity = balance + (await this.unrealizedPnl(open));
    if (used + required > equity + 1e-6) {
      throw new BadRequestException(
        `Insufficient free margin: need ${required.toFixed(2)}, free ${(equity - used).toFixed(2)} (leverage 1:${leverage}).`,
      );
    }
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

    const entry = Number(pos.entryPrice);
    const isBuy = pos.side === OrderSide.BUY;
    if (dto.takeProfit != null) {
      const ok = isBuy ? dto.takeProfit > entry : dto.takeProfit < entry;
      if (!ok) throw new BadRequestException(`Take-profit must be ${isBuy ? 'above' : 'below'} the entry price (${entry}).`);
    }
    if (dto.stopLoss != null) {
      const ok = isBuy ? dto.stopLoss < entry : dto.stopLoss > entry;
      if (!ok) throw new BadRequestException(`Stop-loss must be ${isBuy ? 'below' : 'above'} the entry price (${entry}).`);
    }

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
    idempotencyKey: string,
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
        simulated: this.execFor(account).simulated,
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
        // Deterministic key so a concurrent/duplicate close cannot post P&L twice:
        // the ledger dedupes on idempotencyKey. The caller owns the key namespace.
        idempotencyKey,
        // Reflect the actual venue: real MT5 fills post non-simulated P&L.
        simulated: this.execFor(account).simulated,
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
    const prevRealized = Number(pos.realizedPnl ?? 0);
    // DEMO closes route through the simulated venue too (never a real order).
    const venue = this.execFor(account);

    if (closeQty < posQty) {
      // Partial close: the position stays OPEN, so this doesn't claim a status
      // transition. Its P&L key is unique per partial. (Concurrent identical
      // partials remain a lower-risk follow-up.)
      const fill = await venue.fill(pos.symbol, closeSide, closeQty, await this.mt5AccountFor(venue, userId));
      const pnl = await this.realizePnl(account, pos, closeQty, fill.price, '', `pnl:${pos.id}:partial:${randomUUID()}`);
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

    // Full close: atomically claim the OPEN→CLOSED transition so only one of any
    // concurrent close requests proceeds to fill + post P&L. A losing request
    // sees count 0 and aborts before any side effect (no double fill, no double
    // credit). The deterministic P&L key is a second line of defence.
    const claim = await this.prisma.position.updateMany({
      where: { id: positionId, status: PositionStatus.OPEN },
      data: { status: PositionStatus.CLOSED, closedAt: new Date() },
    });
    if (claim.count === 0) throw new BadRequestException('Position already closed');

    try {
      const fill = await venue.fill(pos.symbol, closeSide, closeQty, await this.mt5AccountFor(venue, userId));
      const pnl = await this.realizePnl(account, pos, closeQty, fill.price, '', `pnl:${pos.id}:close`);
      const updated = await this.prisma.position.update({
        where: { id: positionId },
        data: {
          status: PositionStatus.CLOSED,
          exitPrice: fill.price,
          realizedPnl: toMoney((prevRealized + pnl).toFixed(2)),
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
    } catch (err) {
      // We exclusively hold the claim, so reverting is safe: restore OPEN so a
      // failed close (e.g. no quote) doesn't strand the position as CLOSED.
      await this.prisma.position.update({
        where: { id: positionId },
        data: { status: PositionStatus.OPEN, closedAt: null },
      });
      throw err;
    }
  }

  /** Force-close a full position at a given price (TP/SL hit or stop-out). */
  private async autoClose(position: Position, price: number, reason: string): Promise<void> {
    // Atomically claim the close so a concurrent tick or manual close can't
    // double-close (and double-post P&L). Only the request that flips
    // OPEN→CLOSED proceeds; the deterministic P&L key is a second safeguard.
    const claim = await this.prisma.position.updateMany({
      where: { id: position.id, status: PositionStatus.OPEN },
      data: { status: PositionStatus.CLOSED, exitPrice: price, closedAt: new Date() },
    });
    if (claim.count === 0) return;

    const account = await this.prisma.tradingAccount.findUnique({
      where: { id: position.accountId },
      include: { ledgerAccount: true },
    });
    if (!account) return;
    const pnl = await this.realizePnl(account, position, Number(position.quantity), price, reason, `pnl:${position.id}:close`);
    const prevRealized = Number(position.realizedPnl ?? 0);
    await this.prisma.position.update({
      where: { id: position.id },
      data: { realizedPnl: toMoney((prevRealized + pnl).toFixed(2)) },
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
        await this.prisma.order.updateMany({ where: { id: o.id, status: 'PENDING' }, data: { status: 'REJECTED' } });
        this.logger.warn(`Pending order ${o.id} rejected at trigger (insufficient margin).`);
        continue;
      }

      // Atomically claim the fill: only the tick that flips PENDING→FILLED opens
      // the position. A concurrent tick that lost the claim (count 0) skips it,
      // so one order can never produce two positions.
      const claim = await this.prisma.order.updateMany({
        where: { id: o.id, status: 'PENDING' },
        data: { status: 'FILLED', price },
      });
      if (claim.count === 0) continue;

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

  // ── Account margin / demo tools ──────────────────────────────────────────

  /** Margin health for the Trade UI: balance, equity, used/free margin, level. */
  async getMargin(userId: string, accountId: string) {
    const account = await this.ownedAccount(userId, accountId);
    const s = await this.marginSnapshot(account);
    return {
      accountId,
      balance: round2(s.balance),
      equity: round2(s.equity),
      used: round2(s.used),
      free: round2(s.equity - s.used),
      unrealized: round2(s.unrealized),
      marginLevel: Number.isFinite(s.marginLevel) ? round2(s.marginLevel) : null,
      leverage: s.leverage,
      openPositions: s.enriched.length,
    };
  }

  /** Edit a pending limit/stop order's trigger price and/or quantity. */
  async modifyOrder(userId: string, orderId: string, dto: { triggerPrice?: number; quantity?: number }) {
    const o = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!o || o.userId !== userId) throw new NotFoundException('Order not found');
    if (o.status !== 'PENDING') throw new BadRequestException('Only pending orders can be modified.');
    const account = await this.ownedAccount(userId, o.accountId);

    const triggerPrice = dto.triggerPrice ?? Number(o.triggerPrice);
    const quantity = dto.quantity ?? Number(o.quantity);
    if (!(triggerPrice > 0)) throw new BadRequestException('Invalid trigger price.');
    if (!(quantity > 0)) throw new BadRequestException('Invalid quantity.');

    this.assertTriggerDirection(o.type, o.side, triggerPrice, await this.currentPrice(o.symbol));
    await this.assertMargin(account, triggerPrice * quantity);

    const updated = await this.prisma.order.update({ where: { id: orderId }, data: { triggerPrice, quantity } });
    await this.audit.record({
      userId,
      action: 'trade.order.modify',
      entity: 'Order',
      entityId: orderId,
      metadata: { triggerPrice, quantity },
    });
    return updated;
  }

  /** Reset a demo account: cancel pending, close positions, restore the starting balance. */
  async resetDemo(userId: string, accountId: string) {
    const account = await this.ownedAccount(userId, accountId);
    if (account.mode !== 'DEMO') throw new BadRequestException('Only demo accounts can be reset.');

    await this.prisma.order.updateMany({ where: { accountId, status: 'PENDING' }, data: { status: 'CANCELLED' } });
    await this.prisma.position.updateMany({
      where: { accountId, status: PositionStatus.OPEN },
      data: { status: PositionStatus.CLOSED, closedAt: new Date() },
    });

    if (account.ledgerAccount) {
      const bal = Number(await this.ledger.balanceOf(account.ledgerAccount.id));
      const delta = round2(DEMO_RESET_BALANCE - bal);
      if (Math.abs(delta) >= 0.01) {
        const demoFunding = await this.ledger.getSystemAccount('SYSTEM:DEMO_FUNDING');
        const amount = toMoney(Math.abs(delta).toFixed(2));
        const clientId = account.ledgerAccount.id;
        const postings =
          delta > 0
            ? [
                { ledgerAccountId: demoFunding.id, direction: PostingDirection.DEBIT, amount },
                { ledgerAccountId: clientId, direction: PostingDirection.CREDIT, amount },
              ]
            : [
                { ledgerAccountId: clientId, direction: PostingDirection.DEBIT, amount },
                { ledgerAccountId: demoFunding.id, direction: PostingDirection.CREDIT, amount },
              ];
        await this.ledger.post({
          kind: JournalKind.ADJUSTMENT,
          reference: generateTxReference(),
          idempotencyKey: `demo-reset:${accountId}:${randomUUID()}`,
          simulated: true,
          createdById: userId,
          memo: 'Demo account reset',
          postings,
        });
      }
    }
    await this.audit.record({ userId, action: 'trade.demo.reset', entity: 'TradingAccount', entityId: accountId });
    return this.getMargin(userId, accountId);
  }

  /** Which execution venue is active (simulation vs MT5) — for ops/verification. */
  venue() {
    return { name: this.exec.name, simulated: this.exec.simulated };
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
