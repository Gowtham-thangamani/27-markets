import {
  BadRequestException,
  Injectable,
  NotImplementedException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { OrderSide } from '@prisma/client';
import { MarketService } from '../market/market.service';
import { Mt5GatewayClient } from './mt5-gateway.client';
import { toMt5Symbol } from './mt5-symbols';

/** DI token for the active execution backend. */
export const EXECUTION_PROVIDER = Symbol('EXECUTION_PROVIDER');

/**
 * Choose the execution venue, failing CLOSED: the real MT5 venue is used only
 * when it is explicitly requested AND the live rail is on (TRADING_MODE=LIVE +
 * ALLOW_LIVE_MODE=true). Otherwise we fall back to simulation so a stray
 * EXECUTION_PROVIDER=mt5 can never send real orders while the platform believes
 * it is simulating (H-3). `fellBack` flags that a requested MT5 was downgraded.
 */
export function chooseExecutionProvider<S, M>(
  opts: { executionProvider: string; liveRailOn: boolean },
  sim: S,
  mt5: M,
): { provider: S | M; fellBack: boolean } {
  if (opts.executionProvider === 'mt5' && opts.liveRailOn) {
    return { provider: mt5, fellBack: false };
  }
  return { provider: sim, fellBack: opts.executionProvider === 'mt5' };
}

export interface Fill {
  price: number;
  simulated: boolean;
  /** The venue's position id (MT5), captured on open so closes reference it. */
  brokerPositionId?: string | null;
}

/** A position close routed to the venue. */
export interface CloseInput {
  /** Present → close this exact venue position (full close by id). Absent →
   *  place an opposite market order (partial closes, or legacy positions with
   *  no captured id). */
  brokerPositionId?: string | null;
  symbol: string;
  /** The CLOSING side (opposite of the position's side). */
  side: OrderSide;
  quantity: number;
  mt5AccountId?: string;
}

/**
 * The boundary between the trading app and an execution venue. The SIMULATION
 * venue fills at the live market price; the MT5 adapter routes real orders to a
 * MetaTrader account. TradingService talks only to this interface.
 */
export interface ExecutionProvider {
  readonly name: string;
  readonly simulated: boolean;
  /** Throws if real execution can't be performed (no venue configured). */
  assertAvailable(): void;
  /** Market fill for a symbol/side/quantity. `mt5AccountId` routes to a client's linked account. */
  fill(symbol: string, side: OrderSide, quantity: number, mt5AccountId?: string): Promise<Fill>;
  /** Close a position at the venue and return the executed price. */
  closePosition(input: CloseInput): Promise<Fill>;
}

/** Demo execution: fills at the real, live market price from the price feed. */
@Injectable()
export class SimulationExecutionProvider implements ExecutionProvider {
  readonly name = 'simulation';
  readonly simulated = true;

  constructor(private readonly market: MarketService) {}

  assertAvailable(): void {
    /* always available */
  }

  async fill(symbol: string): Promise<Fill> {
    const [q] = await this.market.getQuotes([symbol]);
    if (!q || !(q.price > 0)) {
      throw new BadRequestException(`No live price available for ${symbol}`);
    }
    return { price: q.price, simulated: true };
  }

  /** Simulated close: fills at the live price (no real venue position to close). */
  async closePosition(input: CloseInput): Promise<Fill> {
    return this.fill(input.symbol);
  }
}

/**
 * MetaTrader 5 adapter (via MetaApi.cloud). Routes real market orders to the
 * configured MT5 account and returns the executed price. Inactive until the
 * gateway is configured — real trades must never execute without a venue.
 */
@Injectable()
export class Mt5ExecutionProvider implements ExecutionProvider {
  readonly name = 'mt5';
  readonly simulated = false;

  constructor(private readonly gateway: Mt5GatewayClient) {}

  assertAvailable(): void {
    if (!this.gateway.configured) {
      throw new NotImplementedException(
        'MT5 execution is not configured (MT5_GATEWAY_URL + MT5_ACCOUNT_ID). Connect a ' +
          'MetaTrader 5 account (e.g. via MetaApi.cloud) before enabling live trading.',
      );
    }
  }

  async fill(symbol: string, side: OrderSide, quantity: number, mt5AccountId?: string): Promise<Fill> {
    this.assertAvailable();
    const mt5Symbol = toMt5Symbol(symbol);
    const deal = await this.gateway.placeMarketOrder({ symbol: mt5Symbol, side: side as 'BUY' | 'SELL', volume: quantity }, mt5AccountId);
    const price = await this.priceOf(deal, mt5Symbol, side, mt5AccountId);
    if (!price) throw new ServiceUnavailableException(`MT5 fill price unavailable for ${symbol}.`);
    // Capture the venue position id so a later close references it directly.
    return { price, simulated: false, brokerPositionId: deal?.positionId ?? null };
  }

  /**
   * Close at the venue. With a known broker position id we close that exact
   * position by id (the correct primitive — nets/hedges deterministically);
   * without one (partial close, or a legacy position) we fall back to an
   * opposite market order.
   */
  async closePosition(input: CloseInput): Promise<Fill> {
    this.assertAvailable();
    const mt5Symbol = toMt5Symbol(input.symbol);
    const deal = input.brokerPositionId
      ? await this.gateway.closePosition(input.brokerPositionId, input.mt5AccountId)
      : await this.gateway.placeMarketOrder(
          { symbol: mt5Symbol, side: input.side as 'BUY' | 'SELL', volume: input.quantity },
          input.mt5AccountId,
        );
    const price = await this.priceOf(deal, mt5Symbol, input.side, input.mt5AccountId);
    if (!price) throw new ServiceUnavailableException(`MT5 close price unavailable for ${input.symbol}.`);
    return { price, simulated: false };
  }

  /** The deal's executed price, or the current quote for the side if absent. */
  private async priceOf(deal: { price?: number }, mt5Symbol: string, side: OrderSide, mt5AccountId?: string): Promise<number | undefined> {
    if (deal?.price && deal.price > 0) return deal.price;
    const quote = await this.gateway.currentPrice(mt5Symbol, mt5AccountId).catch(() => undefined);
    const price = quote ? (side === OrderSide.BUY ? quote.ask : quote.bid) : undefined;
    return price && price > 0 ? price : undefined;
  }
}
